# Backend 开发规范

本文档为 Ello Bot 后端开发的 AI 辅助编码规范，适用于所有 Claude 辅助开发场景。

---

## 1. 项目结构

```
backend/
├── app/
│   ├── __init__.py              # __app_name__, __version__
│   ├── main.py                  # FastAPI 入口、lifespan、middleware、routes
│   ├── core/                    # 框架层：配置、数据库、Redis、OTel、认证、异常、日志
│   │   ├── config.py            # Settings（多子配置类：ServerSettings, DatabaseSettings, ...）
│   │   ├── database.py          # SQLAlchemy engine、SessionLocal、Base
│   │   ├── redis.py             # Redis 客户端、RedisKeyDef、RedisDep
│   │   ├── observability.py     # OpenTelemetry 初始化（TracerProvider + instrument）
│   │   ├── logger.py            # Loguru 配置 + OTel trace_id/span_id 注入
│   │   ├── auth.py              # require_auth 依赖 + token 白名单校验
│   │   ├── exception.py         # ErrorCode、CommonErrorCode、BusinessException、全局异常处理器
│   │   ├── schema.py            # Result[T]、ApiModel 基类
│   │   └── __init__.py          # 公共导出
│   ├── modules/                 # 业务模块
│   │   ├── auth/                # 认证模块（login、register）
│   │   │   ├── consts.py        # AuthRedisKey
│   │   │   ├── commands.py      # AuthCommands（业务逻辑）
│   │   │   ├── schemas.py       # AuthResponse、LoginRequest、RegisterRequest
│   │   │   └── router.py        # /api/auth/*
│   │   └── users/               # 用户模块（用户信息、密码、头像、登出）
│   │       ├── consts.py        # UserErrorCode
│   │       ├── model.py         # User ORM 模型
│   │       ├── commands.py      # UserCommands（写操作）
│   │       ├── queries.py       # UserQueries（读操作）
│   │       ├── schemas.py       # UserInfoResponse、请求 Schema
│   │       ├── router.py        # /api/users/*
│   │       └── __init__.py      # 公共导出
│   └── utils/                   # 工具函数（密码哈希、JWT 编解码）
├── alembic/                     # 数据库迁移
├── tests/                       # 测试
└── pyproject.toml               # 依赖、脚本、工具配置
```

### 模块文件约定

每个业务模块（`modules/{name}/`）应包含：

| 文件 | 职责 |
|------|------|
| `consts.py` | 常量：ErrorCode 枚举、RedisKey 定义 |
| `model.py` | SQLAlchemy ORM 模型 |
| `schemas.py` | Pydantic 请求/响应 Schema |
| `commands.py` | 写操作业务逻辑（注入 DbSession + RedisDep） |
| `queries.py` | 读操作业务逻辑（注入 DbSession） |
| `router.py` | FastAPI Router，只做请求解析和 Result 包装 |
| `__init__.py` | 对外公共导出 + `__all__` |

---

## 2. 分层架构

```
Router → Commands/Queries → Model
```

### 规则

- **Router 层**：只负责 HTTP 层面的事情，不写业务逻辑，直接返回 `Result.ok(data=...)`
- **Commands/Queries 层**：所有业务逻辑在此层，通过构造器注入 `DbSession`、`RedisDep` 等依赖
- **Model 层**：只定义表结构，不含任何业务逻辑

```python
# ✅ 正确：Router 调用 Commands，返回 Result
@router.post("/register")
def register(request: RegisterRequest, commands: AuthCommandsDep):
    return Result.ok(data=commands.register(request.username, request.password))

# ❌ 错误：Router 直接操作数据库
@router.post("/register")
def register(request: RegisterRequest, db: DbSession):
    user = db.query(User).filter(...).first()
```

---

## 3. 错误码最佳实践

### 错误码格式

- **5 位字符**：来源码（1位）+ 编号（4位）
- **来源码**：
    - `A`：基础/框架层（`CommonErrorCode`）
    - `B`：业务层（各业务模块）
    - `C`：第三方/外部系统

### 编号规则

- 范围：`0001-9999`
- 步长：**100**（预留扩展空间）
- 示例：`B0001`, `B0101`, `B0201`

### 业务域号段分配

按业务域以 100 为间隔划分号段：

