# CRMEB数据库设计规范

## 1. 数据库架构

### 1.1 数据库配置

**环境配置（.env文件）：**
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
DEBUG = false
```

**数据库配置文件（config/database.php）：**
```php
<?php
return [
    // 默认使用的数据库连接
    'default' => env('database.type', 'mysql'),
    
    // 数据库连接信息
    'connections' => [
        'mysql' => [
            'type' => 'mysql',
            'hostname' => env('database.hostname', '127.0.0.1'),
            'database' => env('database.database', 'crmeb'),
            'username' => env('database.username', 'root'),
            'password' => env('database.password', ''),
            'hostport' => env('database.hostport', '3306'),
            'charset' => env('database.charset', 'utf8mb4'),
            'prefix' => env('database.prefix', 'eb_'),
            'debug' => env('database.debug', false),
            'deploy' => 0,
            'rw_separate' => false,
            'master_num' => 1,
            'slave_no' => '',
            'break_reconnect' => false,
            'trigger_sql' => env('app_debug', true),
            'fields_strict' => true,
            'auto_timestamp' => false,
        ],
    ],
];
```

### 1.2 数据库设计原则

**核心原则：**
1. **统一前缀**：所有表使用 `eb_` 前缀
2. **清晰命名**：表名和字段名应清晰表达其含义
3. **适当冗余**：在性能关键处适当冗余，减少JOIN查询
4. **索引优化**：为高频查询字段添加索引
5. **数据归档**：定期归档历史数据，保持表体积合理
6. **字段类型**：选择合适的字段类型，避免浪费空间

## 2. 表命名规范

### 2.1 通用规则

```sql
-- ✅ 正确示例
eb_user                      -- 用户表
eb_store_product            -- 商品表
eb_store_order              -- 订单表
eb_system_config            -- 系统配置表

-- ❌ 错误示例
user                        -- 缺少前缀
StoreProduct                -- 使用大写
systemconfig                -- 无下划线
```

### 2.2 模块命名

**用户模块：**
```sql
eb_user                     -- 用户主表
eb_user_bill               -- 用户账单
eb_user_extract            -- 用户提现
eb_user_recharge           -- 用户充值
eb_user_level              -- 用户等级
eb_user_group              -- 用户分组
eb_user_label              -- 用户标签
eb_user_sign               -- 用户签到
eb_user_task               -- 用户任务
```

**商品模块：**
```sql
eb_store_category           -- 商品分类
eb_store_product            -- 商品主表
eb_store_product_attr       -- 商品属性
eb_store_product_attr_result -- 属性结果
eb_store_product_description -- 商品详情
eb_store_product_relation   -- 商品关联（收藏、点赞）
eb_store_product_reply      -- 商品评价
```

**订单模块：**
```sql
eb_store_cart               -- 购物车
eb_store_order              -- 订单主表
eb_store_order_cart_info    -- 订单商品
eb_store_order_status       -- 订单状态记录
eb_store_refund             -- 退款记录
eb_store_order_invoice      -- 发票信息
```

**营销模块：**
```sql
eb_store_coupon             -- 优惠券
eb_store_coupon_user        -- 用户优惠券
eb_store_combination        -- 拼团商品
eb_store_pink               -- 拼团记录
eb_store_bargain            -- 砍价商品
eb_store_seckill            -- 秒杀商品
eb_store_integral           -- 积分商品
```

**分销模块：**
```sql
eb_agent_level              -- 分销等级
eb_agent_level_task         -- 分销任务
eb_spread_user              -- 分销员
eb_spread_order             -- 分销订单
eb_spread_commission        -- 分销佣金
eb_division                 -- 事业部
```

**系统模块：**
```sql
eb_system_admin             -- 管理员
eb_system_role              -- 角色
eb_system_menus             -- 菜单
eb_system_config            -- 配置
eb_system_log               -- 操作日志
```

## 3. 字段命名规范

### 3.1 通用字段

**主键和ID：**
```sql
id INT PRIMARY KEY AUTO_INCREMENT  -- 主键，所有表必须有
```

**外键：**
```sql
user_id INT              -- 关联用户表
category_id INT          -- 关联分类表
product_id INT           -- 关联商品表
order_id INT             -- 关联订单表
```

**状态字段：**
```sql
status TINYINT(1)        -- 状态（0禁用/下架，1启用/上架）
is_del TINYINT(1)        -- 是否删除（0未删除，1已删除）
is_show TINYINT(1)       -- 是否显示（0不显示，1显示）
```

**时间字段：**
```sql
create_time INT          -- 创建时间（时间戳）
update_time INT          -- 更新时间（时间戳）
delete_time INT          -- 删除时间（时间戳，用于软删除）
```

### 3.2 字段类型选择

**整数类型：**
```sql
-- TINYINT: -128到127（无符号0-255）
status TINYINT(1)        -- 状态字段
type TINYINT(1)          -- 类型字段
is_del TINYINT(1)        -- 删除标记

