# 数据库设计文档

## 1. 概述

本文档描述了 CRMEB 项目的数据库设计，包括数据库架构、表结构、索引设计、关系设计等，旨在规范数据库设计，提高数据库性能和可维护性。

## 2. 数据库架构

### 2.1 整体架构

- **数据库系统**: MySQL 5.7~8.0
- **存储引擎**: InnoDB (默认)
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_general_ci
- **连接池**: 建议使用
- **SQL文件位置**: `public/install/crmeb.sql`

### 2.2 技术栈

- **MySQL**: 5.7+
- **Redis**: 用于缓存
- **ThinkPHP ORM**: 用于模型操作
- **数据库迁移**: 用于版本控制
- **数据库备份**: 用于数据安全

### 2.3 配置说明

#### 2.3.1 数据库配置

```php
// config/database.php
return [
    'default' => env('database.driver', 'mysql'),
    'connections' => [
        'mysql' => [
            'type' => 'mysql',
            'hostname' => env('database.hostname', '127.0.0.1'),
            'database' => env('database.database', ''),
            'username' => env('database.username', ''),
            'password' => env('database.password', ''),
            'hostport' => env('database.hostport', '3306'),
            'charset' => 'utf8mb4',
            'prefix' => env('database.prefix', ''),
            'debug' => env('app_debug', true),
        ],
    ],
];
```

## 3. 数据库设计规范

### 3.1 命名规范

- **数据库名**: 小写字母，下划线分隔
- **表名**: 小写字母，下划线分隔，前缀统一
- **字段名**: 小写字母，下划线分隔
- **索引名**: 小写字母，下划线分隔，类型前缀
  - 主键: `PRIMARY`
  - 唯一索引: `uk_字段名`
  - 普通索引: `idx_字段名`

### 3.2 表结构规范

- **主键**: 统一命名为 `id`，自增整数
- **外键**: 格式 `表名_id`，如 `user_id`
- **时间字段**: `create_time`/`update_time`
- **状态字段**: `status`，默认值 0
- **软删除字段**: `delete_time`，默认值 NULL

### 3.3 字段类型规范

- **整数类型**: 根据实际范围选择
  - `TINYINT`: 1字节，范围 -128~127
  - `SMALLINT`: 2字节，范围 -32768~32767
  - `INT`: 4字节，范围 -2147483648~2147483647
  - `BIGINT`: 8字节，范围更大

- **字符串类型**: 
  - 固定长度: `CHAR`
  - 可变长度: `VARCHAR`
  - 长文本: `TEXT`
  - 大文本: `LONGTEXT`

- **日期时间类型**: 
  - 日期: `DATE`
  - 时间: `TIME`
  - 日期时间: `DATETIME`
  - 时间戳: `TIMESTAMP`

- **数值类型**: 
  - 小数: `DECIMAL`
  - 浮点数: `FLOAT`, `DOUBLE`

- **布尔类型**: 使用 `TINYINT(1)`，0 表示 false，1 表示 true

### 3.4 索引规范

- **主键索引**: 每个表必须有主键
- **唯一索引**: 用于唯一标识的字段
- **普通索引**: 用于经常查询的字段
- **复合索引**: 用于多字段查询
- **外键索引**: 用于关联查询
- **索引数量**: 每个表索引数量不宜过多，一般不超过 5 个

## 4. 核心表结构

### 4.1 用户表 (`user`)

| 字段名 | 数据类型 | 长度 | 约束 | 描述 |
|-------|---------|------|------|------|
| `id` | `INT` | 11 | `PRIMARY KEY AUTO_INCREMENT` | 用户ID |
| `username` | `VARCHAR` | 50 | `NOT NULL` | 用户名 |
| `password` | `VARCHAR` | 255 | `NOT NULL` | 密码 |
| `nickname` | `VARCHAR` | 50 | `NOT NULL` | 昵称 |
| `avatar` | `VARCHAR` | 255 | | 头像 |
| `mobile` | `VARCHAR` | 20 | | 手机号 |
| `email` | `VARCHAR` | 100 | | 邮箱 |
| `status` | `TINYINT` | 1 | `DEFAULT 1` | 状态 |
| `create_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `update_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `delete_time` | `DATETIME` | | | 删除时间 |

