# CRMEB代码开发规范

## 1. 命名规范

### 1.1 类命名

**规则：**
- 使用大驼峰命名法（PascalCase）
- 类名应清晰表达其职责
- 遵循PSR-2规范

**示例：**
```php
<?php
// ✅ 正确
class UserServices
class StoreOrderController
class SystemConfigDao

// ❌ 错误
class userServices
class store_order_controller
class DAO_User
```

**命名约定：**
- **控制器**：模块名 + Controller，如 `UserController`, `ProductController`
- **服务类**：模块名 + Services，如 `UserServices`, `StoreOrderServices`
- **DAO类**：模块名 + Dao，如 `UserDao`, `StoreProductDao`
- **模型类**：模块名，如 `User`, `StoreOrder`
- **验证器**：模块名 + Validate，如 `UserValidate`
- **中间件**：功能名 + Middleware，如 `AuthTokenMiddleware`
- **监听器**：功能名 + Listener，如 `OrderPaySuccessListener`
- **异常类**：功能名 + Exception，如 `ValidateException`

### 1.2 方法命名

**规则：**
- 服务层、DAO层、模型层使用小驼峰命名法（camelCase）
- 控制器层方法使用小写+下划线命名法
- 方法名应清晰表达其功能
- 私有方法以下划线开头

**示例：**
```php
<?php
// 服务层/DAO层/模型层 - 小驼峰
public function getUserList()
public function saveOrder()
public function deleteById()
private function _formatData()  // 私有方法以下划线开头

// 控制器层 - 小写+下划线
public function get_list()
public function save_data()
public function delete()
public function update_status()
```

### 1.3 变量命名

**规则：**
- 使用小驼峰命名法（camelCase）
- 变量名应清晰表达其含义
- 数组变量使用复数形式
- 布尔变量使用is/has/can开头
- 常量使用全大写+下划线

**示例：**
```php
<?php
// ✅ 正确
$userName = '张三';
$orderId = 12345;
$userList = [];  // 数组使用复数
$isPaid = true;  // 布尔值使用is/has/can开头
$hasStock = true;
$canRefund = false;

// 常量
const STATUS_ACTIVE = 1;
const ORDER_TYPE_NORMAL = 0;

// ❌ 错误
$username = '张三';  // 不清晰
$a = 12345;         // 无意义
$list = [];         // 不明确
$paid = true;       // 不清晰
```

### 1.4 数据库命名

**表命名：**
- 使用小写字母+下划线
- 统一使用 `eb_` 前缀
- 表名应清晰表达其内容
- 使用复数形式或明确含义的名词

**示例：**
```sql
-- ✅ 正确
eb_user
eb_store_product
eb_store_order
eb_system_config

-- ❌ 错误
user              -- 无前缀
StoreProduct      -- 大写字母
systemconfig      -- 无下划线
```

**字段命名：**
- 使用小写字母+下划线
- 字段名不以下划线开头
- 主键统一命名为 `id`
- 外键命名为 `表名_id`
- 时间字段命名为 `create_time`, `update_time`
- 状态字段命名为 `status`
- 删除标记命名为 `is_del`

**示例：**
```sql
-- ✅ 正确
id INT PRIMARY KEY,
user_id INT,
order_id INT,
create_time INT,
update_time INT,
status TINYINT(1),
is_del TINYINT(1)

-- ❌ 错误
ID INT PRIMARY KEY,           -- 大写
userId INT,                   -- 驼峰
orderId INT,                  -- 驼峰
createTime INT,               -- 驼峰
Status TINYINT(1),            -- 大写
isDelete TINYINT(1),          -- 驼峰
```

## 2. 代码分层规范

### 2.1 分层架构

```
请求 → 路由 → 中间件 → 控制器 → 服务层 → DAO层 → 模型层 → 数据库
           ↓                                                   ↑
           └────────→ 异常处理 ←───────── 事务管理 ←───────────┘
```

### 2.2 控制器层规范

**职责：**
1. 接收和验证请求参数
2. 调用服务层处理业务逻辑
3. 返回统一的JSON响应
4. 不直接操作数据库
5. 不包含复杂业务逻辑

