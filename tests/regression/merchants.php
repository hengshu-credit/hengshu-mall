<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
if (getenv('CRMEB_AUDIT_DATABASE')!=='crmeb_merchant_test') throw new RuntimeException('Use run-merchants.ps1: isolated database required');
function checkMerchant($name,$ok) { if (!$ok) throw new RuntimeException('FAIL: '.$name); echo 'PASS: '.$name.PHP_EOL; }
function rejectMerchant($name,callable $fn) { try { $fn(); } catch (crmeb\exceptions\AdminException $e) { checkMerchant($name,true); return; } throw new RuntimeException('FAIL: '.$name); }
function getLang($message,$replace=[]) { return $message; }
function sys_config($key,$default=null) { return $default; }
$testApp=new think\App(dirname(__DIR__,2).'/crmeb/');
$testApp->setRuntimePath(sys_get_temp_dir().'/merchant-tests/');
think\Container::setInstance($testApp);
function app($name=null) { global $testApp; return $name===null?$testApp:$testApp->make($name); }
function config($name,$default=null) { return app()->config->get($name,$default); }
function response($data='',int $code=200) { return think\Response::create($data,'html',$code); }
$db=new think\DbManager();
$db->setConfig(['default'=>'mysql','connections'=>['mysql'=>['type'=>'mysql','hostname'=>'127.0.0.1','hostport'=>3306,'database'=>'crmeb_merchant_test','username'=>'root','password'=>'merchant-test-only','charset'=>'utf8mb4','prefix'=>'test_','fields_strict'=>true]]]);
$testApp->instance('db',$db); think\Model::setDb($db);
$testApp->config->set(['default'=>'file','stores'=>['file'=>['type'=>'File','path'=>sys_get_temp_dir().'/merchant-cache/']]],'cache');
use think\facade\Db;
use app\services\merchant\MerchantInstaller;
use app\services\merchant\MerchantServices;
use app\services\merchant\MerchantData;
use app\services\merchant\MerchantVault;
$sql=file_get_contents(dirname(__DIR__,2).'/crmeb/public/install/crmeb.sql');
foreach (['system_menus','system_role','store_product','store_order','store_order_cart_info','store_seckill','store_bargain','store_combination','user'] as $table) {
    preg_match('/CREATE TABLE IF NOT EXISTS `eb_'.$table.'`.*?;/s',$sql,$match);
    Db::execute(str_replace('`eb_','`test_',$match[0]));
}
Db::name('system_menus')->insert(['id'=>1,'menu_path'=>'/product','menu_name'=>'商品','is_show_path'=>1,'auth_type'=>1]);
Db::name('store_product')->insert(['id'=>1,'store_name'=>'旧平台商品','mer_id'=>0]);
Db::name('store_product')->insert(['id'=>2,'store_name'=>'未知历史归属','mer_id'=>77]);
MerchantInstaller::menus(); MerchantInstaller::menus();
$platform=MerchantInstaller::platformId();
checkMerchant('one default platform merchant',Db::name('merchant_shop')->where('is_platform',1)->count()===1);
checkMerchant('known legacy products migrated',Db::name('store_product')->where('id',1)->value('seller_shop_id')==$platform);
checkMerchant('unknown nonzero legacy ownership preserved',Db::name('store_product')->where('id',2)->value('seller_shop_id')==0);
checkMerchant('one set of merchant menu entries',Db::name('system_menus')->where('unique_auth','admin-merchant-management')->count()===1);
$secret=['bank_account'=>'6222333344445555','identity_number'=>'private-identity'];
$cipher=MerchantVault::encrypt($secret);
checkMerchant('sensitive data encrypted and authenticated',strpos($cipher,$secret['bank_account'])===false && MerchantVault::decrypt($cipher)===$secret);
$privateDir=MerchantVault::directory();
$testApp->setRuntimePath(sys_get_temp_dir().'/merchant-tests/adminapi/');
checkMerchant('CLI and multi-app HTTP share private storage',MerchantVault::directory()===$privateDir);
rejectMerchant('tampering rejected',function () use ($cipher) { MerchantVault::decrypt(substr($cipher,0,-4).'AAAA'); });
$s=new MerchantServices();
$actor=['id'=>101,'kind'=>'admin','name'=>'测试管理员','source'=>'test','sensitive'=>true];
function merchantKey($name) { return str_pad($name,20,'_'); }
function merchantDocs($actor) {
    $ids=[];
    foreach (['contract','license'] as $kind) $ids[]=(int)Db::name('merchant_document')->insertGetId(['owner_id'=>$actor['id'],'owner_kind'=>$actor['kind'],'kind'=>$kind,'name'=>$kind.'.pdf','storage_name'=>bin2hex(random_bytes(24)).'.pdf','mime'=>'application/pdf','size'=>10,'sha256'=>str_repeat('a',64),'created_at'=>time()]);
    return $ids;
}
$profile=['name'=>'品牌旗舰店','type_id'=>2,'subject_kind'=>'company','subject_name'=>'测试公司','identity_number'=>'913300001234567890','representative'=>'王某','registered_address'=>'杭州市测试路1号','business_address'=>'杭州市测试路1号','contact_name'=>'李某','contact_phone'=>'13812345678','bank_account'=>'6222333344445555','bank_holder'=>'测试公司','bank_name'=>'测试银行','document_ids'=>merchantDocs($actor)];
$created=$s->saveShop(0,$profile,0,$actor,merchantKey('create-first'));
$id=$created['id'];
checkMerchant('new merchant starts as draft',$s->info($id,true)['audit_status']==='draft');
checkMerchant('repeat create request does not duplicate',$s->saveShop(0,$profile,0,$actor,merchantKey('create-first'))['id']===$id && Db::name('merchant_shop')->count()===2);
rejectMerchant('same request key cannot write different data',function () use ($s,$profile,$actor) { $s->saveShop(0,array_replace($profile,['name'=>'另一家']),0,$actor,merchantKey('create-first')); });
$changed=$s->saveShop($id,['contact_address'=>'宁波市新地址'],1,$actor,merchantKey('ordinary-change'));
checkMerchant('ordinary info recorded without review',count($s->histories($id,[],true)['list'])===2);
rejectMerchant('stale save rejected',function () use ($s,$id,$actor) { $s->saveShop($id,['name'=>'过期保存'],1,$actor,merchantKey('stale-save')); });
$historyCount=$s->histories($id,[],true)['count'];
$s->saveShop($id,['contact_address'=>'宁波市新地址'],$changed['version'],$actor,merchantKey('same-value'));
checkMerchant('unchanged save creates no event',$s->histories($id,[],true)['count']===$historyCount);
$submit=$s->submitShop($id,$changed['version'],$actor,merchantKey('submit-first'));
$app=$s->applicationInfo($submit['application_id'],true);
rejectMerchant('submitted snapshot cannot be edited',function () use ($s,$id,$submit,$actor) { $s->saveShop($id,['name'=>'试图覆盖审核'],$submit['version'],$actor,merchantKey('pending-edit')); });
$approved=$s->review((int)$app['id'],(int)$app['version'],'approved','资料一致',$actor,merchantKey('approve-first'));
$info=$s->info($id,true);
checkMerchant('approval creates verified subject and remains preparing',$info['subject_id']>0 && $info['audit_status']==='approved' && $info['state']==='preparing');
$s->review((int)$app['id'],(int)$app['version'],'approved','资料一致',$actor,merchantKey('approve-first'));
checkMerchant('repeated approval creates no extra subject',Db::name('merchant_subject')->count()===1);
$s->setState($id,$info['version'],'open',$actor,merchantKey('open-first'));
checkMerchant('approved open merchant usable',$s->info($id)['available']);
$info=$s->info($id,true);
$s->saveShop($id,['bank_account'=>'6222000099998888'],$info['version'],$actor,merchantKey('pending-bank'));
$info=$s->info($id,true);
checkMerchant('pending account never replaces effective account',$info['profile']['bank_account']==='6222333344445555' && $info['pending']['profile']['bank_account']==='6222000099998888');
$submit=$s->submitShop($id,$info['version'],$actor,merchantKey('submit-bank'));
$app=$s->applicationInfo($submit['application_id'],true);
$s->review((int)$app['id'],(int)$app['version'],'rejected','需要核对户名',$actor,merchantKey('reject-bank'));
checkMerchant('rejection preserves effective account',$s->info($id,true)['profile']['bank_account']==='6222333344445555');
$info=$s->info($id,true);
$s->saveShop($id,['bank_holder'=>'测试公司'],$info['version'],$actor,merchantKey('retry-bank-draft'));
$info=$s->info($id,true);
$submit=$s->submitShop($id,$info['version'],$actor,merchantKey('resubmit-bank'));
$app=$s->applicationInfo($submit['application_id'],true);
$s->withdraw((int)$app['id'],(int)$app['version'],$actor,merchantKey('withdraw-bank'));
checkMerchant('withdrawn edits remain available for correction',$s->info($id,true)['pending']['profile']['bank_account']==='6222000099998888');
$info=$s->info($id,true);
$submit=$s->submitShop($id,$info['version'],$actor,merchantKey('resubmit-bank-2'));
$app=$s->applicationInfo($submit['application_id'],true);
$s->review((int)$app['id'],(int)$app['version'],'approved','确认账户',$actor,merchantKey('approve-bank'));
checkMerchant('approval makes new account effective',$s->info($id,true)['profile']['bank_account']==='6222000099998888');
$publicHistory=json_encode($s->histories($id,[],false));
checkMerchant('history masks old and new sensitive values',strpos($publicHistory,'6222333344445555')===false && strpos($publicHistory,'6222000099998888')===false);
$limited=$actor; $limited['sensitive']=false;
rejectMerchant('basic editors cannot overwrite sensitive fields',function () use ($s,$id,$limited) { $s->saveShop($id,['bank_account'=>'123456789'],$s->info($id)['version'],$limited,merchantKey('sensitive-write')); });
rejectMerchant('basic editor cannot probe matching plaintext through save',function () use ($s,$id,$limited) { $s->saveShop($id,['bank_account'=>'6222000099998888'],$s->info($id)['version'],$limited,merchantKey('sensitive-probe')); });
$profile2=array_replace($profile,['name'=>'另一商户记录','document_ids'=>merchantDocs($actor)]);
$id2=$s->saveShop(0,$profile2,0,$actor,merchantKey('create-second'))['id'];
$submit=$s->submitShop($id2,1,$actor,merchantKey('submit-second'));
$app=$s->applicationInfo($submit['application_id'],true);
$s->review((int)$app['id'],(int)$app['version'],'approved','同主体',$actor,merchantKey('approve-second'));
checkMerchant('two merchant records share one legal subject',$s->info($id,true)['subject_id']===$s->info($id2,true)['subject_id'] && Db::name('merchant_subject')->count()===1);
$info=$s->info($id,true);
$s->saveShop($id,['representative'=>'赵某'],$info['version'],$actor,merchantKey('shared-subject-edit'));
$submit=$s->submitShop($id,$s->info($id)['version'],$actor,merchantKey('shared-subject-submit'));
$app=$s->applicationInfo($submit['application_id'],true);
checkMerchant('review shows exact affected merchants',count($app['affected_shops'])===2);
$s->review((int)$app['id'],(int)$app['version'],'approved','核对代表人',$actor,merchantKey('shared-subject-approve'));
checkMerchant('approved shared change visible in second merchant',$s->info($id2,true)['profile']['representative']==='赵某');
checkMerchant('shared change history visible in affected merchant',$s->histories($id2,['event_type'=>'audit'],true)['count']===2);
$type=$s->saveDictionary('type',0,['name'=>'工厂店'],0,$actor,merchantKey('new-neutral-type'));
checkMerchant('custom neutral types supported',$type['id']>3);
rejectMerchant('cannot delete referenced type',function () use ($s,$actor) { $s->deleteDictionary('type',2,1,$actor,merchantKey('delete-used-type')); });
$s->saveDictionary('type',2,['name'=>'中性分类','status'=>0],1,$actor,merchantKey('rename-disable-type'));
checkMerchant('type changes do not disable merchants',$s->info($id)['available']);
$s->saveShop($id,['remark'=>'保留停用类型'],$s->info($id)['version'],$actor,merchantKey('keep-disabled-type'));
rejectMerchant('new merchant cannot select disabled type',function () use ($s,$profile,$actor) { $s->saveShop(0,array_replace($profile,['document_ids'=>[]]),0,$actor,merchantKey('new-disabled-type')); });
$tag=$s->saveDictionary('tag',0,['name'=>'重点合作','color'=>'#336699'],0,$actor,merchantKey('new-tag'));
$s->saveShop($id,['tag_ids'=>[$tag['id']]],$s->info($id)['version'],$actor,merchantKey('assign-tag'));
checkMerchant('tag belongs only to specific merchant',count($s->info($id)['tags'])===1 && count($s->info($id2)['tags'])===0);
checkMerchant('tag filter counts merchant records',$s->list(['tag_ids'=>[$tag['id']]])['count']===1);
$s->setState($id,$s->info($id)['version'],'paused',$actor,merchantKey('pause-first'));
checkMerchant('pause makes merchant unavailable',!$s->info($id)['available']);
rejectMerchant('default platform cannot close',function () use ($s,$platform,$actor) { $s->setState($platform,$s->info($platform)['version'],'closed',$actor,merchantKey('close-platform')); });
$raw=Db::name('merchant_history')->column('payload');
checkMerchant('history database contains no plaintext sensitive fields',strpos(implode('',$raw),'6222333344445555')===false);
checkMerchant('keyword search uses real name query',$s->list(['keyword'=>'另一商户'])['count']===1);
checkMerchant('keyword SQL injection remains data',$s->list(['keyword'=>"' OR 1=1 --"])['count']===0);
checkMerchant('selector returns no private identity or bank fields',strpos(json_encode($s->options('品牌')),'bank_account')===false);

