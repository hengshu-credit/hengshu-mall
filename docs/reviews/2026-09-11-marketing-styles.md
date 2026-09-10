# 营销样式验收记录（2026-09-11）

## 参考及实现

实际登录查看了[Tigshop营销样式](https://java-b2b2c-pro.tigshop.cn/admin/promotionStyle)、[CRMEB活动氛围](https://mer.crmeb.net/admin/marketing/atmosphere/list)和[CRMEB商品边框](https://mer.crmeb.net/admin/marketing/border/list)的列表及创建表单。仅查看，无远端保存操作。

本项目使用统一“营销样式”入口，两类样式共用基础表单和范围选择器。采用现有素材库、商品/分类/标签/品牌数据和后台权限方式。本项目为单商户，因此不增加商户范围。公开功能介绍可参阅[CRMEB官方说明](https://www.crmeb.com/ask/thread/48393.html)。

## 本地后台实际操作

在8011后台通过页面操作上传3张工程测试图片：透明边框750×750、移动端氛围750×152、PC氛围810×50。创建两条仅作用于商品4的样式，完成日期选择、商品搜索和选择、保存、启用、编辑素材与范围回填。商品接口返回了相应边框和氛围元数据，商品原图URL未改变。

后台表单实际画面已查看，配置区域与右侧效果预览无重叠。最终两条测试样式均已停用，保留为停用样例供检查；素材保留在本地素材库。未修改其他活动、主题配置或用户购物车。

## uni-app验证

H5独立浏览器检查通过：列表边框与图片边界一致，不拦截商品点击；详情移动端与PC分别使用对应图片比例；氛围图与商品信息不重叠；到期和图片错误均恢复原始信息布局。

使用HBuilderX CLI将隔离副本同步到Wuse_API_30 Android模拟器，运行在 `io.dcloud.HBuilder` 调试基座，连接本地8011接口。没有发布安装包或连接线上业务API。实际操作搜索商品并检查显示：

- 详情氛围图宽约412.19、高84 CSS px，图层底部与信息区顶部同为581，信息区margin-top为0。
- 初次native检查发现旧WebView不支持`inset`，导致边框为0×0；改为明确top/left/width/height后重新差量编译并同步成功。
- 修复后搜索页边框与商品图均为98×98，坐标均为(16,133.76)，定位正常。

证据文件（本地构建目录）：

- `.build/marketing-style-admin.png`
- `.build/marketing-style-native-detail.png`
- `.build/marketing-style-native-border.png`
- `.build/marketing-style-native-launch.log`
- `.build/marketing-style-browser-tests.log`
- `.build/marketing-style-backend-tests.log`

后台生产构建、H5生产构建、修改的PHP文件语法检查、隔离数据库测试及H5浏览器回归均通过。Android验证集中在实际显示；未进行下单、支付或金额计算测试。

测试结束后已停止本次HBuilderX调试进程与模拟器，并移除临时端口转发。再次读取本地商品4，确认不再返回测试营销样式。

![后台配置与预览](../../.build/marketing-style-admin.png)
