# Windows 源码开发

日常仅编辑 `E:\workspace\CRMEB`。管理后台由 Vue CLI 读取 `template/admin`，商城 H5 由本项目内的 HBuilderX 读取 `template/uni-app`，PHP 容器直接挂载 Windows 的 `crmeb`。

在项目根目录执行：

```powershell
./help/dev/dev.ps1 Start
./help/dev/dev.ps1 Status
./help/dev/dev.ps1 Stop
```

入口：

| 页面 | 统一入口 | 开发服务直连 |
| --- | --- | --- |
| 管理后台 | http://localhost:8011/admin/ | http://localhost:1617/admin/ |
| 商城 H5 | http://localhost:8011/ | http://localhost:8080/ |

8011 的页面请求转发到源码开发服务；API、上传图片和后端公共资源仍由 PHP/Nginx 提供。源码开发服务停止后页面会返回 502，不会退回旧的发布文件。小程序/App 需在 HBuilderX 选择对应运行平台，并配置设备可访问的本地后端地址。

## 自动更新

- 保存 Vue、JS、CSS 后，前端自动编译并通过 HMR 更新；部分修改会触发整页刷新。
- PHP 普通请求读取 Windows 源码。开发 OPcache 每次请求检查文件时间戳。
- 队列、定时任务、聊天长连接是常驻进程。修改其 PHP 逻辑后执行 `./help/dev/dev.ps1 RestartPhp`。
- 改管理端 `vue.config.js`、环境变量、`help/dev/proxy.cjs` 或 H5 的 `manifest.json` 后，重启对应前端开发服务。当前 HBuilderX 编译器会用 `manifest.json` 的 `h5.devServer` 覆盖 `vue.config.js` 中同名配置，因此 H5 代理放在 manifest 中。
- 业务数据变化仍需页面重新请求数据；源码热更新不会自动刷新所有业务数据。

## HBuilderX 与 Node

HBuilderX 位于项目根目录的 `HBuilderX/HBuilderX.exe`。启动脚本使用其自带的 Node 22，避免系统 Node 26 与旧版 Vue CLI 不兼容；仅管理后台开发进程设置 OpenSSL 兼容选项。

首次使用需安装 HBuilderX 的 `uniapp-cli`、`compile-node-sass`、`compile-stylus` 插件。本次已安装。手动运行方式：导入 `template/uni-app`，选择“运行到浏览器 → Chrome”。管理后台编译日志在 `help/dev/.state/admin.log`，H5 日志在 HBuilderX 控制台。

## 数据与清理

MySQL 和 Redis 分别使用外部 Docker 命名卷 `crmeb_mysql_data`、`crmeb_redis_data`。这些卷已从原 WSL 环境迁入；新机器需先显式创建或恢复它们。切勿删除这些卷。源码位于 Windows，Docker 自身仍使用其 Linux/WSL 运行环境。

本次迁移备份：`E:\workspace\CRMEB-backups\2026-09-08-source-dev`。包括旧 WSL 源码压缩包、Windows 原 public 压缩包、MySQL SQL 和旧数据库文件备份。旧目录移入此处的 `retired-wsl`、`retired-public`，不再作为运行源码使用。备份可能包含本地安装凭据，请留在本机。

清理范围为旧 WSL 项目目录以及 `crmeb/public/admin`、`crmeb/public/static`、`crmeb/public/pages` 和 `crmeb/public/index.html` 中的前端发布产物。PHP 入口、安装/升级脚本、上传文件、`statics` 和 `assets` 保留。

运行环境使用两份 Compose 配置：`help/docker/docker-compose.yml` + `help/dev/compose.yml`。原有生产 Nginx 配置保留，开发启动脚本会明确选择源码开发配置。

参考：[Vue CLI 开发服务](https://v4.cli.vuejs.org/guide/cli-service.html)、[HBuilderX Web CLI](https://hx.dcloud.net.cn/cli/launch-web)。
