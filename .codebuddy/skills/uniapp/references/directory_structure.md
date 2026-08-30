# UniApp 目录结构文档

## 1. 概述

本文档描述了 CRMEB 项目中 UniApp 移动端的目录结构，包括各目录的功能、文件组织方式等，旨在帮助开发者理解项目结构，提高开发效率。

## 2. 项目根目录结构

```
template/uni-app/
├── api/                  # API 接口目录
├── config/               # 配置目录
├── libs/                 # 库文件目录
├── mixins/               # 混入目录
├── store/                # 状态管理目录
├── utils/                # 工具类目录
├── App.vue               # 应用入口组件
├── main.js               # 应用入口文件
├── manifest.json         # 应用配置文件
├── package.json          # 项目配置文件
├── pages.json            # 页面路由配置文件
├── uni.scss              # UniApp 全局样式文件
└── vue.config.js         # Vue 配置文件
```

## 3. API 目录结构 (api/)

```
api/
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

- **功能**: 封装与后端交互的 API 接口
- **结构**: 按业务模块划分接口文件
- **特性**: 统一处理请求头、响应拦截、错误处理等
- **调用方式**: 通过 `import` 导入使用

## 4. 配置目录结构 (config/)

```
config/
├── app.js                # 应用配置
├── cache.js              # 缓存配置
└── socket.js             # WebSocket 配置
```

- **功能**: 存储项目的所有配置文件
- **结构**: 按功能模块划分配置文件
- **特性**: 集中管理配置，便于维护和修改
- **加载顺序**: 应用启动时加载

## 5. 库文件目录结构 (libs/)

```
libs/
├── chat.js               # 聊天相关功能
├── login.js              # 登录相关功能
├── new_chat.js           # 新聊天功能
├── order.js              # 订单相关功能
├── routine.js            # 小程序相关功能
├── uniApi.js             # UniApp API 封装
└── wechat.js             # 微信相关功能
```

- **功能**: 存储通用库文件和功能模块
- **结构**: 按功能划分库文件
- **特性**: 独立于页面代码，便于复用
- **作用**: 提供通用功能和服务

## 6. 混入目录结构 (mixins/)

```
mixins/
└── color.js              # 颜色相关混入
```

- **功能**: 存储 Vue 混入对象
- **结构**: 按功能划分混入文件
- **特性**: 实现代码复用，避免重复逻辑
- **作用**: 为组件提供共享的方法和数据

## 7. 状态管理目录结构 (store/)

```
store/
├── getters.js            # 状态获取器
└── index.js              # 状态管理入口
```

- **功能**: 存储 Vuex 状态管理相关文件
- **结构**: 按 Vuex 规范划分文件
- **特性**: 集中管理应用状态，实现组件间通信
- **作用**: 管理全局状态，如用户信息、购物车数据等

## 8. 工具类目录结构 (utils/)

```
utils/
├── cache.js              # 缓存工具
├── emoji.js              # 表情工具
├── index.js              # 工具类入口
├── lang.js               # 语言工具
├── request.js            # 网络请求工具
├── theme.js              # 主题工具
├── util.js               # 通用工具
└── validate.js           # 验证工具
```

- **功能**: 存储通用工具类
- **结构**: 按功能划分工具文件
- **特性**: 提供通用功能，便于复用
- **作用**: 处理缓存、网络请求、验证等通用操作

## 9. 页面目录结构

### 9.1 页面配置 (pages.json)

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/user/index",
      "style": {
        "navigationBarTitleText": "个人中心"
      }
    }
  ],
  "subPackages": [
    {
      "root": "pages/order",
      "pages": [
        {
          "path": "index",
          "style": {
            "navigationBarTitleText": "订单列表"
          }
        }
      ]
    }
  ]
}
```

- **功能**: 配置页面路由、导航栏样式等
- **结构**: 按页面层级配置
- **特性**: 支持分包加载，优化应用体积
- **作用**: 定义应用的页面结构和导航样式

