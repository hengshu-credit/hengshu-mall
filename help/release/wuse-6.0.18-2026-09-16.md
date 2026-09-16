# 物色 6.0.18：购物车图片修复

分类页“已选商品”弹层、购物车有效商品及失效商品列表统一使用 `cartProductImage`。空白规格图直接使用商品主图；规格图加载失败后使用主图，主图也失败时显示包内占位图。相同地址不重复尝试，切换商品或规格后重新选择图片，旧图片的延迟错误事件不会影响新图。仅调整图片展示，不回写商品图片或修改购物车数量、勾选、金额及结算规则。

旧版本在隔离 H5 和 Android 回放中复现：分类页弹层的空规格图、失效规格图均为空白；购物车列表的失效规格图为空白。正常规格图可以显示。公开商品 1 的主图地址及兼容图片接口本轮可用，因此修复的是规格图回退链路；未读取用户手机购物车，不能将回放中的失效地址视作该手机的实际地址。

## 安装包

- 文件：`dist/物色-6.0.18-universal.apk`，版本 6.0.18 / 618。
- 包名 `com.hengshucredit.mall`，沿用原签名，支持 ARM 32 位、ARM 64 位和 x86。
- APK v1/v2 签名、zipalign、包结构及测试代码/签名秘密排除校验通过；218 个编译资源逐文件匹配，48 个原生文件与 6.0.17 一致。
- SHA-256：`5b7e6c27dfdbb43574ff2df04646ade6e1949e02f6162edb7988953a5a9b2d22`。
- 本次只生成本地 APK；未部署后台或 H5，未上传 APK 或登记线上 APP 最新版本。手机需覆盖安装此包才能使用修复。

## 本轮验证

| 层次 | 结果与边界 |
| --- | --- |
| 源码 | `cart_images.cjs`、`cart_loading.cjs`、`app_decoration_consistency.cjs` 通过，覆盖图片回退/失败恢复及购物车原有数量、选择、计价行为 |
| 生产构建 | H5 和 App 编译成功；App 最终版本为 6.0.18。H5 图片回归使用版本号递增前生成的同一份图片修复代码产物 |
| H5 页面 | 真实生产页面验证分类页弹层、购物车列表及展开后的失效商品图片，记录解码尺寸与显示尺寸 |
| Android | Android 11 / WebView 83.0.4103.106 模拟器完成 6.0.17 → 6.0.18 覆盖安装，首次安装时间保留；最终隔离回放的两处购物车各 3/3 图片解码成功，失效商品图片也通过，并人工检查截图 |
| 线上图片接口 | 通过公开 `/api/media/image` 检查：旧浏览器 Accept 得到 JPEG，支持 AVIF 的 Accept 得到 AVIF，状态、Content-Type 及文件特征匹配。模拟器的页面检查使用本地隔离响应，不属于线上账号购物车验收 |
| 其他端 | 未进行实体安卓手机、iOS、小程序验证 |

验证素材在 `.build/cart-category-images/`，包括 `browser-before.json`、`browser-after.json`、`android-results.json`、`upgrade.json` 和前后截图。打包及独立校验在 `.build/release-6.0.18/`，汇总在 `dist/release-6.0.18.json`。

初轮 Android 失效商品检查未先滚动到展开按钮，点击未命中；修正测试操作后重验。首次覆盖安装启动时，原生壳释放新包资源覆盖了回放注入，导航超时；核对资源摘要确认是正式包资源后，待首次释放结束重新执行隔离回放通过。失败日志保留，不计作通过。最终回放限制模拟器 App 仅访问本地服务，结束后恢复原资源与网络规则。

## 重跑图片回归

先准备现有 `.build/storefront-audit/live` 公开数据快照、`.build/storefront-audit/media` 媒体、当前 H5/App 编译资源，以及 `tests/tooling` 的 Playwright/Python、`.build/php74`。Android 使用本机 Wuse_API_30 模拟器、原 App 安装包和 root adb，测试会备份并恢复 App 资源。

```powershell
./HBuilderX/plugins/node/node.exe tests/regression/cart_images.cjs
$env:CRMEB_AUDIT_H5='E:/workspace/CRMEB/.build/cart-category-images/h5'
./HBuilderX/plugins/node/node.exe tests/regression/cart_images_browser.cjs
$env:CRMEB_AUDIT_APP='E:/workspace/CRMEB/.build/cart-category-images/app'
./HBuilderX/plugins/node/node.exe tests/regression/cart_images_native.cjs
```
