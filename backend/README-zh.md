# Ello Bot 后端

基于 FastAPI 构建的后端服务，为 Ello Bot（个人 LLM 应用平台）提供 API 支持。

## 技术栈

- **Web 框架**：FastAPI
- **ORM**：SQLAlchemy 2.x（同步）
- **数据库迁移**：Alembic
- **数据校验**：Pydantic v2
- **认证**：JWT（PyJWT + bcrypt）
- **日志**：Loguru
- **包管理**：uv

## 项目结构

```
app/
├── core/          # 核心基础设施（配置、数据库、异常、日志、Result）
├── model/         # SQLAlchemy ORM 模型
├── schema/        # Pydantic 请求/响应 Schema
├── repository/    # 数据访问层（CRUD）
├── service/       # 业务逻辑层
├── router/        # HTTP 路由层
└── utils/         # 工具函数（JWT、密码哈希）
```

## 快速开始

### 环境要求

- Python 3.12+
- uv

### 安装依赖

```bash
cd backend && uv sync
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp backend/.env.example backend/.env
```

关键配置项：

```env
DATABASE_URL=postgresql://user:password@localhost/ello_bot
SECRET_KEY=your-secret-key-here
DEBUG=false
```

### 数据库迁移

```bash
make db-upgrade
```

### 启动开发服务器

```bash
make backend-run
```

服务启动后访问 `http://localhost:8000/docs` 查看 API 文档。

## 运行测试

```bash
make backend-test
```

## 代码质量

```bash
make backend-lint    # lint + 格式化
make backend-check   # 仅 lint（不修复）
```

## 开发规范

参见 [CLAUDE.md](./CLAUDE.md)。
