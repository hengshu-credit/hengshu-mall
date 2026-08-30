# Admin-Element 系统配置文档

## 1 环境变量配置

### 1.1 环境变量文件

Admin-Element 项目使用 `.env` 文件管理环境变量：

```
template/admin-element/
├── .env                # 基础环境变量文件
├── .env.development    # 开发环境变量
├── .env.production     # 生产环境变量
└── .env.staging        # 测试环境变量
```

### 1.2 环境变量配置示例

在 `.env.development` 中配置开发环境变量：

```dotenv
# 基础 API 路径
VUE_APP_BASE_API = 'http://localhost:8080/api'

# 项目标题
VUE_APP_TITLE = 'CRMEB 管理端'

# 开发环境
NODE_ENV = 'development'

# 端口
VUE_APP_PORT = '9527'

# 构建输出目录
VUE_APP_OUTPUT_DIR = 'dist'

# 是否启用代码压缩
VUE_APP_COMPRESS = 'false'

# 是否启用 source map
VUE_APP_SOURCE_MAP = 'true'
```

在 `.env.production` 中配置生产环境变量：

```dotenv
# 基础 API 路径
VUE_APP_BASE_API = 'https://api.example.com'

# 项目标题
VUE_APP_TITLE = 'CRMEB 管理端'

# 生产环境
NODE_ENV = 'production'

# 端口
VUE_APP_PORT = '80'

# 构建输出目录
VUE_APP_OUTPUT_DIR = 'dist'

# 是否启用代码压缩
VUE_APP_COMPRESS = 'true'

# 是否启用 source map
VUE_APP_SOURCE_MAP = 'false'
```

## 2 项目基本配置

### 2.1 package.json 配置

在 `package.json` 文件中配置项目基本信息和依赖：

```json
{
  "name": "admin-element",
  "version": "1.0.0",
  "description": "CRMEB 管理端前端项目",
  "author": "CRMEB Team",
  "private": true,
  "scripts": {
    "dev": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint",
    "preview": "serve dist",
    "test": "vue-cli-service test:unit"
  },
  "dependencies": {
    "vue": "^2.6.11",
    "vue-router": "^3.2.0",
    "vuex": "^3.4.0",
    "axios": "^0.21.1",
    "element-ui": "^2.14.1",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@vue/cli-service": "^4.5.13",
    "@vue/cli-plugin-babel": "^4.5.13",
    "@vue/cli-plugin-eslint": "^4.5.13",
    "@vue/cli-plugin-unit-jest": "^4.5.13",
    "babel-eslint": "^10.1.0",
    "eslint": "^6.7.2",
    "eslint-plugin-vue": "^6.2.2"
  }
}
```

### 2.2 vue.config.js 配置

在 `vue.config.js` 文件中配置 Vue CLI 相关选项：

```javascript
const { defineConfig } = require('@vue/cli-service')
const path = require('path')

module.exports = defineConfig({
  // 部署应用包的基本 URL
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  
  // 构建输出目录
  outputDir: process.env.VUE_APP_OUTPUT_DIR || 'dist',
  
  // 静态资源目录
  assetsDir: 'static',
  
  // 生产环境是否生成 source map
  productionSourceMap: process.env.VUE_APP_SOURCE_MAP === 'true',
  
  // 开发服务器配置
  devServer: {
    port: process.env.VUE_APP_PORT || 9527,
    open: true,
    overlay: {
      warnings: false,
      errors: true
    },
    proxy: {
      // API 代理配置
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api'
        }
      }
    }
  },
  
  // 构建配置
  configureWebpack: {
    // 提供 webpack 全局变量
    plugins: [
      // 其他插件配置
    ],
    // 解析配置
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@views': path.resolve(__dirname, 'src/views'),
        '@api': path.resolve(__dirname, 'src/api'),
        '@utils': path.resolve(__dirname, 'src/utils')
      }
    }
  },
  
  // 链式配置
  chainWebpack: config => {
    // 配置别名
    config.resolve.alias
      .set('@', path.resolve(__dirname, 'src'))
    
    // 配置构建优化
    if (process.env.NODE_ENV === 'production') {
      // 生产环境配置
      config.optimization.minimizer('terser').tap(args => {
        // 配置 terser 选项
        return args
      })
    }
  }
})
```

## 3 路由配置

### 3.1 路由配置文件

路由配置文件位于 `src/router/` 目录：

