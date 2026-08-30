# 项目部署文档

## 1. 概述

本文档描述了 CRMEB 项目的部署流程，包括环境配置、部署步骤、服务管理等，旨在规范项目部署，确保项目能够稳定运行。

## 2. 部署架构

### 2.1 系统架构

#### 2.1.1 基础架构

- **Web 服务器**: Nginx/Apache
- **应用服务器**: PHP-FPM
- **数据库服务器**: MySQL
- **缓存服务器**: Redis
- **队列服务器**: ThinkPHP 内置队列
- **长连接服务器**: Workerman

#### 2.1.2 部署模式

##### 2.1.2.1 单机部署

```
┌─────────────────────────────────────────────────────┐
│                    服务器                           │
├──────────────┬──────────────┬──────────────┬─────────┤
│  Nginx/Apache│   PHP-FPM    │    MySQL     │  Redis  │
└──────────────┴──────────────┴──────────────┴─────────┘
```

##### 2.1.2.2 分布式部署

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Web 服务器  │────>│ 应用服务器   │────>│ 数据库服务器 │
├──────────────┤     ├──────────────┤     ├──────────────┤
│   Nginx      │     │   PHP-FPM    │     │    MySQL     │
└──────────────┘     └──────────────┘     └──────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                     ┌──────────────┐
                     │  缓存服务器  │
                     ├──────────────┤
                     │    Redis     │
                     └──────────────┘
```

### 2.2 网络架构

#### 2.2.1 网络拓扑

- **公网**: 外部访问
- **内网**: 内部服务通信
- **DMZ**: 边界区域

#### 2.2.2 端口规划

- **HTTP**: 80
- **HTTPS**: 443
- **SSH**: 22
- **MySQL**: 3306
- **Redis**: 6379
- **PHP-FPM**: 9000
- **Workerman**: 8282

## 3. 环境配置

### 3.1 操作系统

#### 3.1.1 系统要求

- **Linux**: CentOS 7+/Ubuntu 18.04+
- **Windows**: Windows Server 2016+
- **macOS**: macOS 10.15+

#### 3.1.2 系统优化

```bash
# 关闭 SELinux
setenforce 0
sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config

# 关闭防火墙（生产环境建议配置规则）
systemctl stop firewalld
systemctl disable firewalld

# 调整文件描述符
cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
EOF

# 调整内核参数
cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 5000
EOF
sysctl -p
```

### 3.2 PHP 环境

#### 3.2.1 版本要求

- **PHP**: 7.1~7.4

#### 3.2.2 安装步骤

```bash
# CentOS 安装 PHP 7.4
rpm -Uvh https://mirror.webtatic.com/yum/el7/epel-release.rpm
rpm -Uvh https://mirror.webtatic.com/yum/el7/webtatic-release.rpm
yum install -y php74w php74w-fpm php74w-cli php74w-mysql php74w-redis php74w-gd php74w-mbstring php74w-xml php74w-zip php74w-opcache

# Ubuntu 安装 PHP 7.4
apt update
apt install -y php7.4 php7.4-fpm php7.4-cli php7.4-mysql php7.4-redis php7.4-gd php7.4-mbstring php7.4-xml php7.4-zip php7.4-opcache
```

#### 3.2.3 配置优化

```php
// php.ini 配置
memory_limit = 512M
upload_max_filesize = 20M
post_max_size = 20M
max_execution_time = 300
date.timezone = Asia/Shanghai
opcache.enable = 1
opcache.enable_cli = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 4000
opcache.revalidate_freq = 60

// www.conf 配置
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.process_idle_timeout = 10s
pm.max_requests = 1000
```

### 3.3 Web 服务器

#### 3.3.1 Nginx 配置

```nginx
# crmeb.conf
server {
    listen 80;
    server_name example.com;
    root /data/www/crmeb/public;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    access_log /data/logs/nginx/crmeb.access.log;
    error_log /data/logs/nginx/crmeb.error.log;
}
```

### 3.4 数据库配置

#### 3.4.1 MySQL 安装

```bash
# CentOS 安装 MySQL 5.7
yum localinstall -y https://dev.mysql.com/get/mysql57-community-release-el7-11.noarch.rpm
yum install -y mysql-community-server

