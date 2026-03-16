# Ello Bot 前端

Ello Bot 的前端使用 React 19 + TypeScript 构建。当前应用是一个基于 Vite 的 SPA，包含公开的落地页与认证页，以及受保护的 `/app` 路由，覆盖 dashboard、users、profile 和 IAM 管理界面。

## 技术栈

- React 19
- React Router 7
- TypeScript 严格模式
- Vite 6
- TanStack Query + `react-query-auth`
- Zustand
- Axios
- Tailwind CSS
- Zod + `react-hook-form`
- i18next + `react-i18next`
- Orval OpenAPI 代码生成
- Vitest、Playwright、Storybook

## 目录结构

```text
src/
├── app/                  # 应用壳、Provider、route module
├── api/                  # OpenAPI 生成的模型、schema、operation contract 与 runtime helper
├── features/             # auth、users、iam、chat
├── components/           # 通用 UI、布局、通知、错误边界
├── lib/                  # api-client、auth、react-query、i18n
├── store/                # 持久化的认证会话状态
├── config/               # 环境变量与路由配置
├── testing/              # Vitest 测试辅助与 Provider 包装
└── locales/              # 默认语言资源
```

`src/` 之外还需要关注：

- `e2e/`：Playwright 用例
- `.storybook/`：Storybook 配置
- `locales/`：i18n 工作流生成的 JSON 产物

## 快速开始

### 1. 环境要求

- Node.js 18+
- pnpm 10+
- 本地可访问的后端 API

### 2. 安装依赖

```bash
cd frontend
pnpm install
```

### 3. 创建 `.env`

```bash
cp .env.example .env
```

默认配置为：

```env
VITE_APP_API_URL=http://localhost:8000/api
VITE_APP_URL=http://localhost:3000
```

### 4. 启动开发服务器

在仓库根目录执行：

```bash
make frontend-dev
```

或直接执行：

```bash
cd frontend
pnpm run dev
```

Vite 开发服务器默认运行在 `http://localhost:3000`，并把 `/api`、`/static` 代理到 `VITE_APP_API_URL` 对应的后端 origin。

## 常用命令

在仓库根目录执行：

```bash
make frontend-dev
make frontend-build
make frontend-check
make frontend-lint
make frontend-test-unit
make frontend-test-e2e
```

在 `frontend/` 目录执行：

```bash
pnpm run dev
pnpm run build
pnpm run preview
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run check-types
pnpm run test
pnpm run test:unit
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run storybook
pnpm run build-storybook
pnpm run codegen:api
pnpm run i18n
```

## 认证与数据流

- 客户端通过 Zustand 持久化 `accessToken` 和 `refreshToken`，存储 key 为 `ELLO_AUTH_SESSION`。
- `src/lib/api-client.ts` 会自动附加 access token。
- 遇到 401 时会尝试使用 refresh token 刷新一次会话。
- 刷新失败后会清空本地会话并跳转登录页。
- viewer 这类服务端数据由 React Query 和 `react-query-auth` 管理，不整体塞进 Zustand。

## API 契约同步

后端接口变更后执行：

```bash
make sync-api
```

手动流程：

```bash
cd backend && uv run gen-openapi
cd frontend && pnpm run codegen:api
```

`pnpm run codegen:api` 现在会统一完成下面几步：

- 通过 Orval 生成请求模型、响应模型和请求体 Zod Schema
- 生成 `src/api/operations/` 下的 operation contract，输出稳定的 `id`、`method`、`path`
- 统一修正公共 barrel，确保 `Result` 这类后处理产物也能从公开入口导出
- 在格式化前校验公开入口是否完整

下面这些目录都视为生成物，不要手改：

- `src/api/models/req/`
- `src/api/models/resp/`
- `src/api/schemas/`
- `src/api/operations/`

前端代码应通过这些公共入口消费生成契约，而不是 deep import：

- `@/api/models/req`
- `@/api/models/resp`
- `@/api/schemas`
- `@/api/operations`

手写 feature wrapper 仍然放在 `src/features/**/api` 和 `src/lib/auth`，业务行为也保留在那里，但请求 path / method 必须通过 `@/api/runtime` 组合 generated operation contract 与共享 Axios client。

## 测试策略

### Vitest

- 使用 `jsdom`
- `src/testing/setup-tests.ts` 会主动禁止网络访问
- 适合组件、hook、store 和纯 UI 行为测试

### Playwright

- 负责依赖真实 HTTP 和真实后端的流程
- `make frontend-test-e2e` 会先通过 `docker-compose.test.yaml` 启动后端 E2E 测试栈
- 前端测试服务器运行在 `3000` 端口
- 后端 E2E API 暴露在 `http://localhost:8001/api`

### Storybook

- 本地启动：`pnpm run storybook`
- 构建静态文档：`pnpm run build-storybook`

## i18n 流程

1. 修改 `src/locales/default/` 下的默认文案
2. 执行：

```bash
cd frontend
pnpm run i18n
```

生成的语言 JSON 会写入 `frontend/locales/`。

## 前端协作约定

- route module 保持轻量，业务逻辑尽量下沉到 feature hook 或组件中。
- 路由跳转统一使用 `src/config/paths.ts`。
- 进行 AI 辅助开发时，以 `frontend/AGENTS.md` 作为前端约束的准绳。
