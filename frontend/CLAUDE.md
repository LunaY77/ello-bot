# Frontend 开发规范

本文档为 Ello Bot 前端的 AI 辅助编码规范，适用于 `frontend/` 下所有 Claude 协作场景。

如何启动、构建、运行测试，请看 `frontend/README.md` 与 `frontend/README-zh.md`；本文件只讨论项目规范。

---

## 1. 项目结构

```text
frontend/
├── src/
│   ├── app/
│   │   ├── AppProvider.tsx      # 全局 Provider 组装
│   │   ├── AppRouter.tsx        # 路由树与 lazy route module
│   │   └── routes/              # route module
│   ├── api/
│   │   ├── models/              # Orval 生成的请求/响应模型
│   │   ├── schemas/             # Orval 生成的 Zod Schema
│   │   └── internal/            # codegen 后处理脚本与转换逻辑
│   ├── features/                # iam、chat 等业务模块
│   ├── components/              # 通用 UI、布局、错误边界、SEO、通知
│   ├── lib/                     # api-client、auth、react-query、i18n 等基础设施
│   ├── store/                   # Zustand 客户端状态
│   ├── config/                  # 环境变量与路由配置
│   ├── testing/                 # 测试辅助、provider 包装、query client
│   ├── locales/default/         # 默认文案源文件
│   └── utils/                   # 通用工具函数
├── e2e/                         # Playwright 用例与认证态 fixture
├── .storybook/                  # Storybook 配置
└── locales/                     # i18n workflow 生成的 JSON 产物
```

### 目录职责

| 目录              | 职责                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/`        | 应用壳、Provider、路由树、route module                                                                |
| `src/features/`   | 业务组件、业务 API hooks、业务交互逻辑；当前认证、用户、角色、权限、会话、workspace 都归入 `iam` 领域 |
| `src/components/` | 无业务归属的共享 UI 与布局                                                                            |
| `src/lib/`        | 跨业务基础设施能力                                                                                    |
| `src/store/`      | 仅存放客户端状态，不存放整块服务端实体数据                                                            |
| `src/api/`        | OpenAPI 生成物与生成辅助逻辑                                                                          |
| `src/testing/`    | Vitest 测试辅助                                                                                       |

---

## 2. 分层架构与单向依赖

```text
app/routes -> features -> lib/api-client -> backend api
          -> components/shared
          -> store
```

### 规则

- `src/app/` 只负责页面骨架、路由拼装、Provider 组装，不承载可复用业务实现。
- `src/features/` 是主要业务承载层，按领域拆分。
- `src/components/` 只放共享 UI 与布局，不放具体业务语义。
- `src/lib/` 放跨业务基础设施，例如鉴权、query、i18n、HTTP 客户端。
- `src/store/` 只保存客户端状态边界，不复制服务端查询数据。

### 依赖方向规则

根据当前 ESLint 约束，必须遵守：

- `features` 之间禁止互相导入内部实现。
- `features` 禁止导入 `app`。
- `components` / `hooks` / `lib` / `utils` 禁止导入 `features` 或 `app`。
- 路由字符串统一从 `src/config/paths.ts` 获取，禁止硬编码。

```tsx
// ✅ 正确：route 组装 feature
import { IamConsole } from '@/features/iam/components/IamConsole';

