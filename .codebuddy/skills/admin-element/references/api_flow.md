# Admin-Element 接口请求流程文档

## 1 API 请求流程概述

Admin-Element 项目的 API 请求流程遵循以下步骤：

1. **接口定义**: 在 `src/api/` 目录下按模块定义 API 接口
2. **请求封装**: 使用 `axios` 封装网络请求，添加拦截器
3. **接口调用**: 在组件或业务逻辑中调用 API 接口
4. **响应处理**: 统一处理 API 响应，包括成功和失败情况
5. **错误处理**: 统一处理网络错误、业务错误等异常情况
6. **数据管理**: 将获取的数据存储到状态管理或组件中

## 2 网络请求封装

### 2.1 axios 实例创建

在 `src/utils/request.js` 中创建 axios 实例并配置：

```javascript
import axios from 'axios'
import { Message, Loading } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// 创建 axios 实例
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // API 基础路径
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})
```

### 2.2 请求拦截器

```javascript
// 请求拦截器
service.interceptors.request.use(
  config => {
    // 显示加载动画
    if (config.loading !== false) {
      store.dispatch('app/showLoading')
    }
    
    // 自动添加 token
    if (store.getters.token) {
      config.headers['Authorization'] = `Bearer ${getToken()}`
    }
    
    return config
  },
  error => {
    // 隐藏加载动画
    store.dispatch('app/hideLoading')
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)
```

### 2.3 响应拦截器

```javascript
// 响应拦截器
service.interceptors.response.use(
  response => {
    // 隐藏加载动画
    store.dispatch('app/hideLoading')
    
    const res = response.data
    
    // 检查响应状态
    if (res.code !== 200) {
      // 显示错误消息
      Message.error({
        message: res.message || '操作失败',
        duration: 3000
      })
      
      // 处理 token 过期等特殊情况
      if (res.code === 401) {
        // 跳转到登录页面
        store.dispatch('user/logout').then(() => {
          location.reload()
        })
      }
      
      return Promise.reject(new Error(res.message || '操作失败'))
    } else {
      return res
    }
  },
  error => {
    // 隐藏加载动画
    store.dispatch('app/hideLoading')
    
    // 处理网络错误
    let message = '网络请求失败'
    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          // 跳转到登录页面
          store.dispatch('user/logout').then(() => {
            location.reload()
          })
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求地址不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = `请求失败 (${status})`
      }
    } else if (error.message.includes('timeout')) {
      message = '请求超时'
    }
    
    // 显示错误消息
    Message.error({
      message: message,
      duration: 3000
    })
    
    return Promise.reject(error)
  }
)

export default service
```

## 3 API 接口定义

### 3.1 接口文件组织

API 接口按模块组织，存放在 `src/api/` 目录下：

```
src/api/
├── index.js          # API 入口文件
├── user.js           # 用户相关接口
├── goods.js          # 商品相关接口
├── order.js          # 订单相关接口
└── ...               # 其他模块接口
```

### 3.2 接口定义示例

在 `src/api/user.js` 中定义用户相关接口：

```javascript
import request from '@/utils/request'

export default {
  // 登录
  login(data) {
    return request({
      url: '/admin/login',
      method: 'post',
      data
    })
  },
  
  // 获取用户信息
  getUserInfo() {
    return request({
      url: '/admin/user/info',
      method: 'get'
    })
  },
  
  // 获取用户列表
  getUserList(params) {
    return request({
      url: '/admin/user/list',
      method: 'get',
      params
    })
  },
  
  // 修改用户信息
  updateUser(data) {
    return request({
      url: '/admin/user/update',
      method: 'put',
      data
    })
  },
  
  // 删除用户
  deleteUser(id) {
    return request({
      url: `/admin/user/delete/${id}`,
      method: 'delete'
    })
  }
}
```

### 3.3 API 入口文件

在 `src/api/index.js` 中导出所有 API 模块：

```javascript
import user from './user'
import goods from './goods'
import order from './order'

// 导出 API 模块
export default {
  user,
  goods,
  order
}
```

## 4 请求和响应处理

### 4.1 请求参数处理

#### 4.1.1 GET 请求

```javascript
// 带查询参数的 GET 请求
api.user.getUserList({
  page: 1,
  limit: 10,
  keyword: 'test'
})
```

#### 4.1.2 POST 请求

```javascript
// 带请求体的 POST 请求
api.user.login({
  username: 'admin',
  password: '123456'
})
```

#### 4.1.3 PUT 请求

```javascript
// 带请求体的 PUT 请求
api.user.updateUser({
  id: 1,
  username: 'newadmin',
  nickname: '新管理员'
})
```

#### 4.1.4 DELETE 请求

```javascript
// 路径参数的 DELETE 请求
api.user.deleteUser(1)
```

### 4.2 响应数据结构

后端 API 响应数据结构应遵循以下规范：

