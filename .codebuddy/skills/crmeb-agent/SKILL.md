---
name: CRMEB电商系统Agent
description: 专为CRMEB电商系统设计的智能开发助手,帮助开发者理解架构、快速开发功能、解决问题
---

# CRMEB电商系统Agent

## 0. 自动触发说明

### 0.1 触发条件

#### 0.1.1 操作触发
- **文件浏览时**: 当浏览CRMEB项目核心目录时自动调用
  - 打开 `crmeb/app/` 应用目录时触发
  - 打开 `crmeb/crmeb/` 核心库目录时触发
  - 打开 `template/` 前端目录时触发
  - 浏览配置文件目录时触发
- **文件操作时**: 当对CRMEB项目文件进行操作时自动调用
  - 创建控制器、服务、模型时触发
  - 修改核心业务代码时触发
  - 修改配置文件时触发
- **目录操作时**: 当对项目目录进行操作时自动调用
  - 创建新模块目录时触发
  - 重命名业务目录时触发

#### 0.1.2 内容触发
- **关键词触发**: 当文件内容包含以下关键词时自动调用
  - 电商关键词: `订单`、`商品`、`用户`、`支付`、`购物车`
  - 营销关键词: `优惠券`、`拼团`、`砍价`、`秒杀`、`积分`
  - 系统关键词: `CRMEB`、`ThinkPHP`、`后台管理`、`移动端`
- **代码触发**: 当查看特定类型代码时自动调用
  - 控制器代码 (`Controller`)
  - 服务层代码 (`Services`)
  - 模型代码 (`Model`)
  - 前端Vue组件 (`*.vue`)

#### 0.1.3 命令触发
- **终端命令触发**: 当执行以下命令时自动调用
  - `php think` (ThinkPHP命令)
  - `composer install/update` (依赖管理)
  - `npm run dev/build` (前端构建)
  - `php think queue:listen` (队列启动)
  - `php think workerman` (WebSocket启动)

### 0.2 适用场景

#### 0.2.1 核心场景
- **功能开发**: 开发新的电商功能模块时
- **API开发**: 开发前后端接口时
- **数据库设计**: 设计数据表结构时
- **问题排查**: 解决系统运行问题时

#### 0.2.2 辅助场景
- **代码审查**: 审查代码质量时
- **性能优化**: 优化系统性能时
- **安全加固**: 增强系统安全性时
- **部署运维**: 部署和维护系统时

## 1. CRMEB系统架构

### 1.1 整体架构
- **框架**: ThinkPHP 6.x (PHP后端) + Vue 2.x (前端)
- **架构模式**: 前后端分离 + MVC + Service + DAO分层架构
- **数据库**: MySQL 5.7-8.0 (使用eb_前缀)
- **缓存**: Redis (可选,用于缓存和队列)
- **消息队列**: ThinkPHP Queue + Workerman
- **实时通信**: Workerman WebSocket

### 1.2 技术栈

#### 后端技术栈
```
- PHP: 7.1-7.4
- ThinkPHP: 6.x
- Composer: 依赖管理
- Workerman: 长连接服务
- PHPUnit: 单元测试(可选)
```

#### 前端技术栈
```
管理端:
- Vue.js 2.x
- Element UI 2.15.6
- Vuex 3.0
- Vue Router 3.0
- Axios
- ECharts 4.8.0

移动端:
- UniApp
- uView UI
```

#### 第三方服务
```
- 支付: 微信支付、支付宝支付
- 存储: 阿里云OSS、腾讯云COS、七牛云
- 短信: 阿里云短信
- 微信: 公众号、小程序
```

### 1.3 目录结构

