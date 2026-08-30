# 目录结构文档

## 1. 概述

本文档描述了 CRMEB 项目的目录结构，包括各目录的功能、文件组织方式等，旨在帮助开发者理解项目结构，提高开发效率。

## 2. 项目根目录结构

```
CRMEB/
├── app/                  # 应用目录
├── config/               # 配置目录
├── crmeb/                # 核心库目录
├── database/             # 数据库目录
├── extend/               # 扩展目录
├── public/               # 公共资源目录
├── runtime/              # 运行时目录
├── thinkphp/             # ThinkPHP 核心目录
├── vendor/               # 第三方依赖目录
├── .env                  # 环境变量文件
├── .env.example          # 环境变量示例文件
├── composer.json         # Composer 配置文件
├── composer.lock         # Composer 锁定文件
├── LICENSE               # 许可证文件
├── README.md             # 项目说明文档
├── think                 # ThinkPHP 命令行工具
```

## 3. 应用目录结构 (app/)

```
app/
├── api/                  # API 接口层
│   ├── v1/               # API 版本 1
│   ├── v2/               # API 版本 2
│   └── BaseApi.php       # API 基类
├── controller/           # 控制器层
│   ├── admin/            # 管理端控制器
│   ├── api/              # API 控制器
│   └── BaseController.php # 控制器基类
├── dao/                  # 数据访问层
│   └── BaseDao.php       # DAO 基类
├── event/                # 事件层
├── exception/            # 异常处理层
├── middleware/           # 中间件层
├── model/                # 模型层
│   └── BaseModel.php     # 模型基类
├── services/             # 业务逻辑层
│   └── BaseServices.php  # 服务基类
├── subscribe/            # 事件订阅层
├── validate/             # 验证层
│   └── BaseValidate.php  # 验证器基类
└── common.php            # 公共函数文件
```

### 3.1 API 目录 (app/api/)

- **功能**: 处理 API 接口请求
- **结构**: 按 API 版本划分目录
- **基类**: `BaseApi.php`，提供 API 基础功能
- **版本控制**: 通过目录结构实现 API 版本管理

### 3.2 控制器目录 (app/controller/)

- **功能**: 处理 HTTP 请求，路由分发
- **结构**: 按模块划分控制器
- **基类**: `BaseController.php`，提供控制器基础功能
- **类型**: 管理端控制器、API 控制器

### 3.3 DAO 目录 (app/dao/)

- **功能**: 数据访问对象，封装数据库操作
- **结构**: 按业务模块划分 DAO 类
- **基类**: `BaseDao.php`，提供 DAO 基础功能
- **职责**: 处理数据库查询、插入、更新、删除等操作

### 3.4 模型目录 (app/model/)

- **功能**: 数据模型，定义数据结构和关系
- **结构**: 按业务模块划分模型类
- **基类**: `BaseModel.php`，提供模型基础功能
- **特性**: 支持 ORM、关联查询、软删除等

### 3.5 服务目录 (app/services/)

- **功能**: 业务逻辑层，封装核心业务逻辑
- **结构**: 按业务模块划分服务类
- **基类**: `BaseServices.php`，提供服务基础功能
- **职责**: 实现业务规则，协调多个 DAO 和模型

### 3.6 验证目录 (app/validate/)

- **功能**: 数据验证，验证请求参数
- **结构**: 按业务模块划分验证器类
- **基类**: `BaseValidate.php`，提供验证器基础功能
- **特性**: 支持规则验证、场景验证等

## 4. 配置目录结构 (config/)

```
config/
├── app.php               # 应用配置
├── cache.php             # 缓存配置
├── captcha.php           # 验证码配置
├── console.php           # 控制台配置
├── cookie.php            # Cookie 配置
├── database.php          # 数据库配置
├── filesystem.php        # 文件系统配置
├── lang.php              # 语言配置
├── log.php               # 日志配置
├── queue.php             # 队列配置
├── route.php             # 路由配置
├── session.php           # Session 配置
├── template.php          # 模板配置
└── trace.php             # 调试配置
```

- **功能**: 存储项目的所有配置文件
- **结构**: 按功能模块划分配置文件
- **特性**: 支持环境变量配置、配置缓存等
- **加载顺序**: 框架配置 → 应用配置 → 环境配置

## 5. 核心库目录结构 (crmeb/)

```
crmeb/
├── basic/                # 基础类库
├── exception/            # 核心异常类
├── services/             # 核心服务类
├── utils/                # 工具类
└── version.php           # 版本信息
```