### 4.2 商品表 (`product`)

| 字段名 | 数据类型 | 长度 | 约束 | 描述 |
|-------|---------|------|------|------|
| `id` | `INT` | 11 | `PRIMARY KEY AUTO_INCREMENT` | 商品ID |
| `name` | `VARCHAR` | 255 | `NOT NULL` | 商品名称 |
| `category_id` | `INT` | 11 | `NOT NULL` | 分类ID |
| `price` | `DECIMAL` | 10,2 | `NOT NULL` | 价格 |
| `stock` | `INT` | 11 | `NOT NULL` | 库存 |
| `status` | `TINYINT` | 1 | `DEFAULT 1` | 状态 |
| `create_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `update_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `delete_time` | `DATETIME` | | | 删除时间 |

### 4.3 订单表 (`order`)

| 字段名 | 数据类型 | 长度 | 约束 | 描述 |
|-------|---------|------|------|------|
| `id` | `INT` | 11 | `PRIMARY KEY AUTO_INCREMENT` | 订单ID |
| `order_sn` | `VARCHAR` | 32 | `NOT NULL UNIQUE` | 订单号 |
| `user_id` | `INT` | 11 | `NOT NULL` | 用户ID |
| `total_price` | `DECIMAL` | 10,2 | `NOT NULL` | 总价 |
| `status` | `TINYINT` | 1 | `DEFAULT 0` | 状态 |
| `create_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `update_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `delete_time` | `DATETIME` | | | 删除时间 |

### 4.4 分类表 (`category`)

| 字段名 | 数据类型 | 长度 | 约束 | 描述 |
|-------|---------|------|------|------|
| `id` | `INT` | 11 | `PRIMARY KEY AUTO_INCREMENT` | 分类ID |
| `name` | `VARCHAR` | 50 | `NOT NULL` | 分类名称 |
| `parent_id` | `INT` | 11 | `DEFAULT 0` | 父分类ID |
| `sort` | `INT` | 11 | `DEFAULT 0` | 排序 |
| `status` | `TINYINT` | 1 | `DEFAULT 1` | 状态 |
| `create_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `update_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `delete_time` | `DATETIME` | | | 删除时间 |

### 4.5 地址表 (`address`)

