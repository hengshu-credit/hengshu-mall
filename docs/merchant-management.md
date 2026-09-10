# 商户管理

分支：`codex/merchant-management`。独立工作目录：`E:\workspace\CRMEB-merchant-management`。产品方案见 [整合设计](/E:/workspace/CRMEB-merchant-management/docs/superpowers/specs/2026-09-11-merchant-design.md)。

## 已实现

后台入口为 `/admin/merchant/shop/list`，同组包含入驻申请、商户类型、商户标签。单个列表统一管理商户，不设置上下游身份或销售／供货开关；类型只做分类。

商户资料支持主体、联系人、地址、账户和电子合同／证照上传。普通信息修改直接生效，核心资料形成待审版本，审批后才替换有效资料。审核、修改前后值、附件调整、状态操作和资料导出记录均保留在同一个历史列表。共享主体的变化关联到当时受影响的商户。

电子合同和证照存入私有目录，支持 PDF、JPG、PNG、WebP，单份不超过20MB。详情和历史能预览／下载原文件；资料包包含资料、历史、目录及原文件，原文件合计超过40MB时提示分批下载。后台接口显式校验操作权限，历史中的身份证件和银行账号按敏感权限脱敏。

商品基础信息支持“所属商户”，商品列表可筛选并显示商户。商品保存、草稿、复制与采集沿用同一字段；旧编辑请求不传字段时保留既有归属。已上架或有订单／活动引用的商品不能直接转移归属。商品目录、详情、加购、购物车有效性、下单与支付前检查商户状态；订单和明细保存当时的商户摘要。

商城申请页为 `/pages/merchant/application`，需要会员登录。支持资料草稿、文件上传、提交、撤回、查看本人申请与审核意见；后台“入驻申请”页可查看页面路径，商城装修可以配置该链接。

## 安装与更新

管理端读取菜单时自动初始化。建议更新代码后先执行：

```sh
php think merchant:install
```

本地容器：

```powershell
docker exec -w /var/www crmeb_php php think merchant:install
```

命令可重复执行，补齐结构和菜单，保留已有类型名称、商户资料及平台默认商户。使用当前连接的表前缀。只自动映射原 `mer_id=0` 且尚无新归属的旧平台商品／订单；原非零商户未映射的数据保持待处理，不统一归为自营。菜单权限需在角色中按需授予。

管理后台和H5源码均须重新构建。开发后台可访问 `http://localhost:8011/admin/merchant/shop/list`；商城页面需要已运行的H5开发服务或相应发布产物。

## 私有资料与备份

默认私有目录固定为项目根目录下的 `runtime/merchant_private`，CLI与各HTTP应用共用。资料字段采用AES-256-GCM加密，密钥默认保存在该目录的 `.key`；需要配置时可以用 `CRMEB_MERCHANT_KEY` 提供64位十六进制密钥，以 `CRMEB_MERCHANT_STORAGE` 指定公开目录之外的绝对存储路径。

数据库、私有原文件与原密钥必须一起备份。不要重新生成或替换已有密钥，丢失原密钥不能解密旧资料。本地安装命令会将私有目录和密钥所有者与根runtime目录保持一致，PHP运行用户须能读写，文件不经公开上传目录提供。

## 验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/regression/run-merchants.ps1
& ./HBuilderX/plugins/node/node.exe --test tests/regression/merchant_frontend.cjs tests/regression/product_brand_frontend.cjs
& ./HBuilderX/plugins/node/node.exe tests/regression/admin_routes.cjs
```

数据库回归使用无外网、无宿主端口的临时MySQL，覆盖资料与审批、并发版本和重试、私有文件越权、共享主体、商品归属、订单快照、停用和权限；不会往开发商城创建测试商户。前端回归使用实际Vue/Element UI组件，覆盖中性表单、敏感输入限制、合同附件、候选异步竞争和统一历史。

## 当前业务边界

本次完成档案与商品归属阶段，并为现有交易加入商户快照和停用检查。订单仍沿用现有平台统一处理流程：多商户明细可保存各自归属，但尚未接入按店拆单、独立商户经营后台、采购／代发执行和自动结算／分账。不能把商品选择了商户理解为这些后续业务已经启用。资料包当前导出商户资料、历史和附件，独立交易对账资料按后续业务阶段接入。
