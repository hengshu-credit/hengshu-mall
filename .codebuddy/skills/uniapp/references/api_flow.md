# UniApp API 开发流程文档

## 1. 概述

本文档描述了 CRMEB 项目中 UniApp 移动端的 API 开发流程，包括 API 接口设计、请求流程、响应处理、错误处理等，旨在规范 API 开发，提高开发效率和代码质量。

## 2. API 目录结构

```
template/uni-app/api/
├── activity.js           # 活动相关接口
├── admin.js              # 管理相关接口
├── api.js                # 基础 API 配置
├── kefu.js               # 客服相关接口
├── lottery.js            # 抽奖相关接口
├── order.js              # 订单相关接口
├── public.js             # 公共接口
├── store.js              # 商城相关接口
└── user.js               # 用户相关接口
```

## 3. 基础 API 配置 (api.js)

```javascript
// 基础 API 配置
const baseURL = 'https://api.crmeb.net';

// 请求超时时间
const timeout = 10000;

// 请求拦截器
const requestInterceptor = (config) => {
  // 添加 token
  const token = uni.getStorageSync('token');
  if (token) {
    config.header['Authorization'] = `Bearer ${token}`;
  }
  
  // 添加设备信息
  config.header['X-Device-Type'] = uni.getSystemInfoSync().platform;
  
  return config;
};

// 响应拦截器
const responseInterceptor = (response) => {
  const { data } = response;
  
  // 统一处理错误
  if (data.code !== 200) {
    uni.showToast({
      title: data.message || '请求失败',
      icon: 'none'
    });
    
    // 处理登录过期
    if (data.code === 401) {
      uni.redirectTo({
        url: '/pages/login/index'
      });
    }
    
    return Promise.reject(data);
  }
  
  return data;
};

// 错误处理
const errorHandler = (error) => {
  uni.showToast({
    title: '网络错误，请稍后重试',
    icon: 'none'
  });
  
  return Promise.reject(error);
};

// 导出配置
export default {
  baseURL,
  timeout,
  requestInterceptor,
  responseInterceptor,
  errorHandler
};
```

## 4. API 接口封装

### 4.1 通用请求方法

```javascript
// utils/request.js
import apiConfig from '../api/api';

class Request {
  constructor() {
    this.baseURL = apiConfig.baseURL;
    this.timeout = apiConfig.timeout;
  }
  
  // 通用请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      // 应用请求拦截器
      if (apiConfig.requestInterceptor) {
        options = apiConfig.requestInterceptor(options);
      }
      
      uni.request({
        url: this.baseURL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: options.header || {
          'Content-Type': 'application/json'
        },
        timeout: this.timeout,
        success: (response) => {
          // 应用响应拦截器
          if (apiConfig.responseInterceptor) {
            try {
              const result = apiConfig.responseInterceptor(response);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else {
            resolve(response.data);
          }
        },
        fail: (error) => {
          // 应用错误处理器
          if (apiConfig.errorHandler) {
            apiConfig.errorHandler(error);
          }
          reject(error);
        }
      });
    });
  }
  
  // GET 请求
  get(url, params = {}) {
    return this.request({
      url,
      method: 'GET',
      data: params
    });
  }
  
  // POST 请求
  post(url, data = {}) {
    return this.request({
      url,
      method: 'POST',
      data
    });
  }
  
  // PUT 请求
  put(url, data = {}) {
    return this.request({
      url,
      method: 'PUT',
      data
    });
  }
  
  // DELETE 请求
  delete(url, params = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data: params
    });
  }
}

export default new Request();
```

### 4.2 业务接口封装

```javascript
// api/user.js
import request from '../utils/request';

// 用户相关接口
export default {
  // 登录
  login: (data) => request.post('/api/user/login', data),
  
  // 注册
  register: (data) => request.post('/api/user/register', data),
  
  // 获取用户信息
  getUserInfo: () => request.get('/api/user/info'),
  
  // 更新用户信息
  updateUserInfo: (data) => request.put('/api/user/info', data),
  
  // 修改密码
  changePassword: (data) => request.post('/api/user/password', data),
  
  // 获取地址列表
  getAddressList: () => request.get('/api/user/address'),
  
  // 添加地址
  addAddress: (data) => request.post('/api/user/address', data),
  
  // 更新地址
  updateAddress: (id, data) => request.put(`/api/user/address/${id}`, data),
  
  // 删除地址
  deleteAddress: (id) => request.delete(`/api/user/address/${id}`),
  
  // 设置默认地址
  setDefaultAddress: (id) => request.put(`/api/user/address/${id}/default`)
};
```

## 5. API 调用示例

### 5.1 页面中调用 API

```vue
<template>
  <view class="user-info">
    <view v-if="loading">加载中...</view>
    <view v-else>
      <image :src="userInfo.avatar" class="avatar"></image>
      <view class="name">{{ userInfo.nickname }}</view>
      <view class="mobile">{{ userInfo.mobile }}</view>
    </view>
  </view>
</template>

<script>
import userApi from '../../api/user';

export default {
  data() {
    return {
      loading: false,
      userInfo: {}
    };
  },
  
  onLoad() {
    this.getUserInfo();
  },
  
  methods: {
    async getUserInfo() {
      try {
        this.loading = true;
        const res = await userApi.getUserInfo();
        this.userInfo = res.data;
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### 5.2 组件中调用 API

```vue
<template>
  <view class="address-item" v-for="item in addressList" :key="item.id">
    <view class="address-info">
      <view class="name">{{ item.name }} {{ item.mobile }}</view>
      <view class="detail">{{ item.province }}{{ item.city }}{{ item.district }}{{ item.detail }}</view>
    </view>
    <view class="address-actions">
      <button @click="editAddress(item)">编辑</button>
      <button @click="deleteAddress(item.id)">删除</button>
      <button v-if="!item.is_default" @click="setDefault(item.id)">设为默认</button>
    </view>
  </view>