#### 1.3.1 后端目录结构
```
crmeb/
├── app/                          # 应用目录
│   ├── adminapi/                 # 后台管理API (多应用模式)
│   │   ├── controller/           # 控制器层
│   │   │   ├── system/           # 系统管理
│   │   │   ├── product/          # 商品管理
│   │   │   ├── order/            # 订单管理
│   │   │   ├── user/             # 用户管理
│   │   │   └── marketing/        # 营销管理
│   │   ├── middleware/           # 中间件
│   │   ├── route/                # 路由定义
│   │   └── validate/             # 验证器
│   ├── api/                      # 移动端API
│   ├── kefuapi/                  # 客服端API
│   ├── outapi/                   # 外部接口API
│   ├── dao/                      # 数据访问层
│   │   ├── UserDao.php
│   │   ├── StoreOrderDao.php
│   │   └── ...
│   ├── model/                    # 数据模型层
│   │   ├── User.php
│   │   ├── StoreOrder.php
│   │   └── ...
│   ├── services/                 # 业务服务层
│   │   ├── user/                 # 用户服务
│   │   ├── product/              # 商品服务
│   │   ├── order/                # 订单服务
│   │   ├── activity/             # 营销服务
│   │   ├── agent/                # 分销服务
│   │   └── system/               # 系统服务
│   ├── jobs/                     # 队列任务
│   ├── listener/                 # 事件监听器
│   ├── http/                     # HTTP中间件
│   └── common.php                # 公共方法
├── crmeb/                        # 核心框架目录
│   ├── basic/                    # 基础类库
│   │   ├── BaseServices.php      # 服务基类
│   │   ├── BaseDao.php           # DAO基类
│   │   ├── BaseModel.php         # 模型基类
│   │   └── BaseController.php    # 控制器基类
│   ├── command/                  # 命令行命令
│   │   ├── Timer.php             # 定时任务
│   │   └── Swoole.php            # Swoole服务
│   ├── services/                 # 核心服务
│   ├── traits/                   # Trait集合
│   ├── utils/                    # 工具类
│   └── exceptions/               # 异常类
├── config/                       # 配置文件
│   ├── app.php                   # 应用配置
│   ├── database.php              # 数据库配置
│   ├── cache.php                 # 缓存配置
│   ├── queue.php                 # 队列配置
│   ├── workerman.php             # Workerman配置
│   └── ...
├── route/                        # 主路由文件
├── public/                       # Web入口
│   ├── index.php                 # 前端入口
│   └── admin/                    # 后台前端文件
├── runtime/                      # 运行时文件
├── composer.json                 # Composer依赖
├── .env                          # 环境配置
└── think                         # ThinkPHP命令行工具
```

#### 1.3.2 前端目录结构
```
template/
├── admin/                        # 管理后台 (Vue + ElementUI)
│   ├── src/
│   │   ├── api/                  # API接口定义
│   │   ├── components/           # 通用组件
│   │   ├── pages/                # 页面组件
│   │   ├── router/               # 路由配置
│   │   ├── store/                # Vuex状态管理
│   │   └── utils/                # 工具函数
│   ├── package.json
│   └── vue.config.js
└── uni-app/                      # 移动端 (UniApp)
    ├── api/                      # API接口
    ├── components/               # 组件
    ├── pages/                    # 页面
    ├── manifest.json             # 应用配置
    └── pages.json                # 页面路由配置
```

## 2. 核心业务模块

### 2.1 用户模块 (`app/services/user/`)

#### 核心服务
- **UserServices**: 用户主服务,管理用户基础信息
- **LoginServices**: 登录服务,处理多种登录方式
- **UserLevelServices**: 用户等级管理
- **UserMoneyServices**: 用户余额管理
- **UserBillServices**: 账单流水管理
- **UserExtractServices**: 提现管理
- **UserRechargeServices**: 充值管理
- **UserGroupServices**: 用户分组
- **UserLabelServices**: 用户标签

#### 数据表
```sql
eb_user                  # 用户表
eb_user_bill             # 账单表
eb_user_extract          # 提现表
eb_user_recharge         # 充值表
eb_user_level            # 用户等级表
eb_user_group            # 用户分组表
eb_user_label            # 用户标签表
```

#### 开发要点
- 用户登录支持多种方式: 账号密码、手机验证码、微信授权
- 用户余额变动必须记录到账单表
- 用户等级可以设置升级条件
- 用户分组和标签用于精准营销

### 2.2 商品模块 (`app/services/product/`)

#### 核心服务
- **StoreProductServices**: 商品主服务
- **StoreCategoryServices**: 商品分类
- **StoreProductAttrServices**: 商品属性
- **StoreProductReplyServices**: 商品评价
- **CopyTaobaoServices**: 淘宝商品采集

