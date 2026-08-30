---
name: PHP后端开发说明
description: PHP后端开发skill说明
---

# PHP后端开发说明

## 0. 自动触发说明

### 0.1 触发条件

#### 0.1.1 操作触发
- **文件浏览时**: 当浏览 PHP 后端相关目录时自动调用
  - 打开 `app/` 目录时触发
  - 打开 `crmeb/` 核心库目录时触发
  - 浏览控制器、模型、服务目录时触发
  - 查看配置文件目录时触发
- **文件操作时**: 当对 PHP 后端文件进行操作时自动调用
  - 创建新 PHP 文件时触发
  - 修改后端代码时触发
  - 删除 PHP 文件时触发
- **目录操作时**: 当对 PHP 后端目录进行操作时自动调用
  - 创建新后端目录时触发
  - 重命名后端目录时触发
  - 删除后端目录时触发

#### 0.1.2 内容触发
- **关键词触发**: 当文件内容包含以下关键词时自动调用
  - 后端关键词: `后端`、`PHP`、`服务器`、`API`、`接口`
  - 框架关键词: `ThinkPHP`、`TP6`、`框架`、`路由`、`控制器`
  - 功能关键词: `登录`、`注册`、`支付`、`订单`、`用户`
- **代码触发**: 当查看特定类型 PHP 代码时自动调用
  - 控制器代码 (`Controller`)
  - 模型代码 (`Model`)
  - 服务代码 (`Service`)
  - 配置代码 (`Config`)
  - 路由代码 (`Route`)

#### 0.1.3 命令触发
- **终端命令触发**: 当执行以下命令时自动调用
  - `php think` (ThinkPHP 命令)
  - `composer` (依赖管理命令)
  - `php` (PHP 执行命令)
  - `artisan` (Laravel 命令，如需)

### 0.2 适用场景

#### 0.2.1 核心场景
- **后端开发**: 开发 PHP 后端功能时
- **API 开发**: 开发 RESTful API 接口时
- **业务逻辑实现**: 实现核心业务逻辑时
- **数据操作**: 进行数据库操作时

#### 0.2.2 辅助场景
- **代码调试**: 调试 PHP 后端代码时
- **性能优化**: 优化后端性能时
- **安全加固**: 增强后端安全性时
- **架构设计**: 设计后端架构时

### 0.3 触发机制

#### 0.3.1 调用时机
- **实时触发**: PHP 文件操作时立即触发
- **延迟触发**: 复杂目录操作时延迟1秒触发
- **批量触发**: 批量文件操作时合并触发

#### 0.3.2 调用频率
- 文件浏览: 最多每10秒触发一次
- 文件操作: 最多每5秒触发一次
- 命令执行: 最多每3秒触发一次

#### 0.3.3 调用优先级
- **优先级等级**: 中等优先级 (3/5)
- **竞争处理**: 当多个技能同时触发时
  - 最高优先级: 系统核心技能
  - 高优先级: 代码结构技能
  - 中等优先级: PHP 后端技能、前端技能、移动端技能
  - 低优先级: 辅助工具技能
- **触发限制**: 仅在 PHP 后端相关操作时被触发，不影响其他技能的正常使用

### 0.4 触发后行为

#### 0.4.1 自动分析
- **代码分析**: 分析 PHP 代码结构和质量
- **依赖分析**: 分析代码依赖关系
- **性能分析**: 分析代码性能瓶颈
- **安全分析**: 分析代码安全隐患

#### 0.4.2 自动展示
- **目录结构**: 展示 PHP 后端目录结构
- **代码说明**: 展示核心代码功能说明
- **技术栈**: 展示后端技术栈
- **开发规范**: 展示 PHP 开发规范

#### 0.4.3 自动建议
- **开发建议**: 提供 PHP 后端开发建议
- **优化建议**: 提供性能优化建议
- **规范建议**: 提供代码规范遵循建议
- **安全建议**: 提供安全防护建议

## 1. PHP 后端架构

### 1.1 整体架构
- **框架**: ThinkPHP 6.x
- **架构模式**: MVC + Service + DAO 分层架构
- **设计模式**: 单例、工厂、依赖注入等
- **数据库**: MySQL 5.7~8.0
- **缓存**: Redis (推荐)
- **队列**: ThinkPHP 内置队列

