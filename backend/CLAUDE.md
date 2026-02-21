# Backend 开发规范

本文档为 Ello Bot 后端开发的 AI 辅助编码规范，适用于所有 Claude 辅助开发场景。

---

## 1. 项目分层最佳实践

项目采用严格的四层架构，各层职责清晰，禁止跨层调用。

```
Router → Service → Repository → Model
```

### 各层职责

| 层级 | 目录 | 职责 |
|------|------|------|
| Router | `app/router/` | HTTP 请求/响应处理，调用 Service，返回 Result |
| Service | `app/service/` | 业务逻辑，错误码定义，调用 Repository |
| Repository | `app/repository/` | 数据库 CRUD，不含业务逻辑，不管理事务 |
| Model | `app/model/` | SQLAlchemy ORM 模型定义 |

### 规则

- **Router 层**：只负责 HTTP 层面的事情，不写业务逻辑，直接返回 `Result.ok(data=...)`
- **Service 层**：所有业务逻辑在此层，定义本模块的 `ErrorCode` 枚举，抛出 `BusinessException`
- **Repository 层**：只做数据库操作，**不 commit/rollback**（事务由 `get_db` 管理），可以 `flush()` 和 `refresh()`
- **Model 层**：只定义表结构，不含任何业务逻辑

```python
# ✅ 正确：Router 调用 Service，返回 Result
@router.post("/register")
def register(request: UserCreate, user_service: UserServiceDep):
    return Result.ok(data=user_service.register(request.username, request.password))

# ❌ 错误：Router 直接操作数据库
@router.post("/register")
def register(request: UserCreate, db: DbSession):
    user = db.query(User).filter(...).first()
```

---

## 2. 错误码最佳实践

### 错误码规范

| 前缀 | 含义 | 示例 |
|------|------|------|
| `A` | 参数校验错误 | `A0001` 参数校验失败 |
| `B` | 业务逻辑错误 | `B0001` 未授权访问 |
| `C` | 系统异常 | `C0001` 系统异常 |

### 定义规则

- **通用错误码**：定义在 `app/core/exception.py` 的 `CommonErrorCode` 中
- **业务错误码**：定义在对应的 `app/service/xxx.py` 中，紧邻使用它的 Service 类
- 每个业务模块的错误码编号**不得与其他模块重复**
- 抛出异常统一使用 `BusinessException`，不要直接抛出 `HTTPException`

```python
# ✅ 正确
raise BusinessException(UserErrorCode.USER_NOT_FOUND)

# ❌ 错误
raise HTTPException(status_code=404, detail="User not found")
```

---

## 3. Pydantic 最佳实践

### Schema 定义规范

- 所有 Schema 定义在 `app/schema/` 目录下
- 请求 Schema 和响应 Schema 分开定义，命名清晰
- 使用 `Field(...)` 添加描述和示例
- 使用 `@field_validator` 进行字段级校验，校验失败抛出 `ValueError`

```python
# ✅ 正确
class UserCreate(UserBase):
    password: str = Field(..., description="Password", examples=["password123"])

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not (6 <= len(v) <= 100):
            raise ValueError("Password must be between 6 and 100 characters")
        return v
```

### ORM 模型转换

- 响应 Schema 需要设置 `model_config = ConfigDict(from_attributes=True)` 以支持从 ORM 对象创建
- 使用 `Model.model_validate(orm_obj)` 进行转换，不要手动构造

```python
# ✅ 正确
class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# 使用
user_response = UserResponse.model_validate(user)
```

### 泛型响应

- 所有 API 响应统一使用 `Result[T]` 包装
- 成功：`Result.ok(data=...)`
- 失败：通过 `BusinessException` 触发，由全局异常处理器返回 `Result.fail(...)`

---

## 4. 依赖注入最佳实践

### 依赖定义规范

每个可注入的依赖都应提供一个 `Annotated` 类型别名，命名以 `Dep` 结尾：

```python
# ✅ 正确：在模块末尾定义 Dep 类型别名
def get_user_repository(db: DbSession) -> UserRepository:
    return UserRepository(db)

UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]
```

### 依赖链

```
DbSession (get_db)
  └── UserRepositoryDep (get_user_repository)
        └── UserServiceDep (get_user_service)
```

### 规则

- **不要在 Service/Repository 中直接导入 `SessionLocal`**，数据库会话只通过 `get_db` 注入
- **不要在 Router 中直接注入 `DbSession`**，数据库操作通过 Service 层进行
- 依赖工厂函数命名为 `get_xxx`，类型别名命名为 `XxxDep`

---

## 5. 导入规范（绝对导入）

**所有导入必须使用绝对路径，禁止相对导入。**

### 同一 package 内部

同一 package（如 `app/core/`）内的模块间导入，使用完整路径：

```python
# ✅ 正确：app/core/exception.py 导入 app/core/result.py
from app.core.result import Result
from app.core.logger import log

# ❌ 错误：相对导入
from .result import Result
```

### 跨 package 导入

跨 package 导入时，**必须通过目标 package 的 `__init__.py` 暴露的接口**导入：

```python
# ✅ 正确：通过 app.core 的 __init__.py 导入
from app.core import BusinessException, Result, log, settings

# ✅ 正确：通过 app.repository 的 __init__.py 导入
from app.repository import UserRepositoryDep

# ❌ 错误：绕过 __init__.py 直接导入内部模块
from app.core.exception import BusinessException
from app.repository.user import UserRepositoryDep
```

### 例外情况

仅在出现**循环依赖**时，允许直接导入内部模块（需在代码注释中说明原因）：

```python
# 避免循环依赖：app.core.__init__ 已导入 database，此处直接引用
from app.core.database import Base
```

### `__init__.py` 维护

每个 package 的 `__init__.py` 必须显式声明 `__all__`，只暴露对外的公共接口：

```python
# app/core/__init__.py
from app.core.exception import BusinessException, CommonErrorCode
from app.core.result import Result

__all__ = ["BusinessException", "CommonErrorCode", "Result"]
```
