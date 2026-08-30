# Template 目录说明文档

## 目录结构

`template` 目录包含 CRMEB 系统的前端项目代码，主要分为两个子项目：

```
template/
├── admin/         # 管理端前端项目（Vue.js + Element UI）
└── uni-app/       # 移动端前端项目（UniApp）
```

## 项目说明

### 1. 管理端前端项目 (admin/)

管理端前端项目基于 Vue.js + Element UI 开发，用于后台管理系统的操作界面。

#### 主要目录结构

```
admin/
├── public/        # 静态资源目录
├── src/           # 源代码目录
│   ├── api/       # API 接口定义
│   ├── assets/    # 静态资源文件
│   ├── components/ # 通用组件
│   ├── config/    # 配置文件
│   ├── directive/ # 自定义指令
│   ├── filters/   # 过滤器
│   ├── layout/    # 布局组件
│   ├── libs/      # 工具库
│   ├── pages/     # 页面组件
│   ├── router/    # 路由配置
│   ├── store/     # 状态管理
│   ├── styles/    # 样式文件
│   ├── utils/     # 工具函数
│   ├── App.vue    # 根组件
│   └── main.js    # 入口文件
├── .env.dev       # 开发环境配置
├── .env.production # 生产环境配置
├── package.json   # 项目依赖
├── vue.config.js  # Vue 配置
└── README.md      # 项目说明
```

#### 技术栈
- Vue.js 2.x
- Element UI
- Vue Router
- Vuex
- Axios
- ECharts

#### 开发命令
- 安装依赖：`npm install`
- 开发环境运行：`npm run dev`
- 生产环境构建：`npm run build`
- 代码检查：`npm run lint`

### 2. 移动端前端项目 (uni-app/)

移动端前端项目基于 UniApp 开发，支持多端发布（微信小程序、H5、App 等）。

#### 主要目录结构

```
uni-app/
├── api/           # API 接口定义
├── components/    # 通用组件
├── config/        # 配置文件
├── libs/          # 工具库
├── mixins/        # 混合器
├── pages/         # 页面组件
├── static/        # 静态资源
├── App.vue        # 根组件
├── main.js        # 入口文件
├── manifest.json  # 应用配置
├── pages.json     # 页面配置
└── package.json   # 项目依赖
```

#### 技术栈
- UniApp
- Vue.js 2.x
- uView UI (UniApp 组件库)
- Vuex
- Axios

#### 开发命令
- 安装依赖：`npm install`
- 开发环境运行：使用 HBuilderX 运行到对应平台
- 生产环境构建：使用 HBuilderX 发行到对应平台

## 前端与后端交互

前端项目通过 API 接口与后端进行交互，主要配置如下：

### 管理端 API 配置
- 开发环境：`admin/.env.dev` 文件中的 `VUE_APP_API_URL`
- 生产环境：`admin/.env.production` 文件中的 `VUE_APP_API_URL`

### 移动端 API 配置
- 配置文件：`uni-app/config/api.js`
- API 基础路径：`baseURL` 变量

## 部署说明

### 管理端部署
1. 执行构建命令：`npm run build`
2. 将 `admin/dist` 目录下的文件部署到 Web 服务器
3. 配置 Nginx 或 Apache 服务器，指向构建后的静态文件

### 移动端部署
1. 使用 HBuilderX 打开 `uni-app` 目录
2. 根据需要发行到对应平台：
   - 微信小程序：发行 -> 小程序-微信
   - H5：发行 -> H5
   - App：发行 -> 原生 App-云打包

## 开发规范

### 代码风格
- 遵循 Vue 官方风格指南
- 使用 ESLint 进行代码检查
- 组件名使用 PascalCase
- 方法和变量名使用 camelCase

### 命名规范
- 文件和目录名使用 kebab-case
- 组件名使用 PascalCase
- 常量使用全大写，单词间用下划线分隔

### 目录使用
- `api/`：按模块组织 API 接口
- `components/`：存放可复用组件
- `pages/`：存放页面组件
- `utils/`：存放工具函数
- `styles/`：存放全局样式

## 注意事项

1. **API 接口**：前端项目需要与后端 API 接口保持一致，如有接口变更，需要同步修改前端代码。

2. **环境配置**：不同环境下的 API 地址需要在对应配置文件中修改。

3. **依赖管理**：使用 npm 管理项目依赖，确保依赖版本的一致性。

4. **构建优化**：生产环境构建时会自动进行代码压缩和优化。

5. **跨域处理**：开发环境下使用 Vue CLI 的代理配置处理跨域问题，生产环境需要在服务器端配置 CORS。

6. **性能优化**：
   - 合理使用组件懒加载
   - 优化图片资源
   - 减少不必要的 API 请求
   - 使用缓存减少重复数据获取

## 常见问题

### 1. 开发环境 API 调用失败
- 检查 `.env.dev` 文件中的 API 地址是否正确
- 检查后端服务是否正常运行
- 检查网络连接是否正常

### 2. 构建后页面空白
- 检查路由配置是否正确
- 检查是否有未捕获的错误
- 检查静态资源路径是否正确

### 3. 移动端适配问题
- 使用 Flex 布局进行响应式设计
- 针对不同设备尺寸进行适配
- 测试不同设备的显示效果

## 联系与支持

- 官方文档：https://doc.crmeb.com
- 技术社区：https://www.crmeb.com/ask
- 官方 QQ 群：请参考官方网站

## 版本信息

- CRMEB 版本：5.6.4
- 管理端前端：Vue 2.x + Element UI
- 移动端前端：UniApp

---

**说明**：本目录为前端项目代码，后端代码位于项目根目录的 `crmeb/` 目录中。