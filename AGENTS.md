# 衡枢商城开发指引

## 项目与当前边界

- 基于 CRMEB 的平台商城。PHP/ThinkPHP 后端在 `crmeb/`，Vue 2 管理端在 `template/admin/`，UniApp 用户端在 `template/uni-app/`。
- 平台统一处理订单、履约与售后；商户档案、商品归属、店铺展示和主题已经实现。独立商户交易后台、按店履约和结算须按独立需求设计，不要假定已有。
- `seller_shop_id=0` 可以表示未分配；订单头为 0 也可能是混合归属。保留旧 `mer_id` 兼容规则，历史交易按成交快照解释。
- 当前研究基线：[系统评估](docs/reviews/2026-09-14-system-product-architecture-review.md)；[需求路线图](docs/reviews/2026-09-14-iteration-roadmap.md)。报告是日期快照，开始修改前重查实际源码、运行状态和相关问题是否已被修复。

## 代码入口

- `crmeb/app/api`、`adminapi`、`kefuapi`、`outapi`：消费端、平台后台、客服和外部 API。路由主要位于各应用的 `route/`。
- `crmeb/app/services`：业务规则与事务；`dao` / `model`：查询与数据模型；`jobs` / `listener`：任务与事件。
- `crmeb/crmeb`：缓存、锁、支付、上传等项目支持代码；`crmeb/vendor` 是第三方依赖，不直接修改来修补业务。
- `template/shared`：后台与消费端共用的配置、链接、配色、画布等逻辑；PHP 配置校验在 `crmeb/app/services/diy`。
- `services/jd-crawler`：Python/Chromium 商品素材采集，内部 HTTP、独立任务存储；`services/media-display`：本地 AVIF 的 PNG 显示副本。
- `help/dev`：Windows 开发脚本；`help/release`：构建、安装、更新与验证；`tests/regression`：隔离业务、数据库、组件、浏览器和原生回归。

## 修改方式

- 开始先看 `git status --short`。工作区可能存在其他任务尚未提交的改动；保留它们，只修改当前需求涉及的文件，不做无关格式化、重置或清理。
- 默认在现有模块化单体中按业务动作调整。先明确所有调用入口和事务/权限合同，再考虑抽取服务；不要为目录整齐大规模重写。
- 权限必须由服务端判断，并区分身份、操作权限、数据归属。不要依赖菜单显隐，也不要假定旧通用角色校验已经可靠；研究基线中发现其无权限分支仍放行。
- 金额使用整数分或 BCMath。余额、积分、佣金的变动必须检查并发、幂等、流水与回滚；绕过统一金额方法直接 `update` 账户字段需要专项核对。
- 外部支付/退款结果未知不能视为失败；先查询再重试。任务入队不等于执行完成，外部副作用不应依赖数据库回滚撤销。
- 不删除已有唯一约束或全局锁来直接“优化性能”；先证明替代的一致性机制，并验证并发结果。
- 商户资料使用私有目录和原加密密钥；不要输出密钥、账户配置或私有资料，不把它们写进报告/测试/发布包。原始采集素材与显示副本分开，保持来源可追溯。

## 前端与装修

- 修改 `template/` 前阅读该目录的 [AGENTS.md](template/AGENTS.md)，具体合同见 [装修组件合同](docs/decoration-component-contract.md)。
- 配置改动同时核对后台控件、预览、共享 JS、PHP 校验、消费端渲染、保存重载和链接目录。
- 区分页面名称与展示标题；区分导航继承、自定义和主动关闭；不得用空数组的猜测替代明确配置。
- 跨端结果分别记录源码测试、生产构建、Android/iOS/小程序实际验证和部署状态。隔离数据回放不能称作线上验收。

## 本地运行与验证

- 工作环境为 Windows / PowerShell。优先使用 `HBuilderX/plugins/node/node.exe`（本机 Node 22），避免系统新版本 Node 与旧 Vue CLI 不兼容。H5 编译依赖 HBuilderX 的 uni-app 编译器。
- Python 读取源码显式使用 UTF-8；需要中文输出时设置当前进程的 `PYTHONIOENCODING=utf-8`。不要改动用户全局运行时配置来完成一次验证。
- 开发说明见 `help/dev/README.md`，发布说明见 `help/release/README.md` 与 `README-update.md`。先确认服务状态，不因旧文档说服务已启动就假定端口可用。
- 交易回归：`./tests/regression/run.ps1`。使用隔离 MySQL，需 Docker、匹配 PHP 镜像和 Node；先读 `tests/regression/README.md`。
- 模块数据库回归：`run-merchants.ps1`、`run-storefront.ps1`、`run-rankings.ps1`、`run-full-reduction.ps1` 等，均从项目根目录执行并先核对脚本隔离方式。
- 前端重点按改动选择，如 `admin_routes.cjs`、`request_completion.cjs`、`cart_loading.cjs`、`merchant_frontend.cjs`、`storefront_frontend.cjs`。浏览器脚本可能需要独立 Playwright/pngjs 依赖、运行中的 H5 或指定构建目录。
- 京东服务在 `services/jd-crawler` 中设置 `PYTHONPATH=src` 后运行 `python -m unittest discover -s tests -v`。媒体测试使用服务 requirements 对应、支持 AVIF 的环境运行 `python tests/regression/media_display.py`。
- 研究探针在 `docs/reviews/evidence/2026-09-14/`，它们的成功退出表示旧缺陷被复现，不能当作修复后的安全通过。修复后建立断言正确不变量的永久回归。
- 测试失败要区分业务缺陷、过时断言、替身缺失和环境不可用，记录明确范围；不能把跳过、语法通过或历史结果计成本轮端到端通过。

## 发布与数据

- `./package.ps1` 构建后台及 H5，并生成全新安装包；`./package.ps1 -Update` 为已安装系统生成更新包；`-Verify` 执行对应隔离验证，依赖 Docker。原生 APK/小程序单独构建与验证。
- 打包会更新本地产物，开始前确认属于当前需求；研究或代码审查无需自动打包、部署、执行迁移或触碰运行中订单。
- 商户、榜单、满减、品牌等迁移命令在 `crmeb/config/console.php` 注册。执行迁移前确认目标连接；数据演练使用隔离数据库。
- 保留 `.env`、安装锁、上传、数据库/Redis 卷、商户私有文件及原密钥、采集数据卷、App 签名和 HBuilderX。恢复能力需要这些数据的配套备份。
- Windows 递归移动/删除前验证绝对目标路径；清理遵循 `cleanup.ps1` 的精确预览，不清除不属于本次工作的文件。