-- SMALLINT: -32768到32767（无符号0-65535）
category_id SMALLINT     -- 分类ID
sort SMALLINT            -- 排序

-- INT: -21亿到21亿（无符号0-42亿）
id INT                   -- 主键
user_id INT              -- 用户ID
order_id INT             -- 订单ID
create_time INT          -- 时间戳

-- BIGINT: 更大范围
snowflake_id BIGINT      -- 雪花算法ID
```

**小数类型：**
```sql
-- DECIMAL: 精确小数（推荐用于金额）
price DECIMAL(10,2)      -- 价格（最多10位，小数2位）
total_price DECIMAL(10,2) -- 总价
commission DECIMAL(10,2)  -- 佣金

-- FLOAT/DOUBLE: 非精确小数（少用）
weight FLOAT             -- 重量（可接受精度损失）
```

**字符串类型：**
```sql
-- VARCHAR: 变长字符串
account VARCHAR(30)      -- 账号
phone VARCHAR(11)        -- 手机号
real_name VARCHAR(50)    -- 真实姓名
nickname VARCHAR(50)     -- 昵称
title VARCHAR(255)       -- 标题
image VARCHAR(255)       -- 图片路径

-- TEXT: 长文本
description TEXT         -- 商品描述
content TEXT             -- 文章内容
remark TEXT              -- 备注
```

**时间类型：**
```sql
-- INT存储时间戳（推荐，灵活）
create_time INT          -- 创建时间