**规范示例：**
```php
<?php
namespace app\adminapi\controller\system;

use think\facade\App;
use app\services\system\SystemAdminServices;

class SystemAdminController
{
    protected $services;

    public function __construct(App $app, SystemAdminServices $services)
    {
        $this->services = $services;
    }

    /**
     * 获取管理员列表
     * @return \think\response\Json
     */
    public function get_list()
    {
        // 1. 获取并验证请求参数
        $where = $this->request->getMore([
            ['keywords', ''],
            ['status', ''],
            ['role_id', '']
        ]);

        // 2. 调用服务层
        $list = $this->services->getAdminList($where);

        // 3. 返回响应
        return app('json')->success($list);
    }

    /**
     * 保存管理员
     * @return \think\response\Json
     */
    public function save()
    {
        // 1. 获取并验证POST参数
        $data = $this->request->postMore([
            ['id', 0],
            ['account', ''],
            ['real_name', ''],
            ['pwd', ''],
            ['roles', []],
            ['status', 1]
        ]);

        // 2. 调用服务层保存
        $this->services->saveAdmin($data);

        // 3. 返回成功响应
        return app('json')->success('保存成功');
    }

    /**
     * 删除管理员
     * @param int $id
     * @return \think\response\Json
     */
    public function delete($id)
    {
        // 1. 参数验证
        if (!$id) {
            return app('json')->fail('参数错误');
        }

        // 2. 调用服务层删除
        $this->services->deleteAdmin($id);

        // 3. 返回成功响应
        return app('json')->success('删除成功');
    }
}
```

### 2.3 服务层规范

**职责：**
1. 实现核心业务逻辑
2. 数据验证和权限验证
3. 调用DAO层操作数据库
4. 事务管理（需要时）
5. 调用其他服务（需要时）
6. 触发系统事件

**规范示例：**
```php
<?php
namespace app\services\system;

use crmeb\basic\BaseServices;
use crmeb\exceptions\AdminException;
use app\dao\system\SystemAdminDao;

class SystemAdminServices extends BaseServices
{
    protected $dao;

    public function __construct(SystemAdminDao $dao)
    {
        $this->dao = $dao;
    }

    /**
     * 获取管理员列表
     * @param array $where
     * @param int $page
     * @param int $limit
     * @return array
     */
    public function getAdminList(array $where, int $page = 1, int $limit = 10): array
    {
        // 1. 构建查询条件
        $query = $this->dao->search($where);

        // 2. 统计总数
        $count = $query->count();

        // 3. 获取列表数据
        $list = $query->page($page, $limit)->select()->toArray();

        // 4. 处理数据
        foreach ($list as &$item) {
            $item['role_names'] = $this->getRoleNames($item['roles']);
            $item['status_text'] = $item['status'] ? '启用' : '禁用';
            $item['last_login_time_text'] = $item['last_login_time'] 
                ? date('Y-m-d H:i:s', $item['last_login_time']) 
                : '-';
        }

        // 5. 返回分页数据
        return [
            'list' => $list,
            'count' => $count,
            'page' => $page,
            'limit' => $limit
        ];
    }

    /**
     * 保存管理员
     * @param array $data
     * @return int
     * @throws AdminException
     */
    public function saveAdmin(array $data): int
    {
        // 1. 数据验证
        if (empty($data['account'])) {
            throw new AdminException('账号不能为空');
        }

        // 2. 验证账号唯一性
        $exists = $this->dao->getAdminByAccount($data['account'], $data['id'] ?? 0);
        if ($exists) {
            throw new AdminException('账号已存在');
        }

        // 3. 密码处理
        if (!empty($data['pwd'])) {
            $data['pwd'] = password_hash($data['pwd'], PASSWORD_DEFAULT);
        } else {
            unset($data['pwd']);
        }

        // 4. 开启事务
        return $this->transaction(function () use ($data) {
            if (isset($data['id']) && $data['id']) {
                // 更新
                $id = $data['id'];
                unset($data['id']);
                $this->dao->update($id, $data);
                return $id;
            } else {
                // 新增
                $data['create_time'] = time();
                return $this->dao->save($data);
            }
        });
    }

    /**
     * 删除管理员
     * @param int $id
     * @return bool
     * @throws AdminException
     */
    public function deleteAdmin(int $id): bool
    {
        // 1. 检查是否可删除
        $count = $this->dao->count();
        if ($count <= 1) {
            throw new AdminException('至少需要保留一个管理员');
        }

        // 2. 软删除
        return $this->dao->update($id, ['is_del' => 1]);
    }

    /**
     * 根据角色ID获取角色名称
     * @param array $roleIds
     * @return string
     */
    private function getRoleNames(array $roleIds): string
    {
        if (empty($roleIds)) {
            return '';
        }

        $roleNames = $this->dao->getRoleNames($roleIds);
        return implode(',', $roleNames);
    }
}
```