#### 数据表
```sql
eb_store_product        # 商品表
eb_store_category       # 商品分类表
eb_store_product_attr   # 商品属性表
eb_store_product_reply  # 商品评价表
eb_store_product_description  # 商品详情表
```

#### 开发要点
- 商品支持多规格(SKU),需要处理库存和价格
- 商品可以设置为普通商品、积分商品、预售商品等
- 商品分类支持多级分类
- 商品属性支持自定义规格

### 2.3 订单模块 (`app/services/order/`)

#### 核心服务
- **StoreOrderServices**: 订单主服务
- **StoreOrderCreateServices**: 订单创建
- **StoreOrderDeliveryServices**: 订单发货
- **StoreOrderRefundServices**: 订单退款
- **StoreCartServices**: 购物车
- **OtherOrderServices**: 其他订单(积分订单等)
- **OutStoreOrderServices**: 外部订单

#### 数据表
```sql
eb_store_order          # 订单表
eb_store_order_cart     # 订单商品表
eb_store_order_status   # 订单状态变更记录
eb_store_refund         # 退款表
eb_store_cart           # 购物车表
```

#### 开发要点
- 订单状态流转: 未支付 → 待发货 → 待收货 → 已完成 (或取消/退款)
- 订单创建时需要扣减库存
- 支付成功后触发后续流程(发货通知、积分增加等)
- 订单退款需要恢复库存
- 订单相关操作建议使用队列异步处理

#### 订单状态流转图
```
未支付 (status=0)
   ↓ 支付成功
待发货 (status=1)
   ↓ 发货
待收货 (status=2)
   ↓ 确认收货
已完成 (status=3)

分支流程:
- 未支付 → 已取消 (status=-1)
- 待发货 → 申请退款 → 退款中 (status=-2) → 已退款 (status=-3)
- 待收货 → 申请退款 → 退款中 (status=-2) → 已退款 (status=-3)
```

### 2.4 支付模块 (`app/services/pay/`)

#### 核心服务
- **PayServices**: 支付服务
- **WechatPayServices**: 微信支付
- **AlipayServices**: 支付宝支付

#### 数据表
```sql
eb_pay                  # 支付记录表
```

#### 开发要点
- 支付方式: 微信支付(公众号/小程序/H5)、支付宝支付、余额支付
- 支付流程: 创建订单 → 调起支付 → 支付回调 → 更新订单状态
- 支付回调需要验证签名防止伪造
- 支付成功后触发事件,可以扩展后续业务逻辑

### 2.5 营销模块 (`app/services/activity/`)

#### 核心服务
- **拼团**: StoreCombinationServices, StorePinkServices
- **砍价**: StoreBargainServices
- **秒杀**: StoreSeckillServices
- **优惠券**: StoreCouponService, StoreCouponUserServices
- **积分**: StoreIntegralServices
- **直播**: LiveRoomServices, LiveGoodsServices
- **抽奖**: LuckLotteryServices

#### 数据表
```sql
eb_store_combination    # 拼团商品表
eb_store_pink           # 拼团记录表
eb_store_bargain        # 砍价商品表
eb_store_bargain_user   # 砍价记录表
eb_store_seckill        # 秒杀商品表
eb_store_coupon         # 优惠券表
eb_store_coupon_user    # 用户优惠券表
eb_integral_product     # 积分商品表
```

#### 开发要点
- 营销活动都需要设置时间范围
- 优惠券可以设置使用条件和适用商品
- 拼团需要处理拼团成功/失败的逻辑
- 砍价需要处理砍价进度和完成时间
- 秒杀商品需要限制库存和购买数量

### 2.6 分销模块 (`app/services/agent/`)

#### 核心服务
- **AgentLevelServices**: 分销等级管理
- **AgentLevelTaskServices**: 分销任务系统
- **DivisionServices**: 事业部/代理管理
- **SpreadApplyServices**: 分销申请

#### 数据表
```sql
eb_agent_level          # 分销等级表
eb_agent_level_task     # 分销任务表
eb_division             # 事业部表
eb_spread_apply         # 分销申请表
```

#### 开发要点
- 分销系统支持多级分销
- 分销员等级通过完成任务自动升级
- 分销佣金结算需要计算各级佣金
- 分销申请需要管理员审核

