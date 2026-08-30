# CRMEB系统配置详解

## 1. 配置文件结构

CRMEB使用多文件配置方式，配置文件位于 `crmeb/config/` 目录：

```
config/
├── app.php                   # 应用配置
├── cache.php                 # 缓存配置
├── cookie.php                # Cookie配置
├── database.php              # 数据库配置
├── log.php                   # 日志配置
├── middleware.php            # 中间件配置
├── queue.php                 # 队列配置
├── route.php                 # 路由配置
├── session.php               # Session配置
├── template.php              # 模板配置
├── trace.php                 # 调试配置
├── workerman.php             # Workerman配置
└── ...
```

系统还支持环境变量配置（`.env` 文件），可以覆盖配置文件中的设置。

## 2. 应用配置（app.php）

**配置文件：** `crmeb/config/app.php`

**主要配置项：**

```php
<?php
return [
    // 应用名称
    'app_name' => 'CRMEB',
    
    // 应用版本
    'app_version' => '5.6.4',
    
    // 应用调试模式
    'app_debug' => false,
    
    // 应用Trace调试
    'app_trace' => false,
    
    // 是否支持多应用
    'app_multi_app' => true,
    
    // 入口自动绑定应用
    'auto_bind_app' => true,
    
    // 应用映射（自动多应用模式有效）
    'app_map' => [
        'adminapi' => 'adminapi',
        'api' => 'api',
        'kefuapi' => 'kefuapi',
        'outapi' => 'outapi',
    ],
    
    // 域名绑定（自动多应用模式有效）
    'domain_bind' => [
        // 'adminapi.crmeb.com' => 'adminapi',
        // 'api.crmeb.com' => 'api',
    ],
    
    // 默认应用
    'default_app' => 'home',
    
    // 默认时区
    'default_timezone' => 'Asia/Shanghai',
    
    // 异常处理handle类
    'exception_handle' => '\app\ExceptionHandle',
];
```

**环境变量配置（.env）：**
```env
APP_DEBUG = false
DEFAULT_TIMEZONE = Asia/Shanghai
```

## 3. 数据库配置（database.php）

**配置文件：** `crmeb/config/database.php`

**主要配置项：**

```php
<?php
return [
    // 默认使用的数据库连接
    'default' => env('database.type', 'mysql'),
    
    // 时间字段取出后的默认时间格式
    'datetime_format' => 'Y-m-d H:i:s',
    
    // 数据库连接信息
    'connections' => [
        'mysql' => [
            // 数据库类型
            'type' => 'mysql',
            // 服务器地址
            'hostname' => env('database.hostname', '127.0.0.1'),
            // 数据库名
            'database' => env('database.database', 'crmeb'),
            // 用户名
            'username' => env('database.username', 'root'),
            // 密码
            'password' => env('database.password', ''),
            // 端口
            'hostport' => env('database.hostport', '3306'),
            // 数据库连接参数
            'params' => [
                PDO::ATTR_CASE => PDO::CASE_NATURAL,
            ],
            // 字符集
            'charset' => env('database.charset', 'utf8mb4'),
            // 数据库表前缀
            'prefix' => env('database.prefix', 'eb_'),
            // 数据库调试模式
            'debug' => env('database.debug', false),
            // 数据库部署方式:0 集中式(单一服务器),1 分布式(主从服务器)
            'deploy' => 0,
            // 数据库读写是否分离 主从式有效
            'rw_separate' => false,
            // 读写分离后 主服务器数量
            'master_num' => 1,
            // 指定从服务器序号
            'slave_no' => '',
            // 是否严格检查字段是否存在
            'fields_strict' => true,
            // 是否需要断线重连
            'break_reconnect' => false,
            // 监听SQL
            'trigger_sql' => true,
            // 开启字段缓存
            'fields_cache' => false,
        ],
    ],
];
```

**环境变量配置（.env）：**
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

**读写分离配置示例：**
```php
<?php
return [
    'connections' => [
        'mysql' => [
            // 主库（写操作）
            'hostname' => '192.168.1.1,192.168.1.2',
            'username' => 'root',
            'password' => 'password',
            'hostport' => '3306',
            'deploy' => 1,              // 1 分布式
            'rw_separate' => true,      // 读写分离
            'master_num' => 1,          // 主库数量
            'slave_no' => '',           // 从库序号
        ],
    ],
];
```

## 4. 缓存配置（cache.php）

