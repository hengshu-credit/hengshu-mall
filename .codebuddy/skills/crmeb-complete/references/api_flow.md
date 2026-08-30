# API接口请求流程详解

## 1. API请求生命周期

### 1.1 请求流程图

```
客户端请求
    ↓
Nginx/Apache
    ↓
入口文件 (public/index.php)
    ↓
ThinkPHP应用初始化
    ↓
路由解析 (route/*.php)
    ↓
中间件处理 (app/http/middleware/)
    ↓
控制器 (app/*/controller/)
    ↓
服务层 (app/services/)
    ↓
DAO层 (app/dao/)
    ↓
模型层 (app/model/)
    ↓
数据库 (MySQL)
    ↓
返回响应
    ↓
JSON格式化
    ↓
客户端接收
```

### 1.2 请求处理详解

**步骤1：路由解析**
- 配置文件：`route/app.php`, `route/adminapi.php`, `route/api.php`
- 路由规则：支持GET、POST、PUT、DELETE等HTTP方法
- 路由分组：按模块分组，统一前缀

**步骤2：中间件处理**
- 权限验证：验证用户登录状态和权限
- 请求日志：记录请求日志
- 参数过滤：过滤非法参数
- 跨域处理：处理CORS跨域请求

**步骤3：控制器层**
- 接收参数：从GET/POST获取参数
- 参数验证：验证参数合法性
- 调用服务：调用服务层处理业务
- 返回响应：返回JSON格式数据

**步骤4：服务层**
- 业务逻辑：处理核心业务逻辑
- 数据验证：验证业务规则
- 调用DAO：调用DAO层操作数据库
- 事务管理：处理数据库事务
- 事件触发：触发系统事件

**步骤5：DAO层**
- 构建查询：构建SQL查询条件
- 执行查询：执行数据库操作
- 返回结果：返回查询结果

**步骤6：模型层**
- 数据映射：ORM对象关系映射
- 数据转换：自动转换数据类型
- 关联查询：处理表关联关系

## 2. API调用示例

### 2.1 用户登录API

**请求URL:**
```
POST /api/login
```

**请求参数:**
```json
{
  "account": "13800138000",
  "password": "123456",
  "type": "account"  // account:账号密码, mobile:手机验证码
}
```

**处理流程:**
```php
// 1. 路由定义 (route/api.php)
Route::post('login', 'api.Login/login');

// 2. 控制器 (app/api/controller/Login.php)
class Login
{
    public function login()
    {
        // 获取参数
        $data = $this->request->postMore([
            ['account', ''],
            ['password', ''],
            ['type', 'account']
        ]);
        
        // 调用登录服务
        $loginServices = app()->make(LoginServices::class);
        $token = $loginServices->login($data['account'], $data['password'], $data['type']);
        
        // 返回token
        return app('json')->success(['token' => $token]);
    }
}

// 3. 服务层 (app/services/user/LoginServices.php)
class LoginServices extends BaseServices
{
    public function login($account, $password, $type)
    {
        // 验证验证码（如果需要）
        // 查询用户
        $user = $this->dao->getUserByAccount($account);
        
        // 验证密码
        if (!password_verify($password, $user['pwd'])) {
            throw new ValidateException('密码错误');
        }
        
        // 生成token
        $token = $this->createToken($user['uid']);
        
        // 更新登录信息
        $this->dao->update($user['uid'], [
            'last_login_time' => time(),
            'last_login_ip' => request()->ip()
        ]);
        
        return $token;
    }
}
```

**响应结果:**
```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

### 2.2 商品列表API

**请求URL:**
```
GET /api/products
```

**请求参数:**
```
page: 1          // 页码
limit: 10        // 每页数量
category_id: 1   // 分类ID
keywords: "手机"  // 搜索关键词
sort: "id-desc"  // 排序方式
```

**处理流程:**
```php
// 1. 路由定义
Route::get('products', 'api.Product/get_list');

// 2. 控制器
class Product
{
    public function get_list()
    {
        // 获取参数
        $where = $this->request->getMore([
            ['page', 1],
            ['limit', 10],
            ['category_id', 0],
            ['keywords', ''],
            ['sort', 'id-desc']
        ]);
        
        // 调用服务层
        $productServices = app()->make(StoreProductServices::class);
        $list = $productServices->getProductList($where);
        
        return app('json')->success($list);
    }
}