systemctl start mysqld
systemctl enable mysqld

# 获取初始密码
grep 'temporary password' /var/log/mysqld.log

# 安全配置
mysql_secure_installation

# Ubuntu 安装 MySQL 5.7
apt update
apt install -y mysql-server
mysql_secure_installation
```

#### 3.4.2 MySQL 配置优化

```ini
# my.cnf 配置
[mysqld]
bind-address = 127.0.0.1
port = 3306
datadir = /var/lib/mysql
socket = /var/lib/mysql/mysql.sock
user = mysql

# 性能优化
max_connections = 1000
wait_timeout = 60
interactive_timeout = 28800
key_buffer_size = 64M
table_open_cache = 256
sort_buffer_size = 1M
read_buffer_size = 1M
read_rnd_buffer_size = 4M
myisam_sort_buffer_size = 64M
thread_cache_size = 8
query_cache_size = 16M

# InnoDB 优化
innodb_buffer_pool_size = 1G
innodb_file_per_table = 1
innodb_log_file_size = 256M
innodb_log_buffer_size = 8M
innodb_flush_method = O_DIRECT
```

### 3.5 缓存配置

#### 3.5.1 Redis 安装

```bash
# CentOS 安装 Redis
yum install -y epel-release
yum install -y redis

systemctl start redis
systemctl enable redis

# Ubuntu 安装 Redis
apt update
apt install -y redis-server
systemctl start redis
systemctl enable redis
```

#### 3.5.2 Redis 配置优化

```conf
# redis.conf 配置
bind 127.0.0.1
port 6379
databases 16
dir /var/lib/redis
requirepass your_password
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 4. 部署流程

### 4.1 代码部署

#### 4.1.1 Git 部署

```bash
# 克隆代码
git clone https://github.com/crmeb/CRMEB.git /data/www/crmeb
cd /data/www/crmeb

# 切换版本
git checkout tags/v5.6.4

# 安装依赖
composer install --no-dev

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库、Redis 等信息

# 生成密钥
php think key:generate

# 数据库迁移
php think migrate:run

# 生成数据表
php think crmeb:install

# 清除缓存
php think clear
```

#### 4.1.2 手动部署

1. **下载代码**: 从官方网站下载最新版本
2. **上传代码**: 上传到服务器 `/data/www/` 目录
3. **解压代码**: `unzip CRMEB_v5.6.4.zip -d /data/www/crmeb`
4. **安装依赖**: `composer install --no-dev`
5. **配置环境**: 同 Git 部署步骤

### 4.2 服务启动

#### 4.2.1 Web 服务

```bash
# Nginx 启动
systemctl start nginx
systemctl enable nginx

# Apache 启动
systemctl start httpd
systemctl enable httpd
```

#### 4.2.2 PHP-FPM 服务

```bash
systemctl start php-fpm
systemctl enable php-fpm
```

#### 4.2.3 队列服务

```bash
# 启动队列（推荐使用 Supervisor 管理）
supervisorctl start crmeb-queue

# Supervisor 配置
[program:crmeb-queue]
command=php /data/www/crmeb/think queue:listen --queue=default --timeout=60
process_name=%(program_name)s_%(process_num)02d
autostart=true
autorestart=true
user=www
numprocs=2
directory=/data/www/crmeb
stdout_logfile=/data/logs/supervisor/crmeb-queue-stdout.log
stderr_logfile=/data/logs/supervisor/crmeb-queue-stderr.log
```

#### 4.2.4 长连接服务

```bash
# 启动长连接服务
php think workerman start --d

# 停止长连接服务
php think workerman stop
```

#### 4.2.5 定时任务

```bash
# 添加定时任务
crontab -e

# 定时任务配置
* * * * * php /data/www/crmeb/think timer run
0 0 * * * php /data/www/crmeb/think crmeb:backup
```

### 4.3 部署验证