- **功能**: 存储 CRMEB 核心库代码
- **结构**: 按功能模块划分目录
- **特性**: 独立于应用代码，便于维护和升级
- **作用**: 提供核心功能和基础服务

## 6. 数据库目录结构 (database/)

```
database/
├── migrations/           # 数据库迁移文件
└── seeders/              # 数据库种子文件
```

- **功能**: 存储数据库相关文件
- **迁移文件**: 用于版本控制数据库结构
- **种子文件**: 用于初始化数据库数据
- **工具**: 使用 ThinkPHP 迁移工具管理

## 7. 公共资源目录结构 (public/)

```
public/
├── admin/                # 管理端资源
├── api/                  # API 资源
├── assets/               # 静态资源
│   ├── css/              # CSS 文件
│   ├── images/           # 图片文件
│   └── js/               # JavaScript 文件
├── index.php             # 应用入口文件
├── robots.txt            # 机器人协议文件
└── router.php            # URL 重写文件
```

- **功能**: 存储可直接访问的公共资源
- **结构**: 按功能模块划分目录
- **特性**: 可通过 URL 直接访问
- **安全**: 敏感文件不应放在此目录

## 8. 运行时目录结构 (runtime/)

```
runtime/
├── cache/                # 缓存目录
├── log/                  # 日志目录
│   └── app/              # 应用日志
├── session/              # Session 目录
├── temp/                 # 临时文件目录
└── think/                # ThinkPHP 运行时目录
```

- **功能**: 存储运行时生成的文件
- **结构**: 按功能模块划分目录
- **特性**: 自动生成，无需手动维护
- **权限**: 需要可写权限

## 9. 核心目录结构 (thinkphp/)

```
thinkphp/
├── lang/                 # 语言包目录
├── library/              # 核心类库目录
├── tpl/                  # 模板目录
├── base.php              # 基础定义文件
├── composer.json         # Composer 配置文件
└── helper.php            # 助手函数文件
```

- **功能**: 存储 ThinkPHP 框架核心代码
- **结构**: 框架默认结构
- **特性**: 独立于应用代码
- **升级**: 通过 Composer 升级

## 10. 第三方依赖目录结构 (vendor/)

```
vendor/
├── autoload.php          # 自动加载文件
├── composer/             # Composer 核心目录
├── symfony/              # Symfony 组件
├── topthink/             # ThinkPHP 组件
└── ...                   # 其他第三方依赖
```

- **功能**: 存储第三方依赖库
- **管理**: 通过 Composer 管理
- **结构**: 按依赖包名称划分目录
- **自动加载**: 通过 `autoload.php` 自动加载

## 11. 目录结构最佳实践

### 11.1 命名规范

- **目录名**: 小写字母，单词之间用下划线分隔
- **文件名**: 与类名一致，使用 PascalCase 命名风格
- **类名**: 使用 PascalCase 命名风格
- **方法名**: 使用 camelCase 命名风格
- **变量名**: 使用 camelCase 命名风格

### 11.2 组织原则

- **模块化**: 按功能模块组织目录结构
- **分层架构**: 遵循 MVC + Service + DAO 分层架构
- **单一职责**: 每个目录和文件只负责一个功能
- **可扩展性**: 便于添加新功能和模块
- **易维护性**: 便于理解和维护

### 11.3 开发建议

- **遵循框架规范**: 遵循 ThinkPHP 框架目录结构规范
- **合理划分模块**: 根据业务功能合理划分模块
- **避免目录过深**: 目录层级不宜过深，一般不超过 4 层
- **保持目录整洁**: 及时清理无用文件和目录
- **文档化**: 为重要目录添加说明文档

## 12. 常见问题

### 12.1 目录权限问题

- **问题**: 运行时目录没有写权限
- **解决方案**: 执行 `chmod -R 777 runtime/` 赋予写权限

### 12.2 自动加载问题

- **问题**: 新增类无法自动加载
- **解决方案**: 执行 `composer dump-autoload` 更新自动加载

### 12.3 配置文件不生效

- **问题**: 修改配置文件后不生效
- **解决方案**: 清除配置缓存，执行 `php think clear`

### 12.4 目录结构混乱

- **问题**: 目录结构不清晰，难以维护
- **解决方案**: 重新组织目录结构，遵循模块化原则

## 13. 参考资源

- [ThinkPHP 6 目录结构](https://www.kancloud.cn/manual/thinkphp6_0/1037487)
- [MVC 架构设计](https://zh.wikipedia.org/wiki/MVC)
- [分层架构设计](https://zh.wikipedia.org/wiki/分层架构)
- [模块化设计](https://zh.wikipedia.org/wiki/模块化设计)