### 2.7 系统管理模块 (`app/services/system/`)

#### 核心服务
- **SystemCrudServices**: CRUD代码生成器
- **SystemConfigServices**: 系统配置
- **SystemEventServices**: 系统事件管理
- **SystemCrontabServices**: 定时任务管理
- **SystemMenusServices**: 菜单管理
- **SystemAdminServices**: 管理员管理
- **SystemLogServices**: 操作日志
- **SystemFileServices**: 文件管理
- **SystemUpgradeServices**: 系统升级

#### 开发要点
- **代码生成器**: 可以快速生成Controller、Service、DAO、Model、Validate
- **系统配置**: 支持后台动态配置,存储在数据库中
- **事件系统**: 定义了30+系统事件锚点,可以扩展业务逻辑
- **定时任务**: 基于Workerman,支持Cron表达式
- **权限管理**: 基于RBAC模型,可以控制到菜单和按钮级别

## 3. 开发规范

### 3.1 命名规范

#### 类命名
- **控制器**: 模块名 + Controller,如 `UserController`
- **服务**: 模块名 + Services,如 `UserServices`
- **DAO**: 模块名 + Dao,如 `UserDao`
- **模型**: 模块名,如 `User`
- **验证器**: 模块名 + Validate,如 `UserValidate`

#### 方法命名
- **控制器方法**: 小写+下划线,如 `get_list`, `save_data`
- **服务方法**: 驼峰法,如 `getUserList`, `saveData`
- **DAO方法**: 数据库操作相关,如 `selectList`, `insert`, `update`, `delete`

#### 变量命名
- **普通变量**: 驼峰法,如 `$userName`, `$orderId`
- **数组变量**: 复数形式,如 `$users`, `$products`
- **布尔变量**: is/has/can开头,如 `$isPaid`, `$hasStock`

### 3.2 代码规范

#### 控制器层
```php
<?php
namespace app\adminapi\controller\system;

use think\facade\App;
use app\services\system\SystemAdminServices;

/**
 * 管理员控制器
 */
class SystemAdminController
{
    protected $services;

    public function __construct(App $app, SystemAdminServices $services)
    {
        $this->services = $services;
    }

    /**
     * 获取管理员列表
     * @return mixed
     */
    public function get_list()
    {
        $where = $this->request->getMore([
            ['keywords', ''],
            ['status', '']
        ]);
        $list = $this->services->getAdminList($where);
        return app('json')->success($list);
    }

    /**
     * 保存管理员
     * @return mixed
     */
    public function save()
    {
        $data = $this->request->postMore([
            ['account', ''],
            ['real_name', ''],
            ['pwd', ''],
            ['roles', []],
            ['status', 1]
        ]);
        $this->services->saveAdmin($data);
        return app('json')->success('保存成功');
    }
}
```

#### 服务层
```php
<?php
namespace app\services\system;

use crmeb\basic\BaseServices;
use crmeb\exceptions\AdminException;

class SystemAdminServices extends BaseServices
{
    /**
     * 获取管理员列表
     * @param array $where
     * @return array
     */
    public function getAdminList(array $where): array
    {
        // 构建查询条件
        $query = $this->dao->search($where);

        // 获取列表
        $list = $query->select()->toArray();

        // 处理数据
        foreach ($list as &$item) {
            $item['role_names'] = $this->getRoleNames($item['roles']);
        }

        return $list;
    }

    /**
     * 保存管理员
     * @param array $data
     * @return int
     */
    public function saveAdmin(array $data): int
    {
        // 验证数据
        if (empty($data['account'])) {
            throw new AdminException('账号不能为空');
        }

        // 密码加密
        if (!empty($data['pwd'])) {
            $data['pwd'] = password_hash($data['pwd'], PASSWORD_DEFAULT);
        } else {
            unset($data['pwd']);
        }

        // 保存数据
        if (isset($data['id']) && $data['id']) {
            // 更新
            $id = $data['id'];
            unset($data['id']);
            $this->dao->update($id, $data);
        } else {
            // 新增
            $id = $this->dao->save($data);
        }

        return $id;
    }
}
```

