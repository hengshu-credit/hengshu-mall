# 物色 6.0.4 商品详情修复

## 原因与修改

商品不存在时接口返回业务状态 400、消息“商品不存在”。旧详情页在请求失败后调用带有 `tab: 3` 的 Tips，约两秒后执行返回；底栏只在 `storeInfo.id` 存在时移入屏幕。返佣分享浮层在默认状态下挂载并向左偏移，露出黄色边缘。

- 移除普通商品详情页的返佣分享浮层。
- 请求失败或缺少商品 ID 时留在详情页，显示错误原因和“重新加载”，不安排跳转。
- 获取有效商品前不渲染空价格和推荐装修内容；加载和错误状态有独立展示。
- 底栏保持显示。无商品时收藏置灰、购买禁用，客服不再携带 undefined 商品 ID，店铺和购物车保留主动跳转能力。
- 防止重复重试请求，重试成功恢复商品内容和购买按钮。主题请求失败有默认底栏样式。

## 验证

官方 Android Emulator，Android 11 / API 30，1080 × 1920。已覆盖安装 6.0.4（604）。

- 从首页轮播商品入口复现旧版白页、黄色边缘和缺失底栏；修复后显示“商品不存在”，停留超过原来的两秒跳转时间后仍在详情页。
- 点击“重新加载”后仍在详情页，底栏完整可见；原生 WebView 检查确认 `.sharing-packets` 不存在，底栏位于可视区。
- 内容右滑返回首页、左滑前进重新进入详情页，通过。
- 底部购物车入口进入购物车，系统返回回到详情页，通过。
- 模拟器断网期间保持加载态与底栏，恢复网络后请求结束并显示商品不存在，没有自动离开详情页。证据：`detail-offline.png`、`detail-network-settled.png`。
- 自动回归通过：`product_detail_empty.cjs`、`app_route_history.cjs`、`app_home_startup.cjs`、`request_completion.cjs`。覆盖缺失商品、下架提示、网络错误、无 ID、空成功响应、重试成功、无重叠请求、正常商品操作和禁用购买操作。
- APK 签名 v1/v2 校验通过；`git diff --check` 通过。

截图在 `help/dev/.state/`：`detail-before-error.png`、`detail-fixed-3seconds.png`、`detail-fixed-retry.png`、`detail-fixed-back-home.png`、`detail-fixed-forward.png`、`detail-footer-cart.png`。

现有线上数据没有可用商品；正常商品成功分支使用测试数据验证，没有创建线上商品或订单。

## 安装包

- `template/uni-app/unpackage/release/apk/物色-6.0.4-universal.apk`
- 构建来源：`__UNI__159D54B__20260909191419.apk`
- 包名：`com.hengshucredit.mall`
- SHA-256：`B08B995D1B2A0C0055C905F4A0E73DBABF7F6437ED9D64072BA21D70DF842E82`
