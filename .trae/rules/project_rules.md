---
alwaysApply: false
description: 
---
# CRMEB 项目专属 Chat 规则

## 1. 项目概述
- **名称**: CRMEB 开源商城系统（PHP版） 
- **技术栈**: ThinkPHP 6 + ElementUI + UniApp
- **版本**: 5.6.4
- **许可证**: Apache-2.0

## 2. 代码风格规范

### 2.1 PHP 规范
- 遵循 PSR-2 命名规范
- 使用 Restful 接口设计
- 代码分层清晰，注释简洁
- 类名 PascalCase，方法/变量 camelCase
- 常量全大写，下划线分隔
- 4空格缩进，禁止制表符

### 2.2 Vue 规范
- 组件名 PascalCase
- 方法/变量 camelCase
- 模板使用 kebab-case
- 遵循 Vue 官方风格指南

### 2.3 数据库规范
- 表名小写下划线分隔
- 主键统一命名为 `id`
- 外键格式 `表名_id`
- 时间字段 `create_time`/`update_time`
- 状态字段 `status`，默认值 0

## 3. 技术选择限制
- **后端**: ThinkPHP 6.x（禁止升级到 7.x）
- **前端**: Vue 2.x + ElementUI（Admin）、UniApp（移动端）、Nuxt（PC）
- **数据库**: MySQL 5.7~8.0（InnoDB）
- **缓存**: Redis（推荐）
- **队列**: ThinkPHP 内置队列
- **长连接**: Workerman

## 4. 开发流程规范

### 4.1 开发环境
- PHP 7.1~7.4
- 开发工具：PHPStorm/VS Code
- 版本控制：Git

### 4.2 代码提交
- 提交信息清晰，中文描述
- 格式：`[模块名] 操作描述`
- 禁止一次提交多个不相关功能

### 4.3 二开流程
1. 阅读项目文档和代码注释
2. 使用代码生成工具创建基础功能
3. 遵循系统架构，不破坏原有结构
4. 使用系统事件扩展功能
5. 测试通过后提交

## 5. 安全规范
- 操作必须记录系统日志
- 敏感数据加密存储
- 禁止直接拼接 SQL，使用参数绑定
- 验证用户输入，防止 XSS/CSRF 攻击
- 使用内置权限管理系统，禁止硬编码权限
- 合理使用缓存，减少数据库查询
- 高并发场景使用队列处理

## 6. 部署规范

### 6.1 运行环境
- 操作系统：Linux/Windows
- Web 服务器：Nginx/Apache/IIS
- PHP 扩展：fileinfo（可选）、redis（可选）
- 禁用危险函数：`proc_open`、`pcntl_signal` 等

### 6.2 启动命令
- 消息队列：`php think queue:listen --queue`（Supervisor 管理）
- 长连接：`sudo -u www php think workerman start --d`
- 定时任务：`php think timer start --d`

## 7. 常用开发命令
- 代码生成：`php think crmeb:build`
- 数据库迁移：`php think migrate:run`
- 查看路由：`php think route:list`
- 清除缓存：`php think clear`

## 8. 文档与支持
- 官方文档：https://doc.crmeb.com/single_open
- 技术社区：https://www.crmeb.com/ask/thread/list/147

## 9. 注意事项
- 确保代码兼容 PHP 7.1~7.4
- 前端兼容主流浏览器和移动端系统
- 避免复杂 SQL 关联查询
- 大数组分批处理
- 保持代码简洁，注释适当
- 遵循单一职责原则

## 10. 违规处理
- 违反规范的提交将被拒绝
- 影响系统稳定性的代码将被回滚
- 多次违规者禁止提交代码

---

以上规则适用于 CRMEB 项目所有开发人员，确保代码一致性、可维护性和安全性。