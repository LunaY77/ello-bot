# Backend 开发规范

本文档为 Ello Bot 后端的 AI 辅助编码规范，适用于 `backend/` 下所有 Claude 协作场景。

如何启动、测试、部署、配置环境变量，请看 `backend/README.md` 与 `backend/README-zh.md`；本文件只讨论项目规范。

---

## 1. 项目结构

```text
backend/
├── app/
│   ├── __init__.py              # __app_name__, __version__
│   ├── main.py                  # FastAPI 入口、lifespan、自举、异常注册、健康检查
│   ├── core/                    # 框架层：配置、数据库、Redis、认证、异常、日志、Result
│   │   ├── config.py            # Settings（多子配置类）
│   │   ├── database.py          # Async engine、SessionLocal、DbSession、Base
│   │   ├── redis.py             # Redis 客户端、RedisKeyDef、RedisDep
│   │   ├── auth.py              # require_auth / CurrentAuthDep
│   │   ├── exception.py         # CommonErrorCode、BusinessException、AuthException
│   │   ├── schema.py            # ApiModel、Result[T]
│   │   ├── logger.py            # Loguru 配置
│   │   ├── observability.py     # OpenTelemetry 初始化
│   │   └── __init__.py          # 公共导出
│   ├── modules/
│   │   └── iam/                 # 当前唯一完整业务模块：认证、租户、RBAC、ACL、Agent
│   │       ├── consts.py        # 业务常量、Redis key、内建角色/权限
│   │       ├── errors.py        # IamErrorCode
│   │       ├── model.py         # ORM 模型
│   │       ├── schemas.py       # 请求/响应 Schema
│   │       ├── commands.py      # 写操作
│   │       ├── queries.py       # 读操作
│   │       ├── workflow.py      # 跨领域编排
│   │       ├── router.py        # /api/iam/*
│   │       └── __init__.py      # 模块公共导出
│   ├── infra/                   # 外部集成预留命名空间
│   ├── tools/                   # 脚本入口（lint/check/gen-openapi）
│   ├── utils/                   # token、密码哈希等工具函数
│   └── static/                  # 默认头像等静态资源
├── alembic/                     # 数据库迁移
├── tests/
│   ├── unit/                    # 单元测试
│   ├── integration/             # 真实 PostgreSQL + Redis 集成测试
│   ├── conftest.py              # 测试夹具与环境初始化
│   └── factories.py             # 测试辅助方法
└── pyproject.toml               # 依赖、pytest、ruff 配置
```

### 模块文件约定

新增业务模块时，优先沿用当前 `iam` 模块的拆分方式：

| 文件 | 职责 |
| ---- | ---- |
| `consts.py` | 常量、RedisKey、内建配置 |
| `errors.py` | 业务错误码定义 |
| `model.py` | SQLAlchemy ORM 模型 |
| `schemas.py` | Pydantic 请求/响应 Schema |
| `commands.py` | 写操作业务逻辑 |
| `queries.py` | 读操作业务逻辑 |
| `workflow.py` | 跨流程编排，按需存在 |
| `router.py` | FastAPI Router，只处理 HTTP 层 |
| `__init__.py` | 公共导出 + `__all__` |

禁止回退到旧的 `service/repository` 分层命名。

---

## 2. 分层架构

```text
Router -> Workflow / Commands / Queries -> Model / Redis
```

### 规则

- **Router 层**：只负责请求解析、依赖注入、权限入口检查、`Result` 包装，不写业务逻辑，不直接拼 SQL。
- **Workflow 层**：处理跨领域编排，适用于注册、登录、刷新令牌、聚合 `/auth/me` 这类流程。
- **Commands 层**：只负责写操作与状态变更。
- **Queries 层**：只负责读操作与显式预加载查询。
- **Model 层**：只定义表结构和关系，不承载业务逻辑。

```python
# ✅ 正确：Router 调用 workflow / commands
@router.post("/auth/login")
async def login(request: LoginRequest, workflow: IamWorkflowDep):
    return Result.ok(data=await workflow.login(request.username, request.password))

# ❌ 错误：Router 直接查库写业务
@router.post("/auth/login")
async def login(request: LoginRequest, db: DbSession):
    user = await db.scalar(select(UserAccount).where(UserAccount.username == request.username))
```