### 1.2 技术栈
- **PHP**: 7.1~7.4
- **ThinkPHP**: 6.x
- **MySQL**: 5.7+
- **Redis**: 5.0+
- **Composer**: 依赖管理
- **Workerman**: 长连接服务

### 1.3 目录结构

#### 1.3.1 核心目录
```
app/
├── api/              # API 接口层
├── controller/       # 控制器层
├── dao/              # 数据访问层
├── model/            # 模型层
├── services/         # 业务逻辑层
├── event/            # 事件处理层
├── middleware/       # 中间件层
└── validate/         # 数据验证层
```

#### 1.3.2 配置目录
```
config/
├── app.php           # 应用配置
├── database.php      # 数据库配置
├── route.php         # 路由配置
├── cache.php         # 缓存配置
└── queue.php         # 队列配置
```

#### 1.3.3 核心库目录
```
crmeb/
├── basic/            # 基础类库
├── exception/        # 异常处理
└── services/         # 核心服务
```

## 2. 核心模块

### 2.1 控制器模块
- **功能**: 处理 HTTP 请求，路由分发，响应客户端
- **特点**: RESTful 风格，分层清晰，参数验证
- **关键文件**: `BaseController.php` (控制器基类)
- **示例代码**:
  ```php
  <?php
  namespace app\controller;
  
  use app\BaseController;
  
  class UserController extends BaseController
  {
      public function index()
      {
          return $this->success('获取用户列表成功', $data);
      }
  }
  ```

### 2.2 服务模块
- **功能**: 实现核心业务逻辑，封装业务规则
- **特点**: 业务逻辑集中，可复用性高，易于测试
- **关键文件**: 各业务服务类
- **示例代码**:
  ```php
  <?php
  namespace app\services;
  
  use crmeb\basic\BaseServices;
  
  class UserServices extends BaseServices
  {
      public function createUser($data)
      {
          // 业务逻辑实现
          return $userId;
      }
  }
  ```

### 2.3 数据访问模块
- **功能**: 封装数据库操作，提供数据访问方法
- **特点**: SQL 集中管理，防止 SQL 注入，提高安全性
- **关键文件**: 各数据访问对象类
- **示例代码**:
  ```php
  <?php
  namespace app\dao;
  
  use crmeb\basic\BaseDao;
  
  class UserDao extends BaseDao
  {
      public function getUserById($id)
      {
          return $this->where('id', $id)->find();
      }
  }
  ```

### 2.4 模型模块
- **功能**: 定义数据模型，处理数据关系
- **特点**: ORM 映射，自动表结构，关联查询
- **关键文件**: `BaseModel.php` (模型基类)
- **示例代码**:
  ```php
  <?php
  namespace app\model;
  
  use crmeb\basic\BaseModel;
  
  class User extends BaseModel
  {
      protected $table = 'user';
      protected $pk = 'id';
  }
  ```

### 2.5 路由模块
- **功能**: 定义 URL 路由规则，分发请求
- **特点**: RESTful 风格，路由分组，中间件支持
- **关键文件**: `route/api.php`、`route/app.php`
- **示例代码**:
  ```php
  <?php
  use think\facade\Route;
  
  Route::get('user/:id', 'User/read');
  Route::post('user', 'User/save');
  Route::put('user/:id', 'User/update');
  Route::delete('user/:id', 'User/delete');
  ```

## 3. 开发规范

### 3.1 代码规范
- **PHP 规范**: 遵循 PSR-2 命名规范
- **命名规范**:
  - 类名: PascalCase
  - 方法/变量: camelCase
  - 常量: 全大写，下划线分隔
  - 文件名: 与类名一致，PascalCase
- **代码缩进**: 4空格缩进，禁止制表符
- **注释规范**: 方法注释、类注释、关键逻辑注释

### 3.2 目录规范
- **按功能模块组织**: 相同功能的代码放在同一目录
- **目录层次清晰**: 避免过深的目录嵌套
- **命名语义化**: 目录名应反映其功能

### 3.3 数据库规范
- **表名**: 小写下划线分隔
- **主键**: 统一命名为 `id`
- **外键**: 格式 `表名_id`
- **时间字段**: `create_time`/`update_time`
- **状态字段**: `status`，默认值 0

