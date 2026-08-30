# 系统配置文档

## 1. 概述

本文档描述了 CRMEB 项目的系统配置，包括配置文件、环境变量、配置项说明等，旨在帮助开发者理解和配置项目，确保项目能够正常运行。

## 2. 配置文件结构

### 2.1 配置目录结构

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

### 2.2 配置加载顺序

1. **框架默认配置**：ThinkPHP 框架自带的默认配置
2. **应用配置**：项目根目录下的 `config/` 目录中的配置文件
3. **环境配置**：根据当前环境加载对应的环境配置文件
4. **动态配置**：运行时动态设置的配置
5. **环境变量**：通过 `.env` 文件或系统环境变量设置的配置

## 3. 环境变量配置

### 3.1 环境变量文件 (.env)

环境变量文件 `.env` 用于存储敏感配置信息，如数据库密码、API 密钥等。该文件不应提交到版本控制系统。

```ini
# 应用配置
APP_NAME=CRMEB
APP_ENV=local
APP_KEY=base64:your_app_key
APP_DEBUG=true
APP_URL=http://localhost

# 数据库配置
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=crmeb
DB_USERNAME=root
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0

# 缓存配置
CACHE_DRIVER=file

# 队列配置
QUEUE_CONNECTION=sync

# 邮件配置
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your_email@example.com
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your_email@example.com
MAIL_FROM_NAME="CRMEB"

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret

# 腾讯云配置
TENCENTCLOUD_SECRET_ID=your_secret_id
TENCENTCLOUD_SECRET_KEY=your_secret_key
```

### 3.2 环境变量加载

环境变量可以通过以下方式加载：

1. **.env 文件**：在项目根目录下创建 `.env` 文件，根据环境需要配置相关变量
2. **系统环境变量**：在服务器上设置系统环境变量
3. **命令行参数**：在运行命令时通过参数设置环境变量

### 3.3 环境变量使用

在配置文件中可以使用 `env()` 函数获取环境变量：

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

## 4. 核心配置项

### 4.1 应用配置 (app.php)

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|--------|------|
| app_debug | bool | true | 应用调试模式 |
| app_trace | bool | false | 应用跟踪模式 |
| app_status | string | 'dev' | 应用状态 |
| app_namespace | string | 'app' | 应用命名空间 |
| default_return_type | string | 'json' | 默认返回类型 |
| default_timezone | string | 'Asia/Shanghai' | 默认时区 |
| lang_switch_on | bool | false | 语言切换开关 |
| default_lang | string | 'zh-cn' | 默认语言 |
| auto_bind_module | bool | true | 自动绑定模块 |
| controller_suffix | bool | false | 控制器后缀 |
| url_route_on | bool | true | URL 路由开关 |
| url_route_must | bool | false | URL 路由必须 |
| var_pathinfo | string | 's' | PATH_INFO 变量名 |
| pathinfo_depr | string | '/' | PATH_INFO 分隔符 |
| url_html_suffix | string | '' | URL HTML 后缀 |
| url_common_param | bool | false | URL 普通参数模式 |
| url_param_type | int | 1 | URL 参数类型 |
| request_cache_on | bool | false | 请求缓存开关 |
| request_cache_expire | int | null | 请求缓存有效期 |

### 4.2 数据库配置 (database.php)

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|--------|------|
| default | string | 'mysql' | 默认数据库连接 |
| connections | array | [] | 数据库连接配置 |
| connections.mysql.type | string | 'mysql' | 数据库类型 |
| connections.mysql.hostname | string | '127.0.0.1' | 数据库主机名 |
| connections.mysql.database | string | '' | 数据库名 |
| connections.mysql.username | string | '' | 数据库用户名 |
| connections.mysql.password | string | '' | 数据库密码 |
| connections.mysql.hostport | string | '3306' | 数据库端口 |
| connections.mysql.charset | string | 'utf8mb4' | 数据库字符集 |
| connections.mysql.prefix | string | '' | 数据库表前缀 |
| connections.mysql.debug | bool | true | 数据库调试模式 |
| connections.mysql.deploy | array | [] | 数据库部署方式 |
| connections.mysql.rw_separate | bool | false | 数据库读写分离 |
| connections.mysql.master_num | int | 1 | 主数据库数量 |
| connections.mysql.slave_no | int | '' | 从数据库编号 |
| connections.mysql.read_master | bool | false | 是否从主服务器读取 |
| connections.mysql.deploy_type | int | 0 | 数据库部署类型 |
| connections.mysql.failover | array | [] | 数据库故障转移 |
| connections.mysql.break_reconnect | bool | false | 断开重连 |
| connections.mysql.pdo_type | string | '' | PDO 类型 |
| connections.mysql.max_conn | int | 0 | 最大连接数 |
| connections.mysql.strict_type | bool | false | 严格模式 |
| connections.mysql.auto_timestamp | bool | false | 自动时间戳 |
| connections.mysql.datetime_format | string | 'Y-m-d H:i:s' | 日期时间格式 |
| connections.mysql.date_format | string | 'Y-m-d' | 日期格式 |
| connections.mysql.time_format | string | 'H:i:s' | 时间格式 |
| connections.mysql.sql_build_cache | bool | false | SQL 构建缓存 |
| connections.mysql.builder | string | '' | 查询构建器 |
| connections.mysql.query | string | '' | 查询类 |
| connections.mysql.break_match_str | string | '' | 断开匹配字符串 |
| connections.mysql.params | array | [] | 连接参数 |
| connections.mysql.pk_convert | bool | false | 主键转换 |
| connections.mysql.resultset_type | string | 'array' | 结果集类型 |
| connections.mysql.return_collection | bool | false | 返回集合 |
| connections.mysql.identifier_quote | string | '' | 标识符引号 |
| connections.mysql.cache | array | [] | 缓存配置 |
| connections.mysql.trace_sql | bool | false | SQL 跟踪 |

