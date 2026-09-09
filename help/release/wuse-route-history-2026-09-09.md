# 物色 6.0.3 路由历史验证

验证日期：2026-09-09。环境：官方 Android Emulator，Android 11 / API 30，1080 × 1920；分别验证三键导航与全面屏手势模式。

## 交付行为

- 从首页开始维护当前运行会话的访问历史，首页、分类、购物车、个人中心和普通子页面共享历史。
- 页面内容区域右滑返回、左滑前进；不新增“上一页／下一页”按钮。
- Android 系统返回键和左右边缘返回手势沿同一历史返回，到达起始页面后留在 APP 内。系统两侧边缘手势均遵循 Android 的返回语义；前进使用内容区域左滑。
- 新访问页面会截断旧的前进分支；路由参数随历史保留。页面打开失败不推进历史游标。
- 轮播图、横向滚动区域、输入控件及弹层优先保留本身交互。
- 历史仅保存在内存中，冷启动重新记录，最多保留 100 条并保留起始记录；被原生栈销毁的子页面前进时重新打开，不承诺恢复未保存表单和滚动位置。

## 模拟器实测

| 场景 | 结果 | 截图（工作区 help/dev/.state） |
| --- | --- | --- |
| 首页 → 分类，内容右滑回首页、左滑再到分类 | 通过 | history-gesture-back.png / history-gesture-forward.png |
| 分类系统返回首页，起始首页再次返回 | 通过，留在 APP | history-home-boundary.png |
| 首页 → 购物车 → 个人中心，右滑回购物车、左滑回个人中心 | 通过 | history-user-back-cart.png / history-cart-forward-user.png |
| 个人中心 → 设置，系统返回后左滑重新打开设置 | 通过，原生子页面重新创建，版本显示 6.0.3 | history-forward-profile.png |
| 全面屏模式下，分类使用左边缘返回，再以内容左滑前进 | 通过 | history-system-gesture-back.png / history-system-gesture-forward.png |
| 全面屏模式下，右边缘返回首页，首页再次左边缘返回 | 通过，留在 APP | history-system-boundary.png |
| 返回首页后新访问购物车，再左滑 | 通过，旧分类前进分支已清除 | history-branch-no-forward.png |
| 有返回历史时在首页轮播图上右滑 | 通过，仍在首页 | history-carousel-preserved.png |

切换系统导航模式会重新创建运行环境；全面屏测试在重新启动 APP、重新访问分类后执行。以上截图不包含新增的历史导航按钮。

## 自动验证

以下脚本均通过（使用 HBuilderX/plugins/node/node.exe）：

- tests/regression/app_route_history.cjs：历史前后移动、边界、分支、参数、失败和过期操作；手势方向与阈值、控件避让、无新增按钮、重复安装；原生生命周期适配、缓存标签页、系统返回、重复消息和失败恢复。
- tests/regression/app_home_startup.cjs：启动异常和重试恢复。
- tests/regression/h5_category.cjs：分类切换、监听清理和分页。
- tests/regression/request_completion.cjs：请求完成分支。
- git diff --check：通过。
- APK 签名验证：v1、v2 均通过，1 个签名者。模拟器已安装 versionName=6.0.3、versionCode=603。

## 安装包

- 路径：template/uni-app/unpackage/release/apk/物色-6.0.3-universal.apk
- 来源：__UNI__159D54B__20260909160536.apk
- 包名：com.hengshucredit.mall
- SHA-256：F917DC026A422470CED18751F94F82E3B0EF819B9B4C48E6972690DF9F9DA69C

本次验证聚焦路由、手势及现有页面显示。商品与品类尚未配置，没有进行下单、支付或售后业务验证。