-- DATETIME（可视性好，但时区不灵活）
create_time DATETIME     -- 创建时间
```

## 4. 核心表结构详解

### 4.1 用户表（eb_user）

```sql
CREATE TABLE `eb_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `account` varchar(30) NOT NULL DEFAULT '' COMMENT '账号',
  `pwd` varchar(255) NOT NULL DEFAULT '' COMMENT '密码',
  `real_name` varchar(50) NOT NULL DEFAULT '' COMMENT '真实姓名',
  `nickname` varchar(50) NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar` varchar(255) NOT NULL DEFAULT '' COMMENT '头像',
  `phone` varchar(11) NOT NULL DEFAULT '' COMMENT '手机号',
  `sex` tinyint(1) NOT NULL DEFAULT '0' COMMENT '性别（0未知，1男，2女）',
  `birthday` int(11) NOT NULL DEFAULT '0' COMMENT '生日',
  `level` tinyint(1) NOT NULL DEFAULT '0' COMMENT '会员等级',
  `group_id` int(11) NOT NULL DEFAULT '0' COMMENT '用户分组ID',
  `label_id` varchar(255) NOT NULL DEFAULT '' COMMENT '用户标签ID（多个用逗号分隔）',
  `money` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '余额',
  `integral` int(11) NOT NULL DEFAULT '0' COMMENT '积分',
  `spread_uid` int(11) NOT NULL DEFAULT '0' COMMENT '推广人UID',
  `spread_time` int(11) NOT NULL DEFAULT '0' COMMENT '推广时间',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态（0禁用，1启用）',
  `is_del` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(11) NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_account` (`account`),
  UNIQUE KEY `idx_phone` (`phone`),
  KEY `idx_spread_uid` (`spread_uid`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

**索引说明：**
- `PRIMARY KEY (id)`：主键索引
- `idx_account`：账号唯一索引
- `idx_phone`：手机号唯一索引
- `idx_spread_uid`：推广人ID索引（用于分销查询）
- `idx_status`：状态索引（用于筛选启用用户）
- `idx_create_time`：创建时间索引（用于时间范围查询）

### 4.2 商品表（eb_store_product）

```sql
CREATE TABLE `eb_store_product` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '商品ID',
  `mer_id` int(11) NOT NULL DEFAULT '0' COMMENT '商户ID',
  `cate_id` int(11) NOT NULL DEFAULT '0' COMMENT '分类ID',
  `store_name` varchar(255) NOT NULL DEFAULT '' COMMENT '商品名称',
  `store_info` varchar(500) NOT NULL DEFAULT '' COMMENT '商品简介',
  `keyword` varchar(255) NOT NULL DEFAULT '' COMMENT '关键字',
  `bar_code` varchar(50) NOT NULL DEFAULT '' COMMENT '商品条码',
  `image` varchar(255) NOT NULL DEFAULT '' COMMENT '商品主图',
  `slider_image` text COMMENT '商品轮播图（JSON数组）',
  `description` longtext COMMENT '商品详情',
  `spec_type` tinyint(1) NOT NULL DEFAULT '0' COMMENT '规格类型（0单规格，1多规格）',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '商品价格',
  `cost` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '商品成本价',
  `ot_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '商品原价',
  `stock` int(11) NOT NULL DEFAULT '0' COMMENT '商品库存',
  `sales` int(11) NOT NULL DEFAULT '0' COMMENT '商品销量',
  `unit_name` varchar(50) NOT NULL DEFAULT '件' COMMENT '商品单位',
  `is_show` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否上架（0下架，1上架）',
  `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否热销',
  `is_benefit` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否优惠',
  `is_best` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否精品',
  `is_new` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否新品',
  `is_good` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否优品',
  `is_postage` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否包邮',
  `sort` smallint(6) NOT NULL DEFAULT '0' COMMENT '排序',
  `give_integral` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '赠送积分',
  `is_del` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '审核状态（0未审核，1已审核）',
  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(11) NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_cate_id` (`cate_id`),
  KEY `idx_mer_id` (`mer_id`),
  KEY `idx_is_show` (`is_show`),
  KEY `idx_is_hot` (`is_hot`),
  KEY `idx_is_new` (`is_new`),
  KEY `idx_sort` (`sort`),
  KEY `idx_create_time` (`create_time`),
  FULLTEXT KEY `idx_keyword` (`keyword`,`store_name`,`store_info`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';
```

### 4.3 订单表（eb_store_order）