### 4.3 缓存配置 (cache.php)

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|--------|------|
| default | string | 'file' | 默认缓存驱动 |
| stores | array | [] | 缓存驱动配置 |
| stores.file.type | string | 'file' | 文件缓存驱动 |
| stores.file.path | string | '' | 文件缓存路径 |
| stores.file.prefix | string | '' | 文件缓存前缀 |
| stores.file.expire | int | 0 | 文件缓存有效期 |
| stores.redis.type | string | 'redis' | Redis 缓存驱动 |
| stores.redis.host | string | '127.0.0.1' | Redis 主机名 |
| stores.redis.port | int | 6379 | Redis 端口 |
| stores.redis.password | string | '' | Redis 密码 |
| stores.redis.select | int | 0 | Redis 数据库 |
| stores.redis.timeout | int | 0 | Redis 超时时间 |
| stores.redis.persistent | bool | false | Redis 持久连接 |
| stores.redis.prefix | string | '' | Redis 缓存前缀 |
| stores.redis.serializer | int | 0 | Redis 序列化方式 |
| stores.memcache.type | string | 'memcache' | Memcache 缓存驱动 |
| stores.memcache.host | string | '127.0.0.1' | Memcache 主机名 |
| stores.memcache.port | int | 11211 | Memcache 端口 |
| stores.memcache.persistent | bool | false | Memcache 持久连接 |
| stores.memcache.timeout | int | 0 | Memcache 超时时间 |
| stores.memcache.prefix | string | '' | Memcache 缓存前缀 |
| stores.wincache.type | string | 'wincache' | WinCache 缓存驱动 |
| stores.wincache.prefix | string | '' | WinCache 缓存前缀 |
| stores.xcache.type | string | 'xcache' | XCache 缓存驱动 |
| stores.xcache.prefix | string | '' | XCache 缓存前缀 |
| stores.apc.type | string | 'apc' | APC 缓存驱动 |
| stores.apc.prefix | string | '' | APC 缓存前缀 |
| prefix | string | '' | 缓存前缀 |

### 4.4 队列配置 (queue.php)

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|--------|------|
| default | string | 'sync' | 默认队列驱动 |
| connections | array | [] | 队列连接配置 |
| connections.sync.driver | string | 'sync' | 同步队列驱动 |
| connections.database.driver | string | 'database' | 数据库队列驱动 |
| connections.database.table | string | 'jobs' | 队列表名 |
| connections.database.queue | string | 'default' | 默认队列名 |
| connections.database.expire | int | 60 | 任务过期时间 |
| connections.redis.driver | string | 'redis' | Redis 队列驱动 |
| connections.redis.connection | string | 'default' | Redis 连接名 |
| connections.redis.queue | string | 'default' | 默认队列名 |
| connections.redis.expire | int | 60 | 任务过期时间 |
| failed | array | [] | 失败队列配置 |
| failed.driver | string | 'database' | 失败队列驱动 |
| failed.table | string | 'failed_jobs' | 失败队列表名 |

### 4.5 日志配置 (log.php)

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|--------|------|
| default | array | ['file'] | 默认日志通道 |
| channels | array | [] | 日志通道配置 |
| channels.file.type | string | 'file' | 文件日志驱动 |
| channels.file.path | string | '' | 文件日志路径 |
| channels.file.level | string | 'debug' | 日志级别 |
| channels.file.days | int | 15 | 日志保留天数 |
| channels.file.json | bool | false | 是否 JSON 格式 |
| channels.syslog.type | string | 'syslog' | Syslog 日志驱动 |
| channels.syslog.ident | string | 'think' | Syslog 标识 |
| channels.syslog.facility | int | 8 | Syslog 设备 |
| channels.syslog.level | string | 'debug' | 日志级别 |
| channels.mail.type | string | 'mail' | 邮件日志驱动 |
| channels.mail.to | string | '' | 邮件接收地址 |
| channels.mail.subject | string | 'Log message' | 邮件主题 |
| channels.mail.level | string | 'error' | 日志级别 |

## 4. 核心配置说明

### 4.1 应用配置 (app.php)