---

## 3. 数据库与 ORM 规范

### 异步优先

- 数据库统一使用 `AsyncSession`。
- 请求作用域内统一通过 `DbSession` 注入。
- 业务代码禁止引入同步 SQLAlchemy Session。

### 事务边界

- 标准请求路径通过 `get_db()` 自动提交或回滚事务。
- 因此 `router.py`、`commands.py`、`queries.py`、`workflow.py` 中不要无理由显式 `commit()`。
- 只有脱离请求生命周期的逻辑才直接使用 `SessionLocal()`，例如 `app/main.py` 的启动自举。

### ORM 关系与查询

- `app/modules/iam/model.py` 中大量关系显式设置了 `lazy="raise"`。
- 任何需要访问关系对象的查询，必须通过 `joinedload()` / `selectinload()` 预加载。
- 序列化阶段如果触发懒加载报错，应修正查询，而不是放宽模型约束。

```python
# ✅ 正确：查询时预加载
stmt = select(UserAccount).options(joinedload(UserAccount.principal))

# ❌ 错误：依赖序列化阶段临时懒加载
user = await db.scalar(select(UserAccount).where(UserAccount.id == user_id))
return UserAccountResponse.model_validate(user)
```

---

## 4. Redis 与鉴权规范

### RedisKeyDef

所有 Redis key 必须通过 `RedisKeyDef` 定义，禁止在业务代码中硬编码字符串 key。

定义位置：

- 框架公共定义在 `app/core/redis.py`
- 模块私有 key 定义在各模块 `consts.py`

命名约定：

- 根前缀统一为 `ello:`
- 建议结构：`ello:{module}:{domain}:{pattern}`

### Redis 使用规则

- `commands.py` / `queries.py` 通过构造器注入 `RedisDep`。
- 业务代码不要直接导入全局 `redis_client`。
- 唯一例外是框架级依赖或进程级初始化逻辑，例如 `core/auth.py` 与启动自举。

### 鉴权规则

- Access token 是不透明 token，不是把 JWT 直接拿来做路由鉴权。
- 路由鉴权统一走 `require_auth()` / `CurrentAuthDep`。
- 受保护接口不要重复手动解析 `Authorization` 请求头。
- Access session 的真实来源是 Redis 中的会话快照。

---

## 5. 错误码与异常规范

### 错误码格式

- 固定 5 位字符：来源码 + 4 位编号
- `A`：框架/通用错误
- `B`：业务错误
- `C`：第三方或外部系统错误

当前后端约定：

- 通用错误码定义在 `app/core/exception.py` 的 `CommonErrorCode`
- 业务错误码定义在模块 `errors.py`
- 当前 `iam` 模块使用 `IamErrorCode`

### 号段建议

- `B01xx`：认证/用户基础操作
- `B02xx`：租户、RBAC、ACL、Agent 等 IAM 管理操作
- 新增业务域时，优先申请新的百位号段，不要把新语义塞进已混乱的区间

### 抛错规则

- 业务失败统一抛 `BusinessException`
- 鉴权失败统一抛 `AuthException`
- 禁止在业务代码中直接抛 `HTTPException`

```python
# ✅ 正确
raise BusinessException(IamErrorCode.USER_NOT_FOUND)

# ❌ 错误
raise HTTPException(status_code=404, detail="User not found")
```

---

## 6. Schema 与 API 响应规范

### Schema 规范

- 所有请求/响应 Schema 统一放在模块 `schemas.py`
- 公共 API schema 继承 `ApiModel`
- `ApiModel` 已统一提供：
  - camelCase alias
  - `populate_by_name=True`
  - `extra="forbid"`

### 请求/响应模型

- 请求模型和响应模型分开定义，命名清晰。
- 简单字段约束优先使用 Pydantic v2 类型约束、`Annotated`、`Field`。
- 能不用自定义校验器时，尽量不要写 `@field_validator`。

### ORM 转换

- 响应模型如需从 ORM 转换，应开启 `from_attributes=True`。
- 统一使用 `Model.model_validate(orm_obj)`，不要重复手写字段拷贝。

