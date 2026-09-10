# 物色 Android 6.0.11：启动等待优化

后台 `/admin/setting/system_visualization_data` 的开屏广告开关、图片/视频、播放时长继续生效。本次没有修改线上配置。检查时线上 `/api/get_open_adv` 返回广告关闭。

## 修改

- 首个页面 `onReady` 时关闭原生启动图，避免空白引导页跳转后仍等待原生白屏检测；保留原生自动关闭作为兜底。
- App 引导页提供可见的加载状态，广告接口和页面等待限制为 1.2 秒。关闭、无素材、失败、超时均进入首页；迟到响应不会重新显示广告。此限制只针对广告请求，不限制后台配置的广告播放时长，也不更改普通业务接口超时。
- 保留每日展示逻辑；修正仅配置视频、无图片时被误跳过的问题；页面销毁时释放广告倒计时。
- 启用 App 的本地分包。首页和分类页直接依赖的装修组件留在主包，其他 9 个页面分包按需加载。

最终 APK 的 `app-service.js` 从 6.0.10 的 3,349,679 字节降至 1,479,943 字节，减少约 55.8%。此数字是启动主脚本体积，不代表 APK 总体积或启动耗时的同比降幅。

## 安装包

- 文件：`dist/物色-6.0.11-universal.apk`，32,267,679 字节。
- 来源：`template/uni-app/unpackage/release/apk/__UNI__159D54B__20260911015702.apk`。
- 包名：`com.hengshucredit.mall`；版本：`6.0.11 / 611`。
- 架构：`armeabi-v7a`、`arm64-v8a`、`x86`。
- SHA-256：`38A1C6D551B353052B434DE03132DD057DFF6FB8CAE715971EAC45E07FB08D99`。
- 沿用已有签名，v1/v2 校验通过；模拟器从 6.0.10 覆盖安装成功，首次安装时间保留。

## 验证与边界

Android 11 / API 30 模拟器，1080 × 1920，强制停止进程后冷启动，未清除应用数据。旧版 6.0.10 在启动指令发出 10 秒的截图中仍显示原生启动图。最终 6.0.11 更新后首次运行，原生启动图从创建到关闭约 4.60 秒；再次冷启动约 2.88 秒，从启动指令到关闭约 3.79 秒。日志使用首次 `Html5Plus-SplashClosed` 记录；`am start -W` 的 Activity 启动时间不是首页完成时间。

上述是有限次数的模拟器测量，不是实体手机性能承诺。关闭启动图后，首页内容仍需接口和图片加载；未将后台设置的广告播放时长算作性能回归。实际打开首页、分类页和商品详情分包，页面结构与文字正常显示，部分远程图片在截图时尚未加载。扫描最终运行日志未发现 `FATAL EXCEPTION`、`Uncaught`、`ReferenceError` 或 `TypeError`。

通过：Android 生产编译与 APK 打包、签名校验、`app_startup.cjs`、`component_reuse.cjs`、`navigation_route_race.cjs`、`main_navigation_native.cjs`。启动测试覆盖关闭/开启广告、仅视频广告、保留 8/12 秒配置、每日跳过、1.2 秒请求截止、迟到响应、页面隐藏/销毁清理、H5/小程序条件编译及普通接口超时隔离。

额外运行的现有 `category_title_native.cjs` 未通过：旧测试夹具缺少当前分类组件要求的 `title_component`，在读取 `isHide` 时异常；本次没有修改该分类组件或该测试。分类页另经过实际 APK 打开检查。

构建、签名、截图、启动日志保存在 `.build/app-startup/`；最终证据为 `final-611/`、`final-611-repeat/`、`category-final.png`、`detail-final.png`、`pack-final.log` 和 `signature.txt`。临时打包密码配置已删除。本次无需服务器更新，通过覆盖安装新 APK 生效。

参考：[uni-app 启动性能与空白中转页](https://uniapp.dcloud.io/tutorial/performance.html)、[启动图关闭策略](https://zh.uniapp.dcloud.io/tutorial/app-splashscreen.html)、[App 分包配置](https://uniapp.dcloud.net.cn/collocation/manifest?id=optimization-1)。