```
src/router/
├── index.js          # 路由配置主文件
└── modules/          # 按模块组织的路由配置
    ├── user.js       # 用户模块路由
    ├── goods.js      # 商品模块路由
    └── order.js      # 订单模块路由
```

### 3.2 路由配置示例

在 `src/router/index.js` 中配置主路由：

```javascript
import Vue from 'vue'
import Router from 'vue-router'
import Layout from '@/layout'

Vue.use(Router)

// 静态路由
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/404',
    component: () => import('@/views/404'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [{
      path: 'dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index'),
      meta: { title: '控制台', icon: 'dashboard', affix: true }
    }]
  }
]

// 动态路由
export const asyncRoutes = [
  // 用户管理
  {
    path: '/user',
    component: Layout,
    redirect: '/user/list',
    name: 'User',
    meta: { title: '用户管理', icon: 'user', roles: ['admin'] },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/user/list'),
        meta: { title: '用户列表', roles: ['admin'] }
      },
      {
        path: 'add',
        name: 'UserAdd',
        component: () => import('@/views/user/add'),
        meta: { title: '添加用户', roles: ['admin'] }
      },
      {
        path: 'edit/:id',
        name: 'UserEdit',
        component: () => import('@/views/user/edit'),
        meta: { title: '编辑用户', roles: ['admin'] },
        hidden: true
      }
    ]
  },
  // 404 页面必须放在最后
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  mode: 'history',
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher
}

export default router
```

## 4 菜单配置

### 4.1 菜单配置文件

菜单配置文件位于 `src/config/menu.config.js`：

```javascript
export default [
  {
    path: '/dashboard',
    title: '控制台',
    icon: 'dashboard',
    component: 'dashboard/index',
    meta: {
      roles: ['admin', 'editor']
    }
  },
  {
    path: '/user',
    title: '用户管理',
    icon: 'user',
    component: 'layout',
    redirect: '/user/list',
    meta: {
      roles: ['admin']
    },
    children: [
      {
        path: 'list',
        title: '用户列表',
        component: 'user/list',
        meta: {
          roles: ['admin']
        }
      },
      {
        path: 'add',
        title: '添加用户',
        component: 'user/add',
        meta: {
          roles: ['admin']
        }
      }
    ]
  },
  {
    path: '/goods',
    title: '商品管理',
    icon: 'shopping',
    component: 'layout',
    redirect: '/goods/list',
    meta: {
      roles: ['admin', 'editor']
    },
    children: [
      {
        path: 'list',
        title: '商品列表',
        component: 'goods/list',
        meta: {
          roles: ['admin', 'editor']
        }
      },
      {
        path: 'category',
        title: '商品分类',
        component: 'goods/category',
        meta: {
          roles: ['admin']
        }
      }
    ]
  }
]
```

## 5 主题配置

### 5.1 主题配置文件

主题配置文件位于 `src/config/theme.config.js`：

```javascript
export default {
  // 主题颜色
  primaryColor: '#409EFF',
  
  // 成功颜色
  successColor: '#67C23A',
  
  // 警告颜色
  warningColor: '#E6A23C',
  
  // 错误颜色
  errorColor: '#F56C6C',
  
  // 信息颜色
  infoColor: '#909399',
  
  // 菜单主题
  menuTheme: 'dark', // dark, light
  
  // 顶部导航栏主题
  navbarTheme: 'light', // dark, light
  
  // 布局模式
  layoutMode: 'side', // side, top
  
  // 是否固定顶部导航栏
  fixedNavbar: true,
  
  // 是否固定侧边栏
  fixedSidebar: true,
  
  // 是否显示标签栏
  showTagsView: true,
  
  // 是否显示logo
  showLogo: true,
  
  // 是否显示面包屑
  showBreadcrumb: true,
  
  // 是否启用响应式布局
  responsiveLayout: true
}
```

## 6 API 配置

### 6.1 API 基础配置

在 `src/utils/request.js` 中配置 API 请求基础设置：

```javascript
import axios from 'axios'

const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 其他配置...

export default service
```

### 6.2 API 模块配置

在 `src/api/` 目录下按模块配置 API 接口：

```javascript
// src/api/user.js
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
  }
}
```

## 7 权限配置

### 7.1 权限配置文件

权限配置文件位于 `src/config/permission.config.js`：

