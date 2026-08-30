---
name: CRMEB电商系统完整开发指南
description: 完整的CRMEB开源电商系统开发指南，包含后端API、管理端、移动端uniapp的全栈开发说明，帮助开发者快速理解和开发CRMEB项目
version: 1.0.0
tags: [电商, CRMEB, ThinkPHP, Vue, UniApp, 全栈开发]
---

# CRMEB电商系统完整开发指南

## 0. 项目概述

### 0.1 项目简介

CRMEB是一款高品质的开源电商系统，基于Apache-2.0协议，100%开源免费商用。系统采用前后端分离架构，支持多端覆盖（公众号、小程序、H5、APP、PC），内置20+核心营销模块。

**核心特点：**
- ✅ 100%开源，Apache-2.0协议，无任何隐藏费用
- ✅ 前后端分离，ThinkPHP 6 + Vue 2.x + UniApp
- ✅ 多端覆盖，数据实时互通
- ✅ 20+营销模块（拼团、砍价、秒杀、优惠券、直播等）
- ✅ 代码生成器，快速开发增删改查
- ✅ 强大的权限管理系统（RBAC）
- ✅ 支持队列、定时任务、WebSocket实时通信
- ✅ Docker一键部署

### 0.2 技术架构

**后端架构：**
- **框架**: ThinkPHP 6.x (PHP 7.1-7.4)
- **架构模式**: MVC + Service + DAO 分层架构
- **数据库**: MySQL 5.7-8.0 (InnoDB引擎)
- **缓存**: Redis (可选)
- **消息队列**: ThinkPHP Queue + Workerman
- **实时通信**: Workerman WebSocket

**前端架构：**
- **管理端**: Vue 2.x + Element UI + Vuex + Vue Router
- **移动端**: UniApp + uView UI (支持小程序、H5、APP)
- **PC端**: Nuxt.js (Vue SSR)

**项目地址：**
- **官网**: https://www.crmeb.com
- **Gitee**: https://gitee.com/ZhongBangKeJi/CRMEB
- **在线体验**: http://v5.crmeb.net/admin (账号: demo, 密码: crmeb.com)

### 0.3 快速开始

**Docker一键部署：**
```bash
# 启动服务
docker-compose up -d

# 访问地址
# 网站: http://localhost:8011
# MySQL: localhost:33061 (root/123456)
# Redis: localhost:63791 (123456)
```

**默认账号：**
- 后台管理: http://localhost:8011/admin (admin/crmeb.com)
- 移动端: http://localhost:8011

## 1. 目录结构

### 1.1 后端核心目录 (`/crmeb`)

```
crmeb/
├── app/                              # 应用目录
│   ├── adminapi/                     # 后台管理API
│   │   ├── controller/               # 控制器层
│   │   ├── middleware/               # 中间件
│   │   ├── route/                    # 路由定义
│   │   └── validate/                 # 验证器
│   ├── api/                          # 移动端API
│   ├── kefuapi/                      # 客服端API
│   ├── outapi/                       # 外部接口API（MCP）
│   ├── dao/                          # 数据访问层（180+文件）
│   ├── model/                        # 数据模型层（150+文件）
│   ├── services/                     # 业务服务层（230+文件）
│   │   ├── user/                     # 用户服务
│   │   ├── product/                  # 商品服务
│   │   ├── order/                    # 订单服务
│   │   ├── activity/                 # 营销服务
│   │   ├── agent/                    # 分销服务
│   │   └── system/                   # 系统服务
│   ├── jobs/                         # 队列任务（30+任务）
│   ├── listener/                     # 事件监听器（20+监听器）
│   └── common.php                    # 公共函数
├── crmeb/                            # 核心框架目录
│   ├── basic/                        # 基础类库
│   │   ├── BaseController.php
│   │   ├── BaseServices.php
│   │   ├── BaseDao.php
│   │   └── BaseModel.php
│   └── ...
├── config/                           # 配置文件
├── public/                           # Web入口
├── runtime/                          # 运行时文件
└── .env                              # 环境配置
```

### 1.2 前端目录