### 3.4 API 规范
- **RESTful 风格**: 使用标准 HTTP 方法
- **响应格式**: 统一 JSON 格式
- **错误处理**: 使用统一的错误码和错误信息
- **参数验证**: 严格的参数验证

## 4. 最佳实践

### 4.1 开发流程
1. **需求分析**: 明确功能需求和技术方案
2. **架构设计**: 设计模块结构和数据库结构
3. **代码实现**: 遵循开发规范编码
4. **测试验证**: 单元测试和功能测试
5. **代码审查**: 代码质量检查
6. **部署上线**: 构建和部署

### 4.2 性能优化
- **数据库优化**: 索引优化，SQL 优化
- **缓存策略**: 合理使用 Redis 缓存
- **代码优化**: 减少循环嵌套，优化算法
- **请求优化**: 合并请求，减少 HTTP 调用

### 4.3 安全防护
- **SQL 注入防护**: 使用参数绑定，避免直接拼接 SQL
- **XSS 防护**: 输入验证和输出编码
- **CSRF 防护**: 使用 Token 验证
- **权限控制**: 严格的权限验证机制
- **敏感信息保护**: 加密存储敏感信息

### 4.4 代码复用
- **抽象公共逻辑**: 将公共逻辑抽象为服务或工具类
- **使用 Traits**: 复用代码片段
- **继承基类**: 继承基础类获得通用功能
- **依赖注入**: 提高代码可测试性和可维护性

## 5. 常见问题

### 5.1 性能问题
- **数据库查询慢**: 检查索引，优化 SQL
- **内存占用高**: 检查大数组，优化内存使用
- **响应时间长**: 检查业务逻辑，使用缓存

### 5.2 安全问题
- **SQL 注入**: 使用参数绑定，避免直接拼接 SQL
- **XSS 攻击**: 对输入进行验证和过滤
- **CSRF 攻击**: 实现 CSRF Token 验证
- **权限绕过**: 严格检查权限，避免逻辑漏洞

### 5.3 部署问题
- **环境配置**: 确保生产环境配置正确
- **依赖管理**: 使用 Composer 管理依赖
- **缓存清理**: 部署后清理缓存
- **日志管理**: 配置合理的日志级别

### 5.4 代码问题
- **命名不规范**: 遵循命名规范
- **注释不足**: 添加必要的注释
- **逻辑混乱**: 重构代码，提高可读性
- **重复代码**: 抽象公共逻辑，减少重复

## 6. 开发工具推荐

### 6.1 IDE 推荐
- **PHPStorm**: 专业的 PHP IDE，功能强大
- **VS Code**: 轻量级编辑器，丰富的插件
- **Sublime Text**: 快速的代码编辑器

### 6.2 插件推荐
- **PHP Inspections**: PHP 代码检查插件
- **Laravel Idea**: Laravel 开发插件 (如需)
- **GitLens**: Git 增强插件
- **Debugger for Chrome**: 浏览器调试插件

### 6.3 工具推荐
- **Composer**: PHP 依赖管理工具
- **PHPUnit**: PHP 单元测试框架
- **Postman**: API 测试工具
- **MySQL Workbench**: 数据库设计工具
- **Redis Desktop Manager**: Redis 管理工具

## 7. 参考资源

### 7.1 官方文档
- [ThinkPHP 6 官方文档](https://www.kancloud.cn/manual/thinkphp6_0)
- [PHP 官方文档](https://www.php.net/docs.php)
- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [Redis 官方文档](https://redis.io/documentation)

### 7.2 学习资源
- [Laravel 学院](https://learnku.com/laravel)
- [PHP 中文网](https://www.php.cn/)
- [ThinkPHP 社区](https://www.thinkphp.cn/)
- [Stack Overflow](https://stackoverflow.com/)

### 7.3 代码规范
- [PSR 标准](https://www.php-fig.org/psr/)
- [ThinkPHP 代码规范](https://www.thinkphp.cn/doc)
- [PHP 最佳实践](https://phpbestpractices.org/)

### 7.4 其他资源
- 接口开发流程文档 ./references/api_create.md
- 代码规范文档 ./references/code_style.md
- 数据库设计文档 ./references/db_design.md
- 项目部署文档 ./references/deploy.md
- 目录结构文档 ./references/directory_structure.md
- 错误码文档 ./references/error_code.md
- 系统配置文档 ./references/system_config.md
- 接口请求流程文档 ./references/api_flow.md