### 2.4 DAO层规范

**职责：**
1. 封装数据库查询逻辑
2. 构建查询条件
3. 防止SQL注入
4. 不提供业务逻辑
5. 返回原始数据或模型对象

**规范示例：**
```php
<?php
namespace app\dao\system;

use crmeb\basic\BaseDao;
use app\model\system\SystemAdmin;

class SystemAdminDao extends BaseDao
{
    /**
     * 设置模型
     * @return string
     */
    protected function setModel(): string
    {
        return SystemAdmin::class;
    }

    /**
     * 搜索条件构建
     * @param array $where
     * @return \think\Model
     */
    public function search(array $where = [])
    {
        // 基础查询（排除已删除）
        $query = $this->getModel()
            ->where('is_del', 0);

        // 关键词搜索
        if (!empty($where['keywords'])) {
            $query = $query->whereLike('account|real_name', "%{$where['keywords']}%");
        }

        // 状态筛选
        if ($where['status'] !== '') {
            $query = $query->where('status', $where['status']);
        }

        // 角色筛选
        if (!empty($where['role_id'])) {
            $query = $query->whereFindInSet('roles', $where['role_id']);
        }

        // 时间范围筛选
        if (!empty($where['start_time'])) {
            $query = $query->where('create_time', '>=', strtotime($where['start_time']));
        }
        if (!empty($where['end_time'])) {
            $query = $query->where('create_time', '<', strtotime($where['end_time']));
        }

        // 排序（默认按创建时间倒序）
        $query = $query->order('create_time DESC, id DESC');

        return $query;
    }

    /**
     * 根据账号获取管理员
     * @param string $account
     * @param int $exceptId
     * @return array|null
     */
    public function getAdminByAccount(string $account, int $exceptId = 0): ?array
    {
        $query = $this->getModel()
            ->where('account', $account)
            ->where('is_del', 0);

        if ($exceptId > 0) {
            $query = $query->where('id', '<>', $exceptId);
        }

        $admin = $query->find();
        return $admin ? $admin->toArray() : null;
    }

    /**
     * 统计管理员数量
     * @return int
     */
    public function count(): int
    {
        return $this->getModel()
            ->where('is_del', 0)
            ->count();
    }
}
```

### 2.5 模型层规范

**职责：**
1. 定义数据模型
2. 处理数据关系（关联查询）
3. 自动时间戳
4. 数据获取器和修改器

**规范示例：**
```php
<?php
namespace app\model\system;

use crmeb\basic\BaseModel;
use think\model\relation\BelongsToMany;

class SystemAdmin extends BaseModel
{
    // 数据表名
    protected $name = 'system_admin';

    // 主键
    protected $pk = 'id';

    // 自动时间戳（使用int类型存储时间戳）
    protected $autoWriteTimestamp = 'int';

    // 创建时间字段
    protected $createTime = 'create_time';

    // 更新时间字段
    protected $updateTime = 'update_time';

    // 软删除字段
    protected $deleteTime = 'delete_time';

    /**
     * 关联角色（多对多）
     * @return BelongsToMany
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            SystemRole::class,
            'system_admin_role',
            'role_id',
            'admin_id'
        );
    }

    /**
     * 密码修改器（自动加密）
     * @param string $value
     * @return string
     */
    public function setPwdAttr(string $value): string
    {
        return password_hash($value, PASSWORD_DEFAULT);
    }

    /**
     * 状态获取器
     * @param int $value
     * @return string
     */
    public function getStatusTextAttr(int $value, array $data): string
    {
        $status = [
            0 => '禁用',
            1 => '启用'
        ];
        return $status[$data['status']] ?? '未知';
    }

    /**
     * 最后登录时间获取器
     * @param int $value
     * @return string
     */
    public function getLastLoginTimeTextAttr(int $value): string
    {
        return $value ? date('Y-m-d H:i:s', $value) : '-';
    }
}
```

