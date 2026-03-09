# Ello Bot

个人 LLM 应用平台，类似 OpenClaw，用于构建和管理个人 AI 工作流与对话应用。

## 项目结构

```
ello-bot/
├── backend/    # FastAPI 后端服务
└── frontend/   # React 前端
```

## 快速开始

### 环境要求

- Python 3.12+ 和 [uv](https://docs.astral.sh/uv/)
- Node.js 18+ 和 [pnpm](https://pnpm.io/)
- Docker

### 安装依赖和 Git Hooks

```bash
make setup
```

---

## 模式一 — Local（一键启动，全部容器化）

所有服务均在容器中运行，`make setup` 之后无需本地 Python/Node 环境。

```bash
# 构建镜像、执行迁移、启动所有服务
make docker-local-up
```

启动后访问：

| 服务     | 地址                   |
| -------- | ---------------------- |
| 前端     | http://localhost:3000  |
| 后端     | http://localhost:8000  |

```bash
make docker-local-logs   # 查看日志
make docker-local-down   # 停止并删除 volumes
make docker-local-reset  # 清空重启（会重新执行迁移）
```

---

## 模式二 — Dev（本地运行服务，Docker 提供基础设施）

后端和前端本地运行，支持热重载和调试器。Docker 仅提供 PostgreSQL 和 Redis。

### 1. 启动基础设施

```bash
make docker-dev-up
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填写 DB_URL、JWT_SECRET_KEY 等配置
```

### 3. 执行数据库迁移

```bash
make db-upgrade
```

### 4. 启动后端和前端

```bash
# 分别在两个终端中执行：
make backend-run    # http://localhost:8000
make frontend-dev   # http://localhost:3000
```

```bash
make docker-dev-down     # 停止基础设施并删除 volumes
make docker-dev-reset    # 清空并重启基础设施
```

### 可选：开启分布式追踪

```bash
make docker-dev-obs-up   # 启动基础设施 + Jaeger + OTEL Collector
# 在 backend/.env 中设置 OTEL_ENABLED=true，然后 make backend-run
# Jaeger UI：http://localhost:16686
make docker-dev-obs-down
```

---

## 所有命令

```bash
make help
```

| 命令                           | 描述                                         |
| ------------------------------ | -------------------------------------------- |
| `make setup`                   | 安装所有依赖和 Git Hooks                     |
| **Docker — Local 全栈**        |                                              |
| `make docker-local-up`         | 构建镜像、执行迁移、启动所有服务             |
| `make docker-local-down`       | 停止并删除 Local 栈 volumes                  |
| `make docker-local-logs`       | 查看 Local 栈日志                            |
| `make docker-local-reset`      | 清空 volumes 并重启（重新执行迁移）          |
| **Docker — Dev 基础设施**      |                                              |
| `make docker-dev-up`           | 启动 postgres + redis（供本地开发使用）      |
| `make docker-dev-down`         | 停止并删除 Dev 基础设施 volumes              |
| `make docker-dev-logs`         | 查看 Dev 基础设施日志                        |
| `make docker-dev-reset`        | 清空并重启 Dev 基础设施                      |
| **Docker — 可观测性**          |                                              |
| `make docker-obs-up`           | 启动 Jaeger + OTEL Collector                 |
| `make docker-obs-down`         | 停止可观测性栈                               |
| `make docker-obs-logs`         | 查看可观测性日志                             |
| **Docker — 组合**              |                                              |
| `make docker-dev-obs-up`       | 启动 Dev 基础设施 + 可观测性（本地 tracing） |
| `make docker-dev-obs-down`     | 停止 Dev 基础设施 + 可观测性                 |
| **后端**                       |                                              |
| `make backend-run`             | 启动 FastAPI 开发服务器（端口 8000）         |
| `make backend-lint`            | Ruff lint（修复）+ 格式化                    |
| `make backend-check`           | Ruff lint（仅检查）                          |
| `make backend-test`            | 运行后端测试                                 |
| **前端**                       |                                              |
| `make frontend-dev`            | 启动前端开发服务器（端口 3000）              |
| `make frontend-build`          | 构建前端生产版本                             |
| `make frontend-lint`           | Prettier 格式化 + ESLint 修复                |
| `make frontend-check`          | ESLint 检查                                  |
| **数据库**                     |                                              |
| `make db-upgrade`              | 应用所有待执行的迁移                         |
| `make db-downgrade`            | 回滚一个迁移                                 |
| `make db-migration msg="..."`  | 生成新的迁移文件                             |
| `make db-migrate msg="..."`    | 生成并立即应用迁移                           |
| **组合**                       |                                              |
| `make lint`                    | Lint + 格式化前后端代码                      |
| `make check`                   | 检查前后端代码                               |
| `make sync-api`                | 生成 OpenAPI 规范并同步前端客户端代码        |

## License

Apache-2.0