```javascript
{
  "code": 200, // 状态码，200 表示成功
  "message": "操作成功", // 响应消息
  "data": { ... } // 响应数据
}
```

### 4.3 响应处理示例

```javascript
// 在组件中调用 API
import api from '@/api'

export default {
  methods: {
    async fetchUserList() {
      try {
        const res = await api.user.getUserList({
          page: this.page,
          limit: this.limit
        })
        
        // 处理成功响应
        this.userList = res.data.list
        this.total = res.data.total
      } catch (error) {
        // 错误已在拦截器中处理，这里可以做额外处理
        console.error('获取用户列表失败:', error)
      }
    }
  }
}
```

## 5 错误处理机制

### 5.1 网络错误

- 网络连接失败
- 请求超时
- 服务器无响应

### 5.2 业务错误

- 参数错误 (400)
- 未授权 (401)
- 拒绝访问 (403)
- 请求地址不存在 (404)
- 服务器内部错误 (500)

### 5.3 业务逻辑错误

- 状态码非 200 的响应
- 业务规则验证失败

### 5.4 错误处理最佳实践

1. **统一错误处理**: 在响应拦截器中统一处理错误
2. **友好的错误提示**: 向用户显示清晰的错误消息
3. **错误日志记录**: 记录错误信息，便于排查问题
4. **特殊错误处理**: 对 token 过期等特殊情况进行处理
5. **降级处理**: 网络错误时提供合理的降级方案

## 6 接口调用最佳实践

### 6.1 使用 async/await

```javascript
async fetchData() {
  try {
    const res = await api.goods.getGoodsList(this.queryParams)
    this.goodsList = res.data.list
    this.total = res.data.total
  } catch (error) {
    // 错误处理
  }
}
```

### 6.2 加载状态管理

```javascript
export default {
  data() {
    return {
      loading: false,
      goodsList: []
    }
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const res = await api.goods.getGoodsList(this.queryParams)
        this.goodsList = res.data.list
      } catch (error) {
        // 错误处理
      } finally {
        this.loading = false
      }
    }
  }
}
```

### 6.3 防抖和节流

对于频繁触发的请求，使用防抖或节流优化：

```javascript
import { debounce } from 'lodash'

export default {
  methods: {
    // 使用防抖优化搜索请求
    search: debounce(async function(query) {
      try {
        const res = await api.goods.searchGoods({ keyword: query })
        this.searchResults = res.data
      } catch (error) {
        // 错误处理
      }
    }, 300)
  }
}
```

### 6.4 请求取消

对于可能重复触发的请求，使用取消令牌避免重复请求：

```javascript
import axios from 'axios'

export default {
  data() {
    return {
      cancelToken: null
    }
  },
  methods: {
    async fetchData() {
      // 取消之前的请求
      if (this.cancelToken) {
        this.cancelToken.cancel('取消重复请求')
      }
      
      // 创建新的取消令牌
      this.cancelToken = axios.CancelToken.source()
      
      try {
        const res = await api.goods.getGoodsList({
          page: this.page,
          limit: this.limit
        }, {
          cancelToken: this.cancelToken.token
        })
        this.goodsList = res.data.list
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log('请求已取消:', error.message)
        } else {
          // 错误处理
        }
      }
    }
  }
}
```

## 7 接口安全

### 7.1 认证与授权

- 使用 JWT 令牌进行身份认证
- 请求头中携带 Authorization 字段
- 定期刷新令牌，避免过期

### 7.2 数据加密

- 敏感数据传输加密
- 密码等敏感信息使用 HTTPS 传输

### 7.3 防止 CSRF 攻击

- 使用 CSRF Token
- 验证请求来源

### 7.4 接口速率限制

- 后端实现接口速率限制
- 前端避免频繁请求

## 8 性能优化

### 8.1 请求合并

对于多个相同类型的请求，合并为一个请求：

```javascript
// 批量获取数据
api.goods.batchGetGoodsInfo(ids)
```

### 8.2 缓存策略

- 对不常变化的数据进行缓存
- 使用 localStorage 或 sessionStorage 缓存数据

### 8.3 懒加载

- 按需加载数据
- 滚动到底部加载更多数据

### 8.4 预加载

- 预加载可能需要的数据
- 提升用户体验

## 9 调试技巧

### 9.1 接口调试工具

- 使用 Chrome DevTools 的 Network 面板
- 使用 Postman 等 API 调试工具

### 9.2 日志记录

- 在开发环境下打印详细的请求和响应信息
- 在生产环境下只记录错误信息

### 9.3 模拟数据

- 使用 Mock 数据进行前端开发
- 减少对后端接口的依赖

## 10 总结

Admin-Element 项目的 API 请求流程采用了统一的封装和处理机制，通过 axios 拦截器实现了请求和响应的统一处理，提高了代码的可维护性和可扩展性。开发者应遵循接口定义规范和最佳实践，确保 API 调用的安全性、可靠性和性能。