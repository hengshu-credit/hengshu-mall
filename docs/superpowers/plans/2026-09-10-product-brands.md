# 商品品牌管理实现计划

**目标：** 后台商品管理新增品牌 CRUD；品牌可通用或关联多个任意层级分类；商品基础信息支持品牌多选。

**方案：** 使用品牌、品牌分类关系、商品品牌关系三张独立表，沿用 ThinkPHP 控制器／服务／DAO 和 Vue 2、Element UI。一级分类范围包含后代；多个分类按并集匹配。商品品牌为可选，旧请求不传字段时保留关系。

**边界：** 当前工作区有其他未提交工作，只修改本功能文件，不切换现有分支、不提交其他改动。不会增加商户功能。品牌停用后不再提供新选择；已有不适用选项保留显示，保存时提示调整。已关联商品的品牌禁止删除，可停用。

## 任务

- [x] 后端：先写范围与存储回归；新增三张表、幂等安装命令与菜单权限；品牌 CRUD、候选接口和商品保存／详情／草稿接入。
- [x] 前端：品牌列表与编辑弹窗；多分类、通用、标识图片、排序、状态；商品基础信息品牌搜索多选，分类变化重新匹配且保留失效选择供移除。
- [x] 验证：真实 MySQL 关系、校验、事务回滚与安装重入；前端交互、编译、PHP 语法、差异检查；本地执行安装并检查入口。

## 接口约定

- `GET product/brand/list`，参数 `page,limit,name,status,is_global,cate_id`；响应 `data:{list,count}`。
- `GET product/brand/info/:id`；响应品牌对象。
- `POST product/brand/save/:id`；字段 `name,logo,description,sort,status,is_global,cate_ids`。
- `PUT product/brand/status/:id/:status`；`DELETE product/brand/del/:id`。
- `GET product/brand/options`，参数 `cate_ids`、`selected_ids`（ID 数组）；响应 `data` 为品牌数组，包括 `id,name,logo,available`；保留选中但不可用的品牌，`available:false`。
- 品牌对象：`id,name,logo,description,sort,status,is_global,cate_ids,cate_names,product_count`。
- 商品保存、详情和草稿使用 `brand_ids:number[]`；详情额外返回 `brand_list` 供回显。
- 页面 `/admin/product/brand/list`，权限 `admin-product-brand-list`；候选接口使用商品编辑权限。

## 进度与实施裁定

- 接口参数及规则检查：品牌 CRUD 和商品选择共用分类范围规则；列表筛选与候选列表均以指定分类及祖先匹配；不按子分类反向扩大范围。
- 保留当前源码开发目录：已有其他正在进行的修改，切换分支或复制工作树会扰动开发环境；在明确的文件边界内实施并独立复核。
- 验证完成：41 项后端回归、12 项 Vue/Element UI 组件回归、266 个路由名称检查、PHP 语法及 git diff --check 通过。完整后台生产构建通过（有 CSS 顺序及包体积警告）；产物在 `.build/product-brands/admin`。
- 本地真实 HTTP 验证通过品牌 CRUD、双品牌商品新增和详情回显、停用后拒绝保存并回滚商品字段、旧请求保留关系及清空后删除。测试商品、品牌及临时会话已清理。
- 复核修复了角色分配标记，并在实际角色权限树确认全部 9 个品牌条目可分配。CUA 连接不可用，未声称真实浏览器视觉验证通过。
