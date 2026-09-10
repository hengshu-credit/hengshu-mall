# 恒数商城：后端与管理后台发布包

本包用于全新安装，包含当前 PHP 后端、vendor 依赖、管理后台、移动端 H5 生产构建和 Docker Compose 配置。不包含安卓 APK、本地数据库、安装锁、本地账号配置、日志、备份或安卓 AppKey/证书。

更新现有商城时，在源码执行 `./package.ps1 -Update`，使用单文件 `dist/hengshu-mall-update.tar.gz` 和包内的更新说明。更新包排除安装程序、安装 SQL 和预置上传文件，保留服务器现有配置及数据。商城和独立京东采集由同一份 Compose 管理，队列等进程默认启动，无需额外启用 profile。

京东服务首次启动自动生成持久化凭据。服务健康后执行 `docker compose exec jd-crawler python -m jd_crawler.bootstrap show`，按照输出在本机建立 SSH 转发、打开 noVNC 并登录京东。后台服务地址填 `http://jd-crawler:8091`，密钥填输出中的 `JD_CRAWLER_TOKEN`。京东登录态和凭据在 `jd-crawler-data` 卷中，日常停止不要使用 `down -v`。

PHP 固定使用当前项目兼容的 7.4，本次未做 PHP 8 迁移。首次启动需联网拉取镜像；这不是包含 Docker 镜像的离线安装包。管理后台前端不需要在服务器安装 Node。

## 1. 启动服务

源码根目录执行 `./package.ps1`，生成 `dist/hengshu-mall.tar.gz`；加 `-Verify` 可运行 Docker 集成验证。服务器需安装 Docker Engine、Compose 和 openssl。将压缩包解压后进入 `crmeb-mall` 目录：

```bash
cd /root/hengshu-mall/crmeb-mall
# 首次解压后、修改配置前校验文件完整性，报错时先重新上传完整包。
sha256sum --quiet -c files.sha256
bash start.sh
```

默认绑定 `0.0.0.0:8011`，供已配置的 NPM 通过主机 IP 和端口访问。不公开 MySQL、Redis、PHP-FPM 和长连接端口。MySQL 挂载 `./data/mysql:/var/lib/mysql`，Redis 挂载 `./data/redis:/data` 并开启 AOF。实际数据保存在 `/root/hengshu-mall/crmeb-mall/data/mysql` 和 `/root/hengshu-mall/crmeb-mall/data/redis`，容器删除重建后仍然保留。不要删除这些目录，也不要在另一个空目录启动同一套应用。

## 2. 接入现有 Nginx Proxy Manager

域名：`mall.hengshucredit.com`。DNS A 记录应指向服务器 `111.228.52.212`。

现有 NPM 已通过主机 IP 和端口代理，保持该方式即可，无需连接商城的 Docker 网络。配置应为：

| 字段 | 值 |
| --- | --- |
| Domain Names | mall.hengshucredit.com |
| Scheme | http |
| Forward Hostname / IP | 111.228.52.212（或 NPM 已配置的可达主机 IP） |
| Forward Port | 8011 |
| Websockets Support | 开启 |
| Cache Assets | 首次部署先关闭 |
| SSL | 为该域名申请/选择证书，开启 Force SSL |

NPM Advanced 可添加：

```nginx
client_max_body_size 100m;
proxy_read_timeout 3600s;
```

保留原始 Host、X-Forwarded-Proto 以及 WebSocket Upgrade 转发。内层配置会将 HTTPS 信息传给 PHP，避免安装后生成 http 链接。

## 3. 全新安装

安装完成之前，使用 NPM Access List 将入口限制为你的访问 IP，防止其他人抢先安装。

访问 `https://mall.hengshucredit.com/install/index.php`，填写：

| 项目 | 值 |
| --- | --- |
| MySQL 主机/端口 | mysql / 3306 |
| 数据库/用户名 | crmeb / crmeb |
| 数据库密码 | 发布包根目录 .env 中的 MYSQL_PASSWORD |
| 表前缀 | eb_ |
| Redis 主机/端口 | redis / 6379 |
| Redis 密码 | 发布包根目录 .env 中的 REDIS_PASSWORD |
| Redis 数据库 | 0 |
| 缓存方式 | Redis |
| 管理员 | 自行设置账号和强密码 |

选择初始化数据，不导入本地数据库。包里保留安装 SQL，以及它引用且当前源码中存在的预置图片；源码缺失的预置图片不会自动补齐，数量见 release.json。初始化数据里的第三方服务配置需替换为你自己的配置。

安装向导会生成 `crmeb/.env`、`crmeb/.constant` 和 `crmeb/public/install.lock`。发布包根目录 `.env` 管理容器密码，`crmeb/.env` 管理应用连接，两者用途不同。安装结束后执行：

```bash
bash start.sh
```

启动脚本首次自动生成三个不同的随机密码到根目录 `.env`，已有密码保持不变；检测到旧数据但缺少 `.env` 时停止，避免错误初始化。全部任务容器随首次启动创建，安装锁生成后自动运行，再次执行脚本会收紧应用配置权限。队列、定时任务和客服进程由独立容器守护，读取安装生成的队列名称；不要再手动重复启动。这三个容器共享 phpfpm 的网络和 PID 命名空间，使 CRMEB 的 127.0.0.1 内部消息通信和进程状态检查正常工作。Nginx 经 phpfpm:40001、phpfpm:40002 转发 WebSocket，宿主机仍只发布 8011。变更或重建 phpfpm 时，对整套服务执行 `docker compose --profile workers up -d --force-recreate`，同步重建关联容器。

后台：`https://mall.hengshucredit.com/admin/`。根路径也会跳转到管理后台。本包未包含商城 H5 页面。

后台接口：`/adminapi/`；商城接口：`/api/`；通知和客服长连接：`wss://mall.hengshucredit.com/notice`、`wss://mall.hengshucredit.com/msg`。在后台对应连接配置中使用这些正式地址。

## 4. 验证与维护

检查后台登录、子页面刷新、图片上传、队列及客服连接。安装锁存在时，Nginx 会阻止再次访问安装入口；安装 SQL、环境文件和模板 PHP 不能从网站直接下载或执行。

```bash
docker compose exec nginx nginx -t
docker compose --profile workers logs --tail=100
```

完成安装后，可在同一目录执行以下命令停止并删除容器，再重建启动，MySQL 和 Redis 会继续使用原来的本地数据：

```bash
docker compose --profile workers down
docker compose --profile workers up -d
docker compose --profile workers ps
```

保留根目录 `.env`、整个 `data/`、`crmeb/.env`、`crmeb/.constant`、`crmeb/public/install.lock`、上传和主题目录。不要重新生成密码或重跑安装向导。MySQL 的初始化密码变量仅在数据目录为空时生效。定期备份数据库和上述配置、文件；直接复制数据库目录需先停服务或使用一致性备份工具。本配置使用 bind mount，`down` 不删除宿主机数据；日常使用普通 `down` 即可。

本包适用于新安装；不要把初始化包直接覆盖已有站点的配置、安装锁或上传目录。旧版 PHP 的长期维护需另行安排兼容升级。