**配置文件：** `crmeb/config/cache.php`

**主要配置项：**

```php
<?php
return [
    // 默认缓存驱动
    'default' => env('cache.driver', 'redis'),
    
    // 缓存连接方式配置
    'stores' => [
        'file' => [
            // 驱动方式
            'type' => 'file',
            // 缓存保存目录
            'path' => '../runtime/cache/',
            // 缓存前缀
            'prefix' => 'eb_',
            // 缓存有效期 0表示永久缓存
            'expire' => 0,
        ],
        
        'redis' => [
            // 驱动方式
            'type' => 'redis',
            // 服务器地址
            'host' => env('redis.hostname', '127.0.0.1'),
            // 端口
            'port' => env('redis.port', 6379),
            // 密码
            'password' => env('redis.password', ''),
            // 缓存前缀
            'prefix' => env('cache.prefix', 'eb_'),
            // 缓存有效期
            'expire' => 3600,
            // 数据库索引
            'select' => env('redis.select', 0),
            // 序列化机制
            'serialize' => true,
        ],
    ],
];
```

**环境变量配置（.env）：**
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

## 5. 队列配置（queue.php）

**配置文件：** `crmeb/config/queue.php`

**主要配置项：**

```php
<?php
return [
    // 默认的队列驱动
    'default' => 'redis',
    
    // 队列驱动配置
    'connections' => [
        'sync' => [
            // 同步驱动
            'type' => 'sync',
        ],
        
        'redis' => [
            // 驱动方式
            'type' => 'redis',
            // 队列名称
            'queue' => env('queue.queue_name', 'default'),
            // 错误重试次数
            'retry' => 3,
            // redis配置
            'host' => env('redis.hostname', '127.0.0.1'),
            'port' => env('redis.port', 6379),
            'password' => env('redis.password', ''),
            'select' => env('redis.select', 0),
            'timeout' => 0,
            'persistent' => false,
        ],
        
        'database' => [
            // 数据库驱动
            'type' => 'database',
            // 队列表名
            'queue' => 'jobs',
            // 错误重试次数
            'retry' => 3,
        ],
    ],
    
    // 队列驱动配置
    'failed' => [
        // 驱动类型
        'type' => 'redis',
        // 错误日志记录
        'log' => true,
        // redis配置
        'host' => env('redis.hostname', '127.0.0.1'),
        'port' => env('redis.port', 6379),
        'password' => env('redis.password', ''),
        'select' => env('redis.select', 0),
        'timeout' => 0,
        'persistent' => false,
    ],
];
```

**环境变量配置（.env）：**
```env
[QUEUE]
QUEUE_NAME = default
```

**使用示例：**
```php
<?php
// 推送任务到队列
\think\facade\Queue::push(Job::class, $data, 'queue_name');

// 延迟执行任务
\think\facade\Queue::later(10, Job::class, $data, 'queue_name');  // 延迟10秒

// 启动队列消费者
php think queue:listen --queue

// 查看队列状态
php think queue:status
```

## 6. Workerman配置（workerman.php）

**配置文件：** `crmeb/config/workerman.php`

**主要配置项：**

