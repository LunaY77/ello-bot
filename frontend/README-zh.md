# Ello Bot 前端

Ello Bot 的 React + TypeScript 前端应用。

## 技术栈

- **框架**：React 19 + React Router 7
- **构建工具**：Vite 6
- **语言**：TypeScript（strict 模式）
- **数据请求**：TanStack Query + react-query-auth
- **状态管理**：Zustand
- **校验**：Zod + react-hook-form
- **样式**：Tailwind CSS
- **国际化**：i18next + react-i18next
- **API 类型/Schema**：Orval（OpenAPI 代码生成）

## 项目结构

```
src/
├── app/              # 应用壳、Provider、路由树
├── api/              # OpenAPI 生成的请求/响应模型与 schema
├── features/         # 业务模块（auth、users、chat）
├── components/       # 通用 UI 与布局组件
├── lib/              # 基础设施（api-client、auth、react-query、i18n）
├── store/            # 仅客户端全局状态（如 auth token）
├── config/           # 配置（paths、env）
└── locales/          # 默认语言资源
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 10+
- 后端 API 已启动（默认：`http://localhost:8000`）

### 安装依赖

```bash
cd frontend && pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp frontend/.env.example frontend/.env
```

关键配置项：

```env
VITE_APP_API_URL=http://localhost:8000/api
VITE_APP_ENABLE_API_MOCKING=false
VITE_APP_MOCK_API_PORT=8080
VITE_APP_URL=http://localhost:3000
```

### 启动开发服务

```bash
make frontend-dev
```

或：

```bash
cd frontend && pnpm run dev
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm run dev` | 启动 Vite 开发服务器 |
| `pnpm run build` | 类型检查并构建生产包 |
| `pnpm run preview` | 本地预览生产构建 |
| `pnpm run lint` | 执行 ESLint |
| `pnpm run lint:fix` | 执行 ESLint 并自动修复 |
| `pnpm run format` | 使用 Prettier 格式化代码 |
| `pnpm run check-types` | 执行 TypeScript 类型检查 |
| `pnpm run test` | 运行 Vitest |
| `pnpm run test:coverage` | 运行测试并生成覆盖率 |
| `pnpm run codegen:api` | 根据 OpenAPI 生成 API 模型/schema |
| `pnpm run i18n` | 执行 i18n 工作流并格式化产物 |

## API 契约同步

后端接口契约变更后执行：

```bash
make sync-api
```

或手动执行：

```bash
cd backend && uv run gen-openapi
cd frontend && pnpm run codegen:api
```

## 国际化流程

1. 修改 `src/locales/default/*.ts` 默认语言文件
2. 执行：

```bash
cd frontend && pnpm run i18n
```

命令会在 `frontend/locales/` 下生成对应语言 JSON 文件。

## 代码质量

```bash
make frontend-lint    # 格式化 + lint 修复
make frontend-check   # 仅 lint 检查
```

## 开发规范

参见 [AGENTS.md](./AGENTS.md)。
