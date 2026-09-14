# 物色 6.0.14 更新说明

本版本修复首页推荐商品及隐式标题、商城分类空列表、购物车导航缺失、详情服务行缺失、店铺重复标题和商品图片空白。也包含上一轮首页装修默认标题的修复。

文件：`hengshu-mall-update-6.0.14.tar.gz`（PHP、管理后台、H5 和配套服务）与 `物色-6.0.14-universal.apk`。APK 版本为 6.0.14 / 614，包名和签名沿用上一版，可覆盖升级。每个文件附 SHA-256 校验文件。

## 更新顺序

**先更新服务器，再安装 APK。** 图片修复同时依赖新的 PHP 图片入口和 `media-display` 服务；仅安装 APK 无法修复旧服务器的商品查询、导航接口或图片路径。

在现有商城目录更新，保留原数据库、上传文件和配置，沿用现有备份流程。将 tar.gz 上传到服务器 `/root/hengshu-mall/`：

```sh
cd /root/hengshu-mall
tar --no-same-owner -xzf hengshu-mall-update-6.0.14.tar.gz
cd crmeb-mall
docker-compose -f compose.yml up -d --build
docker-compose -f compose.yml exec -T phpfpm php think merchant:install
docker-compose -f compose.yml exec -T phpfpm php think ranking:install
docker-compose -f compose.yml ps
```

如果使用 Compose 插件，将 `docker-compose` 换为 `docker compose`。构建需要服务器联网。后台更新后重新登录并强制刷新；子管理员需有相应菜单权限。

旧购物车的空导航配置会跟随首页已有导航；需要关闭时，在购物车装修中将“底部导航”设为“不显示”。单独配置的导航继续使用自己的样式。

## 对外检查

在本地源码目录执行，最后一个参数为有在售 AVIF 商品的店铺 ID：

```sh
node help/release/check-storefront.cjs https://mall.hengshucredit.com 1
```

检查商城与店铺商品查询、购物车导航来源，以及 `/api/media/image` 返回的 Content-Type 和 PNG 文件特征。图片地址返回 HTTP 200 但内容为 HTML 时会报错。检查通过后覆盖安装 APK，并打开相关页面确认。

## 本次验证范围

- 后台真实控件操作、PHP 校验保存及重开；购物车导航继承、自定义和主动关闭。
- 真实 ORM 商品范围查询；可售、删除状态过滤；真实 AVIF 文件经过 Python HTTP 服务和 PHP 控制器返回 PNG，12 路并发及源文件保持不变。
- 生产 H5 全页跳转及内容、图片检查；包括从交付更新包中提取的 H5。
- Android 11 / WebView 83 模拟器逐屏 UI 验收：首页真实滑动至推荐区、商城分类、购物车图片/导航、关闭导航、详情四行服务、参数及单规格弹层、商品介绍图片、店铺首页和店铺分类。
- APK v1/v2 签名、zipalign、版本及生产域名通过；218 个编译资源与 APK 一致，48 个原生 SDK/模块文件与上一版一致；6.0.13 覆盖升级至 6.0.14 并启动成功。
- 更新包 12,499 个文件的 SHA-256、关键 PHP 与素材服务源码、后台/H5 入口资源和受保护目录排除检查通过。

APP UI 验收使用线上只读获取的公开配置和商品图片回放，购物车使用隔离测试数据；没有修改真实订单。真实 MySQL / Docker 部署联调未计为通过，本次尚未部署线上。

详细复盘及 10 张 Android 截图见本地源码 `docs/storefront-sync-audit-2026-09-13.md`。