```sql
CREATE TABLE `eb_store_order` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_id` varchar(32) NOT NULL DEFAULT '' COMMENT '订单号（唯一）',
  `uid` int(11) NOT NULL DEFAULT '0' COMMENT '用户ID',
  `real_name` varchar(50) NOT NULL DEFAULT '' COMMENT '收货人姓名',
  `user_phone` varchar(20) NOT NULL DEFAULT '' COMMENT '收货人电话',
  `user_address` varchar(255) NOT NULL DEFAULT '' COMMENT '收货地址',
  `cart_id` text COMMENT '购物车ID',
  `total_num` int(11) NOT NULL DEFAULT '0' COMMENT '商品总数',
  `total_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '商品总价',
  `total_postage` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '邮费',
  `pay_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '实际支付金额',
  `pay_postage` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '实际支付邮费',
  `deduction_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '抵扣金额',
  `coupon_id` int(11) NOT NULL DEFAULT '0' COMMENT '优惠券ID',
  `coupon_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '优惠券金额',
  `paid` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否支付（0未支付，1已支付）',
  `pay_time` int(11) NOT NULL DEFAULT '0' COMMENT '支付时间',
  `pay_type` varchar(20) NOT NULL DEFAULT '' COMMENT '支付方式',
  `status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '订单状态（0未支付，1待发货，2待收货，3已完成，-1已取消，-2退款中，-3已退款）',
  `refund_status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '退款状态',
  `refund_reason` varchar(255) NOT NULL DEFAULT '' COMMENT '退款原因',
  `refund_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '退款金额',
  `delivery_name` varchar(50) NOT NULL DEFAULT '' COMMENT '快递公司名称',
  `delivery_id` varchar(50) NOT NULL DEFAULT '' COMMENT '快递单号',
  `delivery_type` varchar(20) NOT NULL DEFAULT 'express' COMMENT '配送方式（express快递，send商家配送，pick自取）',
  `delivery_time` int(11) NOT NULL DEFAULT '0' COMMENT '发货时间',
  `gain_integral` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '赠送积分',
  `mark` varchar(500) NOT NULL DEFAULT '' COMMENT '买家备注',
  `remark` varchar(500) NOT NULL DEFAULT '' COMMENT '商家备注',
  `cost` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '成本价',
  `is_del` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `update_time` int(11) NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order_id` (`order_id`),
  KEY `idx_uid` (`uid`),
  KEY `idx_paid` (`paid`),
  KEY `idx_status` (`status`),
  KEY `idx_pay_time` (`pay_time`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

## 5. 索引设计规范

### 5.1 索引使用原则

**必须添加索引的场景：**
1. 主键字段
2. 外键字段
3. WHERE条件中的字段
4. ORDER BY排序字段
5. JOIN关联字段
6. 唯一性约束字段

**索引命名规范：**
- 主键索引：`PRIMARY`
- 唯一索引：`uk_字段名` 或 `idx_字段名`
- 普通索引：`idx_字段名`
- 组合索引：`idx_字段1_字段2`
- 全文索引：`ft_字段名`

**示例：**
```sql
-- 主键索引（自动创建）
PRIMARY KEY (`id`)

-- 唯一索引
UNIQUE KEY `uk_account` (`account`)
UNIQUE KEY `uk_phone` (`phone`)
UNIQUE KEY `uk_order_id` (`order_id`)

-- 普通索引
KEY `idx_user_id` (`user_id`)
KEY `idx_status` (`status`)
KEY `idx_create_time` (`create_time`)

-- 组合索引
KEY `idx_user_status` (`user_id`, `status`)
KEY `idx_create_type` (`create_time`, `type`)

-- 全文索引
FULLTEXT KEY `ft_keyword` (`keyword`, `name`)
```

### 5.2 组合索引最左前缀原则

**正确示例：**
```sql
-- 创建组合索引
KEY `idx_user_status_time` (`user_id`, `status`, `create_time`)

-- 以下查询会使用索引
WHERE user_id = 1
WHERE user_id = 1 AND status = 1
WHERE user_id = 1 AND status = 1 AND create_time > 1234567890
WHERE user_id = 1 AND create_time > 1234567890  -- 部分使用

-- 以下查询不会使用索引
WHERE status = 1                      -- 缺少最左列user_id
WHERE create_time > 1234567890        -- 缺少最左列user_id
WHERE status = 1 AND create_time > 1234567890  -- 缺少最左列user_id
```

### 5.3 索引优化建议

1. **选择性高的列放前面**：区分度高的字段放在组合索引前面
2. **避免过多索引**：每个表索引数量不超过6个
3. **避免冗余索引**：idx_a_b和idx_a是冗余的
4. **定期维护索引**：使用 `OPTIMIZE TABLE` 优化表
5. **监控索引使用**：使用 `EXPLAIN` 分析查询

**使用EXPLAIN分析：**
```sql
EXPLAIN SELECT * FROM eb_store_order WHERE user_id = 1 AND status = 1;

-- 输出解读：
-- type: ALL（全表扫描，性能差）
-- type: const（主键查询，性能最好）
-- type: ref（索引查找，性能好）
-- type: range（范围查询，性能较好）
-- key: 使用的索引名
-- rows: 扫描的行数（越少越好）
```

## 6. 数据类型优化

### 6.1 整数类型选择

| 类型 | 有符号范围 | 无符号范围 | 占用空间 | 适用场景 |
|------|-----------|-----------|----------|----------|
| TINYINT | -128~127 | 0~255 | 1字节 | 状态、布尔值、小范围枚举 |
| SMALLINT | -32768~32767 | 0~65535 | 2字节 | 分类ID、排序 |
| INT | -21亿~21亿 | 0~42亿 | 4字节 | 主键、用户ID、订单ID |
| BIGINT | 很大 | 很大 | 8字节 | 雪花算法ID、大数值 |

**示例：**
```sql
-- 状态字段使用TINYINT
status TINYINT(1) NOT NULL DEFAULT '1'
is_del TINYINT(1) NOT NULL DEFAULT '0'
type TINYINT(1) NOT NULL DEFAULT '0'

-- 主键使用INT或BIGINT
id INT(11) NOT NULL AUTO_INCREMENT
id BIGINT(20) NOT NULL AUTO_INCREMENT  -- 分布式ID

-- 分类ID、排序使用SMALLINT
cate_id SMALLINT(6) NOT NULL DEFAULT '0'
sort SMALLINT(6) NOT NULL DEFAULT '0'
```

### 6.2 小数类型选择

**金额使用DECIMAL（精确计算）：**
```sql
-- 正确：金额使用DECIMAL
price DECIMAL(10,2) NOT NULL DEFAULT '0.00'
total_price DECIMAL(10,2) NOT NULL DEFAULT '0.00'
commission DECIMAL(10,2) NOT NULL DEFAULT '0.00'

-- 参数说明：DECIMAL(M, D)
-- M: 总位数（整数+小数）
-- D: 小数位数

-- DECIMAL(10,2) 范围：-99999999.99 到 99999999.99
```

**避免使用FLOAT/DOUBLE存储金额：**
```sql
-- 错误：FLOAT/DOUBLE无法精确表示小数
price FLOAT              -- 可能导致精度丢失
price DOUBLE             -- 可能导致精度丢失
```

### 6.3 字符串类型选择

**VARCHAR vs TEXT：**
```sql
-- VARCHAR：变长，占用实际长度+1-2字节
-- 适合短字符串，有长度限制
account VARCHAR(30)      -- 账号
phone VARCHAR(11)        -- 手机号
real_name VARCHAR(50)    -- 姓名
title VARCHAR(255)       -- 标题

-- TEXT：长文本，占用额外空间
-- 适合长内容，无长度限制
description TEXT         -- 商品描述
content TEXT             -- 文章内容
remark TEXT              -- 备注

-- 性能考虑：
-- 1. VARCHAR可以创建索引，TEXT只能创建前缀索引
-- 2. VARCHAR查询性能更好
-- 3. TEXT字段会单独存储，查询时需要额外IO
```

### 6.4 时间存储方式

**时间戳（INT）vs DATETIME：**

```sql
-- 方案1：使用INT存储时间戳（推荐）
create_time INT(11) NOT NULL DEFAULT '0'

-- 优点：
-- 1. 时区灵活，可根据用户时区转换
-- 2. 计算方便（加减秒数）
-- 3. 占用空间小（4字节）
-- 4. 兼容性好

-- 缺点：
-- 1. 不直观，需转换才能查看
-- 2. 范围有限（2038年问题）

-- 方案2：使用DATETIME
-- create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

-- 优点：
-- 1. 直观，可直接查看时间
-- 2. 支持日期函数（YEAR(), MONTH()等）

-- 缺点：
-- 1. 时区不灵活
-- 2. 占用空间大（5-8字节）
-- 3. 性能略差
```

## 7. 关联查询设计

### 7.1 一对多关系

**示例：用户和订单**
```sql
-- 用户表（一）
CREATE TABLE `eb_user` (
  `id` int(11) PRIMARY KEY,
  `account` varchar(30),
  ...
);

-- 订单表（多）
CREATE TABLE `eb_store_order` (
  `id` int(11) PRIMARY KEY,
  `user_id` int(11) NOT NULL,           -- 关联用户表
  `order_id` varchar(32),
  ...
  KEY `idx_user_id` (`user_id`)         -- 添加索引
);

-- 查询用户的所有订单
SELECT o.* 
FROM eb_store_order o 
JOIN eb_user u ON o.user_id = u.id 
WHERE u.id = 1;
```

### 7.2 多对多关系

**示例：用户和角色**
```sql
-- 用户表
CREATE TABLE `eb_system_admin` (
  `id` int(11) PRIMARY KEY,
  `account` varchar(30),
  ...
);

-- 角色表
CREATE TABLE `eb_system_role` (
  `id` int(11) PRIMARY KEY,
  `role_name` varchar(50),
  ...
);

-- 中间表（用户-角色关联）
CREATE TABLE `eb_system_admin_role` (
  `admin_id` int(11) NOT NULL,          -- 用户ID
  `role_id` int(11) NOT NULL,           -- 角色ID
  PRIMARY KEY (`admin_id`, `role_id`),  -- 联合主键
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_role_id` (`role_id`)
);