### 统一响应

- 所有接口统一返回 `Result[T]`
- 成功返回：`Result.ok(data=...)`
- 失败返回：通过异常处理器统一转换，不在路由里手写失败 JSON

---

## 7. 依赖注入规范

### 命名规则

- 依赖工厂函数统一命名为 `get_xxx`
- 依赖类型别名统一命名为 `XxxDep`

```python
def get_iam_queries(db: DbSession, redis: RedisDep) -> IamQueries:
    return IamQueries(db, redis)

IamQueriesDep = Annotated[IamQueries, Depends(get_iam_queries)]
```

### 注入边界

- Router 优先注入 `IamCommandsDep`、`IamQueriesDep`、`IamWorkflowDep`、`CurrentAuthDep`
- 不要在业务 Router 中直接注入底层 `SessionLocal` 或全局 `redis_client`
- `commands.py` / `queries.py` / `workflow.py` 使用构造器注入依赖，而不是在方法内部到处 import 全局对象

---

## 8. 配置规范

### Settings 结构

配置通过 `pydantic-settings` 分层管理，当前已拆分为：

| 子配置类 | env_prefix | 访问方式 |
| -------- | ---------- | -------- |
| `ServerSettings` | `SERVER_` | `settings.server.HOST` |
| `DatabaseSettings` | `DB_` | `settings.db.URL` |
| `CacheSettings` | `REDIS_` | `settings.cache.URL` |
| `JwtSettings` | `JWT_` | `settings.jwt.SECRET_KEY` |
| `LogSettings` | `LOG_` | `settings.log.LEVEL` |
| `OtelSettings` | `OTEL_` | `settings.otel.ENABLED` |
| `BootstrapSettings` | `BOOTSTRAP_` | `settings.bootstrap.ENABLED` |
| `Settings` | 无 | `settings.DEBUG` |

### 规则

- 新增配置项时，优先归入已有子配置类。
- 业务代码统一通过 `settings` 读取配置，不要散落读取 `os.environ`。
- 安全相关约束尽量写进 `Settings` 校验逻辑，不要只靠 README 提醒。

---

## 9. 导入规范

### 同 package 内：相对导入

同一 package 内部模块互相导入时，使用相对导入：

```python
# ✅ 正确
from .consts import IamRedisKey
from .model import UserAccount

# ❌ 错误
from app.modules.iam.consts import IamRedisKey
from app.modules.iam.model import UserAccount
```

### 跨 package：优先公共接口

跨 package 导入时，优先通过目标 package 的公共导出：

```python
# ✅ 正确
from app.core import BusinessException, Result, settings
from app.modules import iam_router

# 谨慎使用：只有在公共接口未导出或需要规避循环依赖时
from app.modules.iam.errors import IamErrorCode
```

### `__init__.py` 维护

- 各 package 的 `__init__.py` 需要显式维护 `__all__`
- 对外暴露的公共符号通过 `__init__.py` 统一出口管理

---

## 10. 测试规范

### 测试分层

- 单元测试放 `tests/unit/`
- 集成测试放 `tests/integration/`
- 集成测试必须显式标记 `@pytest.mark.integration`

### 测试约束

- 新增核心业务时，至少补：
  - 一个单元测试，覆盖纯逻辑分支
  - 一个集成测试，覆盖真实 HTTP / DB / Redis 路径
- 集成测试优先复用 `tests/conftest.py` 中的：
  - `client`
  - `db_session`
  - `redis_for_assertions`
- 不要假设测试环境里已有预置数据；集成测试会在前后清理数据库与 Redis。

### 鉴权与权限测试

- 涉及 IAM 改动时，除了 happy path，还要覆盖：
  - 未登录
  - 权限不足
  - 租户 scope 不匹配
  - 会话失效或被撤销

---

## 11. 文档同步规范

- **项目规范变更**：同步更新
  - `backend/AGENTS.md`
  - `backend/CLAUDE.md`
- **启动方式、环境变量、测试命令变更**：同步更新
  - `backend/README.md`
  - `backend/README-zh.md`
- 不要让 `AGENTS.md`、`CLAUDE.md`、`README*` 长期描述不同的后端结构。
