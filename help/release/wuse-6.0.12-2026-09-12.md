# 物色 6.0.12 更新包

- 后管更新包：`hengshu-mall-update-6.0.12.tar.gz`，包含 PHP、管理后台、手机 H5、排行榜素材与字体，以及当前工作区的后台更新。
- Android：`物色-6.0.12-universal.apk`，包名 `com.hengshucredit.mall`，版本 6.0.12 / 612；支持 armeabi-v7a、arm64-v8a、x86。
- 每个文件均附 `.sha256` 校验文件；汇总见 `release-6.0.12.json`。

## 主要更新

排行榜条件树及访问客户个性化规则；排行榜和店铺装修组件；专题页可删除标题；详情排行榜再次选中与设置面板修复；Android 图片尺寸、画布缩放、配色及间距兼容修复。

## 更新顺序

先更新服务器，再覆盖安装新版 APK。更新包不包含现有数据库、上传文件、安装锁或应用密钥，不需要重新安装商城。

将后管更新包上传到服务器 `/root/hengshu-mall/`，执行：

```sh
cd /root/hengshu-mall
tar --no-same-owner -xzf hengshu-mall-update-6.0.12.tar.gz
cd crmeb-mall
docker-compose -f compose.yml up -d --build
docker-compose -f compose.yml ps
```

使用 Docker Compose 插件的服务器，把 `docker-compose` 替换为 `docker compose`。更新前沿用现有备份流程，更新后强制刷新后管浏览器。

APK 沿用历史签名证书，可覆盖升级。新资源由 HBuilderX 5.24 重新编译，并使用与 6.0.11 相同的原生 SDK 和模块在本机重建、签名；未调用云端签名。已通过 v1/v2 签名、字节对齐、生产接口地址与资源一致性检查，并在 Android 模拟器覆盖安装和启动成功。

本次只生成安装文件，尚未更新线上服务器。

## 本次校验

- 更新包解压、12,493个文件SHA-256、管理后台/H5入口资源引用，以及保留现有配置、安装状态和上传目录的检查通过。
- 排行榜条件树、商户主题相关PHP和排行榜素材/字体均已核对为当前源码。
- APK与6.0.11证书一致，v1/v2签名和zipalign校验通过；218个生产资源文件逐字节核对，48个原生SDK/模块文件保持一致。
- Android模拟器覆盖升级成功，版本为6.0.12/612，首次安装时间保留；已打开首页，日志未检出FATAL EXCEPTION、Uncaught TypeError或Uncaught ReferenceError。
- Docker运行验证因本机引擎响应超时未完成；这项未计为通过。此前源码层的条件树、H5及Android调试基座核验见项目 `docs/ranking-decoration-audit-2026-09-11.md`。
