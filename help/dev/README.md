# Windows 源码开发

日常仅编辑 `E:\workspace\CRMEB`。管理后台由 Vue CLI 读取 `template/admin`，商城 H5 由本项目内的 HBuilderX 读取 `template/uni-app`，PHP 容器直接挂载 Windows 的 `crmeb`。

PHP 的 `vendor` 依赖和 `runtime` 使用 Docker 命名卷，减少 Linux 容器跨文件系统读取 Windows 小文件的开销。业务代码仍直接读取 E 盘，不增加另一份业务源码。首次 `Start` 会复制现有依赖、日志和会话到卷中；后续启动复用卷。

在项目根目录执行：

```powershell
./help/dev/dev.ps1 Start
./help/dev/dev.ps1 Status
./help/dev/dev.ps1 Stop
```

入口：

| 页面 | 统一入口 | 开发服务直连 |
| --- | --- | --- |
| 管理后台 | http://localhost:8011/admin/ | http://localhost:1617/admin/ |
| 商城 H5 | http://localhost:8011/ | http://localhost:8080/ |

`http://localhost:8080/admin` 不属于管理后台入口：8080 只运行商城 H5，管理后台请使用上表中的 8011 或 1617 地址。

H5 的 `manifest.json` → `h5.uniStatistics.enable` 保持 `false`。本地商城使用 PHP API，不需要 uniCloud；若开启私有版 uni统计 2.0 而未关联云空间，会出现“应用未关联服务空间”的提示。修改此配置后重新编译 H5。

8011 的页面请求转发到源码开发服务；API、上传图片和后端公共资源仍由 PHP/Nginx 提供。源码开发服务停止后页面会返回 502，不会退回旧的发布文件。小程序/App 需在 HBuilderX 选择对应运行平台，并配置设备可访问的本地后端地址。

## 自动更新

- 保存 Vue、JS、CSS 后，前端自动编译并通过 HMR 更新；部分修改会触发整页刷新。
- 管理后台热更新统一连接当前页面同源的 `/admin/sockjs-node`。Vue CLI 3 会额外注入旧客户端，开发构建会统一其连接参数，避免 8011 入口连接到硬编码的局域网地址。不要通过放开跨域或关闭主机校验来绕过此问题。
- PHP 普通请求读取 Windows 源码。开发 OPcache 每次请求检查文件时间戳，并复用已编译 PHP 文件的存在性检查结果；修改、删除、重新创建源码均已验证在下一次请求生效。
- 队列、定时任务、聊天长连接是常驻进程。修改其 PHP 逻辑后执行 `./help/dev/dev.ps1 RestartPhp`。
- 改管理端 `vue.config.js`、环境变量、`help/dev/proxy.cjs` 或 H5 的 `manifest.json` 后，重启对应前端开发服务。当前 HBuilderX 编译器会用 `manifest.json` 的 `h5.devServer` 覆盖 `vue.config.js` 中同名配置，因此 H5 代理放在 manifest 中。
- 业务数据变化仍需页面重新请求数据；源码热更新不会自动刷新所有业务数据。

## PHP 依赖与运行目录

- `crmeb_php_vendor`：容器使用的依赖副本。更新 Windows 的 `crmeb/vendor` 后执行 `./help/dev/dev.ps1 SyncVendor`，会短暂停止 PHP/Nginx，重建依赖卷并启动它们。Composer 文件变化时，`Start` 会提示先同步；直接修改 vendor 文件也需要手动同步。
- `crmeb_php_runtime`：PHP 当前日志、缓存、会话和进程文件。Windows 的 `crmeb/runtime` 仅保留迁移前内容，之后不再接收运行时写入。可用 `docker exec crmeb_php ls /var/www/runtime` 查看，或用 `docker cp crmeb_php:/var/www/runtime/log ./help/dev/.state/runtime-log` 导出日志。
- 不要删除 runtime 卷，否则会丢失迁移后产生的日志和文件会话。`Stop`、`Start`、`RestartPhp` 和 `SyncVendor` 都保留它。
- 容器每次启动会清理上次运行遗留的 `workerman.pid`、`timer.pid`，避免旧 PID 与新容器进程冲突，导致聊天或定时任务误判为已经启动。
- 直接使用 Compose 时，先运行 `docker compose -p crmeb -f help/docker/docker-compose.yml -f help/dev/compose.yml run --rm --no-deps php-storage-init`，再 `up -d`。日常推荐使用启动脚本。

