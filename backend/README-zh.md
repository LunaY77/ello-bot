# Ello Bot 后端

基于 FastAPI 构建的后端服务，为 Ello Bot（个人 LLM 应用平台）提供 API 支持。

## 技术栈

- Python 3.12
- FastAPI
- SQLAlchemy 2.x 异步 ORM
- PostgreSQL
- Redis
- Alembic
- Pydantic v2 + pydantic-settings
- Loguru
- uv

## 目录结构

```text
app/
├── main.py              # FastAPI 应用、lifespan、自举、健康检查
├── core/                # 配置、数据库、Redis、认证、异常、日志、Result
├── modules/iam/         # 认证、租户、RBAC、ACL、Agent 管理
├── infra/               # 基础设施
├── static/              # 默认头像等静态资源
├── tools/scripts.py     # lint/check/gen-openapi
└── utils/               # 鉴权与安全相关工具
```

## 快速开始

### 1. 环境准备

- Python 3.12+
- `uv`
- Docker Desktop 或兼容的 Docker 运行环境

### 2. 启动本地 PostgreSQL 和 Redis

在仓库根目录执行：

```bash
make docker-dev-up
```

会启动：

- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`，密码 `12345678`

### 3. 安装 Python 依赖

```bash
cd backend
uv sync
```

### 4. 创建 `.env`

```bash
cp .env.example .env
```

如果你使用的是 `make docker-dev-up` 这套本地开发基础设施，请把连接配置改成：

```env
DEBUG=true
DB_URL=postgresql+asyncpg://ello:12345678@localhost:5432/ello
REDIS_URL=redis://:12345678@localhost:6379/0
BOOTSTRAP_ENABLED=true
BOOTSTRAP_ADMIN_PASSWORD=替换成管理员初始密码
```

注意：

- 当关闭调试模式且仍启用 bootstrap 时，`BOOTSTRAP_ADMIN_PASSWORD` 也必须显式配置。

### 5. 执行迁移并启动服务

在仓库根目录执行：

```bash
make backend-run
```

该命令会先执行 `alembic upgrade head`，再启动 Uvicorn。

### 6. 常用地址

- Swagger 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`
- 静态资源：`http://localhost:8000/static/...`

## 常用命令

在仓库根目录执行：

```bash
make backend-run
make backend-lint
make backend-check
make backend-test
make db-upgrade
make db-downgrade
```

生成 OpenAPI 文档：

```bash
cd backend
uv run gen-openapi
```

生成结果会写到仓库根目录的 `docs/api/openapi.json`。

## 测试说明

`make backend-test` 会使用 `docker-compose.test.yaml`，并运行：

- `tests/unit`
- `tests/integration`

集成测试使用独立的测试数据库和 Redis：

- PostgreSQL 主机端口：`5433`
- Redis 主机端口：`6380`

`tests/conftest.py` 负责测试环境变量、迁移执行、应用 lifespan，以及每个集成用例前后的状态清理。

## 后端协作约定

- Router 保持轻量，HTTP 处理尽量下沉到 `workflow.py`、`commands.py`、`queries.py`。
- 依赖注入优先使用 `DbSession`、`RedisDep`、`CurrentAuthDep`。
- API 统一返回 `Result[T]`，失败统一抛 `BusinessException` 或 `AuthException`。
- 不要依赖懒加载。IAM 模型大量关系使用了 `lazy="raise"`，查询时必须显式预加载。
- 进行 AI 辅助开发时，以 `backend/AGENTS.md` 作为后端约束的准绳。

## 相关文档

- `backend/AGENTS.md`
- `backend/docs/`
- 执行 `uv run gen-openapi` 后生成的 `docs/api/openapi.json`