// ❌ 错误：feature 反向依赖 app route
import IamRoute from '@/app/routes/app/Iam';
```

---

## 3. 路由与页面规范

### Route Module 职责

- `src/app/routes/**` 中的 route module 负责：
  - 页面布局组装
  - 调用 feature hook / component
  - 跳转、search param、route-level UI
- 不要把可复用业务逻辑直接写死在 route module 里。

### 权限入口

- 受保护页面统一挂在 `/app` 下，并通过 `ProtectedRoute` 保护。
- 用户初始化由 `AuthLoader` 负责；页面本身不要重复写一套 viewer restore 流程。
- 登录成功后的跳转逻辑可以放 route module，但会话恢复逻辑应留在 `lib/auth`。

### 路由配置

- 所有 path / href 统一维护在 `src/config/paths.ts`。
- 新增路由时，同时更新：
  - `src/config/paths.ts`
  - `src/app/AppRouter.tsx`
  - 对应 route module 与 feature 暴露

### 路由目录分层

- `src/app/routes/app/assistant/` 只放 Assistant 主工作区页面。
- `src/app/routes/app/admin/` 只放后台管理页，例如 users、sessions、roles、permissions、agents。
- `src/app/routes/app/settings/` 放偏好与个人设置页，例如 profile、workspaces。
- `src/app/routes/app/legacy/` 只放兼容跳转或废弃入口，不再承载真实业务页面。

---

## 4. API 契约与 HTTP 规范

### OpenAPI 生成物

以下目录是生成物，禁止手写业务改动：

- `src/api/models/req/`
- `src/api/models/resp/`
- `src/api/schemas/`

如果后端接口契约变更：

- 重新生成模型与 schema
- 如生成规则需要调整，改 `src/api/internal/` 下的后处理逻辑，不要直接补丁生成文件

### HTTP 入口

- 所有业务 HTTP 请求统一通过 `src/lib/api-client.ts` 的 `api` 实例。
- 不要在 feature 内随意创建新的 axios 实例。
- `rawApi` 只用于 `api-client` 内部的 refresh 场景，业务代码不要直接复用。
- workspace / tenant CRUD 与列表能力统一收敛在 `src/features/iam/api/tenants.ts`，不要在 auth feature 内复制一套 tenant hooks。

### `api-client` 责任边界

- 注入 `Authorization: Bearer <accessToken>`
- 解包后端 `Result<T>`
- 401 时尝试一次 refresh
- refresh 失败时清空会话并跳转登录页
- 统一错误通知

业务 hook 不要重复实现上述逻辑。

---

## 5. React Query 规范

### Server State 边界

- 所有服务端数据优先交给 React Query。
- 不要把 viewer、users、tenants、roles、permissions 这类查询结果长期复制到 Zustand。

### Query / Mutation 组织

- 优先使用 `queryOptions` 工厂函数与 feature hook 封装。
- Query key 必须稳定，且包含影响结果的参数。
- 可复用 mutation 配置优先通过 `MutationConfig` 暴露扩展点。
- 成功后的缓存更新按语义选择：
  - `invalidateQueries`
  - `setQueryData`

### Query Key 约定

- 当前登录用户 key 固定为：`['authenticated-user']`
- IAM 相关 key 统一走 `src/features/iam/api/query-keys.ts`
- 不要在各组件中散落手写重复的 query key
- 登录态 mutation 如果会影响 admin/settings 数据面，应优先失效整个 `['iam']` 命名空间，而不是额外造一套 tenant query key。

---

## 6. 鉴权与 Zustand 状态规范

### 状态边界

- 当前 `user` store 只保存认证会话状态：
  - `accessToken`
  - `refreshToken`
- 持久化 key 为 `ELLO_AUTH_SESSION`

### Action 约定

- 登录、注册、刷新、切租户后统一调用 `setSession`
- 登出或认证失败后统一调用 `clearSession`
- 不要再引入旧式的 `token` / `setToken` 语义

### 访问方式

- React 组件内使用 store hook
- 非 React 上下文，例如 interceptor、auth config，使用 `getUserStoreState()`

### Store 结构

新增 store 功能时，沿用现有 slice 结构：

- `initial-state.ts`
- `action.ts`
- `selectors.ts`

不要把大块逻辑直接塞进 `store.ts`。

---

## 7. 表单、国际化与共享 UI 规范

### 表单与校验

- 表单优先复用共享 `Form` 组件和 `react-hook-form`
- 请求参数校验优先复用 `src/api/schemas/` 生成的 Zod Schema
- 不要在组件里手写一套与后端契约脱节的重复校验

### 国际化

- 所有用户可见文案必须走 i18n
- 默认文案源维护在 `src/locales/default/*.ts`
- 文案变更后，同步生成 `frontend/locales/` 产物
- 生成默认英文产物优先使用 `bash -lc 'pnpm run workflow:i18n'`
- 如果同时修改了 `zh-CN` 文案，补完后再运行 `prettier --write "locales/**"`

### 共享 UI

- 组件进入 `src/components/` 的前提是可跨 feature 复用
- 只被单一 feature 使用的 UI，优先留在该 feature 内
- 共享 UI 若已有 Storybook 覆盖，修改行为或视觉时要同步更新 stories
- 跨多个 admin 页面复用的目录/详情页 primitives 统一放在 `src/components/admin/`
- 当前 admin 共享 primitives 在 `src/components/admin/AccessPrimitives.tsx`

### Admin 页面约定

- Users、Sessions、Roles、Permissions、Agents 这类后台页优先使用 `左侧目录 + 右侧详情` 的 master-detail 结构。
- 创建动作应进入右侧详情面板，不要把长列表压到页面下方。
- 次级数据集要拆成独立工作区，例如 permission registry 与 ACL overrides 分上下两个区块。
- 左侧目录默认使用固定高度并在卡片内部滚动，避免长列表把右侧详情面板挤出可视区。
- 不要在一个页面里混入多个独立领域的 CRUD；如果 agent、permission、inspector 已经是不同任务，应拆成独立页面。
- 侧边导航只保留真实存在且有后端能力支持的页面，禁止保留死链或占位入口。
- Agents 是独立 admin 页面，Workspaces 是独立 settings 页面；不要再把它们塞回 permissions 或 dashboard 杂糅区域。

---

## 8. 导入、命名与文件组织规范

### 导入规范

- 跨目录导入优先使用 `@/` 别名
- 导入顺序遵循 ESLint：
  - `builtin`
  - `external`
  - `internal`
  - `parent`
  - `sibling`
  - `index`

### 命名规范

- `*.ts` 使用 kebab-case
- `*.tsx` 使用 PascalCase
- 目录名使用 kebab-case

### Feature 暴露边界

- 对外复用的 feature 能力通过 `index.ts` 暴露
- 跨目录不要深挖别的 feature 内部文件路径
- 如某能力需要被多个 feature 共享，应上提到 `lib`、`components` 或新建更合理的共享层

---

## 9. 测试规范

### Vitest

- Vitest 仅用于单元测试、组件测试、hook 测试、store 测试。
- `src/testing/setup-tests.ts` 会主动禁用网络访问。
- 任何依赖真实 HTTP 的测试，不应写成 Vitest。

### 测试辅助

- 组件测试优先使用 `renderWithProviders`
- Query 相关测试优先复用 `createTestQueryClient`
- 测试中不要绕过项目既有 provider 约束，避免出现与真实运行时不一致的行为

### Playwright

- 真实登录、鉴权、路由跳转、后端联动流程放在 `e2e/`
- 认证态用例复用 `auth.setup.ts` 与 `e2e/.auth/user.json`
- 如果需求依赖真实后端、副作用、跨页面流程，优先补 Playwright，而不是在 Vitest 里伪造过深的 mock

### Storybook

- 共享组件、复杂交互组件优先补充 `*.stories.tsx`
- Storybook 不是测试替代，但它是共享 UI 的重要文档与回归面

---

## 10. 文档同步规范

- **项目规范变更**：同步更新
  - `frontend/AGENTS.md`
  - `frontend/CLAUDE.md`
- **启动方式、环境变量、构建/测试命令变更**：同步更新
  - `frontend/README.md`
  - `frontend/README-zh.md`
- **接口契约变更**：同步更新生成物与必要的 feature 文档说明

不要让 `AGENTS.md`、`CLAUDE.md`、`README*` 长期描述不同的前端结构。