// 3. 服务层
class StoreProductServices extends BaseServices
{
    public function getProductList(array $where)
    {
        // 构建查询条件
        $query = $this->dao->search($where);
        
        // 分页查询
        $list = $query->page($where['page'], $where['limit'])->select();
        
        // 处理数据
        foreach ($list as &$item) {
            $item['price'] = bcadd($item['price'], '0', 2);
            $item['image'] = $this->getImageUrl($item['image']);
        }
        
        return [
            'list' => $list,
            'count' => $query->count(),
            'page' => $where['page'],
            'limit' => $where['limit']
        ];
    }
}

// 4. DAO层
class StoreProductDao extends BaseDao
{
    public function search(array $where = [])
    {
        $query = $this->getModel()
            ->where('is_del', 0)
            ->where('is_show', 1);
        
        // 分类筛选
        if ($where['category_id']) {
            $query = $query->where('category_id', $where['category_id']);
        }
        
        // 关键词搜索
        if ($where['keywords']) {
            $query = $query->whereLike('name|keyword', "%{$where['keywords']}%");
        }
        
        // 排序
        [$field, $sort] = explode('-', $where['sort']);
        $query = $query->order($field, $sort);
        
        return $query;
    }
}
```

### 2.3 创建订单API

**请求URL:**
```
POST /api/order/create
```

**请求头:**
```
Authorization: Bearer {token}
```

**请求参数:**
```json
{
  "cart_id": "1,2,3",           // 购物车ID（多个用逗号分隔）
  "address_id": 10,             // 收货地址ID
  "pay_type": "wechat",         // 支付方式: wechat, alipay, yue
  "coupon_id": 5,               // 优惠券ID（可选）
  "mark": "尽快发货",           // 买家留言（可选）
  "use_integral": false         // 是否使用积分
}
```

**处理流程:**
```php
// 1. 路由定义
Route::post('order/create', 'api.Order/create')->middleware(AuthTokenMiddleware::class);

// 2. 中间件验证
class AuthTokenMiddleware
{
    public function handle($request, \Closure $next)
    {
        // 验证token
        $token = $request->header('Authorization');
        $user = $this->checkToken($token);
        
        // 将用户信息存入请求
        $request->user = $user;
        
        return $next($request);
    }
}

// 3. 控制器
class Order
{
    public function create()
    {
        // 获取当前用户
        $uid = $this->request->user['uid'];
        
        // 获取参数
        $data = $this->request->postMore([
            ['cart_id', ''],
            ['address_id', 0],
            ['pay_type', ''],
            ['coupon_id', 0],
            ['mark', ''],
            ['use_integral', false]
        ]);
        
        // 调用订单创建服务
        $orderServices = app()->make(StoreOrderCreateServices::class);
        $orderId = $orderServices->createOrder($uid, $data);
        
        return app('json')->success(['order_id' => $orderId]);
    }
}

// 4. 订单创建服务
class StoreOrderCreateServices extends BaseServices
{
    public function createOrder($uid, $data)
    {
        // 1. 参数验证
        $this->validateOrderData($data);
        
        // 2. 查询购物车
        $carts = $this->getCarts($uid, $data['cart_id']);
        
        // 3. 查询收货地址
        $address = $this->getAddress($uid, $data['address_id']);
        
        // 4. 验证优惠券
        $coupon = null;
        if ($data['coupon_id']) {
            $coupon = $this->validateCoupon($uid, $data['coupon_id']);
        }
        
        // 5. 计算订单金额
        $priceInfo = $this->computeOrderPrice($carts, $coupon, $data['use_integral']);
        
        // 6. 开启事务
        $this->transaction(function () use ($uid, $data, $carts, $address, $priceInfo) {
            // 6.1 创建订单
            $orderId = $this->createOrderRecord($uid, $data, $address, $priceInfo);
            
            // 6.2 创建订单商品
            $this->createOrderCartInfo($orderId, $carts);
            
            // 6.3 扣减库存
            $this->decrementStock($carts);
            
            // 6.4 清空购物车
            $this->clearCart($uid, $data['cart_id']);
            
            // 6.5 使用优惠券
            if ($data['coupon_id']) {
                $this->useCoupon($uid, $data['coupon_id'], $orderId);
            }
            
            // 6.6 触发订单创建事件
            event('order.create', ['order_id' => $orderId]);
            
            return $orderId;
        });
        
        // 7. 返回订单ID
        return $orderId;
    }
}
```

## 3. 统一响应格式

### 3.1 成功响应

**格式:**
```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

**示例:**
```php
// 返回成功，无数据
return app('json')->success();

// 返回成功，带数据
return app('json')->success($data);

// 返回成功，自定义消息
return app('json')->success('登录成功');

// 返回成功，带数据和消息
return app('json')->success($data, '获取成功');
```

### 3.2 分页响应

**格式:**
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

