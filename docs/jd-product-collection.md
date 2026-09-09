# 京东商品采集与原始素材入库

入口为后台商品采集配置和 `/admin/product/add_product` 的“链接采集”。原商品管理列表的“商品采集”入口继续使用相同流程。京东由独立 Python/Chromium 服务处理，一号通、99API 保留给原有平台。

## 同机部署

按照 [独立服务部署说明](../services/jd-crawler/README.md) 部署 `services/jd-crawler`。该目录可独立打包、启动和升级，不依赖商城 Python 环境或数据库。

1. 将服务接入商城 Docker 网络，执行 `sh init-env.sh`、`docker compose up -d --build`。
2. 通过 SSH 转发的 noVNC 在专用 Chromium 中登录京东。
3. 后台“商品采集配置 → 接口选择”启用“京东独立采集”，地址填写 `http://jd-crawler:8091`，密钥填写服务 `.env` 中的 `JD_CRAWLER_TOKEN`。
4. 在商品新增页粘贴 `https://item.jd.com/商品编号.html`，采集完成后核对信息、补全分类/库存/运费，再保存。

配置首次保存会创建缺少的三个配置项，不需要导入 SQL。密钥在后续表单中不回显，留空保留原值。未部署服务、密钥错误、登录失效、验证码、忙碌和超时均返回对应提示。

## 已部署在 /root/hengshu-mall/crmeb-mall 的服务器

需要更新商城 PHP 和后台静态文件，并启动独立采集服务。商城继续使用 `/root/hengshu-mall/crmeb-mall`，采集服务放在旁边的 `/root/hengshu-mall/jd-crawler`。以下命令适用于本项目发布包的 Docker Compose 部署（服务名为 `phpfpm`、`queue`、`timer`、`workerman`）。

先将本次交付的 `hengshu-mall-jd-update.tar.gz` 和 `hengshu-jd-crawler.tar.gz` 上传至服务器 `/root/hengshu-mall/`。增量包仅包含本次 PHP 文件和编译后的管理后台；不含数据库、`.env`、`.constant`、安装锁或上传目录。已有商城不要再次进入安装页面。

**1. 服务器执行：备份并更新商城。**

```sh
cd /root/hengshu-mall/crmeb-mall
docker compose ps
mkdir -p /root/hengshu-mall/backups
tar -czf "/root/hengshu-mall/backups/before-jd-$(date +%Y%m%d-%H%M%S).tar.gz" \
  crmeb/app crmeb/config/upload.php crmeb/crmeb/services/upload crmeb/public/admin
# 上一条备份成功后再继续。
tar --no-same-owner -xzf /root/hengshu-mall/hengshu-mall-jd-update.tar.gz
docker compose --profile workers restart phpfpm queue timer workerman
docker compose --profile workers up -d queue timer workerman
```

更新后浏览器强制刷新后台。若没有“京东独立采集”配置或“链接采集”按钮，检查商城更新包是否已解压到上述目录。

**2. 服务器执行：确认共享网络并启动采集服务。**

```sh
cd /root/hengshu-mall/crmeb-mall
docker inspect "$(docker compose ps -q phpfpm)" \
  --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}'
```

本项目发布配置默认输出 `crmeb-mall_default`。如果输出不同，把下面的 `crmeb-mall_default` 换成实际商城网络名。

```sh
cd /root/hengshu-mall
tar --no-same-owner -xzf hengshu-jd-crawler.tar.gz
cd /root/hengshu-mall/jd-crawler
MALL_NETWORK=crmeb-mall_default sh init-env.sh
docker compose up -d --build
docker compose ps
docker compose exec jd-crawler python /app/healthcheck.py && echo '采集服务健康检查通过'
grep -E '^(JD_CRAWLER_TOKEN|JD_VNC_PASSWORD)=' .env
```

首次构建需要联网下载基础镜像、Chromium 和 Python 依赖。初始化脚本保留已有 `.env`；已有文件时，需要在其中修改 `MALL_NETWORK`，再启动。最后一条命令在自己的终端查看登录密码和接口密钥，不需要发送给他人。

**3. 本地电脑执行：登录京东。**

把 `服务器IP` 替换成实际 SSH 地址，在本地 PowerShell 或终端执行并保持窗口打开：

```sh
ssh -N -L 6080:127.0.0.1:6080 root@服务器IP
```

用本地浏览器访问 <http://127.0.0.1:6080/vnc.html>，输入 `JD_VNC_PASSWORD`，在显示的 Chromium 中登录京东并完成页面要求的验证。无需开放公网 6080 或 8091 端口。

**4. 后台配置并验收。**