-- 查询用户拥有的角色
SELECT r.* 
FROM eb_system_role r
JOIN eb_system_admin_role ar ON r.id = ar.role_id
WHERE ar.admin_id = 1;

-- 查询拥有某角色的所有用户
SELECT a.* 
FROM eb_system_admin a
JOIN eb_system_admin_role ar ON a.id = ar.admin_id
WHERE ar.role_id = 1;
```

### 7.3 一对一关系

**示例：用户和用户详情**
```sql
-- 用户主表
CREATE TABLE `eb_user` (
  `id` int(11) PRIMARY KEY,
  `account` varchar(30),
  ...
);

-- 用户详情表
CREATE TABLE `eb_user_info` (
  `id` int(11) PRIMARY KEY,
  `user_id` int(11) NOT NULL,           -- 关联用户ID
  `birthday` int(11),
  `address` varchar(255),
  ...
  UNIQUE KEY `uk_user_id` (`user_id`)   -- 唯一索引，确保一对一
);

-- 查询用户详情
SELECT u.*, ui.birthday, ui.address
FROM eb_user u
LEFT JOIN eb_user_info ui ON u.id = ui.user_id
WHERE u.id = 1;
```

## 8. 性能优化建议

### 8.1 表分区

**按时间分区（适用于大表）：**
```sql
-- 订单表按月分区
CREATE TABLE `eb_store_order` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(32),
  `create_time` int(11),
  ...
) ENGINE=InnoDB 
PARTITION BY RANGE (create_time) (
  PARTITION p202501 VALUES LESS THAN (1735689600),  -- 2025-01-01
  PARTITION p202502 VALUES LESS THAN (1738368000),  -- 2025-02-01
  PARTITION p202503 VALUES LESS THAN (1740950400),  -- 2025-03-01
  PARTITION p202504 VALUES LESS THAN (1743628800),  -- 2025-04-01
  PARTITION p_max VALUES LESS THAN MAXVALUE
);