- **app_debug**: 应用调试模式，开发环境设置为 `true`，生产环境设置为 `false`
- **app_trace**: 应用跟踪模式，用于调试，开发环境设置为 `true`，生产环境设置为 `false`
- **app_status**: 应用状态，用于加载不同的配置文件
- **default_return_type**: 默认返回类型，API 应用通常设置为 `json`
- **default_timezone**: 默认时区，中国地区设置为 `Asia/Shanghai`

### 4.2 数据库配置 (database.php)

- **default**: 默认数据库连接，通常使用 `mysql`
- **connections.mysql.hostname**: 数据库主机名，通常为 `127.0.0.1` 或数据库服务器 IP 地址
- **connections.mysql.database**: 数据库名，根据实际情况设置
- **connections.mysql.username**: 数据库用户名，根据实际情况设置
- **connections.mysql.password**: 数据库密码，根据实际情况设置
- **connections.mysql.charset**: 数据库字符集，通常使用 `utf8mb4`
- **connections.mysql.prefix**: 数据库表前缀，根据实际情况设置

### 4.3 缓存配置 (cache.php)

- **default**: 默认缓存驱动，开发环境通常使用 `file`，生产环境通常使用 `redis`
- **stores.redis.host**: Redis 主机名，通常为 `127.0.0.1` 或 Redis 服务器 IP 地址
- **stores.redis.password**: Redis 密码，根据实际情况设置
- **stores.redis.port**: Redis 端口，默认为 `6379`
- **stores.redis.select**: Redis 数据库编号，默认使用 `0`

### 4.4 队列配置 (queue.php)

- **default**: 默认队列驱动，开发环境通常使用 `sync`，生产环境通常使用 `redis` 或 `database`
- **connections.redis.queue**: 默认队列名，根据实际情况设置
- **failed.table**: 失败队列表名，默认为 `failed_jobs`

### 4.5 日志配置 (log.php)

- **default**: 默认日志通道，通常使用 `file`
- **channels.file.path**: 文件日志路径，默认使用 `runtime/log`
- **channels.file.level**: 日志级别，开发环境通常使用 `debug`，生产环境通常使用 `info` 或 `error`
- **channels.file.days**: 日志保留天数，根据实际情况设置

## 5. 配置最佳实践

### 5.1 开发环境配置

- **app_debug**: `true`
- **app_trace**: `true`
- **default_return_type**: `json`
- **database.connections.mysql.hostname**: `127.0.0.1`
- **database.connections.mysql.database**: `crmeb_dev`
- **cache.default**: `file`
- **queue.default**: `sync`
- **log.channels.file.level**: `debug`

### 5.2 测试环境配置

- **app_debug**: `false`
- **app_trace**: `false`
- **default_return_type**: `json`
- **database.connections.mysql.hostname**: `127.0.0.1`
- **database.connections.mysql.database**: `crmeb_test`
- **cache.default**: `redis`
- **queue.default**: `redis`
- **log.channels.file.level**: `info`

### 5.3 生产环境配置

- **app_debug**: `false`
- **app_trace**: `false`
- **default_return_type**: `json`
- **database.connections.mysql.hostname**: `your_db_host`
- **database.connections.mysql.database**: `crmeb_prod`
- **database.connections.mysql.username**: `your_db_user`
- **database.connections.mysql.password**: `your_db_password`
- **cache.default**: `redis`
- **queue.default**: `redis`
- **log.channels.file.level**: `error`
- **log.channels.file.days**: `30`

## 6. 常见配置问题

### 6.1 数据库连接失败

- **问题**: 无法连接到数据库
- **原因**: 数据库配置错误，如主机名、端口、用户名或密码错误
- **解决方案**: 检查数据库配置，确保配置正确

### 6.2 缓存无法使用

- **问题**: 缓存无法正常使用
- **原因**: 缓存配置错误，如 Redis 主机名、端口或密码错误
- **解决方案**: 检查缓存配置，确保配置正确

### 6.3 队列无法正常工作

- **问题**: 队列任务无法执行
- **原因**: 队列配置错误，如 Redis 连接错误或队列驱动配置错误
- **解决方案**: 检查队列配置，确保配置正确

### 6.4 日志无法写入

- **问题**: 日志无法写入到文件
- **原因**: 日志目录没有写权限
- **解决方案**: 为日志目录添加写权限

### 6.5 环境变量不生效

- **问题**: 环境变量配置不生效
- **原因**: 环境变量文件 `.env` 不存在或配置错误
- **解决方案**: 创建 `.env` 文件，确保配置正确

## 7. 参考资源

- [ThinkPHP 6 配置](https://www.kancloud.cn/manual/thinkphp6_0/1037478)
- [环境变量配置](https://www.kancloud.cn/manual/thinkphp6_0/1037479)
- [数据库配置](https://www.kancloud.cn/manual/thinkphp6_0/1037480)
- [缓存配置](https://www.kancloud.cn/manual/thinkphp6_0/1037481)
- [队列配置](https://www.kancloud.cn/manual/thinkphp6_0/1037482)
- [日志配置](https://www.kancloud.cn/manual/thinkphp6_0/1037483)