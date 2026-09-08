# CRMEB 架构审查与缺陷修复记录

审查日期：2026-09-08。源码起点：`bae42f927`，CRMEB-KY v6.0.0。修复分支：`codex/fix-commerce-audit`。

## 判断

这是业务覆盖较完整的模块化单体商城。商品、营销、交易、用户和运营工具已经形成完整链路，当前更需要完善身份与数据归属边界、资金并发一致性和异步任务可靠性。目录分层较清晰，但权限校验和事务边界没有贯彻到每个服务方法；不能用“有鉴权中间件”或“有事务”代替具体业务的不变量验证。

本次先审查，再按用户要求修复。已确认的问题来自源码调用链、隔离方法测试和独立 MySQL 并发测试；没有操作现有商城用户、订单、余额或真实支付渠道。

## 框架与实现

| 层次 | 实际实现 | 评价 |
| --- | --- | --- |
| 管理后台 | `template/admin`，Vue 2、Element UI、Vue Router/Vuex；锁文件 Vue 2.7.16 | 页面和业务管理能力丰富；需要单独维护前端构建和兼容验证 |
| 用户端 | `template/uni-app`，UniApp 页面、组件和 API 封装 | H5、小程序、App 共用业务；原生 OAuth、支付仍需各端专项验证 |
| API | ThinkPHP 多应用：`api`、`adminapi`、`kefuapi`、`outapi` | 用户、管理、客服和对外入口分开；登录校验不能代替数据归属校验 |
| 业务层 | 240 个 Service PHP 文件 | 订单创建、计价、拆单、履约、退款分开；部分服务仍过大 |
| 持久层 | 176 个 DAO、157 个 Model，ThinkPHP ORM/MySQL | DAO 复用方便，但通用金额方法的竞态会影响多个业务模块 |
| 异步与消息 | 事件监听器、Redis 队列、Workerman、定时任务 | 同一事件可能混合数据库写入、任务发布和外部调用，必须明确提交时机与重试语义 |
| 运行 | Docker 中 PHP、Nginx、MySQL、Redis | 本机正在运行的容器挂载 WSL 另一份源码，当前 Windows checkout 的修复不会自动进入该服务 |

数量是审查起点的文件统计，不代表逐个接口完成了端到端验收。锁文件记录 ThinkPHP 6.1.2、ORM 2.0.33；PHP 容器运行时是 7.4.33。依赖的公开漏洞与支持周期需要另做供应链审查，本报告没有把版本旧直接等同于可利用漏洞。

请求主链：前端请求 → 路由/中间件 → Controller 参数与身份 → Service 业务规则/事务 → DAO/Model → MySQL；事件监听器再连接 Redis 任务及第三方服务。

## 功能覆盖

| 业务 | 源码覆盖 |
| --- | --- |
| 商品 | 分类、规格 SKU、库存、价格、虚拟商品、导入导出、商品标签 |
| 交易 | 购物车、运费/优惠计算、下单、支付、好友代付、拆单、发货、自提核销、退款、发票 |
| 营销 | 优惠券、拼团、秒杀、砍价、积分、抽奖、签到、会员权益 |
| 用户与分销 | 多渠道登录、手机号绑定、充值余额、等级、推广关系、佣金与提现 |
| 运营 | DIY 页面、内容、客服、通知、统计、权限、配置、定时任务、对外 API |

## 已确认并修复的缺陷

### P1：Apple 登录信任客户端 openId

原入口只凭客户端提交的标识就进入账号选择和签发会话，没有 Apple 签名凭证。具备有效已有标识的人可绕过应有的身份验证。

修复：校验 Apple identityToken 的 RS256 签名、可信密钥、issuer、配置的 audience、有效期、签发时间和 subject；账号和邮箱取自已验证声明。缺少凭证、配置或可信密钥时拒绝。客户端提交原生凭证并支持失效后的重新授权，保留手机绑定流程。