</template>

<script>
import userApi from '../../api/user';

export default {
  data() {
    return {
      addressList: []
    };
  },
  
  mounted() {
    this.getAddressList();
  },
  
  methods: {
    async getAddressList() {
      try {
        const res = await userApi.getAddressList();
        this.addressList = res.data;
      } catch (error) {
        console.error('获取地址列表失败:', error);
      }
    },
    
    editAddress(item) {
      uni.navigateTo({
        url: `/pages/address/edit?id=${item.id}`
      });
    },
    
    async deleteAddress(id) {
      uni.showModal({
        title: '提示',
        content: '确定要删除这个地址吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await userApi.deleteAddress(id);
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.getAddressList();
            } catch (error) {
              console.error('删除地址失败:', error);
            }
          }
        }
      });
    },
    
    async setDefault(id) {
      try {
        await userApi.setDefaultAddress(id);
        uni.showToast({
          title: '设置成功',
          icon: 'success'
        });
        this.getAddressList();
      } catch (error) {
        console.error('设置默认地址失败:', error);
      }
    }
  }
};
</script>
```

## 6. API 开发最佳实践

### 6.1 命名规范

- **文件命名**: 小写字母，单词之间用下划线分隔，如 `user.js`
- **方法命名**: 驼峰命名法，如 `getUserInfo`
- **URL 命名**: 小写字母，单词之间用连字符分隔，如 `/api/user/info`
- **参数命名**: 驼峰命名法，与后端保持一致

### 6.2 接口设计规范

- **RESTful 风格**: 遵循 RESTful API 设计规范
- **版本控制**: 在 URL 中包含版本号，如 `/api/v1/user/info`
- **统一响应格式**: 所有接口返回统一的响应格式
- **错误处理**: 统一的错误码和错误信息

### 6.3 请求规范

- **请求方法**: 根据操作类型选择合适的 HTTP 方法
  - GET: 获取资源
  - POST: 创建资源
  - PUT: 更新资源
  - DELETE: 删除资源
- **请求头**: 统一添加必要的请求头，如 Authorization、Content-Type 等
- **参数传递**: 根据请求方法选择合适的参数传递方式
  - GET: 查询参数
  - POST/PUT: 请求体
  - DELETE: 查询参数或路径参数

### 6.4 响应规范

- **成功响应**: 
  ```json
  {
    "code": 200,
    "message": "请求成功",
    "data": {}
  }
  ```
- **失败响应**: 
  ```json
  {
    "code": 400,
    "message": "请求失败",
    "data": {}
  }
  ```

### 6.5 错误处理规范

- **网络错误**: 统一处理网络错误，如超时、断网等
- **业务错误**: 根据错误码处理不同的业务错误
- **登录过期**: 统一处理登录过期，跳转到登录页面
- **错误提示**: 统一的错误提示方式，使用 uni.showToast

## 7. API 性能优化

### 7.1 请求优化

- **合并请求**: 多个相关请求合并为一个
- **缓存策略**: 对不经常变化的数据使用缓存
- **请求防抖**: 避免频繁发送相同的请求
- **批量操作**: 支持批量操作，减少请求次数

### 7.2 响应优化

- **数据结构优化**: 优化响应数据结构，减少数据传输量
- **分页处理**: 对列表数据使用分页
- **字段筛选**: 支持字段筛选，只返回需要的字段
- **压缩传输**: 使用 gzip 压缩传输数据

### 7.3 代码优化

- **模块化**: 按业务模块划分 API 文件
- **复用代码**: 提取通用的请求逻辑
- **减少冗余**: 避免重复的 API 调用
- **代码可读性**: 保持代码清晰易读

## 8. 常见问题

### 8.1 跨域问题

- **问题**: 开发环境中遇到跨域问题
- **解决方案**: 在本地开发服务器中配置跨域代理

### 8.2 Token 过期问题

- **问题**: Token 过期后请求失败
- **解决方案**: 在响应拦截器中处理 Token 过期，跳转到登录页面

### 8.3 请求超时问题

- **问题**: 网络不稳定时请求超时
- **解决方案**: 设置合理的超时时间，添加网络状态检测

### 8.4 重复请求问题

- **问题**: 快速点击按钮导致重复请求
- **解决方案**: 添加请求防抖或锁机制

### 8.5 数据缓存问题

- **问题**: 缓存数据与服务器数据不一致
- **解决方案**: 合理设置缓存过期时间，提供手动刷新机制

## 9. 参考资源

- [UniApp 网络请求文档](https://uniapp.dcloud.io/api/request/request)
- [RESTful API 设计指南](https://restfulapi.cn/)
- [Axios 文档](https://axios-http.com/zh/docs/intro)
- [HTTP 方法](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Methods)

## 10. 总结

本文档描述了 CRMEB 项目中 UniApp 移动端的 API 开发流程，包括 API 接口设计、请求流程、响应处理、错误处理等。遵循本文档的开发规范，可以提高 API 开发的效率和质量，确保应用的稳定性和可靠性。

随着业务的发展和技术的演进，API 开发流程也需要不断优化和调整，以适应新的业务需求和技术挑战。