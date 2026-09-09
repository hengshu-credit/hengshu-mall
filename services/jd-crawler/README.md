# 恒数商城京东商品素材采集服务

独立运行的 Python + Chromium 服务，复用 [CherryPainter/jd-product-crawler](https://github.com/CherryPainter/jd-product-crawler) 的页面提取代码。商城通过内部 HTTP 调用，不安装 Python、不共享数据库。服务导入当前商品链接对应 SKU 的真实标题、价格、图片、可获取的视频、详情及参数；不采用上游演示代码的随机价格、销量、库存、评论。

## 同一服务器部署

先启动现有商城，再把本目录放到服务器的独立目录，例如 `/opt/hengshu-jd-crawler`。需要 Docker Compose，初始化密钥脚本需要 openssl。

```sh
cd /opt/hengshu-jd-crawler
sh init-env.sh
docker network ls
# 编辑 .env 中 MALL_NETWORK，设置为现有商城的 Docker 网络。
# 当前商城发布配置默认是 crmeb-mall_default；本仓库开发环境是 crmeb_app_net。
docker compose up -d --build
docker compose ps
```

API 仅开放在共享 Docker 网络，商城服务地址填写 `http://jd-crawler:8091`。采集服务独立启停与发布，不会启动、重建或初始化商城数据库。浏览器登录态与任务库在 `crawler-data` 命名卷中，普通重启保留；维护时保留该卷。

## 登录京东

在本地电脑建立 SSH 转发：

```sh
ssh -N -L 6080:127.0.0.1:6080 用户名@商城服务器
```

打开 `http://localhost:6080/vnc.html`，输入服务 `.env` 中的 `JD_VNC_PASSWORD`，在专用 Chromium 中人工登录京东。验证码同样在此完成，不提供自动验证码识别。登录页只映射服务器回环地址；无需向公网开放 6080、5900 或 9222。

进入商城后台 **商品采集配置 → 接口选择**，开启“京东独立采集”，填写服务地址和 `.env` 中的 `JD_CRAWLER_TOKEN`。密钥至少 32 位；后台再次保存时留空保留原值。原一号通/99API 选择继续供其他平台使用。

## 使用

商品管理点击“商品采集”，或直接进入 `/admin/product/add_product` 点击“链接采集”。输入完整详情链接，例如 `https://item.jd.com/商品编号.html`，也支持 `https://item.m.jd.com/product/商品编号.html`。分享短链接请先在浏览器打开，再复制完整详情地址。

采集完成后检查表单，填写分类、库存和运费，核对价格后保存。商品默认不上架。保存时图片进入素材库的“远程下载”，视频进入视频素材的“京东视频”。商城开启队列时，确认其队列进程正在运行。仅导入链接对应的 SKU，页面中的其他规格选项不会自动生成未经核实的价格和库存。

采集素材按照来源文件原始字节存储，不压缩、不转码、不改后缀格式、不加水印，也不生成缩略图。保留京东原生 `.avif`、`.webp` 等路径；不自行拼接尺寸或格式转换参数。仅创建商城存储文件名和素材记录。HTTP 的传输解压不改变源文件内容。SVG 通过静态内容安全检查后原样保存，包含脚本、事件、外部资源等内容的文件直接拒绝，不净化改写。

自动采集视频支持京东直接文件地址的 MP4、WebM、MOV、M4V、OGV。HLS `.m3u8` 是分段播放清单，无法作为单个原始视频文件入库，采集时会提示另行上传原始视频，不做合并或转码。没有视频的商品保持视频为空。完整后台上传格式和验证命令见商城文档 `docs/jd-product-collection.md`。

## 运维与接口

```sh
docker compose logs --tail=100 jd-crawler
docker compose restart jd-crawler
docker compose exec jd-crawler python /app/healthcheck.py
```

所有 API 都要求 `Authorization: Bearer <JD_CRAWLER_TOKEN>`：

| 接口 | 用途 |
| --- | --- |
| `GET /health` | 服务状态 |
| `POST /v1/jobs`，JSON `{ "url": "https://item.jd.com/123.html" }` | 发起任务，返回 `job_id`、`state` |
| `GET /v1/jobs/{job_id}` | 查询状态，成功返回 `product`，失败返回 `error.code/message` |

一次处理一个商品；忙碌时返回明确错误，不无限排队。默认任务时限 240 秒，最长 300 秒；默认保留任务 24 小时。商城浏览器关闭采集弹窗会停止轮询，已经启动的服务端任务继续到完成或超时。

若提示登录失效/验证，打开专用浏览器处理后重试；若连接失败，检查商城与采集服务是否在相同网络、密钥是否一致。详情缺图或价格未取得时，后台会提示补全。京东页面改版或访问限制可能导致提取失败，真实可用性应以已登录浏览器中的具体商品验收为准。

## 开发验证

在本目录使用 Python 3.10+：

```sh
python -m pip install -r requirements.txt
PYTHONPATH=src python -m unittest discover -s tests -v
```

源码归属、版本与校验见随附 `UPSTREAM.md` 及许可证。