本机 2026-09-08 实测：基础配置接口从约 5.1 秒降至 0.9 秒，后台登录配置从 11.3 秒降至 1.7 秒，商品列表从 8.6 秒降至 1.6 秒（迁移后为预热后的连续请求）。首页 8 个接口并发全部返回业务状态 200，总耗时约 3.3 秒。容器刚启动时的首次请求仍较慢；Windows 业务源码读取和前端开发包解析仍有开销。

## HBuilderX 与 Node

HBuilderX 位于项目根目录的 `HBuilderX/HBuilderX.exe`。启动脚本使用其自带的 Node 22，避免系统 Node 26 与旧版 Vue CLI 不兼容；仅管理后台开发进程设置 OpenSSL 兼容选项。

首次使用需安装 HBuilderX 的 `uniapp-cli`、`compile-node-sass`、`compile-stylus` 插件。本次已安装。手动运行方式：导入 `template/uni-app`，选择“运行到浏览器 → Chrome”。管理后台编译日志在 `help/dev/.state/admin.log`，H5 日志在 HBuilderX 控制台。

## 数据与清理

MySQL 和 Redis 分别使用外部 Docker 命名卷 `crmeb_mysql_data`、`crmeb_redis_data`。这些卷已从原 WSL 环境迁入；新机器需先显式创建或恢复它们。切勿删除这些卷。源码位于 Windows，Docker 自身仍使用其 Linux/WSL 运行环境。

本次迁移备份：`E:\workspace\CRMEB-backups\2026-09-08-source-dev`。包括旧 WSL 源码压缩包、Windows 原 public 压缩包、MySQL SQL 和旧数据库文件备份。旧目录移入此处的 `retired-wsl`、`retired-public`，不再作为运行源码使用。备份可能包含本地安装凭据，请留在本机。

清理范围为旧 WSL 项目目录以及 `crmeb/public/admin`、`crmeb/public/static`、`crmeb/public/pages` 和 `crmeb/public/index.html` 中的前端发布产物。PHP 入口、安装/升级脚本、上传文件、`statics` 和 `assets` 保留。

运行环境使用两份 Compose 配置：`help/docker/docker-compose.yml` + `help/dev/compose.yml`。原有生产 Nginx 配置保留，开发启动脚本会明确选择源码开发配置。