## 3. 注释规范

### 3.1 文件注释

```php
<?php
/**
 * CRMEB电商系统
 *
 * PHP版本: 7.1-7.4
 *
 * 文件描述: 管理员服务类
 * 主要功能: 处理管理员相关的业务逻辑
 *
 * @package app\services\system
 * @author CRMEB团队
 * @license Apache-2.0
 * @link https://www.crmeb.com
 * @since 2025-03-17
 */

namespace app\services\system;
```

### 3.2 类注释

```php
<?php
/**
 * 管理员服务类
 * 
 * 该类负责处理管理员相关的所有业务逻辑，包括：
 * - 管理员列表查询
 * - 管理员添加/编辑
 * - 管理员删除
 * - 管理员权限验证
 *
 * @package app\services\system
 */
class SystemAdminServices extends BaseServices
{
    // ...
}
```

### 3.3 方法注释

```php
<?php
/**
 * 获取管理员列表
 * 
 * 根据筛选条件查询管理员列表，支持分页、关键词搜索、状态筛选等
 * 
 * @param array $where 筛选条件
 *  - keywords: 关键词搜索（账号、姓名）
 *  - status: 状态筛选（0禁用，1启用）
 *  - role_id: 角色ID筛选
 * @param int $page 页码，默认为1
 * @param int $limit 每页数量，默认为10
 * @return array 返回包含列表数据和分页信息的数组
 *  - list: 管理员列表
 *  - count: 总数量
 *  - page: 当前页码
 *  - limit: 每页数量
 * @throws \think\db\exception\DataNotFoundException
 * @throws \think\db\exception\ModelNotFoundException
 * @throws \think\db\exception\DbException
 * 
 * @example
 * ```php
 * $services = new SystemAdminServices();
 * $result = $services->getAdminList([
 *     'keywords' => 'admin',
 *     'status' => 1
 * ], 1, 10);
 * ```
 */
public function getAdminList(array $where, int $page = 1, int $limit = 10): array
{
    // ...
}
```

### 3.4 复杂逻辑注释

```php
<?php
public function calculateOrderPrice($carts, $coupon = null, $useIntegral = false)
{
    // 1. 计算商品总价
    $totalPrice = array_sum(array_column($carts, 'price'));

    // 2. 应用优惠券优惠
    if ($coupon) {
        // 优惠券使用条件验证
        if ($totalPrice >= $coupon['use_min_price']) {
            $totalPrice -= $coupon['coupon_price'];  // 减去优惠券金额
            $totalPrice = max(0, $totalPrice);        // 确保不小于0
        }
    }

    // 3. 积分抵扣
    if ($useIntegral) {
        $integralPrice = $this->convertIntegralToPrice($userIntegral);
        $totalPrice -= $integralPrice;
        $totalPrice = max(0, $totalPrice);
    }

    // 4. 运费计算（满额包邮）
    if ($totalPrice < $freeShippingPrice) {
        $totalPrice += $shippingPrice;
    }

    return $totalPrice;
}
```

## 4. 数据库规范

### 4.1 表设计规范

**字段类型选择：**
```sql
-- 整数类型
TINYINT(1)      -- 状态字段（0/1）
SMALLINT        -- 小范围整数（如分类ID）
INT             -- 主键、用户ID、订单ID
BIGINT          -- 大数值（如雪花算法ID）

-- 小数类型
DECIMAL(10,2)   -- 金额、价格（精确计算）
FLOAT           -- 非精确小数（少用）
DOUBLE          -- 非精确大数值（少用）

-- 字符串类型
VARCHAR(255)    -- 短字符串（账号、名称、标题）
VARCHAR(500)    -- 中等长度（描述、简介）
TEXT            -- 长文本（商品详情、文章内容）

-- 时间类型
INT(11)         -- 时间戳（推荐，时区灵活）
DATETIME        -- 日期时间（可视性好）
DATE            -- 日期（仅日期）
TIME            -- 时间（仅时间）
```

