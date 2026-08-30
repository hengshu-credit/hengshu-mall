# CRMEB快速开始指南

## 环境准备

### 1.1 安装Docker（推荐）

```bash
# MacOS
brew install docker

# 启动Docker
open /Applications/Docker.app
```

### 1.2 克隆项目

```bash
git clone https://gitee.com/ZhongBangKeJi/CRMEB.git
cd CRMEB
```

### 1.3 启动服务

```bash
# 使用docker-compose启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

**输出示例：**
```
NAME                COMMAND                  SERVICE             STATUS              PORTS
crmeb_mysql         "docker-entrypoint.s…"   mysql               running             0.0.0.0:33061->3306/tcp
crmeb_redis         "docker-entrypoint.s…"   redis               running             0.0.0.0:63791->6379/tcp
crmeb_php           "docker-php-entrypoi…"   phpfpm              running             0.0.0.0:9000->9000/tcp, 0.0.0.0:40001-40002->40001-40002/tcp
crmeb_nginx         "/docker-entrypoint.…"   nginx               running             0.0.0.0:8011->80/tcp
```

### 1.4 访问系统

**后台管理：**
- URL: http://localhost:8011/admin
- 账号: admin
- 密码: crmeb.com

**前端商城：**
- URL: http://localhost:8011
- 移动端: 浏览器模拟手机访问

**数据库：**
- Host: localhost:33061
- 账号: root
- 密码: 123456
- 数据库: crmeb

**Redis：**
- Host: localhost:63791
- 密码: 123456

### 1.5 启动后台服务

```bash
# 进入PHP容器
docker exec -it crmeb_php bash

# 在容器内启动队列（必须）
php think queue:listen --queue

# 启动定时任务（可选）
php think timer start --d

# 启动WebSocket（可选，用于实时通知）
php think workerman start --d
```

## 手动安装（非Docker）

### 2.1 环境要求

- PHP 7.1 - 7.4
- MySQL 5.7+
- Redis 5.0+（可选）
- Composer
- Node.js 14+

### 2.2 安装步骤

```bash
# 1. 安装PHP依赖
cd crmeb
composer install

# 如果安装慢，使用国内镜像
composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/
composer install

# 2. 配置环境变量
cp .env.example .env

# 3. 修改.env配置文件
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

[REDIS]
REDIS_HOSTNAME = 127.0.0.1
PORT = 6379
REDIS_PASSWORD = your_password
SELECT = 0

# 4. 导入数据库
mysql -u root -p crmeb < database.sql

# 5. 设置目录权限
chmod -R 755 runtime
chmod -R 755 public/uploads

# 6. 配置Nginx/Apache
# Nginx配置示例：
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/CRMEB/crmeb/public;
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
}

# 7. 启动队列（必须）
php think queue:listen --queue

# 8. 启动定时任务（可选）
php think timer start --d

# 9. 启动WebSocket（可选）
php think workerman start --d
```

### 2.3 前端构建

**管理端：**
```bash
cd template/admin

# 安装依赖
npm install

# 开发环境
npm run dev

# 生产构建
npm run build
```

**移动端（UniApp）：**
```bash
cd template/uni-app

# 安装依赖
npm install

# 开发环境 - H5
npm run dev:h5

# 开发环境 - 微信小程序
npm run dev:mp-weixin

# 生产构建 - H5
npm run build:h5

# 生产构建 - 微信小程序
npm run build:mp-weixin
```

## 验证安装

### 3.1 检查后端API

```bash
# 使用curl测试API
curl http://localhost:8011/api/index

# 预期响应
{"code":200,"msg":"ok","data":{...}}
```

### 3.2 检查队列

```bash
# 进入PHP容器
docker exec -it crmeb_php bash

# 查看队列状态
php think queue:status
```

### 3.3 检查定时任务

```bash
# 查看定时任务状态
php think timer status
```

### 3.4 检查WebSocket

```bash
# 查看WebSocket服务状态
php think workerman status
```

## 常见问题

### 4.1 Docker容器无法启动

**问题：**
```
Error: Ports are not available: exposing port TCP 0.0.0.0:33061
```

**解决：**
```bash
# 检查端口占用
lsof -i :33061
lsof -i :63791
lsof -i :8011

