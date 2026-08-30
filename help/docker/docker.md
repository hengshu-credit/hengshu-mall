# CRMEB Docker 一键运行指南

## 镜像信息

- **镜像地址**: `ccr.ccs.tencentyun.com/crmebky_php/crmebky:latest`
- **支持架构**: `linux/amd64`, `linux/arm64`（自动适配）

## 快速启动

```bash
# 拉取镜像
docker pull ccr.ccs.tencentyun.com/crmebky_php/crmebky:latest

# 运行容器
docker run -d --name crmeb \
  -p 80:80 \
  -p 3306:3306 \
  -p 6379:6379 \
  ccr.ccs.tencentyun.com/crmebky_php/crmebky:latest
```

## 访问服务

- **网站**: http://localhost
- **MySQL**: localhost:3306（账号: root，密码: 123456）
- **Redis**: localhost:6379

## 容器包含的服务

- Nginx (80端口)
- PHP-FPM 7.4
- MySQL 8.0（账号: root/crmeb，密码: 123456）
- Redis
- 消息队列
- 定时任务
- Workerman

## 数据持久化（可选）

### 推荐挂载目录

| 容器路径 | 说明 | 建议挂载方式 |
|---------|------|-------------|
| `/var/lib/mysql` | MySQL 数据目录 | 必须挂载，防止数据丢失 |
| `/var/www/crmeb/public/uploads` | 上传文件目录 | 建议挂载，保存用户上传文件 |
| `/var/www/crmeb/runtime` | 缓存/日志目录 | 可选挂载 |
| `/var/lib/redis` | Redis 数据目录 | 可选挂载 |

### 使用 Docker Volume

```bash
docker run -d --name crmeb \
  -p 80:80 \
  -p 3306:3306 \
  -p 6379:6379 \
  -v crmeb_mysql:/var/lib/mysql \
  -v crmeb_uploads:/var/www/crmeb/public/uploads \
  ccr.ccs.tencentyun.com/crmebky_php/crmebky:latest
```

### 使用本地目录挂载

```bash
# 创建本地目录
mkdir -p ~/crmeb-data/mysql ~/crmeb-data/uploads

# 运行容器
docker run -d --name crmeb \
  -p 80:80 \
  -p 3306:3306 \
  -p 6379:6379 \
  -v ~/crmeb-data/mysql:/var/lib/mysql \
  -v ~/crmeb-data/uploads:/var/www/crmeb/public/uploads \
  ccr.ccs.tencentyun.com/crmebky_php/crmebky:latest
```

### 完整示例（生产环境推荐）

```bash
# 创建本地目录
mkdir -p ~/crmeb-data/{mysql,uploads,runtime,redis}

# 运行容器
docker run -d --name crmeb \
  -p 80:80 \
  -p 3306:3306 \
  -p 6379:6379 \
  -v ~/crmeb-data/mysql:/var/lib/mysql \
  -v ~/crmeb-data/uploads:/var/www/crmeb/public/uploads \
  -v ~/crmeb-data/runtime:/var/www/crmeb/runtime \
  -v ~/crmeb-data/redis:/var/lib/redis \
  --restart unless-stopped \
  ccr.ccs.tencentyun.com/crmebky_php/crmebky:latest
```

## 常用命令

```bash
# 查看容器日志
docker logs -f crmeb

# 进入容器
docker exec -it crmeb /bin/bash

# 停止容器
docker stop crmeb

# 启动容器
docker start crmeb

# 删除容器（保留数据卷）
docker rm crmeb

# 完全删除（包括数据卷）
docker rm -v crmeb
```