**管理端 (`/template/admin`):**
```
template/admin/src/
├── api/                  # API接口定义
├── assets/               # 静态资源
├── components/           # 通用组件
├── pages/                # 页面组件
├── router/               # 路由配置
├── store/                # Vuex状态管理
└── utils/                # 工具函数
```

**移动端 (`/template/uni-app`):**
```
template/uni-app/
├── pages/                  # 页面目录
│   ├── index/              # 首页
│   ├── goods/              # 商品
│   ├── cart/               # 购物车
│   ├── order/              # 订单
│   └── user/               # 用户中心
├── components/             # 组件目录
├── static/                 # 静态资源
├── utils/                  # 工具函数
└── api/                    # API接口
```

## 2. 核心业务模块

### 2.1 用户模块

**核心服务：**
- `UserServices` - 用户主服务
- `LoginServices` - 登录服务
- `UserBillServices` - 账单流水
- `UserMoneyServices` - 用户余额
- `UserLevelServices` - 用户等级

**数据表：**
```sql
eb_user              # 用户表
eb_user_bill        # 账单表
eb_user_extract     # 提现表
eb_user_level       # 用户等级表
```

**开发要点：**
- 支持多种登录方式（账号密码、手机验证码、微信授权）
- 余额变动必须记录账单
- 支持多级会员等级
- 标签分组实现精准营销

### 2.2 商品模块

**核心服务：**
- `StoreProductServices` - 商品主服务
- `StoreCategoryServices` - 商品分类
- `StoreProductAttrServices` - 商品属性
- `StoreProductReplyServices` - 商品评价

**数据表：**
```sql
eb_store_product        # 商品表
eb_store_category       # 分类表
eb_store_product_attr   # 属性表
eb_store_product_reply  # 评价表
```

**开发要点：**
- 支持多规格SKU，自动计算价格和库存
- 商品类型（普通、积分、预售、虚拟）
- 多级分类管理
- 商品采集（淘宝、京东）

### 2.3 订单模块

**核心服务：**
- `StoreOrderServices` - 订单主服务
- `StoreOrderCreateServices` - 订单创建
- `StoreOrderDeliveryServices` - 订单发货
- `StoreOrderRefundServices` - 订单退款
- `StoreCartServices` - 购物车

**数据表：**
```sql
eb_store_order          # 订单表
eb_store_order_cart     # 订单商品表
eb_store_order_status   # 订单状态记录表
eb_store_cart           # 购物车表
eb_store_refund         # 退款表
```

**订单状态流转：**
```
未支付 (0) → 待发货 (1) → 待收货 (2) → 已完成 (3)
   ↓             ↓
已取消 (-1)   退款中 (-2) → 已退款 (-3)
```

**开发要点：**
- 下单时扣减库存，取消订单恢复库存
- 支持多种支付方式（微信、支付宝、余额）
- 定时任务自动取消未支付订单
- 定时任务自动确认收货
- 订单状态变更触发系统事件

### 2.4 支付模块

**核心服务：**
- `PayServices` - 支付主服务
- `WechatPayServices` - 微信支付
- `AlipayServices` - 支付宝支付

**支付方式：**
- 微信支付（JSAPI、小程序、H5、扫码）
- 支付宝支付（手机网站、扫码）
- 余额支付
- 积分支付

**支付流程：**
```
1. 创建支付订单
2. 调用第三方支付接口
3. 返回支付参数给客户端
4. 客户端调起支付
5. 支付结果异步回调
6. 更新订单状态
7. 触发支付成功事件
```

**开发要点：**
- 支付回调必须验证签名
- 保证幂等性，避免重复支付
- 事务处理多个业务（订单、账单、通知等）
- 支持原路退款

### 2.5 营销模块

**2.5.1 优惠券**
- 支持通用券、品类券、商品券、新人券
- 可设置使用门槛、有效期、适用商品
- 下单时自动计算优惠金额
- 定时任务自动清理过期优惠券

**2.5.2 拼团**
- 创建拼团活动（拼团价、成团人数、时长）
- 用户发起拼团或参与拼团
- 拼团成功后创建订单
- 拼团失败自动退款

**2.5.3 砍价**
- 发起砍价活动，分享好友帮砍
- 每个好友可帮砍一次
- 达到底价或帮砍人数后可购买
- 超时未达成则砍价失败