| 号段    | 业务域       |
| ------- | ------------ |
| `B01xx` | 用户基础操作 |
| `B02xx` | 用户高级操作 |
| `B03xx` | 用户权限     |
| `B11xx` | 订单基础操作 |
| `B12xx` | 订单支付操作 |

> 新增业务域时，选择未被占用的百位号段，并在此表中登记。

### ⚠️ 错误码操作必须使用 `/errorcode` Skill

**凡涉及错误码的任何操作（查询、新增、分配号段），必须调用 `/errorcode` skill，禁止直接修改文件或凭记忆操作。**

```
/errorcode list                        # 查看所有错误码
/errorcode check "描述"                # 新增前先检查是否可复用
/errorcode allocate <domain>           # 为新业务域分配号段
/errorcode add <domain> <code> <name> <message>  # 添加新错误码
```

### 定义位置

- **通用错误码**：定义在 `app/core/exception.py` 的 `CommonErrorCode` 中
- **业务错误码**：定义在对应模块的 `consts.py` 中（如 `modules/users/consts.py`）
- 抛出异常统一使用 `BusinessException`，不要直接抛出 `HTTPException`

```python
# ✅ 正确
raise BusinessException(UserErrorCode.USER_NOT_FOUND)

# ❌ 错误
raise HTTPException(status_code=404, detail="User not found")
```

---

## 4. Redis 最佳实践

### RedisKeyDef 框架

所有 Redis key 使用 `RedisKeyDef`（定义在 `app/core/redis.py`）声明，禁止在业务代码中硬编码 key 字符串。

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class RedisKeyDef:
    pattern: str                    # 含 {} 占位符的 key 模板
    expire_seconds: int | None      # TTL（秒），None 表示不过期
    description: str = ""           # 用途说明

    def key(self, *args) -> str:    # 格式化得到完整 key
        return self.pattern.format(*args)
```

### Key 命名规范

- 根前缀：`ello:`
- 结构：`ello:{module}:{domain}:{pattern}`
- 示例：`ello:auth:token:active:{jti}`

### 定义位置

每个模块在 `consts.py` 中定义自己的 RedisKey class：

```python
# modules/auth/consts.py
from app.core.config import settings
from app.core.redis import RedisKeyDef

class AuthRedisKey:
    """ello:auth:* key namespace."""

    ACTIVE_TOKEN = RedisKeyDef(
        "ello:auth:token:active:{}",
        expire_seconds=settings.jwt.EXPIRE_MINUTES * 60,
        description="Active JWT token whitelist (synced with JWT TTL)",
    )
```

### 使用方式

```python
# 写入
key_def = AuthRedisKey.ACTIVE_TOKEN
assert key_def.expire_seconds is not None
self.redis.setex(key_def.key(jti), key_def.expire_seconds, str(user.id))

# 读取
exists = self.redis.exists(AuthRedisKey.ACTIVE_TOKEN.key(jti))

# 删除（如 logout）
self.redis.delete(AuthRedisKey.ACTIVE_TOKEN.key(jti))
```

### Redis 依赖注入

Commands/Queries 通过构造器注入 `RedisDep`，**不要在业务代码中直接 import `redis_client`**：

```python
import redis as _redis
from app.core.redis import RedisDep

class UserCommands:
    def __init__(self, db: DbSession, redis: _redis.Redis) -> None:
        self.db = db
        self.redis = redis

def get_user_commands(db: DbSession, redis: RedisDep) -> UserCommands:
    return UserCommands(db, redis)

UserCommandsDep = Annotated[UserCommands, Depends(get_user_commands)]
```

> 例外：`core/auth.py` 中的 `require_auth` 是框架级依赖，可以直接使用 `redis_client`。

---

## 5. 配置最佳实践

### 多子配置类结构

配置按职责拆分为多个 `BaseSettings` 子类，每个子类通过 `env_prefix` 映射对应的环境变量：

| 子配置类 | env_prefix | 访问方式 |
|---------|-----------|---------|
| `ServerSettings` | `SERVER_` | `settings.server.HOST` |
| `DatabaseSettings` | `DB_` | `settings.db.URL` |
| `CacheSettings` | `REDIS_` | `settings.cache.URL` |
| `JwtSettings` | `JWT_` | `settings.jwt.SECRET_KEY` |
| `LogSettings` | `LOG_` | `settings.log.LEVEL` |
| `OtelSettings` | `OTEL_` | `settings.otel.ENABLED` |
| `Settings`（顶层） | 无 | `settings.DEBUG`, `settings.APP_NAME` |

新增配置项时，归入对应的子配置类，或新建子类。

---

## 6. Pydantic 最佳实践

### Schema 定义规范

- 所有 Schema 定义在模块的 `schemas.py` 中
- 请求 Schema 和响应 Schema 分开定义，命名清晰
- 使用 `Field(...)` 添加描述和示例和简单的校验
- 优先使用 pydantic v2 内置的约束类型（如 `HttpUrl`、`EmailStr` 等）进行字段约束
- 若 pydantic v2 内置的约束类型无法满足需求，再使用自定义约束, 使用 `Annotated` + `StringConstraints`，**不使用 `@field_validator`**

```python
from typing import Annotated
from pydantic import StringConstraints

UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=50)]
Password = Annotated[str, StringConstraints(min_length=6, max_length=100)]

class UserCreate(UserBase):
    password: Password = Field(..., description="Password", examples=["password123"])
```

### ORM 模型转换

- 响应 Schema 需要设置 `model_config = ConfigDict(from_attributes=True)` 以支持从 ORM 对象创建
- 使用 `Model.model_validate(orm_obj)` 进行转换，不要手动构造

### 泛型响应

- 所有 API 响应统一使用 `Result[T]` 包装
- 成功：`Result.ok(data=...)`
- 失败：通过 `BusinessException` 触发，由全局异常处理器返回 `Result.fail(...)`

---

## 7. 依赖注入最佳实践

### 依赖定义规范

每个可注入的依赖都应提供一个 `Annotated` 类型别名，命名以 `Dep` 结尾：

```python
def get_user_commands(db: DbSession, redis: RedisDep) -> UserCommands:
    return UserCommands(db, redis)

UserCommandsDep = Annotated[UserCommands, Depends(get_user_commands)]
```

### 依赖链

```
DbSession (get_db)
RedisDep (get_redis)
  └── UserCommandsDep (get_user_commands)
        └── 注入到 Router
```

### 规则

- **不要在 Commands/Queries 中直接导入 `SessionLocal` 或 `redis_client`**，通过构造器注入
- **不要在 Router 中直接注入 `DbSession` 或 `RedisDep`**，通过 Commands/Queries 层间接使用
- 依赖工厂函数命名为 `get_xxx`，类型别名命名为 `XxxDep`

---

## 8. 导入规范

### 同一 package 内部：使用相对导入

同一 package（如 `app/core/`、`app/modules/users/`）内的模块间导入，使用相对导入：

```python
# ✅ 正确：app/core/auth.py 导入同 package 下的模块
from .database import DbSession
from .exception import AuthException, CommonErrorCode
from .redis import redis_client

# ✅ 正确：app/modules/users/commands.py 导入同 package 下的模块
from .consts import UserErrorCode
from .model import User

# ❌ 错误：同 package 内使用绝对导入
from app.core.database import DbSession
from app.modules.users.consts import UserErrorCode
```

### 跨 package 导入：通过 `__init__.py` 公共接口

跨 package 导入时，**必须通过目标 package 的 `__init__.py` 暴露的接口**导入：

```python
# ✅ 正确：通过 app.core 的 __init__.py 导入
from app.core import BusinessException, Result, log, settings

# ✅ 正确：通过 app.modules.users 的 __init__.py 导入
from app.modules.users import User, UserErrorCode

# ❌ 错误：绕过 __init__.py 直接导入内部模块
from app.core.exception import BusinessException
from app.modules.users.model import User
```

### 例外情况

1. **避免循环依赖**时，允许跨 package 直接导入内部模块（需用 `TYPE_CHECKING` 或函数内延迟导入）：

```python
# core/auth.py 需要引用 modules 中的类型，用 TYPE_CHECKING 避免循环
if TYPE_CHECKING:
    from app.modules.users import User

def require_auth(...) -> User:
    from app.modules.users import User  # 延迟导入
```

2. **core 内部子模块互相引用**时（如 `auth.py` → `redis.py`），使用相对导入即可，不经过 `__init__.py`。

### `__init__.py` 维护

每个 package 的 `__init__.py` 必须显式声明 `__all__`，只暴露对外的公共接口：

```python
# app/modules/users/__init__.py
from .consts import UserErrorCode
from .model import User
from .schemas import UserInfoResponse, UserName, Password

__all__ = ["UserErrorCode", "User", "UserInfoResponse", "UserName", "Password"]
```
