# CRMEB电商系统Skill包

## 📦 包说明

这是一个完整的CRMEB开源电商系统开发指南Skill包，旨在帮助开发者快速理解、上手和开发CRMEB项目。

## 🎯 适用人群

- **新手开发者**：快速了解CRMEB项目架构和开发流程
- **后端开发者**：学习ThinkPHP 6后端开发规范
- **前端开发者**：学习管理端和移动端开发
- **全栈开发者**：掌握完整的电商系统开发
- **项目经理**：了解项目结构和技术栈

## 📚 包含内容

### 主文档

- **[SKILL.md](./SKILL.md)** - 主Skill文件，项目概览和快速参考
  - 项目概述和架构
  - 目录结构详解
  - 核心业务模块介绍
  - 开发规范和最佳实践
  - 常用命令速查
  - 环境配置指南

### 参考文档

- **[references/quick_start.md](./references/quick_start.md)** - 快速开始指南
  - Docker一键部署
  - 手动安装步骤
  - 环境配置详解
  - 常见问题排查

- **[references/api_flow.md](./references/api_flow.md)** - API请求流程详解
  - API生命周期
  - 请求处理流程
  - 统一响应格式
  - 认证与授权
  - 参数验证
  - 错误处理
  - 性能优化

- **[references/code_style.md](./references/code_style.md)** - 代码规范
  - 命名规范
  - 代码分层规范
  - 控制器层规范
  - 服务层规范
  - DAO层规范
  - 模型层规范
  - 注释规范

- **[references/db_design.md](./references/db_design.md)** - 数据库设计规范
  - 表命名规范
  - 字段命名规范
  - 索引设计
  - 关联关系设计
  - 数据迁移

- **[references/system_config.md](./references/system_config.md)** - 系统配置详解
  - 应用配置
  - 数据库配置
  - Redis配置
  - 队列配置
  - Workerman配置
  - 第三方服务配置

- **[references/mcp_integration.md](./references/mcp_integration.md)** - MCP接口集成
  - MCP接口说明
  - 调用方式
  - 示例代码

## 🚀 快速开始

### 方式一：使用Docker（推荐）

```bash
# 1. 克隆项目
git clone https://gitee.com/ZhongBangKeJi/CRMEB.git
cd CRMEB

# 2. 启动服务
docker-compose up -d

# 3. 访问系统
# 后台：http://localhost:8011/admin (admin/crmeb.com)
# 前台：http://localhost:8011
```

详细步骤请查看：[references/quick_start.md](./references/quick_start.md)

### 方式二：手动安装

```bash
# 1. 克隆项目
git clone https://gitee.com/ZhongBangKeJi/CRMEB.git
cd CRMEB

# 2. 安装依赖
cd crmeb && composer install
cd ../template/admin && npm install
cd ../uni-app && npm install

# 3. 配置环境
cp crmeb/.env.example crmeb/.env
# 编辑.env文件，配置数据库和Redis

# 4. 导入数据库
mysql -u root -p crmeb < database.sql

# 5. 启动服务
# 后端：配置Nginx/Apache，指向crmeb/public
# 队列：php think queue:listen --queue
# 前端：npm run dev/build
```

详细步骤请查看：[references/quick_start.md](./references/quick_start.md)

## 📖 学习路径

### 阶段一：项目了解（10分钟）

1. 阅读 [SKILL.md](./SKILL.md) 的"项目概述"章节
2. 了解技术架构和核心特点
3. 查看目录结构
4. 熟悉核心业务流程

### 阶段二：环境搭建（30分钟）

1. 按照 [references/quick_start.md](./references/quick_start.md) 部署项目
2. 熟悉后台管理功能
3. 体验前端商城流程
4. 验证各项功能是否正常

### 阶段三：后端开发（2-3小时）

1. 阅读 [SKILL.md](./SKILL.md) 的"核心业务模块"章节
2. 查看 [references/api_flow.md](./references/api_flow.md) 了解API开发
3. 学习代码分层规范：[references/code_style.md](./references/code_style.md)
4. 尝试使用代码生成器创建CRUD
5. 开发一个简单的功能模块

### 阶段四：前端开发（管理端）

1. 阅读管理端前端文档
2. 了解Vue 2.x + Element UI开发
3. 学习API调用方式
4. 开发一个管理端页面

### 阶段五：移动端开发

1. 阅读UniApp开发文档
2. 了解跨端开发特性
3. 学习移动端API调用
4. 开发或修改一个页面

### 阶段六：高级特性

1. 学习队列使用
2. 了解定时任务
3. 掌握WebSocket实时通信
4. 阅读MCP接口文档
5. 优化系统性能

## 🔧 开发工具

### 后端开发
- **IDE**: PhpStorm / VS Code
- **API测试**: Postman / Apifox
- **数据库**: Navicat / phpMyAdmin
- **Redis**: Redis Desktop Manager

### 前端开发
- **IDE**: VS Code / WebStorm
- **浏览器**: Chrome（推荐）
- **调试工具**: Vue DevTools

### 移动端开发
- **IDE**: HBuilderX（官方推荐）
- **模拟器**: 微信开发者工具 / 真机调试

## 📌 开发建议

### 1. 使用代码生成器

在后台管理中，使用"代码生成器"可以快速生成CRUD代码，大大提高开发效率。

### 2. 遵循开发规范

务必遵循项目开发规范：[references/code_style.md](./references/code_style.md)

### 3. 使用事件系统

合理使用系统事件，解耦业务逻辑，提高代码可维护性。

### 4. 编写注释

为复杂业务逻辑编写清晰的注释，方便团队协作。

### 5. 使用队列

将耗时操作（发送短信、生成海报等）放入队列，提高响应速度。

### 6. 注意安全性

- 验证所有用户输入
- 使用参数绑定防止SQL注入
- 敏感数据加密存储
- 严格权限控制

## 🤝 贡献指南

如果你在使用过程中发现文档有误或需要补充，欢迎提交PR或Issue。

**贡献方式：**
1. Fork本仓库
2. 修改或补充文档
3. 提交Pull Request

## 📞 获取帮助

- **技术社区**: https://www.crmeb.com/ask/thread/list/147
- **官方文档**: https://doc.crmeb.com
- **在线客服**: https://www.crmeb.com
- **GitHub Issues**: https://gitee.com/ZhongBangKeJi/CRMEB/issues

## 📝 更新日志

### v1.0.0 (2025-03-17)
- 初始版本发布
- 包含项目概览、快速开始、API流程等核心文档
- 完整的开发规范和最佳实践

## 📄 许可证

本项目基于 [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) 协议开源。

## 🙏 致谢

感谢CRMEB开源社区和所有贡献者。

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-17
**维护者**: CRMEB开源社区