定位：`crmeb/app/api/controller/v1/LoginController.php`、`crmeb/app/services/user/AppleIdentityVerifier.php`、`template/uni-app/pages/users/login/index.vue`。

### P1：跨用户读取发票抬头和下载电子发票

详情接口未传 UID；下载接口只按记录 ID 查询。登录本身不能约束返回数据属于谁。

修复：消费端查询必须携带正数认证 UID，查询包含 `uid` 和 `is_del`；下载在调用供应商前验证记录归属及发票号码。后台独立管理入口保持原有用途。

### P1：修改发票时可覆盖其他用户记录

保存方法按任意 `id` 更新，并写入当前用户 `uid`，导致跨用户修改甚至转移归属。

修复：先检查有效 UID 和原记录归属，更新条件包含 `id + uid + is_del`。保留本人新增、修改和默认发票操作。

定位：`crmeb/app/services/user/UserInvoiceServices.php`。

### P1：补开发票使用 UID 0 且订单未校验归属

控制器把认证宏 `uid()` 写成属性 `uid`，实际传入 0；旧服务把 0 解释为跳过发票归属检查，订单查询也没有限定 UID。

修复：使用认证宏，服务拒绝非正数 UID；订单与发票都必须属于当前用户。隔离验证覆盖“请求者 A、订单 B、发票 C”的组合以及正常本人申请。

定位：`crmeb/app/api/controller/v2/order/StoreOrderInvoiceController.php`、`crmeb/app/services/order/StoreOrderInvoiceServices.php`。

### P1：余额并发更新丢失、重复支付重复扣款

金额操作原来读旧值、计算、保存。独立 MySQL 复现：余额 100，两笔各 60 的并发订单都支付成功，但余额只减少到 40。两笔并发入账也可能丢失一笔。旧订单快照还可重复执行余额支付。

修复：同一数据库连接的事务内锁定金额记录，保留 BCMath 精度；支付先锁订单、重查已支付/失效状态，再锁付款账户、扣款和写流水。同一个已完成支付不会重新扣款。

定位：`crmeb/app/dao/BaseDao.php`、`crmeb/app/services/pay/YuePayServices.php`。

### P1：好友代付退款退给下单人

支付时扣实际付款者的余额，退款却固定增加订单 `uid` 的余额。

修复：退款按实际 `pay_uid` 入账，历史缺失付款人记录回退到订单用户；加款与流水处于同一事务。付款准备阶段同时限制已支付订单的付款人变更，避免后续请求篡改退款接收者。

定位：`crmeb/app/services/order/StoreOrderRefundServices.php`、`crmeb/app/services/order/StoreOrderServices.php`、`crmeb/app/api/controller/v1/order/StoreOrderController.php`。

### P1：支付回调重复执行或失败后无法补做

原流程在事务外读 `paid`，再更新已支付并触发事件。并发回调可重复执行；事件失败后订单保持 `paid=1`，下一次回调直接返回成功，跳过剩余业务。

修复：锁定订单并在事务中完成数据库业务副作用；失败回滚后可重试。审查进一步要求任务发布晚于最外层事务提交，并保留可重试的发布状态，避免队列工作进程读取未提交订单。

定位：`crmeb/app/services/order/StoreOrderSuccessServices.php`、`crmeb/app/services/pay/PayNotifyServices.php` 及支付任务发布实现。

待发布步骤与付款业务在同一事务中落库，最外层事务提交后再发送；已支付订单的重复回调或支付重试只补做未完成步骤。当前没有新增定时补偿扫描器：如果进程在提交后退出且再无回调/重试，待发布记录会保留，需要后续重试触发恢复。余额扣款已经提交时，通知故障不会反向撤销支付。

覆盖普通付款以及拼团、虚拟商品和抽奖的提交时机。内部待发布记录不进入订单业务日志，也不复制到拆分后的子订单。支付发布路径检查 Redis 实际写入结果，并保留被通知层捕获的发送失败；延迟任务仍依赖原有 `queue_open=1` 和 Redis 驱动配置。

