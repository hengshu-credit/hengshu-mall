# 恒数商城与京东采集：单包更新

此包用于已部署在 `/root/hengshu-mall/crmeb-mall` 的商城。包含 PHP 后端、管理后台生产文件、Compose 启动配置和独立京东采集容器；不会打包数据库、现有 `.env`、`.constant`、安装锁、上传文件或安装 SQL。服务器不需要 Node.js 或 Python。

需要已安装 Docker 和 Docker Compose。下面使用 `docker-compose` 命令；若服务器使用插件命令，将它替换为 `docker compose`。使用支持 Compose Specification 的当前版本。

## 1. 上传一个文件并启动

本地源码执行 `./package.ps1 -Update` 生成 `dist/hengshu-mall-update.tar.gz`，添加 `-Verify` 可验证更新包和采集容器。将这一个 tar.gz 上传到服务器 `/root/hengshu-mall/`。

更新前建议备份当前应用代码和配置到独立目录；数据库沿用原来的备份方案。现有商城继续使用原位置，不要删除 `data/` 或重新安装。解压和启动：

```sh
cd /root/hengshu-mall
tar --no-same-owner -xzf hengshu-mall-update.tar.gz
cd /root/hengshu-mall/crmeb-mall
docker-compose -f compose.yml up -d --build
docker-compose -f compose.yml ps
```

或者用 `bash start.sh` 启动，脚本自动识别两种 Compose 命令。直接使用 Compose 不需要先运行脚本，也不需要初始化京东密钥。首次构建需要联网下载镜像、Chromium 和 Python 依赖。

商城、队列、定时任务、长连接和京东采集默认一起启动。京东采集仍是独立容器，不共享商城数据库，在内部网络通过 `http://jd-crawler:8091` 通信。每个新发布包会更新 PHP 和后台容器的发布标识，使队列等进程同步加载更新后的代码。

`jd-crawler` 状态为 `healthy` 后查看登录信息：

```sh
docker-compose -f compose.yml exec jd-crawler python -m jd_crawler.bootstrap show
# 等价快捷命令：bash start.sh --info
```

命令会显示 `JD_VNC_PASSWORD` 和 `JD_CRAWLER_TOKEN`，在自己的终端查看即可。首次自动生成的凭据保存在 `jd-crawler-data` 命名卷，普通重启或重新创建容器会保留。原有 `.env` 中已设置的京东凭据会被沿用。

## 2. 在本地电脑登录京东

在本地电脑的 PowerShell 或终端执行，替换 `服务器IP`，保持该窗口打开：

```sh
ssh -N -L 6080:127.0.0.1:6080 root@服务器IP
```

本地浏览器打开 <http://127.0.0.1:6080/vnc.html>，输入上一步的 `JD_VNC_PASSWORD`。在页面显示的 Chromium 中登录京东，完成页面要求的验证。登录态保存在采集服务的数据卷，不需要每次启动重新登录；京东登录过期时按同样步骤重新登录。

无需配置 NPM，也无需向公网开放 6080、8091、5900 或 9222。若本地 6080 已占用，SSH 改为 `-L 16080:127.0.0.1:6080`，浏览器改打开 `http://127.0.0.1:16080/vnc.html`。

## 3. 后台使用

强制刷新管理后台，进入“商品采集配置 → 接口选择”：

- 开启“京东独立采集”。
- 服务地址：`http://jd-crawler:8091`。
- 密钥：上面查询到的 `JD_CRAWLER_TOKEN`。

保存后进入 `/admin/product/add_product`，点击“链接采集”，粘贴完整京东商品详情链接。核对信息、补全分类/库存/运费后保存。采集素材按原文件字节保存，不压缩、不转换格式。

## 4. 维护

```sh
docker-compose -f compose.yml logs --tail=100 jd-crawler
docker-compose -f compose.yml exec jd-crawler python /app/healthcheck.py
docker-compose -f compose.yml restart jd-crawler
```

保留商城根目录 `.env`、`data/`、应用配置、安装锁、上传文件，以及 `jd-crawler-data` 卷。日常停止使用 `docker-compose -f compose.yml down`，不要添加 `-v`，该选项会删除京东登录态与服务凭据。

若此前已在 `/root/hengshu-mall/jd-crawler` 启动旧版独立 Compose，先在那个目录执行 `docker-compose down`（保留旧数据卷），再启动本包，避免登录端口被占用。本包使用新的服务卷，首次按步骤登录京东，并将本包生成的密钥填入后台。