-- 优点：
-- 1. 提高查询性能（只扫描相关分区）
-- 2. 方便数据归档（删除旧分区）
-- 3. 分散IO压力
```

### 8.2 分表策略

**水平分表（按ID取模）：**
```php
<?php
// 用户订单分表
$userId = 12345;
$tableSuffix = $userId % 10;  // 分成10张表
$tableName = "eb_store_order_{$tableSuffix}";

// 查询订单
$orders = Db::name($tableName)
    ->where('user_id', $userId)
    ->select();

-- 分表规则：
-- eb_store_order_0: user_id取模为0
-- eb_store_order_1: user_id取模为1
-- ...
-- eb_store_order_9: user_id取模为9
```

**垂直分表（按字段热度）：**
```sql
-- 商品主表（常用字段）
CREATE TABLE `eb_store_product` (
  `id` int(11) PRIMARY KEY,
  `store_name` varchar(255),
  `price` decimal(10,2),
  `stock` int(11),
  ...
);

-- 商品详情表（不常用字段）
CREATE TABLE `eb_store_product_detail` (
  `product_id` int(11) PRIMARY KEY,
  `description` longtext,        -- 详情（不常查询）
  `slider_image` text,           -- 轮播图（不常查询）
  `parameter` text,              -- 参数（不常查询）
  ...
);
```

### 8.3 读写分离

**主从复制架构：**
```php
<?php
// 主库（写操作）
'master' => [
    'type' => 'mysql',
    'hostname' => '192.168.1.1',
    'username' => 'root',
    'password' => 'password',
    'hostport' => '3306',
],

