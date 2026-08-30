# CRMEB API 接口文档

## 📍 API 入口划分
- **后台管理**: `/adminapi/controller/v1/` (需要管理员权限)
- **前端用户**: `/api/controller/v1/` (需要用户登录)
- **公共接口**: `/api/controller/publics/` (无需登录)

## 🔐 认证机制
```php
// JWT Token 认证
'middleware' => [
    AuthTokenMiddleware::class,  // 用户token验证
    AdminAuthTokenMiddleware::class  // 管理员token验证
]
```

## 📋 核心接口示例

### 用户管理接口
```
GET  /adminapi/v1/user/list      # 用户列表
POST /adminapi/v1/user/edit      # 编辑用户
GET  /api/v1/user/info          # 获取用户信息
```

### 订单管理接口  
```
GET  /adminapi/v1/order/list     # 订单列表
POST /api/v1/order/create       # 创建订单
GET  /api/v1/order/detail       # 订单详情
```

## 🏷️ 统一响应格式
```json
{
    "status": 200,
    "msg": "success", 
    "data": {...},
    "time": "2024-01-01 10:00:00"
}
```

## ⚠️ 错误码规范
- 200: 成功
- 400: 参数错误
- 401: 未授权
- 403: 权限不足  
- 500: 服务器错误

---

> **提示**：该文档由AI生成，仅供参考。