```php
<?php
return [
    // 管理后台通知服务
    'admin' => [
        // 协议
        'protocol' => 'websocket',
        // 监听地址
        'ip' => '0.0.0.0',
        // 监听端口
        'port' => 40001,
        // 进程数
        'processes' => 1,
        // 心跳间隔（秒）
        'heartbeat' => 30,
        // 心跳失败次数
        'max_fail_count' => 2,
    ],
    
    // 客服消息服务
    'chat' => [
        'protocol' => 'websocket',
        'ip' => '0.0.0.0',
        'port' => 40002,
        'processes' => 1,
        'heartbeat' => 30,
        'max_fail_count' => 2,
    ],
    
    // 内部通讯服务
    'channel' => [
        'protocol' => 'tcp',
        'ip' => '127.0.0.1',
        'port' => 40003,
        'processes' => 1,
    ],
    
    // 定时任务服务
    'timer' => [
        // 是否开启定时任务
        'enable' => true,
        // 进程数
        'processes' => 1,
        // 任务列表
        'jobs' => [
            // 取消未支付订单
            'cancel_unpaid_order' => [
                'cron' => '*/30 * * * *',  // 每30分钟
                'class' => '\app\jobs\UnpaidOrderCancelJob',
            ],
            // 自动确认收货
            'auto_confirm_receive' => [
                'cron' => '0 2 * * *',     // 每天凌晨2点
                'class' => '\app\jobs\AutoConfirmJob',
            ],
            // 自动好评
            'auto_comment' => [
                'cron' => '0 3 * * *',     // 每天凌晨3点
                'class' => '\app\jobs\AutoCommentJob',
            ],
            // 关闭拼团
            'close_pink' => [
                'cron' => '*/10 * * * *',  // 每10分钟
                'class' => '\app\jobs\PinkJob',
            ],
            // 关闭砍价
            'close_bargain' => [
                'cron' => '*/10 * * * *',  // 每10分钟
                'class' => '\app\jobs\BargainJob',
            ],
            // 积分过期处理
            'integral_expire' => [
                'cron' => '0 4 * * *',     // 每天凌晨4点
                'class' => '\app\jobs\IntegralExpireJob',
            ],
            // 优惠券过期处理
            'coupon_expire' => [
                'cron' => '0 5 * * *',     // 每天凌晨5点
                'class' => '\app\jobs\CouponExpireJob',
            ],
            // 佣金结算
            'commission_settle' => [
                'cron' => '0 6 * * *',     // 每天凌晨6点
                'class' => '\app\jobs\CommissionJob',
            ],
        ],
    ],
];
```

**启动命令：**
```bash
# 启动Workerman服务
php think workerman start --d

# 停止服务
php think workerman stop

# 重启服务
php think workerman restart

# 查看状态
php think workerman status

# 平滑重启
php think workerman reload
```

## 7. 日志配置（log.php）

**配置文件：** `crmeb/config/log.php`

**主要配置项：**

```php
<?php
return [
    // 默认日志记录通道
    'default' => env('log.channel', 'file'),
    
    // 日志记录级别
    'level' => ['info', 'error', 'warning', 'debug'],
    
    // 日志类型记录的通道
    'type_channel' => [
        'error' => ['file', 'email'],
    ],
    
    // 日志通道列表
    'channels' => [
        'file' => [
            // 驱动方式
            'type' => 'file',
            // 日志保存目录
            'path' => '../runtime/log/',
            // 单个日志文件的大小限制（超过会生成新文件）
            'file_size' => 2097152,
            // 日志的时间格式
            'time_format' => 'c',
            // 日志输出格式化
            'format' => '[%s][%s] %s',
            // 是否JSON格式记录
            'json' => false,
        ],
        
        'order' => [
            'type' => 'file',
            'path' => '../runtime/log/order/',
            'file_size' => 2097152,
            'json' => false,
        ],
        
        'pay' => [
            'type' => 'file',
            'path' => '../runtime/log/pay/',
            'file_size' => 2097152,
            'json' => false,
        ],
    ],
];
```

**使用示例：**
```php
<?php
use think\facade\Log;

// 记录日志
Log::info('订单创建成功', ['order_id' => $orderId]);
Log::error('支付失败', ['order_id' => $orderId, 'error' => $error]);
Log::warning('库存不足', ['product_id' => $productId]);

// 指定通道记录
Log::channel('order')->info('订单日志', ['order_id' => $orderId]);
Log::channel('pay')->info('支付日志', ['pay_id' => $payId]);
```

## 8. 文件存储配置

### 8.1 本地存储

**配置位置：** 后台管理 > 系统设置 > 文件存储

**配置参数：**
```php
// config/filesystem.php
return [
    'default' => 'public',
    
    'disks' => [
        'public' => [
            'type' => 'local',
            'root' => app()->getRootPath() . 'public/storage',
            'url' => '/storage',
        ],
    ],
];
```

### 8.2 云存储配置

**阿里云OSS：**
```php
'aliyun' => [
    'type' => 'aliyun',
    'accessId' => env('oss.access_id', ''),
    'accessSecret' => env('oss.access_secret', ''),
    'bucket' => env('oss.bucket', ''),
    'endpoint' => env('oss.endpoint', ''),
    'domain' => env('oss.domain', ''),
    'timeout' => 3600,
],
```

**腾讯云COS：**
```php
'tencent' => [
    'type' => 'tencent',
    'region' => env('cos.region', ''),
    'appId' => env('cos.app_id', ''),
    'secretId' => env('cos.secret_id', ''),
    'secretKey' => env('cos.secret_key', ''),
    'bucket' => env('cos.bucket', ''),
    'timeout' => 3600,
],
```