// Real private file storage and owner checks, using an isolated temporary directory.
$files=new app\services\merchant\MerchantDocuments();
$pdf=sys_get_temp_dir().'/merchant-test.pdf'; file_put_contents($pdf,"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n");
$user=['id'=>501,'kind'=>'user','name'=>'申请人','source'=>'user','sensitive'=>true];
$otherUser=array_replace($user,['id'=>502]);
Db::name('user')->insert(['uid'=>501,'account'=>'merchant-test-user','pwd'=>'test-only']);
$uploaded=$files->upload(new think\file\UploadedFile($pdf,'合作合同.pdf','application/pdf',0,true),'contract',0,$user);
$license=$files->upload(new think\file\UploadedFile($pdf,'登记证明.pdf','application/pdf',0,true),'license',0,$user);
checkMerchant('private upload exposes no storage path',!isset($uploaded['storage_name']) && !isset($uploaded['path']));
checkMerchant('owner can read original private file',file_get_contents($files->get((int)$uploaded['id'],$user)['path'])===file_get_contents($pdf));
rejectMerchant('other applicant cannot read private file',function () use ($files,$uploaded,$otherUser) { $files->get((int)$uploaded['id'],$otherUser); });
rejectMerchant('executable upload is rejected',function () use ($files,$pdf,$user) { $files->upload(new think\file\UploadedFile($pdf,'file.php','application/pdf',0,true),'contract',0,$user); });
$userProfile=array_replace($profile,['type_id'=>$type['id'],'name'=>'用户入驻记录','identity_number'=>'913300009999111122','subject_name'=>'另一测试公司','document_ids'=>[(int)$uploaded['id'],(int)$license['id']]]);
$userApp=$s->saveUserApplication(0,$userProfile,0,$user,merchantKey('user-create'));
rejectMerchant('applicant cannot read another application',function () use ($s,$userApp,$otherUser) { $s->applicationInfo($userApp['id'],true,$otherUser['id']); });
rejectMerchant('applicant cannot link another users files',function () use ($s,$userProfile,$otherUser) { $s->saveUserApplication(0,$userProfile,0,$otherUser,merchantKey('user-steal-files')); });
$userSubmitted=$s->submitUserApplication($userApp['id'],$userApp['version'],$user,merchantKey('user-submit'));
$approvedUser=$s->review($userApp['id'],$userSubmitted['version'],'approved','用户资料一致',$actor,merchantKey('user-approve'));
checkMerchant('public approval creates merchant once',Db::name('merchant_account_shop')->where(['uid'=>501,'shop_id'=>$approvedUser['id']])->count()===1);
checkMerchant('public application history linked after opening',$s->histories($approvedUser['id'],[],true)['count']===3);