# 杀死占用进程
kill -9 <PID>

# 修改docker-compose.yml中的端口映射
# 例如：将 "33061:3306" 改为 "33062:3306"
```

### 4.2 MySQL连接失败

**问题：**
```
SQLSTATE[HY000] [2002] Connection refused
```

**解决：**
```bash
# 检查MySQL容器状态
docker ps | grep mysql

# 查看MySQL日志
docker logs crmeb_mysql

# 检查.env配置
# 使用Docker时HOSTNAME应为crmeb_mysql
# 手动安装时HOSTNAME应为127.0.0.1

# 测试MySQL连接
docker exec -it crmeb_mysql mysql -u root -p
```

### 4.3 Redis连接失败

**问题：**
```
RedisException: Connection refused
```

**解决：**
```bash
# 检查Redis容器状态
docker ps | grep redis

# 测试Redis连接
docker exec -it crmeb_redis redis-cli -a 123456 ping

# 检查.env配置
# REDIS_HOSTNAME应为crmeb_mysql（Docker）或127.0.0.1（手动安装）
```

### 4.4 队列不工作

**问题：**
```
队列任务不执行，消息积压在Redis中
```

**解决：**
```bash
# 检查队列进程
ps aux | grep queue

# 重新启动队列
docker exec -it crmeb_php php think queue:restart
docker exec -it crmeb_php php think queue:listen --queue

# 查看队列日志
docker exec -it crmeb_php tail -f runtime/log/queue.log
```

### 4.5 前端页面空白

**问题：**
```
访问http://localhost:8011/admin，页面空白或404
```

**解决：**
```bash
# 检查Nginx配置
docker exec -it crmeb_nginx cat /etc/nginx/conf.d/default.conf

# 检查public目录是否存在
docker exec -it crmeb_php ls -la /var/www/public/admin/

# 如果是手动安装，确保Nginx配置正确
# root指向/crmeb/public目录
# 确保伪静态配置正确

# 重新构建前端（手动安装）
cd template/admin
npm run build
```

### 4.6 图片上传失败

**问题：**
```
上传图片提示失败，或无法显示
```

**解决：**
```bash
# 检查上传目录权限
docker exec -it crmeb_php ls -la /var/www/public/uploads/

# 修改权限
docker exec -it crmeb_php chmod -R 755 /var/www/public/uploads/

# 检查存储配置
# 后台管理 > 系统设置 > 文件存储
```

### 4.7 微信支付配置

**配置步骤：**
1. 登录微信商户平台：https://pay.weixin.qq.com
2. 获取商户号（MCH_ID）
3. 获取API密钥（KEY）
4. 下载API证书（apiclient_key.pem, apiclient_cert.pem）
5. 在微信开放平台获取AppID和AppSecret
6. 后台配置：系统设置 > 支付配置 > 微信支付

**注意：**
- 公众号支付需要配置JS接口安全域名
- 小程序支付需要在小程序后台配置
- 支付目录需要配置正确
- 回调地址需要外网可访问

### 4.8 支付宝支付配置

**配置步骤：**
1. 登录支付宝开放平台：https://open.alipay.com
2. 创建应用并获取APP_ID
3. 生成RSA2密钥（应用私钥、公钥）
4. 配置支付宝公钥
5. 签约支付产品（手机网站支付、当面付等）
6. 后台配置：系统设置 > 支付配置 > 支付宝支付

## 下一步

完成安装后，你可以：

1. **阅读代码结构文档**：了解项目架构和目录结构
2. **查看专项Skill文档**：
   - PHP后端开发：`.codebuddy/skills/php-api/SKILL.md`
   - 管理端前端：`.codebuddy/skills/admin-element/SKILL.md`
   - 移动端开发：`.codebuddy/skills/uniapp/SKILL.md`

3. **尝试代码生成器**：在后台管理中快速生成CRUD代码

4. **开发新功能**：参考开发规范，创建你的第一个功能模块

5. **查看示例代码**：在`crmeb/app/services/`中查看现有功能实现

6. **加入社区**：加入CRMEB技术社区，获取更多帮助

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-17