#### DAO层
```php
<?php
namespace app\dao\system;

use crmeb\basic\BaseDao;
use app\model\system\SystemAdmin;

class SystemAdminDao extends BaseDao
{
    /**
     * 设置模型
     * @return string
     */
    protected function setModel(): string
    {
        return SystemAdmin::class;
    }

    /**
     * 搜索条件
     * @param array $where
     * @return \think\Model
     */
    public function search(array $where = [])
    {
        $query = $this->getModel()
            ->where('is_del', 0);

        // 账号搜索
        if (!empty($where['keywords'])) {
            $query = $query->whereLike('account|real_name', "%{$where['keywords']}%");
        }

        // 状态筛选
        if ($where['status'] !== '') {
            $query = $query->where('status', $where['status']);
        }

        return $query;
    }
}
```

#### 模型层
```php
<?php
namespace app\model\system;

use crmeb\basic\BaseModel;

class SystemAdmin extends BaseModel
{
    protected $name = 'system_admin';

    protected $pk = 'id';

    /**
     * 关联角色
     * @return \think\model\relation\BelongsToMany
     */
    public function roles()
    {
        return $this->belongsToMany(SystemRole::class, 'system_admin_role', 'role_id', 'admin_id');
    }

    /**
     * 密码修改器
     * @param $value
     * @return string
     */
    public function setPwdAttr($value)
    {
        return password_hash($value, PASSWORD_DEFAULT);
    }

    /**
     * 状态获取器
     * @param $value
     * @return string
     */
    public function getStatusTextAttr($value, $data)
    {
        $status = [
            0 => '禁用',
            1 => '启用'
        ];
        return $status[$data['status']] ?? '';
    }
}
```

### 3.3 数据库规范

#### 表命名
- 使用小写字母和下划线
- 统一使用 `eb_` 前缀
- 表名使用复数形式或明确含义

#### 字段命名
- 使用小写字母和下划线
- 字段名不以下划线开头
- 主键统一命名为 `id`
- 外键命名为 `表名_id`,如 `user_id`
- 时间字段命名为 `create_time`, `update_time`
- 状态字段命名为 `status`,默认值0
- 删除标记命名为 `is_del`,0未删除1已删除

#### 字段类型
- 整型: 使用 `int`,如 `tinyint`, `smallint`, `int`, `bigint`
- 字符串: 使用 `varchar`,如 `varchar(255)`
- 文本: 使用 `text`
- 金额: 使用 `decimal(10,2)`
- 时间: 使用 `int`(时间戳)或 `datetime`

### 3.4 API规范

#### 请求方式
- **GET**: 查询数据
- **POST**: 创建数据
- **PUT**: 更新数据
- **DELETE**: 删除数据

#### 响应格式
```json
{
    "code": 200,
    "msg": "操作成功",
    "data": {}
}
```

#### 错误响应
```json
{
    "code": 400,
    "msg": "错误信息",
    "data": null
}
```

#### 分页响应
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

## 4. 自动化功能

### 4.1 代码生成器

#### 使用方式
1. 在后台管理中进入"系统管理" > "代码生成"
2. 选择数据表
3. 配置生成参数(字段类型、搜索类型、表单类型等)
4. 生成代码

#### 支持的表单类型
- **input**: 普通输入框
- **textarea**: 文本域
- **select**: 下拉选择
- **radio**: 单选框
- **checkbox**: 复选框
- **date**: 日期选择
- **datetime**: 日期时间选择
- **image**: 图片上传
- **file**: 文件上传
- **editor**: 富文本编辑器
- **number**: 数字输入
- **switch**: 开关
- 等等

#### 支持的搜索类型
- **普通搜索**: 普通文本搜索
- **日期范围**: 日期区间搜索
- **时间范围**: 时间区间搜索
- **下拉选择**: 下拉筛选

### 4.2 定时任务

#### 启动命令
```bash
# 启动定时任务(守护进程)
php think timer start --d

# 停止定时任务
php think timer stop

# 重启定时任务
php think timer restart

# 查看定时任务状态
php think timer status
```

#### 系统预置定时任务
1. 自动取消未支付订单
2. 自动确认收货
3. 自动评价
4. 自动关闭拼团
5. 自动关闭砍价
6. 积分到期处理
7. 优惠券过期处理
8. 分销佣金结算
9. 统计数据汇总
10. 系统日志清理

### 4.3 队列任务