**示例:**
```php
// 构建分页数据
$data = [
    'list' => $list,
    'count' => $total,
    'page' => $page,
    'limit' => $limit
];

return app('json')->success($data);
```

### 3.3 错误响应

**格式:**
```json
{
  "code": 400,
  "msg": "错误信息",
  "data": null
}
```

**示例:**
```php
// 返回错误
return app('json')->fail('参数错误');

// 返回错误，带错误码
return app('json')->fail('用户不存在', 404);

// 抛出异常（框架自动捕获并返回错误）
throw new ValidateException('手机号格式错误');
throw new AuthException('登录已过期');
```

### 3.4 特殊状态码

**系统定义的状态码：**

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

## 4. 认证与授权

### 4.1 Token认证流程

```
1. 用户登录
2. 服务端验证账号密码
3. 生成JWT Token
4. 返回Token给客户端
5. 客户端存储Token（localStorage）
6. 后续请求携带Token（Header: Authorization: Bearer {token}）
7. 服务端验证Token
8. 返回请求数据
```

### 4.2 Token验证中间件

```php
<?php
namespace app\http\middleware;

use crmeb\exceptions\AuthException;

class AuthTokenMiddleware
{
    public function handle($request, \Closure $next)
    {
        // 获取Token
        $token = $request->header('Authorization');
        
        if (!$token) {
            throw new AuthException('请先登录', 401);
        }
        
        // 验证Token格式
        if (!preg_match('/Bearer\s+(.+)/', $token, $matches)) {
            throw new AuthException('Token格式错误', 401);
        }
        
        $jwt = $matches[1];
        
        // 验证JWT
        try {
            $payload = JWTAuth::decode($jwt);
        } catch (\Exception $e) {
            throw new AuthException('Token已过期', 401);
        }
        
        // 查询用户
        $user = \app\model\user\User::find($payload['uid']);
        if (!$user || $user['status'] == 0) {
            throw new AuthException('用户不存在或已被禁用', 401);
        }
        
        // 将用户信息存入请求
        $request->user = $user->toArray();
        
        return $next($request);
    }
}
```

### 4.3 路由中应用中间件

```php
<?php
use think\facade\Route;

// 需要登录的接口
Route::group('api/user', function () {
    Route::get('info', 'api.User/info');
    Route::post('update', 'api.User/update');
    Route::get('order/list', 'api.Order/get_user_order_list');
})->middleware([AuthTokenMiddleware::class]);

// 需要登录和权限验证的接口（后台管理）
Route::group('adminapi', function () {
    Route::get('dashboard', 'adminapi.Index/index');
    Route::get('user/list', 'adminapi.User/get_list');
})->middleware([AuthTokenMiddleware::class, CheckAdminMiddleware::class]);
```

## 5. 参数验证

### 5.1 控制器参数验证

```php
<?php
namespace app\api\controller;

class User
{
    public function update()
    {
        // 获取并验证参数
        $data = $this->request->postMore([
            ['nickname', '', '昵称长度应在2-20位之间', function($value) {
                return mb_strlen($value) >= 2 && mb_strlen($value) <= 20;
            }],
            ['avatar', '', '头像地址不能为空'],
            ['sex', 0, '性别格式错误', function($value) {
                return in_array($value, [0, 1, 2]);
            }]
        ]);
        
        // 业务处理...
    }
}
```

### 5.2 验证器类

```php
<?php
namespace app\validate;

use think\Validate;

class UserValidate extends Validate
{
    protected $rule = [
        'account' => 'require|length:2,20',
        'password' => 'require|length:6,20',
        'phone' => 'require|mobile',
        'email' => 'email',
        'code' => 'require|length:4,6'
    ];
    
    protected $message = [
        'account.require' => '账号不能为空',
        'account.length' => '账号长度应在2-20位之间',
        'password.require' => '密码不能为空',
        'password.length' => '密码长度应在6-20位之间',
        'phone.require' => '手机号不能为空',
        'phone.mobile' => '手机号格式错误',
        'email.email' => '邮箱格式错误',
        'code.require' => '验证码不能为空',
        'code.length' => '验证码长度错误'
    ];
    
    protected $scene = [
        'login' => ['account', 'password'],
        'register' => ['account', 'password', 'phone', 'code'],
        'update' => ['nickname', 'avatar', 'sex']
    ];
}
```

### 5.3 在控制器中使用验证器

```php
<?php
namespace app\api\controller;

use app\validate\UserValidate;

class User
{
    public function register()
    {
        // 验证参数
        $validate = new UserValidate();
        if (!$validate->scene('register')->check($this->request->post())) {
            return app('json')->fail($validate->getError());
        }
        
        // 业务处理...
    }
}
```