// New product ownership and immutable order snapshots.
$s->setState($id,$s->info($id)['version'],'open',$actor,merchantKey('reopen-for-products'));
$products=app\services\merchant\MerchantProducts::class;
$draft=Db::transaction(function () use ($products,$id) { return $products::prepare(['seller_shop_id'=>$id,'is_show'=>0],0); });
Db::name('store_product')->insert(['id'=>20,'store_name'=>'商户商品','mer_id'=>0,'seller_shop_id'=>$draft['seller_shop_id'],'is_show'=>0]);
checkMerchant('product can select any neutral type',$draft['seller_shop_id']===$id);
$open=Db::transaction(function () use ($products) { return $products::prepare(['is_show'=>1],20); });
Db::name('store_product')->where('id',20)->update($open);
Db::name('store_product')->where('id',20)->update(['is_show'=>0]);
rejectMerchant('previously published product cannot change owner',function () use ($products,$id2) { Db::transaction(function () use ($products,$id2) { $products::prepare(['seller_shop_id'=>$id2,'is_show'=>0],20); }); });
Db::name('store_product')->where('id',20)->update(['is_show'=>1]);
$cart=[['product_id'=>20,'cart_num'=>1]];
$snapshot=Db::transaction(function () use ($products,&$cart) { return $products::orderSnapshot($cart); });
checkMerchant('order and item retain real merchant snapshot',$snapshot['seller_shop_id']===$id && (int)$cart[0]['merchant']['id']===$id);
checkMerchant('order snapshot contains no bank or document secrets',strpos($snapshot['merchant_snapshot'],'bank_account')===false && strpos($snapshot['merchant_snapshot'],'document_ids')===false);
$s->setState($id,$s->info($id)['version'],'paused',$actor,merchantKey('pause-for-products'));
$visible=$products::constrain(Db::name('store_product'))->column('id');
checkMerchant('consumer product query excludes paused merchants',!in_array(20,$visible) && in_array(1,$visible));
rejectMerchant('paused merchant cannot publish product',function () use ($products) { Db::transaction(function () use ($products) { $products::prepare(['is_show'=>1],20); }); });
try { $products::assertOrderPayable($snapshot+['paid'=>0]); throw new RuntimeException('payment should be rejected'); } catch (crmeb\exceptions\ApiException $e) { checkMerchant('payment is blocked for paused order merchant',true); }
checkMerchant('old snapshot is unchanged by pause',json_decode($snapshot['merchant_snapshot'],true)[0]['state']==='open');