#### 启动命令
```bash
# 启动队列消费者
php think queue:listen --queue

# 或者使用Workerman
php think queue:work --queue
```

#### 主要队列任务
- **OrderJob**: 订单相关任务(创建、支付、发货等)
- **PinkJob**: 拼团任务
- **BargainJob**: 砍价任务
- **SeckillJob**: 秒杀任务
- **AutoCommentJob**: 自动评价
- **PosterJob**: 海报生成
- **AgentJob**: 分销等级升级检测
- **UnpaidOrderCancelJob**: 未支付订单取消
- 等等

### 4.4 事件系统

#### 系统事件锚点

**用户事件**:
- 用户注册 (user.register)
- 用户登录 (user.login)
- 用户注销 (user.logout)
- 用户修改信息 (user.update)
- 用户绑定推广 (user.bind_spread)
- 用户签到 (user.sign)
- 用户充值 (user.recharge)

**订单事件**:
- 订单创建 (order.create)
- 订单支付成功 (order.pay_success)
- 订单发货 (order.delivery)
- 订单收货 (order.confirm)
- 订单取消 (order.cancel)
- 订单退款 (order.refund)

**商品事件**:
- 商品上架 (product.on_shelf)
- 商品下架 (product.off_shelf)
- 商品评价 (product.comment)

**支付事件**:
- 支付成功 (pay.success)
- 支付失败 (pay.fail)

**营销事件**:
- 领取优惠券 (coupon.receive)
- 参与拼团 (combination.join)
- 参与砍价 (bargain.join)

#### 事件监听器开发
```php
<?php
namespace app\listener\order;

use think\Container;

/**
 * 订单支付成功监听器
 */
class OrderPaySuccessListener
{
    /**
     * 订单支付成功事件处理
     * @param $event
     * @return void
     */
    public function handle($event)
    {
        // $event 包含订单信息
        $order = $event['order'];

        // 业务逻辑
        // 1. 发送通知
        // 2. 增加积分
        // 3. 更新库存
        // 4. 触发分销佣金计算
        // ...
    }
}
```

### 4.5 WebSocket实时通信

#### 启动命令
```bash
# 启动WebSocket服务
php think workerman start --d
```

#### 服务配置
```php
// config/workerman.php
return [
    // 管理后台通知
    'admin' => [
        'protocol' => 'websocket',
        'port' => 40001,
        'ip' => '0.0.0.0',
    ],
    // 客服消息
    'chat' => [
        'protocol' => 'websocket',
        'port' => 40002,
        'ip' => '0.0.0.0',
    ],
    // 内部通讯
    'channel' => [
        'port' => 40003,
        'ip' => '127.0.0.1',
    ],
];
```

#### 使用场景
- 新订单实时通知
- 客服在线聊天
- 系统消息推送
- 实时数据统计

## 5. 常见开发场景

### 5.1 创建新功能模块

#### 步骤1: 创建数据表
```sql
CREATE TABLE `eb_example` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT '名称',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态 0禁用 1启用',
  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(11) NOT NULL DEFAULT '0' COMMENT '更新时间',
  `is_del` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='示例表';
```

#### 步骤2: 创建模型
```bash
# 使用命令行生成模型
php think make:model Example
```

#### 步骤3: 创建DAO
```php
<?php
namespace app\dao;

use crmeb\basic\BaseDao;
use app\model\Example;

class ExampleDao extends BaseDao
{
    protected function setModel(): string
    {
        return Example::class;
    }
}
```

#### 步骤4: 创建服务
```php
<?php
namespace app\services;

use crmeb\basic\BaseServices;
use app\dao\ExampleDao;

class ExampleServices extends BaseServices
{
    public function __construct(ExampleDao $dao)
    {
        $this->dao = $dao;
    }

    public function getList(array $where): array
    {
        return $this->dao->getList($where);
    }

    public function save(array $data): int
    {
        return $this->dao->save($data);
    }
}
```

