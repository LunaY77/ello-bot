# Ello Bot

个人 LLM 应用平台，类似 OpenClaw，用于构建和管理个人 AI 工作流与对话应用。

## 项目结构

```
ello-bot/
├── backend/    # FastAPI 后端服务
└── frontend/   # React 前端（开发中）
```

## 快速开始

### 环境要求

- Python 3.12+ 和 [uv](https://docs.astral.sh/uv/)
- Node.js 18+ 和 [pnpm](https://pnpm.io/)
- Docker（用于 PostgreSQL）

### 1. 启动数据库

```bash
make docker-up
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 填写配置
```

### 3. 执行数据库迁移

```bash
make db-upgrade
```

### 4. 启动后端

```bash
make backend-run
```

### 5. 启动前端

```bash
make frontend-dev
```

### 所有可用命令

运行 `make help` 或参考下表。

| 命令 | 描述 |
|------|------|
| `make docker-up` | 通过 Docker Compose 启动 PostgreSQL |
| `make docker-down` | 停止并删除容器 |
| `make backend-run` | 启动 FastAPI 开发服务器（端口 8000） |
| `make backend-test` | 运行后端测试 |
| `make backend-lint` | Lint 并格式化后端代码 |
| `make frontend-dev` | 启动前端开发服务器 |
| `make frontend-build` | 构建前端生产版本 |
| `make db-upgrade` | 应用所有待执行的迁移 |
| `make db-migration msg="..."` | 生成新的迁移文件 |
| `make lint` | Lint 前后端代码 |
| `make format` | 格式化前后端代码 |

## License

Apache-2.0