#### 4.3.1 健康检查

- **访问首页**: `http://example.com`
- **访问后台**: `http://example.com/admin`
- **API 测试**: `http://example.com/api/ping`
- **数据库连接**: 检查数据库连接状态
- **Redis 连接**: 检查缓存连接状态

#### 4.3.2 日志检查

```bash
# 检查 Nginx 日志
tail -f /data/logs/nginx/crmeb.error.log

# 检查 PHP 错误日志
tail -f /var/log/php-fpm/error.log

# 检查应用日志
tail -f /data/www/crmeb/runtime/log/*.log
```

## 5. 服务管理

### 5.1 日常运维

#### 5.1.1 监控检查

- **服务状态**: 检查所有服务是否正常运行
- **系统负载**: 监控 CPU、内存、磁盘使用情况
- **网络状态**: 监控网络连接和带宽使用
- **应用状态**: 监控应用响应时间和错误率

#### 5.1.2 日志管理

- **日志收集**: 集中收集所有服务日志
- **日志分析**: 分析日志中的错误和异常
- **日志清理**: 定期清理过期日志
- **日志备份**: 重要日志备份到远程存储

#### 5.1.3 备份恢复

##### 5.1.3.1 数据备份

```bash
# 数据库备份
mysqldump -u username -p database_name > /data/backup/data/$(date +%Y%m%d)_backup.sql

# 代码备份
tar -czf /data/backup/code/$(date +%Y%m%d)_crmeb.tar.gz /data/www/crmeb

# 配置文件备份
tar -czf /data/backup/config/$(date +%Y%m%d)_config.tar.gz /data/www/crmeb/config
```

##### 5.1.3.2 数据恢复

```bash
# 数据库恢复
mysql -u username -p database_name < /data/backup/data/20240101_backup.sql

# 代码恢复
tar -xzf /data/backup/code/20240101_crmeb.tar.gz -C /data/www/

# 配置文件恢复
tar -xzf /data/backup/config/20240101_config.tar.gz -C /data/www/crmeb/
```

## 6. 常见问题

### 6.1 部署问题

#### 6.1.1 依赖安装失败

- **问题**: Composer 安装依赖失败
- **原因**: 网络问题，PHP 版本不兼容
- **解决方案**: 使用国内镜像，检查 PHP 版本

#### 6.1.2 数据库连接失败

- **问题**: 应用无法连接数据库
- **原因**: 数据库服务未启动，用户名密码错误，网络连接问题
- **解决方案**: 检查 MySQL 服务，验证用户名密码，检查网络连接

#### 6.1.3 权限错误

- **问题**: 文件或目录权限错误
- **原因**: 权限设置不正确，用户组不匹配
- **解决方案**: 设置正确的文件权限，确保 PHP-FPM 用户有访问权限

#### 6.1.4 端口占用

- **问题**: 服务启动失败，端口被占用
- **原因**: 其他服务占用了相同端口
- **解决方案**: 查找并停止占用端口的服务，或修改服务端口

### 6.2 运行问题

#### 6.2.1 应用响应缓慢

- **问题**: 应用响应时间长
- **原因**: 数据库查询慢，PHP 代码效率低，服务器资源不足
- **解决方案**: 优化 SQL 查询，优化 PHP 代码，增加服务器资源

#### 6.2.2 内存溢出

- **问题**: PHP 内存溢出
- **原因**: 内存限制过小，代码中存在内存泄漏
- **解决方案**: 增加 PHP 内存限制，优化代码中的内存使用

#### 6.2.3 队列堆积

- **问题**: 队列任务堆积
- **原因**: 队列处理速度慢，任务量过大
- **解决方案**: 增加队列进程数，优化队列任务处理逻辑

## 7. 参考资源

- [CRMEB 官方文档](https://doc.crmeb.com/single_open)
- [ThinkPHP 6 官方文档](https://www.kancloud.cn/manual/thinkphp6_0)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [PHP 官方文档](https://www.php.net/docs.php)
- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [Redis 官方文档](https://redis.io/documentation)