| 字段名 | 数据类型 | 长度 | 约束 | 描述 |
|-------|---------|------|------|------|
| `id` | `INT` | 11 | `PRIMARY KEY AUTO_INCREMENT` | 地址ID |
| `user_id` | `INT` | 11 | `NOT NULL` | 用户ID |
| `name` | `VARCHAR` | 50 | `NOT NULL` | 收货人姓名 |
| `mobile` | `VARCHAR` | 20 | `NOT NULL` | 手机号 |
| `province` | `VARCHAR` | 50 | `NOT NULL` | 省份 |
| `city` | `VARCHAR` | 50 | `NOT NULL` | 城市 |
| `district` | `VARCHAR` | 50 | `NOT NULL` | 区县 |
| `detail` | `VARCHAR` | 255 | `NOT NULL` | 详细地址 |
| `is_default` | `TINYINT` | 1 | `DEFAULT 0` | 是否默认 |
| `create_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `update_time` | `DATETIME` | | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `delete_time` | `DATETIME` | | | 删除时间 |

## 5. 索引设计

### 5.1 用户表索引

| 索引名 | 类型 | 字段 | 描述 |
|-------|------|------|------|
| `PRIMARY` | 主键 | `id` | 主键索引 |
| `uk_username` | 唯一 | `username` | 用户名唯一索引 |
| `idx_mobile` | 普通 | `mobile` | 手机号索引 |
| `idx_email` | 普通 | `email` | 邮箱索引 |
| `idx_status` | 普通 | `status` | 状态索引 |

### 5.2 商品表索引

| 索引名 | 类型 | 字段 | 描述 |
|-------|------|------|------|
| `PRIMARY` | 主键 | `id` | 主键索引 |
| `idx_category_id` | 普通 | `category_id` | 分类ID索引 |
| `idx_price` | 普通 | `price` | 价格索引 |
| `idx_status` | 普通 | `status` | 状态索引 |

### 5.3 订单表索引

| 索引名 | 类型 | 字段 | 描述 |
|-------|------|------|------|
| `PRIMARY` | 主键 | `id` | 主键索引 |
| `uk_order_sn` | 唯一 | `order_sn` | 订单号唯一索引 |
| `idx_user_id` | 普通 | `user_id` | 用户ID索引 |
| `idx_status` | 普通 | `status` | 状态索引 |
| `idx_create_time` | 普通 | `create_time` | 创建时间索引 |

### 5.4 分类表索引

| 索引名 | 类型 | 字段 | 描述 |
|-------|------|------|------|
| `PRIMARY` | 主键 | `id` | 主键索引 |
| `idx_parent_id` | 普通 | `parent_id` | 父分类ID索引 |
| `idx_sort` | 普通 | `sort` | 排序索引 |
| `idx_status` | 普通 | `status` | 状态索引 |

### 5.5 地址表索引

| 索引名 | 类型 | 字段 | 描述 |
|-------|------|------|------|
| `PRIMARY` | 主键 | `id` | 主键索引 |
| `idx_user_id` | 普通 | `user_id` | 用户ID索引 |
| `idx_is_default` | 普通 | `is_default` | 是否默认索引 |

## 6. 关系设计

### 6.1 表关系图

```
user ----------------- order
  |                      |
  |                      |
  |                      |
address                product
                          |
                          |
                          |
                      category
```

### 6.2 关系说明

- **用户与订单**: 一对多关系，一个用户可以有多个订单
- **用户与地址**: 一对多关系，一个用户可以有多个地址
- **商品与分类**: 多对一关系，多个商品属于一个分类
- **订单与商品**: 多对多关系，一个订单可以包含多个商品，一个商品可以出现在多个订单中

### 6.3 外键关系

| 主表 | 主键 | 从表 | 外键 | 描述 |
|------|------|------|------|------|
| `user` | `id` | `order` | `user_id` | 订单所属用户 |
| `user` | `id` | `address` | `user_id` | 地址所属用户 |
| `category` | `id` | `product` | `category_id` | 商品所属分类 |

## 7. 性能优化

### 7.1 索引优化

- **选择合适的索引类型**: 根据查询场景选择合适的索引类型
- **避免过度索引**: 只在需要的字段上创建索引
- **使用复合索引**: 对于多字段查询，使用复合索引
- **定期维护索引**: 定期重建碎片化的索引

### 7.2 查询优化

- **避免全表扫描**: 使用索引覆盖查询
- **减少查询字段**: 只查询需要的字段
- **使用连接查询**: 合理使用连接查询，避免子查询
- **限制查询结果**: 使用 LIMIT 限制查询结果数量

### 7.3 存储优化

- **选择合适的字段类型**: 根据实际需求选择合适的字段类型
- **使用分区表**: 对于大表，使用分区表提高查询性能
- **定期清理数据**: 定期清理无用数据，减少表大小
- **使用缓存**: 对于频繁查询的数据，使用 Redis 缓存

### 7.4 配置优化

- **调整 innodb_buffer_pool_size**: 根据服务器内存大小调整
- **调整 max_connections**: 根据并发量调整
- **启用查询缓存**: 对于读多写少的场景
- **优化日志配置**: 合理配置二进制日志和慢查询日志

## 8. 安全设计

### 8.1 数据安全

- **加密存储**: 敏感数据（如密码）加密存储
- **数据备份**: 定期备份数据库
- **数据恢复**: 建立数据恢复机制
- **访问控制**: 严格控制数据库访问权限

### 8.2 SQL 注入防护

- **使用参数化查询**: 避免直接拼接 SQL
- **使用 ORM**: 使用 ThinkPHP ORM 框架
- **输入验证**: 对用户输入进行验证
- **转义特殊字符**: 对特殊字符进行转义

### 8.3 权限管理

- **最小权限原则**: 只授予必要的权限
- **角色分离**: 不同角色拥有不同权限
- **定期审计**: 定期审计数据库访问日志

## 9. 备份与恢复

### 9.1 备份策略

- **全量备份**: 定期进行全量备份
- **增量备份**: 每天进行增量备份
- **日志备份**: 备份二进制日志

### 9.2 恢复策略

- **全量恢复**: 使用全量备份恢复
- **增量恢复**: 使用增量备份恢复
- **点恢复**: 使用二进制日志进行点恢复

### 9.3 备份工具

- **mysqldump**: MySQL 自带备份工具
- **xtrabackup**: Percona 提供的备份工具
- **第三方工具**: 如 Navicat 等

## 10. 版本控制

### 10.1 数据库迁移

- **使用迁移工具**: 使用 ThinkPHP 数据库迁移工具
- **版本管理**: 对数据库结构变更进行版本管理
- **回滚机制**: 支持数据库结构回滚

### 10.2 迁移文件命名规范

- **格式**: `YYYYMMDDHHMMSS_描述.php`
- **示例**: `20230101000000_create_user_table.php`

### 10.3 迁移文件结构

```php
<?php
use think\migration\Migrator;
use think\migration\db\Column;

