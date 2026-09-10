# 画布右侧页面操作与购物车标题图标

- 分类、购物车的“页面设置、另存模板、重置、保存为封面”移到手机画布右方，与首页一样纵向排列。按钮为 94×32px、间隔 20px，距画布右边 48px；预留组件操作栏空间，小屏桌面布局保留设置面板宽度。
- 移除设置面板顶部原有横排操作区；沿用原有按钮组件和功能。封面仍只捕获手机画布，不包含右侧按钮。
- 购物车标题的异常竖线来自旧默认 `icon-lianjie`：该字形是两个节点之间的连接线。已知分类、搜索等页面目标使用对应图标，其他链接使用既有 `icon-baobeilianjie` 链接图标。装修预览和 uni-app 共同使用同一解析函数，旧配置无需重新保存；自定义图标、素材图片与纯文字按钮保留。

## 验证

- 实际后管 1280px 视口：分类与购物车四个按钮纵向同列，购物车按钮 X 均为 833.5px，Y 分别为 104、156、208、260px；不再位于设置面板内。
- 实际点击移动后的“另存模板”能打开弹窗；“页面设置”能返回设置面板。
- 购物车预览的分类、搜索图标均按 20×20px 正常显示，没有旧连接线字形。随后按最新保存配置刷新，后管和原生均显示“首页 / 购物车 / 搜索”及对应图标。
- HBuilderX 5.24 已同步到 `Wuse_API_30` 模拟器的标准调试基座，确认前台包为 `io.dcloud.HBuilder`。原生购物车标题的首页、搜索图标正确，旧连接线图标数量为 0。
- Admin/H5 生产构建、`page_actions.cjs`、`theme_admin_production_browser.cjs`、`cart_decoration_browser.cjs` 通过，覆盖位置、垂直间距、封面范围、图标解析及原有跳转。

日志：`.build/canvas-actions-admin-build.log`、`.build/canvas-actions-h5-build.log`、`.build/canvas-actions-admin-browser.log`、`.build/canvas-actions-cart-browser.log`、`.build/canvas-actions-native-launch.log`。

未更改模板标题内容或真实购物车，未发布 APK。UI 校验未使用截图输入。