**七牛云：**
```php
'qiniu' => [
    'type' => 'qiniu',
    'accessKey' => env('qiniu.access_key', ''),
    'secretKey' => env('qiniu.secret_key', ''),
    'bucket' => env('qiniu.bucket', ''),
    'domain' => env('qiniu.domain', ''),
    'timeout' => 3600,
],
```

## 9. 微信支付配置

### 9.1 配置参数

**配置文件：** `crmeb/config/wechat.php`

```php
<?php
return [
    // 公众号
    'official_account' => [
        'app_id' => env('wechat.official_account_app_id', ''),
        'secret' => env('wechat.official_account_secret', ''),
        'token' => env('wechat.official_account_token', ''),
        'aes_key' => env('wechat.official_account_aes_key', ''),
        'mch_id' => env('wechat.mch_id', ''),           // 商户号
        'key' => env('wechat.key', ''),                 // API密钥
        'cert_path' => env('wechat.cert_path', ''),     // 证书路径
        'key_path' => env('wechat.key_path', ''),       // 证书密钥路径
    ],
    
    // 小程序
    'mini_program' => [
        'app_id' => env('wechat.mini_program_app_id', ''),
        'secret' => env('wechat.mini_program_secret', ''),
        'mch_id' => env('wechat.mch_id', ''),
        'key' => env('wechat.key', ''),
        'cert_path' => env('wechat.cert_path', ''),
        'key_path' => env('wechat.key_path', ''),
    ],
    
    // 开放平台
    'open_platform' => [
        'app_id' => env('wechat.open_platform_app_id', ''),
        'secret' => env('wechat.open_platform_secret', ''),
        'token' => env('wechat.open_platform_token', ''),
        'aes_key' => env('wechat.open_platform_aes_key', ''),
    ],
    
    // 企业微信
    'work' => [
        'corp_id' => env('wechat.work_corp_id', ''),
        'agent_id' => env('wechat.work_agent_id', ''),
        'secret' => env('wechat.work_secret', ''),
    ],
    
    // 支付配置
    'payment' => [
        'mch_id' => env('wechat.mch_id', ''),
        'key' => env('wechat.key', ''),
        'cert_path' => env('wechat.cert_path', ''),
        'key_path' => env('wechat.key_path', ''),
        'notify_url' => env('wechat.notify_url', ''),
    ],
];
```

**环境变量配置（.env）：**
```env
[WECHAT]
MCH_ID = 1234567890
KEY = your_api_key
CERT_PATH = /path/to/apiclient_cert.pem
KEY_PATH = /path/to/apiclient_key.pem

[WECHAT_OFFICIAL_ACCOUNT]
APP_ID = wx1234567890abcdef
SECRET = your_secret
TOKEN = your_token
AES_KEY = your_aes_key

[WECHAT_MINI_PROGRAM]
APP_ID = wx1234567890abcdef
SECRET = your_secret
```

## 10. 支付宝配置

**配置文件：** `crmeb/config/alipay.php`

```php
<?php
return [
    // 应用ID
    'app_id' => env('alipay.app_id', ''),
    
    // 商户私钥
    'merchant_private_key' => env('alipay.merchant_private_key', ''),
    
    // 支付宝公钥
    'alipay_public_key' => env('alipay.alipay_public_key', ''),
    
    // 支付宝网关
    'gateway_url' => 'https://openapi.alipay.com/gateway.do',
    
    // 异步通知地址
    'notify_url' => env('alipay.notify_url', ''),
    
    // 同步回调地址
    'return_url' => env('alipay.return_url', ''),
    
    // 字符编码
    'charset' => 'UTF-8',
    
    // 签名方式
    'sign_type' => 'RSA2',
    
    // 是否沙箱模式
    'sandbox' => false,
];
```

**环境变量配置（.env）：**
```env
[ALIPAY]
APP_ID = 2021001234567890
MERCHANT_PRIVATE_KEY = MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
ALIPAY_PUBLIC_KEY = MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
NOTIFY_URL = https://yourdomain.com/api/alipay/notify
RETURN_URL = https://yourdomain.com/pages/pay/success
```

## 11. 短信服务配置

### 11.1 阿里云短信

**配置文件：** `crmeb/config/sms.php`