```javascript
export default {
  // 路由权限配置
  routePermissions: {
    '/user': ['admin'],
    '/goods': ['admin', 'editor'],
    '/order': ['admin', 'editor'],
    '/finance': ['admin'],
    '/system': ['admin']
  },
  
  // 按钮权限配置
  buttonPermissions: {
    'user:add': ['admin'],
    'user:edit': ['admin'],
    'user:delete': ['admin'],
    'goods:add': ['admin', 'editor'],
    'goods:edit': ['admin', 'editor'],
    'goods:delete': ['admin'],
    'order:edit': ['admin', 'editor'],
    'order:delete': ['admin']
  },
  
  // 角色配置
  roles: {
    admin: {
      name: '管理员',
      permissions: ['user:add', 'user:edit', 'user:delete', 'goods:add', 'goods:edit', 'goods:delete', 'order:edit', 'order:delete']
    },
    editor: {
      name: '编辑',
      permissions: ['goods:add', 'goods:edit', 'order:edit']
    }
  }
}
```

### 7.2 权限指令

在 `src/directive/permission.js` 中配置权限指令：

```javascript
import permission from '@/config/permission.config'

export default {
  inserted(el, binding) {
    const { value } = binding
    const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]')
    
    if (value && value instanceof Array && value.length > 0) {
      const hasPermission = value.some(permission => {
        return userRoles.includes(permission)
      })
      
      if (!hasPermission) {
        el.parentNode && el.parentNode.removeChild(el)
      }
    } else {
      throw new Error('权限指令必须指定权限值')
    }
  }
}
```

## 8 国际化配置

### 8.1 国际化配置文件

国际化配置文件位于 `src/lang/` 目录：

```
src/lang/
├── index.js          # 国际化入口文件
├── zh-CN.js          # 中文语言包
└── en-US.js          # 英文语言包
```

在 `src/lang/zh-CN.js` 中配置中文语言包：

```javascript
export default {
  login: {
    title: '登录',
    username: '用户名',
    password: '密码',
    loginBtn: '登录',
    forgetPassword: '忘记密码',
    register: '注册'
  },
  dashboard: {
    title: '控制台',
    welcome: '欢迎回来',
    todayStats: '今日统计',
    totalStats: '总统计'
  },
  user: {
    title: '用户管理',
    list: '用户列表',
    add: '添加用户',
    edit: '编辑用户',
    delete: '删除用户',
    username: '用户名',
    nickname: '昵称',
    email: '邮箱',
    phone: '手机号',
    status: '状态'
  }
}
```

## 9 构建配置

### 9.1 构建脚本配置

在 `package.json` 中配置构建脚本：

```json
{
  "scripts": {
    "build": "vue-cli-service build",
    "build:dev": "vue-cli-service build --mode development",
    "build:prod": "vue-cli-service build --mode production",
    "build:staging": "vue-cli-service build --mode staging",
    "build:analyze": "vue-cli-service build --report"
  }
}
```

### 9.2 构建优化配置

在 `vue.config.js` 中配置构建优化：

```javascript
module.exports = {
  configureWebpack: {
    optimization: {
      // 分割代码块
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // 第三方库
          vendor: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          // 公共组件
          common: {
            name: 'chunk-common',
            minChunks: 2,
            priority: 5,
            chunks: 'initial',
            reuseExistingChunk: true
          }
        }
      }
    }
  }
}
```

## 10 开发配置

### 10.1 开发服务器配置

在 `vue.config.js` 中配置开发服务器：

```javascript
module.exports = {
  devServer: {
    // 端口
    port: 9527,
    
    // 自动打开浏览器
    open: true,
    
    // 错误和警告显示
    overlay: {
      warnings: false,
      errors: true
    },
    
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api'
        }
      }
    },
    
    // 热更新
    hot: true,
    
    // 静态资源目录
    static: {
      directory: path.join(__dirname, 'public')
    }
  }
}
```

### 10.2 ESLint 配置

ESLint 配置文件位于 `template/admin-element/.eslintrc.js`：

```javascript
module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/standard'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never']
  }
}
```

## 11 部署配置

### 11.1 部署配置文件

部署配置文件位于 `src/config/deploy.config.js`：

```javascript
export default {
  // 部署环境
  environments: {
    // 测试环境
    staging: {
      host: 'staging.example.com',
      port: 22,
      username: 'deploy',
      password: '',
      privateKey: '/path/to/privateKey',
      passphrase: '',
      from: 'dist/',
      to: '/var/www/html/admin-staging',
      timeout: 60000
    },
    // 生产环境
    production: {
      host: 'production.example.com',
      port: 22,
      username: 'deploy',
      password: '',
      privateKey: '/path/to/privateKey',
      passphrase: '',
      from: 'dist/',
      to: '/var/www/html/admin',
      timeout: 60000
    }
  }
}
```

