# Frontend 开发规范

本文档为 Ello Bot 前端开发的 AI 辅助编码规范，适用于所有 Agent/Codex/Claude 辅助开发场景。

---

## 1. 项目分层最佳实践

项目采用前端分层与单向依赖，避免模块耦合与循环引用。

```
App(Route/Layout) → Feature(Component/API Hook) → lib/api-client → Backend API
                    ↘ Store(Zustand, client state only)
```

### 各层职责

| 层级      | 目录              | 职责                                                   |
| --------- | ----------------- | ------------------------------------------------------ |
| App       | `src/app/`        | 组装 Provider、路由、页面骨架与权限壳                  |
| Feature   | `src/features/*`  | 业务组件、业务 API hooks、业务交互逻辑                 |
| Shared UI | `src/components/` | 通用 UI 组件，不包含具体业务语义                       |
| Infra     | `src/lib/`        | `api-client`、`auth`、`react-query`、`i18n` 等基础能力 |
| Store     | `src/store/`      | 仅存放客户端全局状态（如 token、通知）                 |
| Config    | `src/config/`     | 路由与环境变量等配置                                   |

### 依赖方向规则（严格）

- `features` 之间禁止互相导入；可复用逻辑应上提到 `components/hooks/lib`
- `features` 禁止导入 `app`
- `components/hooks/lib/utils` 禁止导入 `features` 或 `app`
- 页面路由字符串统一从 `src/config/paths.ts` 获取，禁止硬编码

```tsx
// ✅ 正确：Feature 内调用本 Feature API hook
import { useUserProfile } from '@/features/users/api/get-user';

// ❌ 错误：Feature A 直接依赖 Feature B 内部实现
import { someInternalFn } from '@/features/auth/...';
```

---

## 2. OpenAPI 类型生成最佳实践

### 生成物目录

- 请求模型：`src/api/models/req/`
- 响应模型：`src/api/models/resp/`
- 请求 Zod Schema：`src/api/schemas/`

### 规则

- OpenAPI 相关模型与 schema **禁止手写/手改**，统一通过 codegen 生成
- 后端接口变更后，必须执行 `pnpm run codegen:api`
- 生成后再提交，确保模型、schema、格式化结果一致

```bash
pnpm run codegen:api
```

---

## 3. API 客户端最佳实践

### 统一入口

- 所有 HTTP 请求统一走 `src/lib/api-client.ts` 的 `api` 实例
- `api-client` 负责：
  - 注入 `Authorization: Bearer <token>`
  - 统一解包后端 `Result<T>`
  - 统一处理错误提示与 401 跳转

### 规则

- 业务 hook 不重复实现 401/token 清理逻辑
- API 层只做“请求与数据转换”，UI 跳转/页面交互放组件或 hook 的回调中处理

---

## 4. React Query 最佳实践

### 查询

- 使用 `queryOptions` 工厂函数 + `useQuery` 模式
- `queryKey` 必须稳定且包含影响结果的参数

### 变更

- 使用 `useMutation`
- 优先通过 `MutationConfig` 暴露可扩展回调
- 成功后按语义选择：`invalidateQueries` 或 `setQueryData`

### 认证缓存约定

- 当前登录用户缓存 key 固定为：`['authenticated-user']`

```ts
// ✅ 推荐：queryOptions 工厂
export const getUserQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => getUser({ userId }),
  });
```

---

## 5. 认证与状态管理最佳实践

### 状态边界

- Zustand `user` store 只保存客户端认证状态（当前为 `token`）
- 用户资料等服务端数据由 `react-query-auth`/React Query 管理，不放入 Zustand

### 规则

- 登录/注册成功后调用 `setToken`
- 登出或 401 时调用 `clearToken`
- 非 React 上下文（如 interceptor）通过 `getUserStoreState()` 访问 store
- 新增 store 功能时沿用 slice 结构：`initial-state.ts` + `action.ts` + `selectors.ts`

---

## 6. 路由与权限最佳实践

### 路由配置

- 路由路径统一维护在 `src/config/paths.ts`
- `src/app/AppRouter.tsx` 负责路由树与懒加载
- 受保护路由统一使用 `ProtectedRoute`

### 页面职责

- Route 页面负责组装布局与业务组件
- 复杂数据逻辑下沉到 `features/*/api` hooks

---

## 7. 表单、校验与国际化最佳实践

### 表单与校验

- 表单优先使用共享 `Form` 组件（`react-hook-form + zod`）
- 请求参数校验优先复用 `src/api/schemas/` 生成的 Zod Schema

### 国际化

- 所有用户可见文案必须走 i18n（`useTranslation`）
- 默认语言资源维护在 `src/locales/default/*.ts`
- 修改文案后运行：

```bash
pnpm run i18n
```

---

## 8. 导入与命名规范

- 跨目录导入优先使用 `@/` 别名
- 导入顺序遵循 ESLint：`builtin → external → internal → parent → sibling → index`
- 命名规范：
  - `*.ts` 使用 kebab-case
  - `*.tsx` 使用 PascalCase
  - 目录使用 kebab-case

---

## 9. 提交前自检清单

```bash
pnpm run lint
pnpm run check-types
pnpm run test
pnpm run build
```

按变更内容补充执行：

```bash
# 接口契约变更后
pnpm run codegen:api

# 文案/i18n 变更后
pnpm run i18n
```
