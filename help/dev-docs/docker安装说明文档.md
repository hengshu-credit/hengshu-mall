# CRMEB Docker 安装说明文档

## 1. 环境准备

### 1.1 安装 Docker

请根据您的操作系统选择对应的 Docker 安装方式：

#### Windows / macOS
访问 Docker 官网下载并安装 Docker Desktop：
[https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

#### Linux
使用以下命令安装 Docker：
```bash
curl -sSL https://get.daocloud.io/docker | sh
```

### 1.2 安装 Docker Compose

#### Windows / macOS
Docker Desktop 已包含 Docker Compose，无需额外安装。

#### Linux
请参考官方文档安装 Docker Compose：
[https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)

## 2. 下载 CRMEB 程序

1. 下载最新开源代码：
[https://gitee.com/ZhongBangKeJi/CRMEB](https://gitee.com/ZhongBangKeJi/CRMEB)

2. 将程序解压并放置在与 `docker-compose` 目录同级的位置。

## 3. 不同操作系统的安装配置

### 3.1 通用配置（默认）

适用于大多数 Linux 系统和 macOS Intel 芯片。

配置文件路径：`docker-compose/docker-compose.yml`

### 3.2 Linux 系统

Linux 专用配置，包含平台兼容性设置。

配置文件路径：`docker-compose/linux/docker-compose.yml`

### 3.3 macOS（Intel 芯片）

macOS Intel 芯片专用配置。

配置文件路径：`docker-compose/MacIntel/docker-compose.yml`

### 3.4 macOS（Apple Silicon 芯片）

MacBook M1/M2/M3 等 Apple Silicon 芯片专用配置，解决了 MySQL 兼容性问题。

配置文件路径：`docker-compose/MacArm/docker-compose.yml`

### 3.5 Windows 系统

Windows 专用配置。

配置文件路径：`docker-compose/window/docker-compose.yml`

## 4. 服务配置说明

### 4.1 MySQL 数据库

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 容器名称 | crmeb_mysql | Docker 容器名称 |
| 镜像 | mysql:5.7 | 数据库镜像（MacArm 使用 mysql/mysql-server） |
| 端口 | 3336:3306 | 宿主机端口:容器端口 |
| 用户名 | root | 数据库用户名 |
| 密码 | 123456 | 数据库密码 |
| 数据库名 | crmeb | 默认创建的数据库名称 |
| 容器 IP | 192.168.10.11 | 内部网络固定 IP |

### 4.2 Redis 缓存

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 容器名称 | crmeb_redis | Docker 容器名称 |
| 镜像 | redis:alpine | Redis 镜像 |
| 端口 | 6379:6379 | 宿主机端口:容器端口 |
| 容器 IP | 192.168.10.10 | 内部网络固定 IP |

### 4.3 PHP 应用

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 容器名称 | crmeb_php | Docker 容器名称 |
| 镜像 | crmeb_php | PHP 镜像（通过 Dockerfile 构建） |
| 端口 | 9000:9000 | PHP-FPM 端口 |
|  | 20002:20002 | 长连接端口 1 |
|  | 20003:20003 | 长连接端口 2 |
| 容器 IP | 192.168.10.90 | 内部网络固定 IP |
| 程序目录 | /var/www | 项目在容器内的路径 |

### 4.4 Nginx 服务器

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 容器名称 | crmeb_nginx | Docker 容器名称 |
| 镜像 | nginx:alpine | Nginx 镜像 |
| 端口 | 8011:80 | 宿主机端口:容器端口 |
| 容器 IP | 192.168.10.80 | 内部网络固定 IP |

## 5. 启动项目

### 5.1 基本启动步骤

1. 进入 docker-compose 目录：
```bash
cd docker-compose
```

2. 启动所有服务：
```bash
docker-compose up -d
```

3. 查看容器状态：
```bash
docker-compose ps
```

### 5.2 启动额外服务（必需）

进入 PHP 容器并启动队列、定时任务和长连接服务：

1. 进入 PHP 容器：
```bash
docker exec -it crmeb_php /bin/bash
```

2. 进入项目目录：
```bash
cd /var/www
```

3. 启动定时任务：
```bash
php think timer start --d
```

4. 启动长连接服务：
```bash
php think workerman start --d
```

5. 启动队列服务：
```bash
php think queue:listen --queue
```

## 6. 访问 CRMEB 系统

### 6.1 访问地址

在浏览器中输入以下地址访问 CRMEB 系统：
```
http://localhost:8011/
```

### 6.2 系统安装

首次访问将进入 CRMEB 安装向导，根据提示完成系统安装。

#### 数据库配置

| 配置项 | 值 |
|--------|-----|
| 数据库地址 | 192.168.10.11 |
| 端口 | 3306 |
| 用户名 | root |
| 密码 | 123456 |
| 数据库名 | crmeb |

#### Redis 配置

| 配置项 | 值 |
|--------|-----|
| Redis 地址 | 192.168.10.10 |
| 端口 | 6379 |
| 数据库 | 0 |
| 密码 | 123456 |

## 7. 容器管理

### 7.1 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止指定服务
docker-compose stop <service-name>
```

### 7.2 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启指定服务
docker-compose restart <service-name>
```

### 7.3 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看指定服务日志
docker-compose logs <service-name>

# 实时查看日志
docker-compose logs -f <service-name>
```

## 8. 常见问题及解决方案

### 8.1 端口被占用

**问题**：启动时出现端口被占用错误

**解决方案**：
1. 修改 `docker-compose.yml` 中的端口映射，例如将 `8011:80` 改为 `8080:80`
2. 重启服务

### 8.2 IP 地址冲突

**问题**：`Error response from daemon: Address already in use`

**解决方案**：
1. 修改 `docker-compose.yml` 中冲突容器的 `ipv4_address`
2. 确保 IP 地址在 `192.168.*.*` 网段内且不与其他设备冲突

### 8.3 MySQL 容器启动失败（Mac ARM 芯片）

**问题**：MySQL 容器无法启动，无日志输出

**解决方案**：
1. 使用 MacArm 目录下的专用配置
2. 确保使用了正确的 MySQL 镜像（`mysql/mysql-server`）
3. 检查文件权限设置

### 8.4 PHP 扩展缺失

**问题**：系统提示缺少某些 PHP 扩展

**解决方案**：
1. 进入 PHP 容器
2. 安装所需扩展
3. 或修改 `docker-compose/php/Dockerfile` 添加扩展并重新构建镜像

### 8.5 文件权限问题

**问题**：程序无法写入文件或创建目录

**解决方案**：
1. 检查宿主机上 `crmeb` 目录的权限
2. 确保容器内 `www-data` 用户有足够的权限
3. 可尝试修改目录权限：
   ```bash
   chmod -R 777 crmeb/runtime
   chmod -R 777 crmeb/public/upload
   ```

## 9. 注意事项

### 9.1 数据持久化

- MySQL 数据默认挂载在 `docker-compose/mysql/data` 目录
- Redis 数据默认未挂载，如需持久化请修改配置文件
- 项目代码挂载在 `crmeb` 目录，修改宿主机上的代码会直接影响容器内的程序

### 9.2 网络配置

- 所有服务运行在 `app_net` 网络中，使用固定 IP 地址
- 宿主机与容器之间通过端口映射通信
- 容器之间可以通过内部 IP 直接通信

### 9.3 性能优化

- 根据服务器配置调整容器资源限制
- 生产环境建议修改默认密码和端口
- 配置合适的日志清理策略

### 9.4 升级说明

1. 停止所有服务
2. 备份数据和配置文件
3. 更新代码
4. 重新启动服务
5. 执行数据库迁移（如有需要）

## 10. 高级配置

### 10.1 修改默认密码

编辑 `docker-compose.yml` 文件，修改以下环境变量：

- MySQL: `MYSQL_ROOT_PASSWORD`, `MYSQL_PASS`
- Redis: 在 `redis.conf` 中配置密码

### 10.2 配置 HTTPS

1. 在 `docker-compose.yml` 中启用 443 端口映射
2. 准备 SSL 证书
3. 修改 `nginx/vhost.conf` 配置 HTTPS

### 10.3 自定义 PHP 配置

修改 `docker-compose/php/php-ini-overrides.ini` 文件来自定义 PHP 配置。

## 11. 技术支持

如果您在安装过程中遇到问题，可以通过以下方式获取帮助：

- CRMEB 官方社区：[https://gitee.com/ZhongBangKeJi/CRMEB/issues](https://gitee.com/ZhongBangKeJi/CRMEB/issues)
- Docker 官方文档：[https://docs.docker.com/](https://docs.docker.com/)

---

**文档版本**：v1.0
**更新日期**：2023-12-04
**适用版本**：CRMEB v5.6+
---

> **提示**：该文档由AI生成，仅供参考。