class CreateUserTable extends Migrator
{
    public function change()
    {
        $table = $this->table('user');
        $table->addColumn('username', 'string', ['limit' => 50, 'comment' => '用户名'])
              ->addColumn('password', 'string', ['limit' => 255, 'comment' => '密码'])
              ->addColumn('nickname', 'string', ['limit' => 50, 'comment' => '昵称'])
              ->addColumn('avatar', 'string', ['limit' => 255, 'comment' => '头像'])
              ->addColumn('mobile', 'string', ['limit' => 20, 'comment' => '手机号'])
              ->addColumn('email', 'string', ['limit' => 100, 'comment' => '邮箱'])
              ->addColumn('status', 'tinyint', ['default' => 1, 'comment' => '状态'])
              ->addColumn('create_time', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'comment' => '创建时间'])
              ->addColumn('update_time', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP', 'comment' => '更新时间'])
              ->addColumn('delete_time', 'datetime', ['comment' => '删除时间'])
              ->addIndex('username', ['unique' => true])
              ->addIndex('mobile')
              ->addIndex('email')
              ->addIndex('status')
              ->create();
    }
}
```

## 11. 维护与监控

### 11.1 日常维护

- **定期优化表**: 定期执行 OPTIMIZE TABLE 命令
- **监控表大小**: 监控表大小变化
- **检查慢查询**: 定期分析慢查询日志
- **更新统计信息**: 定期更新表统计信息

### 11.2 监控指标

- **查询性能**: 监控查询响应时间
- **连接数**: 监控数据库连接数
- **缓存命中率**: 监控缓存命中率
- **磁盘使用率**: 监控磁盘空间使用情况
- **CPU 使用率**: 监控数据库服务器 CPU 使用率

### 11.3 监控工具

- **MySQL Enterprise Monitor**: MySQL 企业版监控工具
- **Percona Monitoring and Management**: 开源监控工具
- **Zabbix**: 通用监控工具
- **Prometheus + Grafana**: 现代化监控方案

## 12. 总结

本文档描述了 CRMEB 项目的数据库设计规范和最佳实践，包括数据库架构、表结构、索引设计、关系设计、性能优化、安全设计、备份与恢复、版本控制、维护与监控等方面。

遵循本文档的设计规范，可以提高数据库性能和可维护性，确保系统的稳定运行。同时，定期对数据库进行维护和监控，可以及时发现和解决潜在问题，保障系统的安全性和可靠性。

随着业务的发展和系统的演进，数据库设计也需要不断优化和调整，以适应新的业务需求和技术挑战。