**2.5.4 秒杀**
- 设置秒杀时间和库存
- 使用Redis缓存库存，防止超卖
- 限制用户购买数量
- 未支付订单自动恢复库存

**2.5.5 积分系统**
- 购物返积分、签到积分、任务积分
- 积分兑换商品或抵扣现金
- 设置积分有效期
- 定时任务清理过期积分

### 2.6 分销模块

**核心服务：**
- `AgentLevelServices` - 分销等级
- `AgentManageServices` - 分销员管理
- `DivisionServices` - 事业部管理

**分销流程：**
```
1. 用户申请成为分销员
2. 管理员审核通过
3. 分销员分享推广链接
4. 新用户注册成为下级
5. 下级用户下单
6. 计算分销佣金
7. 佣金结算到余额
```

**开发要点：**
- 支持多级分销（一级、二级、三级）
- 分销等级自动升级（完成任务）
- 佣金冻结期（防止退款）
- 佣金结算到分销员余额

### 2.7 系统管理模块

**2.7.1 代码生成器**
- 快速生成CRUD代码
- 支持自定义字段类型、搜索类型、表单类型
- 自动生成前后端代码
- 自动生成菜单和权限

**2.7.2 系统配置**
- 后台动态配置系统参数
- 支持多种配置类型
- 配置分组管理
- 配置缓存优化

**2.7.3 系统事件**
- 内置30+事件锚点
- 支持动态添加监听器
- 事件驱动解耦业务
- 支持异步事件处理

**核心事件：**
- `user.register` - 用户注册
- `user.login` - 用户登录
- `order.create` - 订单创建
- `order.pay_success` - 订单支付成功
- `pay.success` - 支付成功

**2.7.4 定时任务**
- 基于Workerman的定时任务
- 支持Cron表达式
- 后台动态配置

**系统预置任务：**
1. 自动取消未支付订单（30分钟）
2. 自动确认收货（每天）
3. 自动好评（每天）
4. 自动关闭拼团（10分钟）
5. 自动关闭砍价（10分钟）
6. 积分到期处理（每天）
7. 优惠券过期处理（每天）
8. 分销佣金结算（每天）

## 3. 开发规范

### 3.1 命名规范

**类命名：**
- 控制器：模块名 + Controller，如 `UserController`
- 服务：模块名 + Services，如 `UserServices`
- DAO：模块名 + Dao，如 `UserDao`
- 模型：模块名，如 `User`
- 验证器：模块名 + Validate，如 `UserValidate`

**方法命名：**
- 控制器：小写+下划线，如 `get_list`, `save_data`
- 服务：驼峰法，如 `getUserList`, `saveData`
- DAO：数据库操作相关，如 `selectList`, `insert`

### 3.2 代码分层规范

**控制器层：**
- 接收和验证请求参数
- 调用服务层处理业务
- 返回统一的JSON响应
- 不直接操作数据库

**服务层：**
- 实现核心业务逻辑
- 数据验证和权限验证
- 调用DAO层操作数据库
- 事务管理

**DAO层：**
- 封装数据库查询逻辑
- 构建查询条件
- 防止SQL注入
- 不提供业务逻辑

### 3.3 API响应格式

**成功响应：**
```json
{
    "code": 200,
    "msg": "操作成功",
    "data": {}
}
```

**分页响应：**
```json
{
    "code": 200,
    "msg": "操作成功",
    "data": {
        "list": [],
        "count": 100,
        "page": 1,
        "limit": 10
    }
}
```

**错误响应：**
```json
{
    "code": 400,
    "msg": "错误信息",
    "data": null
}
```

## 4. 常用命令

### 4.1 ThinkPHP命令
```bash
php think                     # 查看所有命令
php think make:controller     # 创建控制器
php think make:model          # 创建模型
php think make:middleware     # 创建中间件
php think make:validate       # 创建验证器
php think clear               # 清除缓存
php think run                 # 启动内置服务器
```

### 4.2 队列命令
```bash
php think queue:listen        # 监听队列
php think queue:work          # 处理队列任务
php think queue:restart       # 重启队列
php think queue:fail          # 查看失败任务
```