## 10. 应用配置文件

### 10.1 manifest.json

```json
{
  "name": "CRMEB商城",
  "appid": "__UNI__APPID__",
  "description": "CRMEB商城移动端",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": true,
  "uniStatistics": {
    "enable": true
  },
  "app-plus": {
    "usingComponents": true,
    "nvueStyleCompiler": "uni-app"
  },
  "mp-weixin": {
    "appid": "wx_appid",
    "setting": {
      "urlCheck": false
    },
    "usingComponents": true
  }
}
```

- **功能**: 配置应用的基本信息、平台配置等
- **结构**: 按平台划分配置
- **特性**: 支持多平台配置，如微信小程序、App 等
- **作用**: 定义应用的全局配置信息

### 10.2 package.json

```json
{
  "name": "crmeb-uni-app",
  "version": "1.0.0",
  "description": "CRMEB商城移动端",
  "main": "main.js",
  "scripts": {
    "dev": "npm run dev:mp-weixin",
    "dev:mp-weixin": "cross-env NODE_ENV=development UNI_PLATFORM=mp-weixin vue-cli-service uni-build --watch",
    "build": "npm run build:mp-weixin",
    "build:mp-weixin": "cross-env NODE_ENV=production UNI_PLATFORM=mp-weixin vue-cli-service uni-build"
  },
  "dependencies": {
    "vue": "^2.6.11",
    "vuex": "^3.4.0"
  }
}
```

- **功能**: 配置项目的依赖、脚本等
- **结构**: 标准 npm 配置格式
- **特性**: 管理项目依赖，定义构建脚本
- **作用**: 管理项目的依赖和构建流程

## 11. 目录结构最佳实践

### 11.1 命名规范

- **目录名**: 小写字母，单词之间用下划线分隔
- **文件名**: 小写字母，单词之间用下划线分隔
- **组件名**: 使用 PascalCase 命名风格
- **方法名**: 使用 camelCase 命名风格
- **变量名**: 使用 camelCase 命名风格

### 11.2 组织原则

- **模块化**: 按功能模块组织目录结构
- **分层架构**: 遵循 Vue 组件化开发架构
- **单一职责**: 每个目录和文件只负责一个功能
- **可扩展性**: 便于添加新功能和模块
- **易维护性**: 便于理解和维护

### 11.3 开发建议

- **遵循 UniApp 规范**: 遵循 UniApp 官方目录结构规范
- **合理划分模块**: 根据业务功能合理划分模块
- **避免目录过深**: 目录层级不宜过深，一般不超过 4 层
- **保持目录整洁**: 及时清理无用文件和目录
- **文档化**: 为重要目录添加说明文档

## 12. 常见问题

### 12.1 目录权限问题

- **问题**: 某些目录没有读写权限
- **解决方案**: 确保项目目录有正确的读写权限

### 12.2 页面路由配置问题

- **问题**: 新增页面后无法访问
- **解决方案**: 在 pages.json 中添加页面路由配置

### 12.3 分包加载问题

- **问题**: 应用体积过大，无法上传到小程序平台
- **解决方案**: 使用分包加载，将页面划分到不同的分包中

### 12.4 目录结构混乱

- **问题**: 目录结构不清晰，难以维护
- **解决方案**: 重新组织目录结构，遵循模块化原则

## 13. 参考资源

- [UniApp 官方文档](https://uniapp.dcloud.io/)
- [Vue 官方文档](https://cn.vuejs.org/)
- [Vuex 官方文档](https://vuex.vuejs.org/zh/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

## 14. 总结

本文档描述了 CRMEB 项目中 UniApp 移动端的目录结构，包括各目录的功能、文件组织方式等。遵循本文档的目录结构规范，可以提高项目的可维护性和可扩展性，便于团队协作开发。

随着业务的发展和技术的演进，目录结构也可能需要不断优化和调整，以适应新的业务需求和技术挑战。