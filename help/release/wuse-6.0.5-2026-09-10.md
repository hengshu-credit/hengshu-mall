# 物色 Android 6.0.5

日期：2026-09-10。使用当前工作区源码重新编译 Android APK，包含分类页三个布局的模块样式、按页面配置的主导航栏、商品详情底栏与导航栏高度适配。

## 安装包

- 分发文件：`dist/物色-6.0.5-universal.apk`，32,270,785 字节。
- 构建原件：`template/uni-app/unpackage/release/apk/__UNI__159D54B__20260910132015.apk`。
- 应用名：物色；包名：`com.hengshucredit.mall`；版本：6.0.5 / 605。
- ABI：`armeabi-v7a`、`arm64-v8a`、`x86`。
- SHA-256：`6899EF2E877C455E0EC7BAC1CBA93927A8B71733940B6EE98ACF1B456F248D44`。
- 沿用上一版自有测试证书，签名证书 SHA-256：`7a2c34ea73302cfa070ac47003d3985ddb5bbe886431885c4a3776d8f10be7d8`。
- HBuilderX 5.24 安心打包成功，APK v1/v2 签名校验通过，签名与 6.0.4 相同。

直接覆盖安装即可，无需卸载旧版。此记录对应 APK 构建与交付，没有上传应用市场或修改服务器下载地址；本次未构建 iOS。

## 验证

官方 Android Emulator，Android 11 / API 30，1080 × 1920。通过 `adb install -r` 从 6.0.4 / 604 升级至 6.0.5 / 605，首次安装时间保留，登录状态保留。

- 首页启动、分类页打开、系统返回首页、购物车与个人中心导航跳转通过。
- 当前线上分类配置和商品列表能够展示；空购物车提示正常。
- 从首页模板链接进入不存在的商品，保留错误提示、重新加载入口和底部操作栏，购买禁用，返佣浮层未挂载。
- 本次运行未发现 AndroidRuntime 崩溃日志。
- APK 内实际资源版本为 6.0.5 / 605；编译后的代码包含 `pageScoped`、`navigation_mode`、`category_style`、`search_style`、`layout_configs` 和 `pageNavigationHeight`。
- 自动回归通过：`main_navigation_native.cjs`、`h5_category.cjs`、`product_detail_empty.cjs`、`app_route_history.cjs`、`app_home_startup.cjs`、`request_completion.cjs`。
- `git diff --check` 通过。

截图及签名、构建日志位于 `help/dev/.state/wuse-6.0.5-verify/` 和 `help/dev/.state/wuse-6.0.5-*.log`。

## 验证边界

模拟器使用现有线上装修配置，未在服务器创建商品、修改装修、加购、下单或支付。三个布局的配置切换和新导航样式使用回归用例验证，本次没有在服务器逐一发布这些配置。线上部分商品素材仍显示占位图，本记录不代表其图片加载已通过验证。

新后台配置功能需要同步部署商城更新包；安装 APK 不会更新服务器后台。