#### 步骤5: 创建控制器
```php
<?php
namespace app\adminapi\controller;

use app\services\ExampleServices;

class ExampleController
{
    protected $services;

    public function __construct(ExampleServices $services)
    {
        $this->services = $services;
    }

    public function get_list()
    {
        $where = $this->request->getMore([
            ['name', ''],
            ['status', '']
        ]);
        $list = $this->services->getList($where);
        return app('json')->success($list);
    }

    public function save()
    {
        $data = $this->request->postMore([
            ['name', ''],
            ['status', 1]
        ]);
        $this->services->save($data);
        return app('json')->success('保存成功');
    }
}
```

#### 步骤6: 创建路由
```php
// route/app.php 或 route/adminapi.php
use think\facade\Route;

Route::group('example', function () {
    Route::get('list', 'Example/get_list');
    Route::post('save', 'Example/save');
});
```

#### 步骤7: 使用代码生成器(可选)
直接在后台管理系统配置代码生成,自动生成前后端代码

### 5.2 开发订单功能

#### 订单创建流程
1. 校验商品库存和状态
2. 计算订单金额
3. 创建订单记录
4. 创建订单商品记录
5. 扣减商品库存
6. 清空购物车
7. 触发订单创建事件

#### 订单支付流程
1. 调起支付(微信/支付宝/余额)
2. 接收支付回调
3. 验证签名
4. 更新订单状态为"待发货"
5. 扣减优惠券
6. 增加用户积分
7. 触发支付成功事件(分销、通知等)

#### 订单发货流程
1. 获取订单信息
2. 填写物流信息
3. 更新订单状态为"待收货"
4. 发送发货通知
5. 触发发货事件

#### 订单收货流程
1. 用户确认收货或系统自动收货(7天未收货)
2. 更新订单状态为"已完成"
3. 结算分销佣金
4. 增加用户积分
5. 触发收货事件

### 5.3 开发营销活动

#### 优惠券功能开发要点
1. 创建优惠券模板(面额、门槛、使用条件等)
2. 用户领取优惠券
3. 下单时选择优惠券
4. 计算优惠金额
5. 支付后核销优惠券
6. 过期自动失效

#### 拼团功能开发要点
1. 创建拼团商品(拼团价、成团人数、拼团时长)
2. 用户发起拼团
3. 其他人参与拼团
4. 拼团成功/失败判断
5. 成团后按拼团价计算订单
6. 失败后退款

#### 秒杀功能开发要点
1. 创建秒杀活动(时间、商品、库存、限购)
2. 用户参与秒杀
3. 检查库存和限购
4. 创建秒杀订单
5. 未支付订单自动取消
6. 活动结束后更新库存

### 5.4 开发分销功能

#### 分销流程
1. 用户申请成为分销员
2. 管理员审核通过
3. 分销员分享推广链接
4. 新用户通过链接注册成为下级
5. 下级用户下单
6. 系统计算分销佣金
7. 佣金结算到分销员余额

#### 分销等级升级
1. 创建分销等级(等级名称、佣金比例)
2. 设置升级任务(订单数、金额等)
3. 定时任务检测分销员任务完成情况
4. 达到条件自动升级

## 6. 问题排查指南

### 6.1 常见错误

#### 数据库连接错误
```php
// 错误信息
SQLSTATE[HY000] [2002] Connection refused

// 排查步骤
1. 检查数据库服务是否启动
2. 检查 .env 配置文件中的数据库配置
3. 检查数据库用户权限
4. 检查防火墙设置
```

#### 队列任务不执行
```php
// 排查步骤
1. 检查队列消费者是否启动: php think queue:work
2. 检查队列配置: config/queue.php
3. 检查Redis连接: redis-cli ping
4. 查看队列日志: runtime/log/
```

#### 定时任务不执行
```bash
# 排查步骤
1. 检查定时任务是否启动: php think timer status
2. 检查定时任务配置
3. 检查Cron表达式是否正确
4. 查看定时任务日志
```

#### WebSocket连接失败
```bash
# 排查步骤
1. 检查WebSocket服务是否启动: php think workerman status
2. 检查端口是否被占用: netstat -tlnp | grep 40001
3. 检查防火墙设置
4. 检查客户端连接地址是否正确
```

### 6.2 性能优化

#### 数据库优化
- 为常用查询字段添加索引
- 避免使用 `SELECT *`,只查询需要的字段
- 使用 `EXPLAIN` 分析SQL执行计划
- 合理使用缓存减少数据库查询