### 11.2 Nginx 配置

在服务器上配置 Nginx：

```nginx
server {
  listen 80;
  server_name admin.example.com;
  
  root /var/www/html/admin;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  
  # 静态资源缓存
  location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800";
  }
  
  # 错误页面
  error_page 404 /index.html;
  error_page 500 502 503 504 /50x.html;
  location = /50x.html {
    root /usr/share/nginx/html;
  }
}
```

## 12 性能配置

### 12.1 性能优化配置

在 `vue.config.js` 中配置性能优化：

```javascript
module.exports = {
  configureWebpack: {
    // 性能配置
    performance: {
      maxAssetSize: 300000, // 300kb
      maxEntrypointSize: 300000, // 300kb
      hints: 'warning'
    }
  },
  
  // 构建优化
  chainWebpack: config => {
    // 配置图片压缩
    config.module
      .rule('images')
      .use('image-webpack-loader')
      .loader('image-webpack-loader')
      .options({
        mozjpeg: {
          progressive: true,
          quality: 65
        },
        optipng: {
          enabled: false
        },
        pngquant: {
          quality: [0.65, 0.90],
          speed: 4
        },
        gifsicle: {
          interlaced: false
        }
      })
    
    // 配置代码分割
    config.optimization
      .splitChunks({
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            reuseExistingChunk: true
          }
        }
      })
  }
}
```

## 13 安全配置

### 13.1 安全配置文件

安全配置文件位于 `src/config/security.config.js`：

```javascript
export default {
  // 是否启用 CSRF 保护
  enableCsrf: true,
  
  // CSRF Token 名称
  csrfTokenName: 'X-CSRF-Token',
  
  // 是否启用 XSS 防护
  enableXss: true,
  
  // 是否启用 CSP (Content Security Policy)
  enableCsp: true,
  
  // CSP 配置
  csp: {
    defaultSrc: "'self'",
    scriptSrc: "'self' 'unsafe-inline' 'unsafe-eval'",
    styleSrc: "'self' 'unsafe-inline'",
    imgSrc: "'self' data: https:",
    connectSrc: "'self'",
    fontSrc: "'self'",
    objectSrc: "'none'",
    frameSrc: "'none'",
    baseSrc: "'self'",
    formAction: "'self'"
  },
  
  // 是否启用 HTTP Strict Transport Security
  enableHsts: true,
  
  // HSTS 配置
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // 是否启用 X-Content-Type-Options
  enableXContentTypeOptions: true,
  
  // 是否启用 X-Frame-Options
  enableXFrameOptions: true,
  
  // X-Frame-Options 配置
  xFrameOptions: 'DENY', // DENY, SAMEORIGIN, ALLOW-FROM
  
  // 是否启用 X-XSS-Protection
  enableXXssProtection: true
}
```

## 14 最佳实践

### 14.1 配置管理最佳实践

1. **环境变量管理**
   - 使用 `.env` 文件管理不同环境的配置
   - 敏感信息不要硬编码在代码中
   - 不同环境使用不同的配置文件

2. **配置文件组织**
   - 按功能模块组织配置文件
   - 使用统一的配置管理方式
   - 配置文件应该有清晰的注释

3. **配置加载顺序**
   - 环境变量 > 配置文件 > 默认配置
   - 确保配置加载的一致性

4. **配置验证**
   - 对配置项进行验证
   - 提供默认值和错误处理

5. **配置监控**
   - 监控配置的变化
   - 记录配置变更日志

6. **配置安全性**
   - 敏感配置加密存储
   - 配置文件权限控制
   - 避免在日志中输出敏感配置

7. **配置可维护性**
   - 使用结构化的配置格式
   - 配置项命名规范
   - 定期清理无用的配置

8. **配置扩展性**
   - 设计可扩展的配置结构
   - 支持动态配置更新
   - 配置项应该有合理的默认值

## 15 总结

Admin-Element 项目的系统配置涵盖了环境变量、路由、菜单、主题、API、权限、国际化、构建、开发、部署、性能和安全等多个方面。合理的配置管理可以提高项目的可维护性、可扩展性和安全性，同时提升开发效率和用户体验。

开发者应遵循配置管理的最佳实践，根据项目需求和环境特点，合理配置各项参数，确保项目的稳定运行和持续演进。