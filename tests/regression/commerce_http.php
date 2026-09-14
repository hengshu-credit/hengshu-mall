<?php
/** Loopback HTTP server: real route files, JWT verification, DB identities/roles and middleware.
 * Endpoint bodies are read-only sentinels to avoid exercising unrelated business providers.
 */
require __DIR__.'/commerce_bootstrap.php';
use think\facade\Db;
function request(){return app()->request;}
function filter_str($value){return $value;}
$testApp->setNamespace('app\\adminapi');
$testApp->http->name('adminapi');
$testApp->config->set(['url_route_must'=>true,'route_complete_match'=>true,'url_convert'=>false],'route');
$testApp->config->set(['token_name'=>'Authori-zation','header'=>[]],'cookie');
$testApp->config->set(['default'=>'file','channels'=>['file'=>['type'=>'File','path'=>sys_get_temp_dir().'/crmeb-hardening-http-log/']]],'log');
$testApp->env->set(['app'=>['app_key'=>'isolated-http-jwt-key-not-a-production-secret']]);
$testApp->instance('request',app\Request::__make($testApp));
$testApp->bind(think\exception\Handle::class,app\adminapi\AdminApiExceptionHandle::class);
$testApp->instance('json',new class {
    public function success($data=[]){return think\Response::create(['status'=>200,'data'=>$data],'json');}
    public function make($status,$msg,$data=[]){return think\Response::create(['status'=>$status,'msg'=>$msg,'data'=>$data],'json');}
    public function fail($msg,$data=[]){return $this->make(400,$msg,$data);}
});
class HttpControllerSentinel {
    private $kind; public function __construct($kind){$this->kind=$kind;}
    public function index(){return $this->body();}
    public function lst(){return $this->body();}
    public function refund_update($id){return $this->body();}
    public function body(){return think\Response::create(['status'=>200,'kind'=>$this->kind,'admin_id'=>request()->adminId()],'json');}
}
foreach(['app\\adminapi\\controller\\v1\\finance\\UserRecharge'=>'finance','app\\adminapi\\controller\\v1\\order\\StoreOrder'=>'order','app\\adminapi\\controller\\v1\\user\\User'=>'user']as $class=>$kind)$testApp->bind($class,function()use($kind){return new HttpControllerSentinel($kind);});
if(PHP_SAPI==='cli'&&($argv[1]??'')==='seed'){
    hardeningSchema();
    foreach(['system_menus','system_role','system_admin']as $table)Db::name($table)->where('1=1')->delete();
    foreach(['finance/recharge','order/list','user/user']as $i=>$path)Db::name('system_menus')->insert(['id'=>$i+1,'auth_type'=>2,'api_url'=>$path,'methods'=>'GET']);
    Db::name('system_menus')->insert(['id'=>4,'auth_type'=>2,'api_url'=>'finance/recharge/<id>','methods'=>'PUT']);
    Db::name('system_role')->insert(['id'=>1,'role_name'=>'read-fixtures','rules'=>'1,2,3','status'=>1]);
    Db::name('system_role')->insert(['id'=>2,'role_name'=>'refund-fixtures','rules'=>'4','status'=>1]);
    foreach([[1,1,''],[2,1,'1'],[3,1,'2'],[4,0,'']]as [$id,$level,$roles])Db::name('system_admin')->insert(['id'=>$id,'account'=>'synthetic-'.$id,'pwd'=>'synthetic-password-hash','level'=>$level,'roles'=>$roles,'status'=>1,'is_del'=>0]);
    crmeb\services\CacheService::clearAll();
    $tokens=[];
    foreach([1,2,3,4]as $id)$tokens[$id]=(new crmeb\utils\JwtAuth)->createToken($id,'admin',['pwd'=>md5('synthetic-password-hash')])['token'];
    $tokens['consumer']=(new crmeb\utils\JwtAuth)->createToken(1,'api')['token'];
    echo json_encode($tokens);exit;
}
try {
    $response=$testApp->route->dispatch(request(),function(){
        foreach(['finance','order','user']as $file)require dirname(__DIR__,2).'/crmeb/app/adminapi/route/'.$file.'.php';
        // Known route with missing metadata must be denied, including CRUD.
        think\facade\Route::get('crud/unregistered',function(){return think\Response::create(['status'=>200],'json');})
            ->middleware([app\adminapi\middleware\AdminAuthTokenMiddleware::class,app\adminapi\middleware\AdminCheckRoleMiddleware::class]);
    });
    $response->send();
}catch(crmeb\exceptions\AuthException $e){http_response_code($e->getCode()===401?401:403);header('Content-Type: application/json');echo json_encode(['status'=>http_response_code(),'msg'=>$e->getMessage()]);}
catch(think\exception\RouteNotFoundException $e){http_response_code(404);echo '{}';}
catch(Throwable $e){http_response_code(500);header('Content-Type: application/json');echo json_encode(['error'=>get_class($e),'message'=>$e->getMessage()]);}
