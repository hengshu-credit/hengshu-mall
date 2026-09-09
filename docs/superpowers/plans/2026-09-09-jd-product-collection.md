# 京东商品素材采集 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development; preserve unrelated work and do not commit or publish.

**Goal:** 在同机独立部署京东采集服务，后台配置后可按链接采集并保存素材。

**Architecture:** Python browser worker → authenticated asynchronous HTTP API → PHP product/copy → Vue product editor.

**Spec:** ../specs/2026-09-09-jd-product-collection-design.md

**Global constraints:** 不使用随机商品数据；仅当前 SKU；登录/验证人工完成；不读取商城数据库；密钥不出现在商品接口；保留现有采集渠道和未提交改动。

## Task 1: Independent service

Files: services/jd-crawler/**. Implement and test the exact HTTP/product contract in the spec. Use pinned/vendored upstream extraction code, independent requirements, Dockerfile/Compose, persistent browser profile and documented manual login access. Run standard-library unittest tests and service HTTP smoke tests. Record upstream provenance.

- [x] 写 URL、素材/字段规范化、任务生命周期和鉴权测试，确认缺失实现失败。
- [x] 实现真实 DOM 适配、单任务调度、限时任务和 HTTP API。
- [x] 提供同机独立容器部署与人工登录说明，运行测试。

## Task 2: PHP integration

Files: JdCrawlerServices.php, JdCrawlerConfig.php, CopyTaobao.php, CopyTaobaoServices.php, SystemConfigServices.php, SystemConfig.php, tests/regression/jd_collection.php.

- [x] 写当前 SKU 映射、参数 HTML 转义、空数据拒绝、配置验证与任务隔离测试。
- [x] 配置表单追加开关/地址/密钥，保存时创建缺失配置项并清理缓存。
- [x] 复用 product/copy 发起和轮询；成功映射为现有 productInfo，任务按管理员隔离。
- [x] 验证 PHP 语法及回归；修正京东图片下载链路中直接影响本功能的问题。

## Task 3: Admin workflow and acceptance

Files: productAdd/taoBao.vue, productAdd/index.vue, libs/productCollection.js, tests/regression/jd_collection.cjs, docs/jd-product-collection.md.

- [x] 写轮询成功、失败、取消/销毁和无效输入测试。
- [x] 增加直接链接采集按钮，配置说明及采集进度/错误，保留输入；成功设置采集保存标记。
- [x] 运行 PHP/Python/JS 测试和管理后台生产构建。
- [x] 审查全部本次 diff，完成合成 HTTP 联调，记录真实京东登录依赖与部署步骤。

## Task 4: Native media and original bytes (user follow-up)

- [x] 支持原生 AVIF/WebP/SVG 等图片、京东直接视频文件及已有常见视频格式。
- [x] 抓取实际 DOM 原始 URL，不拼接尺寸；禁用采集素材压缩、转码、水印及缩略图。
- [x] 7 个上传驱动统一验证，SVG安全校验后保留原字节，危险文件拒绝。
- [x] 真实二进制素材跨上传/下载链路逐字节回归，浏览器 AVIF/WebM 解码。
- [x] 视频入库记录、投递失败与重试失败提示、任务不携带签名 URL、同步下载不持有商品事务锁。

部署后的人工验收：专用浏览器登录京东并通过网站验证，再用目标商品链接验收。当前未登录真实请求已确认返回 verification_required；本地合成验收通过不代表已完成真实京东商品验收。