## 6. 错误处理

### 6.1 异常类型

**系统定义的异常类：**

```php
// 验证异常（参数错误）
throw new \crmeb\exceptions\ValidateException('参数验证失败');

// 授权异常（登录过期、无权限）
throw new \crmeb\exceptions\AuthException('请先登录', 401);

// 业务异常（通用业务错误）
throw new \crmeb\exceptions\AdminException('操作失败');

// 系统异常（服务器错误）
throw new \crmeb\exceptions\SystemException('系统错误');
```

### 6.2 全局异常处理

**异常处理配置:** `app/ExceptionHandle.php`

```php
<?php
namespace app;

use think\exception\Handle;
use think\exception\ValidateException;
use think\exception\HttpException;

class ExceptionHandle extends Handle
{
    public function render($request, \Throwable $e): \think\Response
    {
        // 验证异常
        if ($e instanceof ValidateException) {
            return app('json')->fail($e->getError(), 400);
        }
        
        // HTTP异常（404等）
        if ($e instanceof HttpException) {
            return app('json')->fail($e->getMessage(), $e->getStatusCode());
        }
        
        // 授权异常
        if ($e instanceof \crmeb\exceptions\AuthException) {
            return app('json')->fail($e->getMessage(), $e->getCode() ?: 401);
        }
        
        // 业务异常
        if ($e instanceof \crmeb\exceptions\AdminException) {
            return app('json')->fail($e->getMessage(), $e->getCode() ?: 400);
        }
        
        // 系统异常（生产环境不显示详细信息）
        if (app()->isDebug()) {
            return app('json')->fail($e->getMessage(), 500);
        } else {
            return app('json')->fail('系统错误，请稍后重试', 500);
        }
    }
}
```

## 7. 日志记录

### 7.1 记录业务日志

```php
<?php
// 记录一般日志
\think\facade\Log::info('用户登录成功', ['uid' => $uid, 'ip' => $ip]);

// 记录错误日志
\think\facade\Log::error('订单创建失败', ['uid' => $uid, 'error' => $error]);

// 记录调试日志
\think\facade\Log::debug('调试信息', ['data' => $data]);

// 指定日志通道
\think\facade\Log::channel('order')->info('订单日志', ['order_id' => $orderId]);
```

### 7.2 日志配置

**配置文件:** `config/log.php`

```php
<?php
return [
    // 默认日志通道
    'default' => env('log.channel', 'file'),
    
    // 日志通道
    'channels' => [
        'file' => [
            'type' => 'file',
            'path' => app()->getRuntimePath() . 'log/',
            'level' => ['info', 'error', 'warning'],
            'single' => false,  // 是否单文件日志
            'max_files' => 10,  // 最大文件数
        ],
        
        'order' => [
            'type' => 'file',
            'path' => app()->getRuntimePath() . 'log/order/',
            'level' => ['info', 'error'],
        ],
        
        'pay' => [
            'type' => 'file',
            'path' => app()->getRuntimePath() . 'log/pay/',
            'level' => ['info', 'error'],
        ]
    ]
];
```

## 8. 性能优化

### 8.1 数据库优化

**使用索引:**
```php
// 在DAO层中，为常用查询字段添加索引
$query = $this->getModel()
    ->where('uid', $uid)           // uid应添加索引
    ->where('status', 1)           // status应添加索引
    ->where('is_del', 0)           // is_del应添加索引
    ->order('id', 'desc');
```

**避免N+1查询:**
```php
// 错误示例：循环中查询
foreach ($orders as $order) {
    $user = User::find($order['uid']);  // 每次循环都查询数据库
}

// 正确示例：预加载
$orders = Order::with('user')->select();  // 一次查询关联数据
```

### 8.2 缓存使用

```php
<?php
use think\facade\Cache;

// 设置缓存
Cache::set('user_' . $uid, $user, 3600);  // 缓存1小时

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

// 使用Redis缓存（推荐）
Cache::store('redis')->set('key', $value, 3600);
```

### 8.3 队列使用

```php
<?php
// 将耗时任务放入队列
\think\facade\Queue::push(Job::class, $data, $queue);

// 示例：订单创建后发送通知
class OrderJob
{
    public function fire($job, $data)
    {
        // 发送短信通知
        \app\services\sms\SmsServices::send($data['phone'], 'order_success', [
            'order_sn' => $data['order_sn']
        ]);
        
        // 发送模板消息（微信）
        \app\services\wechat\WechatTemplateServices::sendOrderSuccess($data);
        
        // 处理完成删除任务
        $job->delete();
    }
}
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-17