// Explicit action permissions do not rely on the legacy permissive middleware.
class MerchantRoleProbe extends app\services\system\admin\SystemRoleServices {
    public $auth=[]; public function __construct() {}
    public function getRolesByAuth(array $rules,int $type=1,string $cachePrefix='') { return $this->auth; }
}
class MerchantPermissionProbe extends app\adminapi\controller\v1\merchant\MerchantManager {
    public function __construct(int $level) { $this->adminId=101; $this->adminInfo=['level'=>$level,'roles'=>[1]]; }
    public function can(string $action): bool { return $this->permits($action); }
}
$roles=new MerchantRoleProbe(); $testApp->instance(app\services\system\admin\SystemRoleServices::class,$roles);
$probe=new MerchantPermissionProbe(1);
checkMerchant('unassigned administrator cannot manage merchants',!$probe->can('save') && !$probe->can('files'));
$roles->auth=['get'=>['merchant/shop/list']];
checkMerchant('list permission does not grant files or sensitive data',$probe->can('list') && !$probe->can('sensitive') && !$probe->can('files') && !$probe->can('save'));
checkMerchant('platform root can manage merchants',(new MerchantPermissionProbe(0))->can('audit'));
$exportActor=$actor; $exportActor['sensitive']=false;
$exportResponse=$files->export($approvedUser['id'],$exportActor);
$archivePath=sys_get_temp_dir().'/merchant-test-export.zip'; file_put_contents($archivePath,$exportResponse->getData());
$archive=new ZipArchive(); $archive->open($archivePath);
$exportedProfile=$archive->getFromName('商户资料.json');
$exportedManifest=json_decode($archive->getFromName('资料目录.json'),true);
checkMerchant('private export contains manifest and original files',count($exportedManifest['files'])===2 && !$exportedManifest['missing']);
checkMerchant('export masks structured sensitive data without permission',strpos($exportedProfile,'6222333344445555')===false);
$archive->close();
checkMerchant('export access recorded in merchant history',$s->histories($approvedUser['id'],['event_type'=>'export'],true)['count']===1);
Db::execute('DROP TABLE test_merchant_document_relation');
Db::name('store_order')->insert(['id'=>91,'order_id'=>'MERCHANT-MIXED-TEST','mer_id'=>0,'seller_shop_id'=>0,'merchant_snapshot'=>json_encode([['id'=>$id],['id'=>$id2]])]);
MerchantInstaller::ensure(true);
checkMerchant('explicit reinstall repairs missing schema',Db::name('merchant_document_relation')->count()===0);
checkMerchant('reinstall preserves configured neutral type',Db::name('merchant_type')->where('id',2)->value('name')==='中性分类' && Db::name('merchant_shop')->where('is_platform',1)->count()===1);
checkMerchant('reinstall does not reclassify mixed merchant orders',Db::name('store_order')->where('id',91)->value('seller_shop_id')==0);
echo "Merchant workflow regression complete\n";