```php
<?php
return [
    // 默认短信驱动
    'default' => env('sms.default', 'aliyun'),
    
    // 短信驱动配置
    'drivers' => [
        'aliyun' => [
            'access_key_id' => env('aliyun.access_key_id', ''),
            'access_key_secret' => env('aliyun.access_key_secret', ''),
            'sign_name' => env('aliyun.sign_name', ''),
            'endpoint' => 'dysmsapi.aliyuncs.com',
            'region_id' => 'cn-hangzhou',
        ],
        
        'tencent' => [
            'secret_id' => env('tencent.secret_id', ''),
            'secret_key' => env('tencent.secret_key', ''),
            'app_id' => env('tencent.app_id', ''),
            'sign_name' => env('tencent.sign_name', ''),
            'endpoint' => 'sms.tencentcloudapi.com',
            'region' => 'ap-guangzhou',
        ],
    ],
    
    // 短信模板
    'templates' => [
        'verify' => [
            'aliyun' => env('aliyun.template_code.verify', ''),
            'tencent' => env('tencent.template_code.verify', ''),
        ],
        'order_pay' => [
            'aliyun' => env('aliyun.template_code.order_pay', ''),
            'tencent' => env('tencent.template_code.order_pay', ''),
        ],
    ],
];
```

**环境变量配置（.env）：**
```env
[ALIYUN]
ACCESS_KEY_ID = your_access_key_id
ACCESS_KEY_SECRET = your_access_key_secret
SIGN_NAME = CRMEB商城
TEMPLATE_CODE_VERIFY = SMS_12345678
TEMPLATE_CODE_ORDER_PAY = SMS_12345679

[TENCENT]
SECRET_ID = your_secret_id
SECRET_KEY = your_secret_key
APP_ID = 1400123456
SIGN_NAME = CRMEB商城
TEMPLATE_CODE_VERIFY = 123456
TEMPLATE_CODE_ORDER_PAY = 123457
```

## 12. 邮件服务配置

**配置文件：** `crmeb/config/mail.php`

```php
<?php
return [
    // SMTP服务器
    'host' => env('mail.host', 'smtp.qq.com'),
    
    // SMTP端口
    'port' => env('mail.port', 465),
    
    // 加密方式（ssl/tls）
    'encryption' => env('mail.encryption', 'ssl'),
    
    // 用户名
    'username' => env('mail.username', ''),
    
    // 密码/授权码
    'password' => env('mail.password', ''),
    
    // 发件人邮箱
    'from_address' => env('mail.from_address', ''),
    
    // 发件人名称
    'from_name' => env('mail.from_name', 'CRMEB'),
    
    // 超时时间
    'timeout' => 30,
];
```

**环境变量配置（.env）：**
```env
[MAIL]
HOST = smtp.qq.com
PORT = 465
ENCRYPTION = ssl
USERNAME = your_email@qq.com
PASSWORD = your_authorization_code
FROM_ADDRESS = your_email@qq.com
FROM_NAME = CRMEB商城
```

## 13. 第三方登录配置

**配置文件：** `crmeb/config/oauth.php`

```php
<?php
return [
    // QQ登录
    'qq' => [
        'app_id' => env('oauth.qq_app_id', ''),
        'app_key' => env('oauth.qq_app_key', ''),
        'callback' => env('oauth.qq_callback', ''),
    ],
    
    // 微信登录
    'wechat' => [
        'app_id' => env('oauth.wechat_app_id', ''),
        'app_key' => env('oauth.wechat_app_key', ''),
        'callback' => env('oauth.wechat_callback', ''),
    ],
    
    // 微博登录
    'weibo' => [
        'app_id' => env('oauth.weibo_app_id', ''),
        'app_key' => env('oauth.weibo_app_key', ''),
        'callback' => env('oauth.weibo_callback', ''),
    ],
];
```

## 14. 安全配置

**配置文件：** `crmeb/config/secure.php`

```php
<?php
return [
    // 后台登录安全
    'admin_login' => [
        // 是否开启验证码
        'captcha' => true,
        // 同一IP最大尝试次数
        'max_attempts' => 5,
        // 锁定时间（分钟）
        'lock_time' => 30,
    ],
    
    // API安全
    'api' => [
        // 是否开启签名验证
        'sign_check' => false,
        // 签名密钥
        'sign_key' => env('secure.sign_key', 'your_sign_key'),
        // 请求有效期（秒）
        'request_expire' => 600,
    ],
    
    // 支付安全
    'pay' => [
        // 支付超时时间（分钟）
        'timeout' => 30,
        // 同一订单最大支付尝试次数
        'max_attempts' => 3,
    ],
    
    // 密码安全
    'password' => [
        // 最小长度
        'min_length' => 6,
        // 最大长度
        'max_length' => 20,
        // 是否包含数字
        'require_number' => false,
        // 是否包含字母
        'require_alpha' => false,
        // 是否包含特殊字符
        'require_symbol' => false,
    ],
];
```