参考：[Vue CLI 开发服务](https://v4.cli.vuejs.org/guide/cli-service.html)、[HBuilderX Web CLI](https://hx.dcloud.net.cn/cli/launch-web)。

## 前端回归检查

使用项目 HBuilderX 自带 Node 运行 `tests/regression/admin_routes.cjs`，检查真实路由表中的名称唯一性与命名跳转；运行 `tests/regression/admin_tags_lifecycle.cjs`，检查标签栏销毁后的缩放监听和延迟刷新。

`tests/regression/admin_hmr.cjs` 需要已启动的开发服务、可解析的 `playwright` 包及 Chrome。它会在独立无头浏览器中验证 8011/1617 两个入口的登录表单、同源热更新和实际 CSS 更新；测试会临时向 `App.vue` 添加不可见的 CSS 变量，并在结束时恢复源码。

客服回归：`tests/regression/chat_socket.cjs` 检查异步地址获取、发送失败、认证错误和页面离开后的连接取消；`tests/regression/chat_browser.cjs` 使用独立的测试 WebSocket 服务验证登录、消息气泡和断线后保留输入，需已启动 H5、Playwright 和 Chrome，不向真实客服发送消息。

## 本地响应速度优化（2026-09-09）

- 开发 Nginx 对 JS、CSS、JSON 和 SVG 启用 gzip，管理后台 1617 直连服务同样启用压缩；不增加页面或接口响应缓存。商城请通过 8011 入口使用这一传输优化。
- 管理后台开发源码映射改为独立 `.map` 文件，浏览器打开调试工具时仍可定位原始源码。`app.js` 解码体积从约 42.3 MB 降到 17.4 MB，gzip 实际传输约 3.1 MB；生产构建配置不变。
- PHP 开启 `opcache.enable_file_override=1`，保留 `validate_timestamps=1`、`revalidate_freq=0` 和原 `open_basedir`。不关闭源码更新检查或文件访问限制。[PHP 官方说明](https://www.php.net/manual/en/opcache.configuration.php#ini.opcache.enable-file-override)说明了该设置对存在性检查的作用，以及关闭时间戳验证的风险。
- PHP-FPM 保留最多 15 个 worker，预启动 6 个，空闲保留 4～8 个，减少页面并发请求时等待新进程的时间。
- 商城版权/连接配置、后台连接配置只合并同时进行的相同 GET 请求。请求结束或失败后立即清除；不同账号、语言、参数不共用请求，各调用方收到独立的数据对象。商品、订单等业务请求及写入请求保持原方式。

性能基准使用独立 Chrome 会话，分别测试首次访问与浏览器缓存命中后的刷新；API 每项连续测量 3 次。原始数据与截图保存在本机忽略目录 `help/dev/.state/performance-before*`、`performance-after*`。登录配置有每次重新生成的 `data.key`，测试校验密钥更新；其余 4 个基准接口比较完整返回内容哈希。

| 测量项 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 后台首次显示内容（FCP） | 3.97 秒 | 0.64 秒 |
| 后台首次访问传输量 | 43.22 MB | 3.28 MB |
| 商城首次访问传输量 | 10.39 MB | 3.32 MB |
| 商城首次访问全部首页接口返回 | 4.20 秒 | 1.81 秒 |
| 商城缓存命中后全部首页接口返回 | 4.03 秒 | 2.09 秒 |
| 基础配置 API 中位数 | 1.05 秒 | 0.50 秒 |
| 首页主题 API 中位数 | 1.31 秒 | 0.65 秒 |
| 后台登录配置 API 中位数 | 1.55 秒 | 1.18 秒 |

上述为本机运行中服务的对比，并非新启动容器的冷启动测试；页面首次访问使用新的浏览器上下文。接口时间会随本机负载波动，开发者工具主动下载源码映射也会增加调试时的资源下载量。

```powershell
# 使用能解析 playwright 的 Node 环境；项目 HBuilderX Node 同样可运行。
node tests/regression/dev_performance.cjs before
# 配置修改并重启对应开发服务后：
node tests/regression/dev_performance.cjs after
node tests/regression/dev_transport.cjs
node tests/regression/php_source_refresh.cjs
node tests/regression/config_requests.cjs
```

`dev_transport.cjs` 校验 gzip 解压前后字节一致、压缩比例及源码映射可用；`php_source_refresh.cjs` 在源码根目录创建随机命名的临时文件，通过本机 9003 FastCGI 端口测试 OPcache 更新并在结束时删除，不增加公开 HTTP 调试接口。配置请求回归覆盖并发合并、数据隔离、账号/语言变化、失败重试和写请求不合并。

页面与样式未因性能优化修改。验证范围包括商城首页、后台登录页、264 条命名路由、主题组件、标签栏生命周期、两入口 HMR、客服隔离收发；不代表逐一执行了所有需要登录的业务操作。

## 商城交互优化（2026-09-09）

- 分类页同时读取分类版本、布局和分类内容，H5 首次进入只向选中的布局共享这次尚未结束的分类请求；后续刷新仍请求新数据。小程序和 App 保留组件自行读取分类的方式，不跨原生组件传递 Promise。
- 三种分类布局和主题组件在销毁时移除各自的全局监听，避免反复进出页面后重复刷新、占用内存。
- 快速切换分类时立即发起新分类请求，仅当前请求能够更新列表；同一分类的分页仍避免重复请求。
- 分类位置合并为一次查询，滚动时只在选中分类变化后更新状态。第三种布局在渲染完成后测量可滚动区域，去掉固定等待一秒。
- H5 懒加载图片共用浏览器可见性监听，提前加载临近视口的图片，免去每张图片的滚动位置查询。保留原加载占位、失败提示、渐显样式；不支持该浏览器能力时以及小程序/App 均使用原滚动检测方式。

本机移动端 Chrome 会话连续三次从首页进入分类页，分类与商品接口使用真实服务；登录、购物车及优惠券使用隔离测试数据。为避免后台主题编辑影响对比，测速浏览器固定使用第二种分类布局：布局接口仍请求真实服务，仅在测试浏览器的响应中固定其 `status`，不修改数据库配置。数据保存在本机 `help/dev/.state/interaction-before.json`、`interaction-after.json`。

| 测量项 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 分类列表出现 | 1.81～2.16 秒 | 0.63～1.19 秒 |
| 分类首批商品数据就绪 | 3.27～3.93 秒 | 2.56～3.71 秒 |
| 每次返回首页后遗留的分类刷新监听 | 1、2、3 个 | 均为 0 个 |
| 记录到的主题监听，连续三轮 | 7、14、21 个 | 均为 5 个 |

商品就绪时间不包含所有图片下载完成；最后一轮商品 API 自身约需 1.93～2.52 秒，仍是主要等待来源。前一轮相同交互的分类就绪为 0.54～0.75 秒、商品就绪为 2.31～2.72 秒，体现了开发机负载的波动。上述是运行中本地服务的样本，不是所有设备、页面或冷启动的速度承诺。页面布局、文案和样式代码未因本轮优化调整，主题颜色仍读取后台当前配置。

```powershell
node tests/regression/h5_category.cjs
node tests/regression/h5_lazy_images.cjs
# 以下需运行中的源码服务、可解析的 playwright 包与 Chrome：
node tests/regression/h5_interaction_browser.cjs
node tests/regression/h5_interactions.cjs after
node tests/regression/chat_browser.cjs
```

`h5_category.cjs` 覆盖监听清理、实时主题更新、并行读取、数据隔离与刷新、快速分类切换、分页和滚动边界；`h5_lazy_images.cjs` 覆盖共享监听及非 H5/旧浏览器回退。`h5_interaction_browser.cjs` 用隔离接口数据验证三种布局、故意延迟的旧分类响应及 40 张图片的真实滚动加载。`h5_interactions.cjs after` 需要先保留本机的 `before` 基准。小程序/App 此轮验证为条件编译后的脚本检查，未进行真机运行。

## 数据库索引优化（2026-09-09）

已在本地 `crmeb_mysql` 的 `crmeb` 数据库应用以下非唯一索引，保留原索引、字段、约束与全部业务记录：

| 表 | 索引 | 服务的现有查询 |
| --- | --- | --- |
| `eb_store_product_cate` | `idx_cate_product (cate_id, product_id)` | 从分类查商品，覆盖关联子查询 |
| `eb_store_product_cate` | `idx_product_cate (product_id, cate_id)` | 从商品查所属分类 |
| `eb_lang_code` | `idx_code_type (code, type_id)` | 语言键与语种查翻译，以及按语言键查详情 |
| `eb_lang_code` | `idx_type_admin_id (type_id, is_admin, id)` | 加载语种数据、按语种和类型倒序分页 |

`EXPLAIN ANALYZE` 实测语言键查询由扫描 25,210 行变为索引定位 1 行，单次约 3.90 毫秒降至 0.05 毫秒；语言分页从读取 250 行过滤到 20 行，变为直接读取 20 行。两个分类关联查询均改用覆盖索引，当前表只有 20 条关联，主要收益是避免数据增加后每次全表扫描。原始执行计划在本机 `help/dev/.state/db-index-before.json`、`db-index-after.json`。

索引脚本会先备份相关表结构，使用 `ALGORITHM=INPLACE, LOCK=NONE`，遇到锁等待超时即失败。它跳过已有等价索引，并在创建前后按主键顺序读取全部记录比较哈希。本次比较一致。回滚仅删除该脚本记录为本次新增且定义仍匹配的索引。

```powershell
./HBuilderX/plugins/node/node.exe help/dev/db-indexes.cjs status
./HBuilderX/plugins/node/node.exe help/dev/db-indexes.cjs apply
# 需要撤销此项索引优化时：
./HBuilderX/plugins/node/node.exe help/dev/db-indexes.cjs rollback
```

表结构备份为本机 `help/dev/.state/db-index-schema-*.sql`，新增索引归属记录为 `db-indexes-applied.json`；再次 `apply` 不重复添加索引。脚本只面向当前 Docker 开发数据库。

数据库耗时与 HTTP 总耗时分开验证：`tests/regression/db_performance.cjs before|after` 通过 9003 FastCGI 端口运行真实 PHP 应用，在非公开源码目录创建随机临时探针，结束后移除。它记录每条 SQL 时间并对商品列表、空分类、价格排序、分类接口分别测三次，比较完整返回内容和数组顺序；本次全部一致。`tests/regression/db_indexes.cjs before|after` 检查四种查询的真实执行计划。

当前商品请求包含约 25 条 SQL，合计仅约 12～14 毫秒；PHP 初始化和后续处理占据绝大多数时间。因此不能将秒级接口时间的波动归因于这些索引，也不能只靠加索引解决所有本地等待。本次不调整商品查询条件、排序、价格、活动及缓存规则。

## 购物车进入优化（2026-09-09）

购物车原先先读取数量，再逐页串行请求全部商品，结束后才显示内容。现在数量与第一页同时请求，后续有效商品分页最多并发 3 个请求；保留服务端分页顺序，完整加载后一次更新列表、默认勾选和合计。未修改接口、模板、样式、价格或结算规则，也未增加购物车响应缓存。

数量或列表请求失败时会结束加载并使用原提示方式显示错误，避免一直等待。离开页面或重新进入后忽略旧请求的响应，避免旧数据覆盖当前列表；失效商品和推荐商品的重复请求也加了进行中保护。

在独立移动端 Chrome 中，以 41 条有效商品和 1 条失效商品、数量接口固定延迟 600 毫秒、每页列表固定延迟 800 毫秒进行前后对比：

| 测量项 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 全部有效商品数据就绪 | 3.11 秒 | 1.52 秒 |
| 加载遮罩消失、页面可操作 | 未单独记录 | 1.89 秒 |

数据就绪等待缩短约 51%；可操作时间包含现有加载遮罩的关闭动画。以上使用固定接口响应来验证请求调度收益，并非真实账号购物车的接口耗时承诺。前后商品顺序、数量、价格、勾选状态、失效商品和合计完整比较一致：选中 41 条、合计 820 元。截图和原始记录保存在本机 `help/dev/.state/cart-before*`、`cart-after*`；截图捕获时机不同，不做逐像素一致声明。

```powershell
./HBuilderX/plugins/node/node.exe tests/regression/cart_loading.cjs
# 需运行中的源码服务、可解析的 playwright 包与 Chrome：
./HBuilderX/plugins/node/node.exe tests/regression/cart_browser.cjs after
```

`cart_loading.cjs` 使用真实 Vue 页面脚本及勾选/计价方法，验证有界并发、乱序返回后的分页顺序、全选与取消、规格失效、库存上限、空车、失败恢复和离开/重进后的旧响应隔离。`cart_browser.cjs after` 需要本机已有修改前基准，验证实际页面的列表、金额、空车、数量请求失败后解除加载及再次进入恢复；测试使用隔离响应，不写入真实购物车。配置请求、商城导航及商品推荐回归也已通过；未进行小程序/App 真机验证。

`tests/regression/php_runtime_profile.cjs` 通过私有 FastCGI 临时探针比较 PHP 类加载时间，并在结束时清理探针。请求内的 classmap 实验未获得稳定的总耗时改善，因此本轮未据此修改生产加载方式或运行配置。
