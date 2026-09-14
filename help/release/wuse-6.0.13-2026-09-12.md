# 物色 6.0.13 更新说明

本次生成两个安装文件，尚未部署线上服务器。先更新服务器，再覆盖安装 APK。

| 文件 | 用途 |
| --- | --- |
| `hengshu-mall-update-6.0.13.tar.gz` | 已安装商城的更新包，包含 PHP 后端、管理后台、手机 H5、排行榜素材、部署配置和配套服务 |
| `物色-6.0.13-universal.apk` | Android 6.0.13 / 613，包名 `com.hengshucredit.mall`，沿用历史签名，可覆盖升级 |

APK 支持 armeabi-v7a、arm64-v8a、x86。每个安装文件均附 `.sha256` 校验文件，汇总见 `release-6.0.13.json`。通用名称 `hengshu-mall-update.tar.gz` 与本版本更新包内容相同。

## 本次包含

- 排行榜组件的背景、边框、圆角配置；右侧使用商品参数同款箭头。
- 排行榜和店铺组件自定义颜色、主题色绑定，装修预览与手机端同步使用配置。
- 推荐项支持商品列表、商城页面和外部 URL；统一链接选择器增加商品排行榜、店铺排行榜和店铺页面。
- 此前的排行榜条件树、访问客户个性化入榜规则、店铺装修、可删除页面标题等功能。
- 当前工作区的其他商城更新及图片显示配套服务；后台和 H5 均为本次重新编译的生产文件。

## 服务器更新

适用于已部署在 `/root/hengshu-mall/crmeb-mall` 的现有商城。沿用现有备份流程，将版本更新包上传到 `/root/hengshu-mall/`，执行：

```sh
cd /root/hengshu-mall
tar --no-same-owner -xzf hengshu-mall-update-6.0.13.tar.gz
cd crmeb-mall
docker-compose -f compose.yml up -d --build
docker-compose -f compose.yml exec -T phpfpm php think merchant:install
docker-compose -f compose.yml exec -T phpfpm php think ranking:install
docker-compose -f compose.yml ps
```

使用 Docker Compose 插件时，将 `docker-compose` 替换为 `docker compose`。镜像构建需要服务器联网。

两个模块安装命令可重复执行，补齐商户和排行榜的数据表、菜单与权限。完成后退出并重新登录后台，强制刷新浏览器；子管理员需分配商户、排行榜及装修菜单权限。主题修改后需保存并启用对应主题，才能在正式商城生效。

更新包不携带现有数据库、`.env`、`.constant`、安装锁、上传文件和 Android 签名密钥，不需要重新安装商城。仅安装 APK 不会更新线上后台菜单和接口。

## APK 安装

服务器更新成功后，在手机上打开 `物色-6.0.13-universal.apk` 覆盖安装。包名和签名均与上一版一致。资源使用 HBuilderX 5.24 重新编译，复用与上一版完全一致的原生 SDK 和模块，在本机重建并签名。

## 本次验证

- 更新包内 12,497 个文件的 SHA-256、后台和 H5 入口资源引用、关键 PHP 与当前源码的一致性检查通过；现有数据和配置目录未纳入更新包。
- 管理后台、H5 和 APP 资源生产编译通过。
- 实际配置面板的背景、透明度、边框、圆角、主题绑定和配置重载验证通过；真实共享链接选择器的商品榜、店铺榜和店铺分类选择通过。
- 使用更新包中提取的 H5 验证：保存的样式与主题色生效，箭头样式正确，推荐项可进入指定店铺分类或保留完整参数的外部 URL。
- PHP 配置校验回归通过；店铺前端 11 项和详情排行榜 3 项回归通过。
- APK 的 v1/v2 签名、zipalign、原生版本号和生产接口域名检查通过；218 个编译资源逐字节一致，48 个原生 SDK/模块文件与上一版一致。
- Android 11 模拟器从 6.0.12 / 612 覆盖升级到 6.0.13 / 613，首次安装时间保留；首页正常打开，启动日志未检出 FATAL EXCEPTION、Uncaught TypeError 或 Uncaught ReferenceError。
- 9 个服务的 Compose 配置解析通过。Docker 引擎响应超时，容器启动和数据库升级的运行验证未完成，未计为通过。

签名证书 SHA-256：`7a2c34ea73302cfa070ac47003d3985ddb5bbe886431885c4a3776d8f10be7d8`。