### 4.2 索引设计

**必须添加索引的字段：**
```sql
-- 主键
PRIMARY KEY (id)

-- 外键
INDEX idx_user_id (user_id)
INDEX idx_order_id (order_id)

-- 查询条件字段
INDEX idx_status (status)
INDEX idx_is_del (is_del)
INDEX idx_create_time (create_time)

-- 组合索引（根据查询场景）
INDEX idx_user_status (user_id, status)
INDEX idx_create_type (create_time, type)
```

**索引使用原则：**
1. 为WHERE条件中的字段添加索引
2. 为ORDER BY排序字段添加索引
3. 为JOIN关联字段添加索引
4. 避免过多索引（影响写入性能）
5. 组合索引遵循最左前缀原则

### 4.3 SQL编写规范

**查询规范：**
```php
<?php
// ✅ 正确 - 使用查询构造器
$user = Db::name('user')
    ->where('id', $userId)
    ->where('status', 1)
    ->find();

// ✅ 正确 - 参数绑定（防SQL注入）
$users = Db::name('user')
    ->where('create_time', '>=', $startTime)
    ->where('create_time', '<', $endTime)
    ->where('status', $status)
    ->select();

// ❌ 错误 - 直接拼接SQL（SQL注入风险）
$sql = "SELECT * FROM eb_user WHERE id = $userId";
Db::query($sql);

// ❌ 错误 - 不使用参数绑定
Db::name('user')->where("id = $userId").find();
```

**避免SELECT *：**
```php
<?php
// ❌ 错误 - 查询所有字段
$users = Db::name('user')->select();

// ✅ 正确 - 只查询需要的字段
$users = Db::name('user')
    ->field('id, account, real_name, status, create_time')
    ->select();
```

## 5. API接口规范

### 5.1 路由定义

**路由文件：**
- 主路由：`route/app.php`
- 后台API路由：`route/adminapi.php`
- 前端API路由：`route/api.php`

**路由规范：**
```php
<?php
use think\facade\Route;

// ✅ 正确 - RESTful风格
Route::get('user/:id', 'User/read');      // 查询用户
Route::post('user', 'User/save');         // 创建用户
Route::put('user/:id', 'User/update');    // 更新用户
Route::delete('user/:id', 'User/delete'); // 删除用户

// ✅ 正确 - 路由分组
Route::group('user', function () {
    Route::get('list', 'User/get_list');    // 用户列表
    Route::get('info/:id', 'User/get_info'); // 用户信息
    Route::post('save', 'User/save');       // 保存用户
    Route::post('update', 'User/update');   // 更新用户
    Route::post('delete/:id', 'User/delete'); // 删除用户
})->middleware([AuthTokenMiddleware::class]);

// ❌ 避免 - 不规范的路由
Route::get('getUserList', 'User/getUserList');  // 无需get前缀
Route::post('doSaveUser', 'User/doSave');       // 无需do前缀
```

### 5.2 请求方法

**HTTP方法使用规范：**

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 查询数据 | GET /api/user/list |
| POST | 创建数据 | POST /api/user |
| PUT | 更新数据（完整更新）| PUT /api/user/:id |
| PATCH | 更新数据（部分更新）| PATCH /api/user/:id |
| DELETE | 删除数据 | DELETE /api/user/:id |

### 5.3 响应格式

**统一响应格式：**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

**成功响应示例：**
```php
<?php
// 返回成功，无数据
return app('json')->success();

// 返回成功，带数据
return app('json')->success($data);

// 返回成功，自定义消息
return app('json')->success('登录成功');

// 返回成功，带数据和消息
return app('json')->success($data, '获取成功');
```

**分页响应格式：**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "list": [],
    "count": 100,
    "page": 1,
    "limit": 10
  }
}
```

**错误响应格式：**
```json
{
  "code": 400,
  "msg": "错误信息",
  "data": null
}
```

```php
<?php
// 返回错误
return app('json')->fail('参数错误');