#### 缓存优化
- 使用Redis缓存热点数据
- 设置合理的缓存过期时间
- 使用缓存前缀防止冲突

#### 代码优化
- 减少循环嵌套
- 优化算法复杂度
- 使用队列处理耗时操作
- 异步处理非关键业务

### 6.3 安全加固

#### SQL注入防护
- 使用参数绑定,不要直接拼接SQL
- 使用ThinkPHP的查询构造器
- 对用户输入进行验证

#### XSS防护
- 对用户输入进行过滤
- 输出时进行HTML转义
- 使用CSP(内容安全策略)

#### CSRF防护
- 使用CSRF Token
- 验证请求来源
- 重要操作二次确认

#### 权限控制
- 严格的权限验证
- 基于RBAC的权限模型
- 敏感操作记录日志

## 7. 部署与运维

### 7.1 环境要求
- PHP >= 7.1
- MySQL >= 5.7
- Redis >= 5.0 (可选)
- Nginx/Apache
- Composer

### 7.2 部署步骤

#### 1. 安装依赖
```bash
composer install
```

#### 2. 配置环境
```bash
cp .env.example .env
# 修改 .env 文件中的配置
```

#### 3. 数据库初始化
```bash
# 导入数据库
mysql -u root -p crmeb < database.sql
```

#### 4. 设置目录权限
```bash
chmod -R 755 runtime
chmod -R 755 public/uploads
```

#### 5. 启动服务
```bash
# 启动队列
php think queue:listen --queue

# 启动定时任务
php think timer start --d

# 启动WebSocket
php think workerman start --d
```

#### 6. 前端构建
```bash
cd template/admin
npm install
npm run build
```

### 7.3 Docker部署

#### 使用docker-compose
```bash
cd docker-compose
docker-compose up -d
```

### 7.4 监控与日志

#### 日志位置
- 应用日志: `runtime/log/`
- 错误日志: `runtime/log/error/`
- SQL日志: 开启数据库SQL日志记录

#### 监控指标
- 服务器资源: CPU、内存、磁盘
- 应用性能: 响应时间、吞吐量
- 数据库: 慢查询、连接数
- 队列: 队列长度、处理速度

## 8. 参考资源

### 8.1 官方文档
- [ThinkPHP 6 官方文档](https://www.kancloud.cn/manual/thinkphp6_0)
- [Vue 2 官方文档](https://v2.vuejs.org/)
- [Element UI 官方文档](https://element.eleme.io/)
- [UniApp 官方文档](https://uniapp.dcloud.net.cn/)

### 8.2 项目文档
- `/dev-docs/AI代码理解指南.md` - 代码理解指南
- `/dev-docs/错误码说明文档.md` - 错误码说明
- `.codebuddy/skills/php-api/SKILL.md` - 后端开发规范
- `.codebuddy/skills/admin-element/SKILL.md` - 前端开发规范

### 8.3 工具推荐
- **IDE**: PhpStorm / VS Code
- **API测试**: Postman / Apifox
- **数据库**: Navicat / phpMyAdmin
- **Redis**: Redis Desktop Manager

## 9. 常用命令速查

### 9.1 ThinkPHP命令
```bash
php think                     # 查看所有命令
php think make:controller      # 创建控制器
php think make:model           # 创建模型
php think make:middleware      # 创建中间件
php think make:validate        # 创建验证器
php think clear                # 清除缓存
php think run                  # 启动内置服务器
```

### 9.2 队列命令
```bash
php think queue:listen        # 监听队列
php think queue:work           # 处理队列任务
php think queue:restart        # 重启队列
php think queue:fail           # 查看失败任务
php think queue:retry          # 重试失败任务
```

### 9.3 定时任务命令
```bash
php think timer start          # 启动定时任务
php think timer stop           # 停止定时任务
php think timer restart        # 重启定时任务
php think timer status         # 查看状态
```

### 9.4 Workerman命令
```bash
php think workerman start      # 启动
php think workerman stop       # 停止
php think workerman restart    # 重启
php think workerman reload     # 平滑重启
php think workerman status     # 查看状态
```

---

> **提示**: 本Agent专为CRMEB电商系统设计,帮助您快速开发和理解系统。如有疑问,请参考官方文档或查看项目源码。