在“商品采集配置 → 接口选择”开启“京东独立采集”，地址填 `http://jd-crawler:8091`，密钥填 `JD_CRAWLER_TOKEN`，保存。该地址由商城 PHP 容器访问，不能换成 `http://127.0.0.1:8091`。

进入 `/admin/product/add_product` 点击“链接采集”，输入完整京东商品详情链接，采集后核对价格，补全分类、库存、运费并保存。检查素材库“远程下载”和“京东视频”。素材按原字节保存；尚未完成或失败的视频转存会显示提示。

排查时在 `/root/hengshu-mall/jd-crawler` 执行 `docker compose logs --tail=100 jd-crawler`，在商城目录执行 `docker compose --profile workers logs --tail=100 queue`。数据库及现有上传文件保持在商城原目录，京东登录态保存在采集服务的 `crawler-data` 卷中。

## 素材原样保存

采集图片及视频保存时进入后台素材库。源文件的内容和格式保持不变，所有采集上传均关闭缩略图、水印、压缩和转码；不会将 AVIF 改成 JPG，也不会为抓取链接拼接图片处理参数。商品编辑中的素材预览使用原始文件地址。

| 素材 | 后台文件上传格式 |
| --- | --- |
| 图片 | JPG/JPEG、PNG、GIF、WebP、AVIF、SVG、BMP、ICO |
| 视频 | MP4、WebM、MOV、M4V、OGV；兼容已有 AVI、WMV、RM、MPG/MPEG、FLV |

安全 SVG 原字节入库；活动脚本、事件、外部引用或不支持的 SVG 结构会拒绝上传，不会改写后保存。普通文件上传及采集转存遵循 `crmeb/config/upload.php` 的大小限制，默认 50 MB；本地视频分片上传上限 1 GB，SVG 安全解析上限 2 MB。浏览器是否能预览视频取决于文件内的编码，不会为了预览转换文件。

采集视频仅接受实际取得的京东直接文件 URL（MP4/WebM/MOV/M4V/OGV）。HLS 清单、超过商品视频字段长度的地址会提示另行上传源文件；不会合并分段、虚构视频或自动转码。图片记录位于“远程下载”，视频记录位于视频素材的“京东视频”。开启商城队列时，素材转存需要队列进程运行；视频任务不会覆盖之后人工修改的视频。保存后和重新编辑时会提示视频转存中或失败，未入库的京东来源地址不会被误报为已完成。队列仅传商品 ID 和 URL 校验值，避免将签名参数写入队列错误日志；关闭队列时，在商品数据库事务开始前完成视频转存。

只采集当前链接对应的 SKU。未采到价格时提示手动填写，库存、销量和原价不会伪造；商品默认下架。任务按管理员隔离，HTTP API 使用访问密钥保护，浏览器登录态单独保存在服务卷中。

## 验证

在已安装商城 Composer/Node 依赖的开发环境执行：

```sh
php tests/regression/jd_collection.php
php tests/regression/media_upload.php
node tests/regression/jd_collection.cjs
node tests/regression/admin_media_formats.cjs
cd services/jd-crawler
PYTHONPATH=src python -m unittest discover -s tests -v
```

下载链路测试使用合成 HTTP 服务，不访问真实京东、不写业务库：

```sh
python tests/regression/fixtures/jd_http.py --port 18099
# 另开终端
php tests/regression/jd_collection.php http://127.0.0.1:18099
php tests/regression/jd_image_download.php http://127.0.0.1:18099/fixture.png
```

若 PHP 运行在 Docker 中，主机地址使用 `host.docker.internal`。下载测试对 PNG、原生 AVIF、WebM 做逐字节比较，并覆盖传输编码、错误响应和大小限制。通用上传测试覆盖本地及 6 个对象存储驱动的真实 PHP 上传入口（对象存储 SDK 使用测试替身），同时验证 SVG 拒绝逻辑和原始字节。对象存储浏览器直传视频沿用现有 SDK 路径；PHP 安全文件检查适用于经过服务器上传的文件。

可将 `services/jd-crawler/tests/browser_smoke.py` 复制到服务容器执行，验证真实 Chromium 上的上游 DOM 方法、原始图片、详情、规格及视频提取。该测试为合成页面；真实京东商品还需要完成专用浏览器登录及具体商品验收。

本次本地验收已完成 PHP 7.4 语法与业务回归、Python 32 项测试、前端回归、生产构建、配置表单及采集组件浏览器联调、Docker 构建/健康/重启/noVNC、真实 Chromium 合成页面提取，以及 AVIF/WebM 浏览器解码。配置写入验收在数据库事务中完成并回滚，未创建真实商品。未登录浏览器访问真实京东商品返回 `verification_required`，因此没有将合成测试表述为真实商品采集成功。