## 15. 环境变量配置示例

**完整的.env配置示例：**

```env
APP_DEBUG = false

[APP]
DEFAULT_TIMEZONE = Asia/Shanghai

[DATABASE]
TYPE = mysql
HOSTNAME = 127.0.0.1
HOSTPORT = 3306
USERNAME = root
PASSWORD = your_password
DATABASE = crmeb
PREFIX = eb_
CHARSET = utf8mb4
DEBUG = false

[LANG]
default_lang = zh-cn

[CACHE]
DRIVER = redis
CACHE_PREFIX = cache_
CACHE_TAG_PREFIX = cache_tag_

[REDIS]
REDIS_HOSTNAME = 127.0.0.1
PORT = 6379
REDIS_PASSWORD = your_redis_password
SELECT = 0

[QUEUE]
QUEUE_NAME = default

[WECHAT]
MCH_ID = 1234567890
KEY = your_wechat_pay_key
CERT_PATH = /path/to/apiclient_cert.pem
KEY_PATH = /path/to/apiclient_key.pem
NOTIFY_URL = https://yourdomain.com/api/wechat/notify

[WECHAT_OFFICIAL_ACCOUNT]
APP_ID = wx1234567890abcdef
SECRET = your_official_secret
TOKEN = your_token
AES_KEY = your_aes_key

[WECHAT_MINI_PROGRAM]
APP_ID = wx1234567890abcdef
SECRET = your_mini_secret

[ALIPAY]
APP_ID = 2021001234567890
MERCHANT_PRIVATE_KEY = your_merchant_private_key
ALIPAY_PUBLIC_KEY = your_alipay_public_key
NOTIFY_URL = https://yourdomain.com/api/alipay/notify
RETURN_URL = https://yourdomain.com/pages/pay/success

[ALIYUN]
ACCESS_KEY_ID = your_access_key_id
ACCESS_KEY_SECRET = your_access_key_secret
SIGN_NAME = CRMEB商城
TEMPLATE_CODE_VERIFY = SMS_12345678

[OSS]
TYPE = aliyun
ACCESS_ID = your_oss_access_id
ACCESS_SECRET = your_oss_access_secret
BUCKET = your_bucket
ENDPOINT = oss-cn-hangzhou.aliyuncs.com
DOMAIN = https://yourdomain.oss-cn-hangzhou.aliyuncs.com

[COS]
TYPE = tencent
REGION = ap-guangzhou
APP_ID = 1234567890
SECRET_ID = your_cos_secret_id
SECRET_KEY = your_cos_secret_key
BUCKET = your_bucket-1234567890
DOMAIN = https://yourbucket-1234567890.cos.ap-guangzhou.myqcloud.com

[MAIL]
HOST = smtp.qq.com
PORT = 465
ENCRYPTION = ssl
USERNAME = your_email@qq.com
PASSWORD = your_email_password
FROM_ADDRESS = your_email@qq.com
FROM_NAME = CRMEB商城

[SECURE]
SIGN_KEY = your_sign_key
JWT_SECRET = your_jwt_secret
JWT_EXPIRE = 86400

[QUEUE]
QUEUE_NAME = default

[SESSION]
PREFIX = session_
EXPIRE = 86400

[TOKEN]
EXPIRE = 86400
```

## 16. 配置热更新

CRMEB支持通过后台管理界面动态修改部分配置，无需重启服务。

**支持的配置项：**
- 站点基本信息
- 支付配置
- 短信配置
- 邮件配置
- 文件存储配置
- 第三方登录配置
- 营销功能配置
- 分销配置

**配置存储位置：**
- 数据库：`eb_system_config` 表
- 缓存：Redis（自动同步）

**使用方式：**
```php
<?php
// 获取配置
$value = \think\facade\Config::get('config_name');

// 或
$value = config('config_name');

// 动态设置配置
config(['config_name' => $value]);
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-17