// 返回错误，带错误码
return app('json')->fail('用户不存在', 404);

// 抛出异常（框架自动处理）
throw new ValidateException('手机号格式错误');
throw new AuthException('请先登录', 401);
```

### 5.4 状态码定义

**系统状态码：**

| 状态码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 参数错误 |
| 401 | 未授权（未登录或token过期） |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 502 | 服务不可用 |

**业务状态码：**

| 状态码 | 说明 |
|--------|------|
| 1000 | 用户已存在 |
| 1001 | 账号或密码错误 |
| 1002 | 验证码错误 |
| 1003 | 用户已被禁用 |
| 2000 | 库存不足 |
| 2001 | 商品已下架 |
| 3000 | 订单不存在 |
| 3001 | 订单状态错误 |
| 4000 | 余额不足 |
| 5000 | 优惠券已过期 |

## 6. 性能优化

### 6.1 缓存使用

```php
<?php
use think\facade\Cache;

// 设置缓存（1小时）
Cache::set('user_' . $uid, $user, 3600);

// 获取缓存
$user = Cache::get('user_' . $uid);
if (!$user) {
    $user = User::find($uid);
    Cache::set('user_' . $uid, $user, 3600);
}

// 删除缓存
Cache::delete('user_' . $uid);

// 清空缓存
Cache::clear();

// 使用Redis缓存
Cache::store('redis')->set('key', $value, 3600);
```

### 6.2 数据库优化

**使用索引：**
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_user_id ON eb_order(user_id);
CREATE INDEX idx_create_time ON eb_order(create_time);
CREATE INDEX idx_status ON eb_order(status);

-- 组合索引
CREATE INDEX idx_user_status ON eb_order(user_id, status);
```

**避免N+1查询：**
```php
<?php
// 错误：循环中查询
foreach ($orders as $order) {
    $user = User::find($order['user_id']);  // N次查询
}

// 正确：预加载
$orders = Order::with('user')->select();  // 2次查询
```

### 6.3 队列使用

```php
<?php
// 将耗时任务放入队列
\think\facade\Queue::push(Job::class, $data, 'queue_name');

// 示例：发送短信通知
class SmsJob
{
    public function fire($job, $data)
    {
        try {
            // 发送短信
            \app\services\sms\SmsServices::send($data['phone'], $data['template'], $data['params']);
            
            // 成功删除任务
            $job->delete();
        } catch (\Exception $e) {
            // 失败记录日志
            \think\facade\Log::error('短信发送失败', [
                'phone' => $data['phone'],
                'error' => $e->getMessage()
            ]);
            
            // 根据失败次数决定重试或删除
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(60);  // 60秒后重试
            }
        }
    }
}
```

## 7. 安全规范

### 7.1 SQL注入防护

```php
<?php
// ✅ 正确 - 使用参数绑定
$user = Db::name('user')
    ->where('account', $account)
    ->where('status', 1)
    ->find();

// ❌ 错误 - SQL注入风险
$sql = "SELECT * FROM eb_user WHERE account = '$account'";
Db::query($sql);
```

### 7.2 XSS防护

```php
<?php
// 输入过滤
$input = htmlspecialchars($_GET['keyword'], ENT_QUOTES, 'UTF-8');

// 输出编码
echo htmlspecialchars($user['nickname'], ENT_QUOTES, 'UTF-8');
```

### 7.3 CSRF防护

```php
<?php
// 在表单中添加token
<input type="hidden" name="__token__" value="{:token()}">

// 验证token
if (!token_verify($request->post('__token__'))) {
    throw new ValidateException('非法请求');
}
```

### 7.4 敏感信息保护

```php
<?php
// 密码加密
$password = password_hash($plainPassword, PASSWORD_DEFAULT);

// 验证密码
if (password_verify($plainPassword, $hashedPassword)) {
    // 密码正确
}

// 敏感数据脱敏
$phone = substr_replace($phone, '****', 3, 4);
$idCard = substr_replace($idCard, '********', 6, 8);
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-17