外部消息/打印/第三方 API 无法仅靠本地数据库实现绝对仅执行一次；发布成功后进程崩溃的窗口仍应依靠接收端幂等键处理。步骤级重试也可能重复该步骤中已成功的一部分通知；队列入队成功不代表工作进程已执行成功。

### P2：用户端 402 响应使请求一直未结束

请求封装收到 402 只显示提示，不 resolve/reject，调用方的后续处理和 loading 收尾可能永远不执行。

修复：提示后拒绝 Promise；验证普通成功、鉴权失败、业务失败、跳过验证和网络失败行为仍正确。

定位：`template/uni-app/utils/request.js`。

## 设计缺陷与剩余审查范围

- 部分 Service 体积较大：订单约 3,117 行、商品约 2,836 行、用户约 2,339 行（审查起点）。权限、展示数据整理和业务写入混合，增加漏校验与回归成本。后续宜沿业务动作拆分，不需要马上拆成微服务。
- 库存扣减没有显式 `stock >= quantity` 条件，但安装 SQL 使用无符号库存字段；不能直接宣称已经确认超卖。仍应补上多用户竞争最后一件商品的真实数据库测试，并验证活动库存与普通 SKU 的一致性。
- `CacheService`/`LockService` 的过期、所有者标识和解锁流程需要专项审查。本次资金安全不再依赖两秒缓存标志作为并发保障。
- 支付、充值、会员、退款涉及多个入口；本次主要交易回归不等于所有渠道、全部活动组合和第三方异常均已验证。
- 原有业务自动测试覆盖不足；这批 `tests/regression` 提供可重复的安全与并发回归基础，但不能替代浏览器、原生 App 和支付沙箱验收。
- 开发 Docker Compose 的明文默认口令、调试开关和对外端口不能直接当作生产模板。本次没有修改正在运行的环境。

## 验证与交付边界

初始语法检查：1,099 个应用、业务支持、路由和配置 PHP 文件通过 PHP 7.4 检查。

最终完整回归及最后补充复测通过：发票权限 34 项、Apple 凭证 22 项、Redis 连接器边界 4 项、真实 MySQL 资金一致性 15 项、提交后发布 22 项、拼团/虚拟商品/抽奖 18 项，以及两组前端脚本；35 个改动或新增 PHP 文件语法检查和差异格式检查通过。最后的拼团服务和测试改动再次通过语法检查；拼团测试重复执行的 4 项基础事务检查没有重复计入场景数量。

回归包含真实源码方法、合成 RSA 签名、前端 VM，以及独立 MySQL/真实 ThinkPHP ORM 的并发操作。具体运行命令和最终结果见 `tests/regression/README.md`。隔离方法测试用内存 DAO/供应商替身；数据库测试只访问临时 `crmeb_audit` 数据库。

独立代码复核提出的额外提交时机、付款人变更和任务记录隔离问题已纳入修复回归。CodeRabbit 本次未提交差异审查因 `Connection failed: WebSocket closed` 失败，不计为通过；可在其网络连接恢复后重跑 `coderabbit review --agent -t uncommitted`。

源码修复未自动部署到本机 WSL 运行副本，未发布线上，未调用真实 Apple 账号、支付或发票服务。UniApp 源码需要重新构建后进入各端运行包。

Apple 上线配置：服务端 `.env` 增加 `[APPLE]` 下的 `CLIENT_ID`，值必须是实际签名 iOS 应用的 Apple Bundle ID。`__UNI__...` 项目 ID 不能替代它。缺少这个值将有意拒绝 Apple 登录；还需 OpenSSL、可信 CA、准确时间以及访问 Apple 公钥 HTTPS 地址的能力。

实现参考：[Apple 验证身份](https://developer.apple.com/documentation/signinwithapple/verifying-a-user)、[UniApp Apple 登录](https://uniapp.dcloud.net.cn/tutorial/app-oauth-apple.html)。