### 4.3 定时任务命令
```bash
php think timer start         # 启动定时任务
php think timer stop          # 停止定时任务
php think timer restart       # 重启定时任务
php think timer status        # 查看状态
```

### 4.4 Workerman命令
```bash
php think workerman start     # 启动WebSocket
php think workerman stop      # 停止WebSocket
php think workerman restart   # 重启WebSocket
php think workerman status    # 查看状态
```

## 5. 开发环境配置

### 5.1 环境要求
- PHP >= 7.1
- MySQL >= 5.7
- Redis >= 5.0（可选）
- Node.js >= 14
- Composer

### 5.2 数据库配置
```env
[DATABASE]
TYPE = mysql
HOSTNAME = 127.0.0.1
HOSTPORT = 3306
USERNAME = root
PASSWORD = 123456
DATABASE = crmeb
PREFIX = eb_
CHARSET = utf8mb4
```

### 5.3 Redis配置
```env
[CACHE]
DRIVER = redis
CACHE_PREFIX = cache_

[REDIS]
REDIS_HOSTNAME = 127.0.0.1
PORT = 6379
REDIS_PASSWORD = 123456
SELECT = 0
```

### 5.4 队列配置
```env
[QUEUE]
QUEUE_NAME = default
```

## 6. 常见问题

### 6.1 数据库连接错误
```bash
# 检查MySQL服务
systemctl status mysql

# 检查配置文件.env
# 测试连接
mysql -u root -p
```

### 6.2 队列不执行
```bash
# 检查队列消费者
php think queue:work

# 检查Redis连接
redis-cli ping

# 查看队列日志
tail -f runtime/log/queue.log
```

### 6.3 定时任务不执行
```bash
# 检查定时任务状态
php think timer status

# 查看定时任务日志
tail -f runtime/log/timer.log
```

### 6.4 WebSocket连接失败
```bash
# 检查WebSocket服务
php think workerman status

# 检查端口占用
netstat -tlnp | grep 40001
```

## 7. 参考资源

### 7.1 官方文档
- [ThinkPHP 6 官方文档](https://www.kancloud.cn/manual/thinkphp6_0)
- [Vue 2 官方文档](https://v2.vuejs.org/)
- [Element UI 官方文档](https://element.eleme.io/)
- [UniApp 官方文档](https://uniapp.dcloud.net.cn/)

### 7.2 项目文档
- 代码理解指南: `/help/dev-docs/AI代码理解指南.md`
- 错误码说明: `/help/dev-docs/错误码说明文档.md`
- 后端API文档: `/help/dev-docs/phpapi/`
- 移动端文档: `/help/dev-docs/uniapp/`
- 管理端文档: `/help/dev-docs/admin/`

### 7.3 开发工具
- **IDE**: PhpStorm / VS Code
- **API测试**: Postman / Apifox
- **数据库**: Navicat / phpMyAdmin
- **Redis**: Redis Desktop Manager

## 8. 获取帮助

### 8.1 技术社区
- CRMEB技术社区: https://www.crmeb.com/ask/thread/list/147
- 开源技术交流群: 查看项目README.md

### 8.2 官方支持
- 官网: https://www.crmeb.com
- 文档中心: https://doc.crmeb.com
- 在线客服: https://www.crmeb.com

### 8.3 问题反馈
- Gitee Issues: https://gitee.com/ZhongBangKeJi/CRMEB/issues
- 技术社区发帖: https://www.crmeb.com/ask/

## 9. 扩展阅读

### 9.1 专项Skill文档
本目录下还包含以下专项skill文档，点击对应文件查看详情：

- **crmeb-agent**: CRMEB电商系统Agent（智能开发助手）
- **php-api**: PHP后端开发专项说明
- **admin-element**: 管理端前端开发专项说明
- **uniapp**: 移动端UniApp开发专项说明

### 9.2 进阶文档
- **references/api_flow.md**: 接口请求流程详解
- **references/code_style.md**: 代码规范详解
- **references/db_design.md**: 数据库设计规范
- **references/system_config.md**: 系统配置说明

---

**最后更新**: 2025年3月17日
**维护者**: CRMEB开源社区
**版本**: v1.0.0