// 从库（读操作）
'slaves' => [
    [
        'type' => 'mysql',
        'hostname' => '192.168.1.2',
        'username' => 'root',
        'password' => 'password',
        'hostport' => '3306',
    ],
    [
        'type' => 'mysql',
        'hostname' => '192.168.1.3',
        'username' => 'root',
        'password' => 'password',
        'hostport' => '3306',
    ],
]

// 在DAO层指定读写
// 写操作（主库）
Db::name('user')->insert($data);

// 读操作（从库）
Db::name('user')->readMaster(false)->find($id);
```

### 8.4 慢查询优化

**开启慢查询日志：**
```ini
# MySQL配置文件my.cnf
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2  # 超过2秒的查询记录
log_queries_not_using_indexes = 1
```

**优化慢查询：**
```sql
-- 1. 使用EXPLAIN分析
EXPLAIN SELECT * FROM eb_store_order 
WHERE user_id = 1 AND status = 1 
ORDER BY id DESC;

-- 2. 添加合适的索引
CREATE INDEX idx_user_status ON eb_store_order(user_id, status);

-- 3. 优化查询语句
-- 错误：SELECT *（查询所有字段）
-- 正确：只查询需要的字段
SELECT id, order_id, pay_price FROM eb_store_order
WHERE user_id = 1 AND status = 1;

-- 4. 避免使用函数在WHERE条件中
-- 错误：WHERE DATE(create_time) = '2025-01-01'
-- 正确：WHERE create_time >= 1735689600 AND create_time < 1735776000
```

## 9. 数据备份与恢复

### 9.1 备份策略

**定期备份：**
```bash
#!/bin/bash
# 备份脚本 backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysql"

# 全量备份
mysqldump -u root -p'password' crmeb > $BACKUP_DIR/crmeb_full_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/crmeb_full_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "crmeb_full_*.sql.gz" -mtime +7 -delete
```

### 9.2 数据恢复

```bash
# 恢复数据
gunzip /backup/mysql/crmeb_full_20250317_000000.sql.gz
mysql -u root -p'password' crmeb < /backup/mysql/crmeb_full_20250317_000000.sql
```

## 10. 数据库监控

### 10.1 监控指标

**关键指标：**
- QPS（每秒查询数）
- TPS（每秒事务数）
- 慢查询数量
- 连接数
- 缓存命中率
- 磁盘IO
- 表空间使用率

**监控工具：**
- MySQL自带：`SHOW STATUS`, `SHOW PROCESSLIST`
- 第三方：Prometheus + Grafana, Percona Monitoring

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-17
