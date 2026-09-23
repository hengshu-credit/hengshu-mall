<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
use app\services\activity\ranking\RankingConfig as Config;
use app\services\activity\ranking\RankingInstaller as Installer;
use app\services\activity\ranking\RankingServices;
use app\services\merchant\MerchantInstaller;
use app\services\merchant\MerchantVault;
use think\facade\Db;
function getLang($value,$replace=[]) { return $value; }
function sys_config($key,$default=null) { return $default; }
function set_file_url($url) { return $url; }
function checkRank($name,$ok) { if (!$ok) throw new RuntimeException('FAIL: '.$name); echo 'PASS: '.$name.PHP_EOL; }
function rejectRank($name,callable $fn) { try { $fn(); } catch(crmeb\exceptions\AdminException $e) { checkRank($name,true);return; } throw new RuntimeException('FAIL: '.$name); }
$base=['name'=>'近30天畅销榜','entity_type'=>'product','enabled'=>1,'top_n'=>2,'window_days'=>30,'metrics'=>[['field'=>'sales','direction'=>'desc','weight'=>100]]];
$rule=Config::validate($base);
foreach ([['top_n'=>0],['priority'=>-1],['enabled'=>true],['entity_type'=>'sql'],['window_days'=>8],['end_time'=>100,'start_time'=>200],['metrics'=>[['field'=>'sales','weight'=>20]]],['conditions'=>[['field'=>'name','op'=>'in','value'=>[]]]],['adjustments'=>[['id'=>1,'factor'=>2,'reason'=>'']]],['adjustments'=>[['id'=>1,'factor'=>INF,'reason'=>'bad']]]] as $bad) rejectRank('invalid configuration rejected',function()use($base,$bad){Config::validate(array_replace($base,$bad));});
$pool=[['id'=>1,'name'=>'A','sales'=>10,'reviews'=>1,'rating'=>100],['id'=>2,'name'=>'B','sales'=>20,'reviews'=>1,'rating'=>0],['id'=>3,'name'=>'C','sales'=>30,'reviews'=>0,'rating'=>0]];
checkRank('single metric selects TOP N',array_column(Config::rank($pool,$rule)['list'],'id')===[3,2]);
$precisionRule=$rule; $precisionRule['top_n']=3;
checkRank('close raw values retain ordering before display rounding',array_column(Config::rank([['id'=>1,'sales'=>1],['id'=>2,'sales'=>2],['id'=>3,'sales'=>10000000000]],$precisionRule)['list'],'id')===[3,2,1]);
$boost=Config::validate($base+['adjustments'=>[['id'=>1,'factor'=>1,'bonus'=>100,'reason'=>'运营推荐']]]);
checkRank('boost applied before TOP N cutoff',array_column(Config::rank($pool,$boost)['list'],'id')===[3,1]);
$excluded=Config::validate(array_replace($boost,['exclude_ids'=>[1],'conditions'=>[['field'=>'sales','op'=>'gte','value'=>20]]]));
checkRank('boost cannot bypass exclusion or conditions',array_column(Config::rank($pool,$excluded)['list'],'id')===[3,2]);
$all=Config::validate($base+['conditions'=>[['field'=>'sales','op'=>'gte','value'=>30],['field'=>'name','op'=>'contains','value'=>'A']]]);
checkRank('all conditions intersect',Config::rank($pool,$all)['candidate_count']===0);
$all['match_mode']='any'; checkRank('any conditions union',Config::rank($pool,$all)['candidate_count']===2);
$composite=Config::validate(array_replace($base,['sort_mode'=>'composite','metrics'=>[['field'=>'sales','direction'=>'desc','weight'=>50],['field'=>'rating','direction'=>'desc','weight'=>50]]]));
checkRank('composite normalization and deterministic tie',array_column(Config::rank($pool,$composite)['list'],'id')===[1,3]);
$smoothed=Config::validate(array_replace($base,['rating_min_reviews'=>3,'metrics'=>[['field'=>'rating','direction'=>'desc','weight'=>100]]]));
checkRank('rating minimum sample smooths small reviewed candidates and keeps no-review candidates at zero',Config::rank([['id'=>1,'reviews'=>1,'rating'=>100],['id'=>2,'reviews'=>10,'rating'=>80],['id'=>3,'reviews'=>0,'rating'=>0]],$smoothed)['list'][0]['id']===2);
checkRank('end time exclusive',Config::status(['enabled'=>1,'start_time'=>0,'end_time'=>100],100)==='ended');
checkRank('empty pool supported',Config::rank([],$rule)===['list'=>[],'candidate_count'=>0]);
function rankingDecoration($appearance) { return app\services\diy\RankingDecorationConfig::validatePage(['value'=>[['name'=>'marketingRanking','rankingId'=>1,'limit'=>10,'appearance'=>$appearance]]]); }
checkRank('legacy decoration without style schema remains valid',is_array(rankingDecoration([])));
$canvasFixtures=json_decode(file_get_contents(dirname(__DIR__,2).'/.build/ranking-review/canvas-fixtures.json'),true);
foreach($canvasFixtures as $type=>$scene)checkRank('full-element preset accepted: '.$type,is_array(rankingDecoration(['preset'=>$type,'canvas'=>$scene])));
$unsafe=$canvasFixtures['tmall_product'];$unsafe['header']['nodes'][0]['style']['opacity']=2;rejectRank('invalid canvas numeric styles rejected',function()use($unsafe){rankingDecoration(['canvas'=>$unsafe]);});
$unsafe=$canvasFixtures['tmall_product'];$unsafe['card']['nodes'][0]['binding']='user.password';rejectRank('canvas binding restricted to public fields',function()use($unsafe){rankingDecoration(['canvas'=>$unsafe]);});
$unsafe=$canvasFixtures['tmall_product'];$unsafe['header']['nodes'][1]['image']='javascript:alert(1)';rejectRank('unsafe canvas assets rejected',function()use($unsafe){rankingDecoration(['canvas'=>$unsafe]);});
checkRank('new commerce and shop presentation properties can be saved',is_array(rankingDecoration(['cardLayout'=>'commerce','panel'=>['color'=>'#eeeeee'],'panelPadding'=>8,'commerce'=>['color'=>'#fff5eb','paddingX'=>12,'paddingY'=>9,'reverse'=>false],'content'=>['showStars'=>true,'starSize'=>12,'starColor'=>'#ff7700','starEmptyColor'=>'#dddddd','showType'=>true,'showShopDescription'=>true,'highlightMetric'=>'score','highlightLabel'=>'综合得分','highlightPadding'=>6,'highlightRadius'=>5,'highlightSize'=>12],'ranks'=>['top1'=>['badge'=>['shape'=>'shield','stacked'=>true,'text'=>'TOP {rank:02}','labelSize'=>8,'numberSize'=>20]]]])));
checkRank('valid independent tier styles accepted',is_array(rankingDecoration(['ranks'=>['top1'=>['card'=>['mode'=>'solid','color'=>'#112233','borderWidth'=>2],'badge'=>['shape'=>'ribbon','visible'=>true,'fontSize'=>18]]]])));
foreach ([['layout'=>'unknown'],['content'=>['imageWidth'=>500]],['content'=>['order'=>['name','name','metrics','button']]],['header'=>['surface'=>['image'=>'javascript:alert(1)']]],['ranks'=>['top1'=>['badge'=>['customImage'=>'//evil.example/a.png']]]],['ranks'=>['top1'=>['card'=>['color'=>'red;position:fixed']]]],['separateTop'=>1],['ranges'=>[['from'=>4,'to'=>8,'style'=>[]],['from'=>7,'to'=>10,'style'=>[]]]]] as $bad) rejectRank('invalid decoration rejected',function()use($bad){rankingDecoration($bad);});
if (getenv('CRMEB_AUDIT_DATABASE')!=='crmeb_ranking_audit') throw new RuntimeException('Use run-rankings.ps1');
$testApp=new think\App(dirname(__DIR__,2).'/crmeb/'); $testApp->setRuntimePath(sys_get_temp_dir().'/ranking-audit/'); think\Container::setInstance($testApp);
function app($name=null){global $testApp;return $name===null?$testApp:$testApp->make($name);}
function config($name,$default=null){return app()->config->get($name,$default);}
$db=new think\DbManager();$db->setConfig(['default'=>'mysql','connections'=>['mysql'=>['type'=>'mysql','hostname'=>'127.0.0.1','hostport'=>3306,'database'=>'crmeb_ranking_audit','username'=>'root','password'=>'ranking-audit-only','charset'=>'utf8mb4','prefix'=>'test_','fields_strict'=>true]]]);
$testApp->instance('db',$db);$testApp->config->set(['default'=>'file','stores'=>['file'=>['type'=>'File','path'=>sys_get_temp_dir().'/ranking-audit-cache/']]],'cache');think\Model::setDb($db);(new think\service\ModelService($testApp))->boot();
$schema=file_get_contents(dirname(__DIR__,2).'/crmeb/public/install/crmeb.sql');
foreach(['system_menus','system_role','store_product','store_order','store_order_cart_info','store_category','store_product_label','store_product_reply','theme','store_product_attr','store_product_protection','store_seckill','store_bargain','store_combination','user','user_group','user_label','user_label_relation','system_user_level'] as $table){preg_match('/CREATE TABLE IF NOT EXISTS `eb_'.$table.'`.*?;/s',$schema,$match);Db::execute(str_replace('`eb_','`test_',$match[0]));}
Db::name('system_menus')->insert(['id'=>1,'menu_path'=>'/marketing','menu_name'=>'营销','is_show_path'=>1,'auth_type'=>1]);
Installer::install();Installer::install();checkRank('custom prefix install idempotent',Db::name('system_menus')->whereLike('unique_auth','marketing-ranking-%')->count()===11);
MerchantInstaller::ensure(); $platform=MerchantInstaller::platformId();
Db::name('store_category')->insertAll([['id'=>1,'pid'=>0,'cate_name'=>'父分类'],['id'=>2,'pid'=>1,'cate_name'=>'子分类']]);
Db::name('store_product')->insertAll([
 ['id'=>1,'store_name'=>'A','is_show'=>1,'cate_id'=>'2','price'=>100,'stock'=>10,'seller_shop_id'=>$platform],
 ['id'=>2,'store_name'=>'B','is_show'=>1,'cate_id'=>'2','price'=>200,'stock'=>20,'seller_shop_id'=>$platform],
 ['id'=>3,'store_name'=>'C','is_show'=>1,'cate_id'=>'','price'=>300,'stock'=>30,'seller_shop_id'=>$platform],
 ['id'=>4,'store_name'=>'D hidden','is_show'=>0,'cate_id'=>'','price'=>400,'stock'=>40,'seller_shop_id'=>$platform],
]);
$now=time();
foreach ([[1,1,10,0,0,$now-60],[2,2,20,0,0,$now-60],[3,3,30,0,0,$now-60],[4,4,9999,0,0,$now-60],[5,1,999,0,-1,$now-60],[6,1,999,1,0,$now-60],[7,1,999,0,0,$now-40*86400]] as $fixture) {
 [$id,$product,$qty,$refund,$pid,$paidAt]=$fixture;
 Db::name('store_order')->insert(['id'=>$id,'order_id'=>'rank-test-'.$id,'unique'=>'rank-test-'.$id,'paid'=>1,'pay_time'=>$paidAt,'pid'=>$pid,'refund_status'=>$refund]);
 Db::name('store_order_cart_info')->insert(['oid'=>$id,'product_id'=>$product,'cart_num'=>$qty,'unique'=>'rank-test-'.$id]);
}
Db::name('store_order')->insert(['id'=>8,'order_id'=>'unpaid','unique'=>'unpaid','paid'=>0]);Db::name('store_order_cart_info')->insert(['oid'=>8,'product_id'=>1,'cart_num'=>999,'unique'=>'unpaid']);
$services=app()->make(RankingServices::class);
$id=$services->saveRanking(0,$base); $info=$services->info($id);
checkRank('one dedicated micro page created with bound ranking component',$info['page_id']>0 && json_decode(Db::name('theme')->where('id',$info['page_id'])->value('home_data'),true)['value']['1000']['rankingId']===$id);
$pageData=json_decode(Db::name('theme')->where('id',$info['page_id'])->value('home_data'),true);
$pageData['value']['1000']['appearance']=['layout'=>'podium','gap'=>12,'separateTop'=>true,'header'=>['titleColor'=>'#123456','surface'=>['mode'=>'gradient','color'=>'#112233','color2'=>'#445566','angle'=>90]],'ranks'=>['top1'=>['badge'=>['shape'=>'image','customImage'=>'/uploads/medal.png','showText'=>true],'card'=>['borderWidth'=>3,'borderColor'=>'#abcdef']]],'ranges'=>[['from'=>4,'to'=>10,'style'=>['card'=>['color'=>'#eeeeee']]]]];
app()->make(app\services\diy\ThemeServices::class)->saveTheme($info['page_id'],['type'=>'home','value'=>$pageData,'tid'=>0,'title'=>'独立装修标题','page_type'=>'micro']);
checkRank('decoration style persists through actual theme service unchanged',json_decode(Db::name('theme')->where('id',$info['page_id'])->value('home_data'),true)['value']['1000']['appearance']===$pageData['value']['1000']['appearance']);
checkRank('decoration does not change marketing rule configuration',!isset($services->info($id)['appearance']) && $services->info($id)['top_n']===2);
$pageData['value']['1000']['appearance']=['canvas'=>$canvasFixtures['tmall_product']];
app()->make(app\services\diy\ThemeServices::class)->saveTheme($info['page_id'],['type'=>'home','value'=>$pageData,'tid'=>0,'title'=>'全元素榜单','page_type'=>'micro']);
checkRank('complete canvas survives database save and reload exactly',json_decode(Db::name('theme')->where('id',$info['page_id'])->value('home_data'),true)['value']['1000']['appearance']['canvas']===$canvasFixtures['tmall_product']);
$result=$services->publicRanking($id);
checkRank('real paid quantities exclude parent refunded unpaid old orders',array_column($result['list'],'id')===[3,2] && $services->preview($base)['candidate_count']===3);
$salesPreview=$services->preview(array_replace($base,['top_n'=>3]));$salesById=[];foreach($salesPreview['list'] as $entry)$salesById[$entry['id']]=$entry['sales'];
checkRank('partial refunds remove refunded units instead of dropping the whole paid order',($salesById[1]??0)===1008);
checkRank('public data does not disclose boosts or filter internals',!isset($result['list'][0]['adjustment']) && !isset($result['ranking']['conditions']));
checkRank('product outside TOP N has no badge',$services->productRankings(1)===[]);
$priority=$services->saveRanking(0,array_replace($base,['name'=>'优先推荐榜','priority'=>50,'top_n'=>3]));
checkRank('equal placements choose the higher priority ranking',$services->productRankings(2)[0]['id']===$priority);
checkRank('detail always returns one matching product ranking',array_column($services->productRankings(2,5),'id')===[$priority]);
$extra=[];
for($i=0;$i<6;$i++)$extra[]=$services->saveRanking(0,array_replace($base,['name'=>'优先但名次较低榜'.$i,'priority'=>100+$i,'top_n'=>3]));
$highest=$services->saveRanking(0,array_replace($base,['name'=>'名次最高榜','priority'=>0,'exclude_ids'=>[3]]));
$best=$services->productRankings(2,5);
checkRank('highest placement wins even after more than five higher priority matches',count($best)===1 && $best[0]['id']===$highest && $best[0]['rank']===1);
checkRank('selection priority is not exposed in public badge data',!isset($best[0]['_priority']));
$highestPage=$services->info($highest)['page_id'];$hidden=json_decode(Db::name('theme')->where('id',$highestPage)->value('home_data'),true);$hidden['is_show']=0;Db::name('theme')->where('id',$highestPage)->update(['home_data'=>json_encode($hidden)]);
checkRank('hidden highest ranking falls back to the next eligible placement',$services->productRankings(2)[0]['id']===$extra[5]);
foreach($extra as $extraId)$services->setEnabled($extraId,0);
$services->setEnabled($highest,0);
$services->setEnabled($priority,0);checkRank('disable falls through immediately',$services->productRankings(2)[0]['id']===$id);
$edit=$services->info($id);$edit['name']='编辑榜';$services->saveRanking($id,$edit);
checkRank('editing keeps the dedicated page',$services->info($id)['page_id']===$info['page_id']);
rejectRank('concurrent stale save rejected',function()use($services,$id,$edit){$services->saveRanking($id,$edit);});
$cat=Config::validate(array_replace($base,['conditions'=>[['field'=>'category_ids','op'=>'in','value'=>[1]]]]));
checkRank('parent category includes descendants',array_column($services->preview($cat)['list'],'id')===[2,1]);
$shopId=$services->saveRanking(0,array_replace($base,['entity_type'=>'shop','priority'=>100]));
$shopResult=$services->publicRanking($shopId);
checkRank('shop metrics aggregate current eligible products',$shopResult['list'][0]['sales']===60 && $shopResult['list'][0]['product_count']===3);
checkRank('shop leaderboard includes eligible nested products ordered by sales',array_column($shopResult['list'][0]['products'],'id')===[3,2,1] && !isset($shopResult['list'][0]['products'][0]['stock']));
Db::name('store_product_reply')->insertAll(array_map(function($row){return array_replace(['is_del'=>0,'comment'=>''],$row);},[
 ['oid'=>1,'unique'=>'rank-r1','product_id'=>1,'product_score'=>5,'status'=>1,'add_time'=>$now,'comment'=>'公开评价摘要'],
 ['oid'=>2,'unique'=>'rank-r2','product_id'=>1,'product_score'=>1,'status'=>1,'add_time'=>$now],
 ['oid'=>3,'unique'=>'rank-r3','product_id'=>2,'product_score'=>5,'status'=>1,'add_time'=>$now],
 ['oid'=>4,'unique'=>'rank-r4','product_id'=>2,'product_score'=>1,'status'=>0,'add_time'=>$now],
 ['oid'=>5,'unique'=>'rank-r5','product_id'=>2,'product_score'=>1,'status'=>1,'is_del'=>1,'add_time'=>$now],
 ['oid'=>6,'unique'=>'rank-r6','product_id'=>2,'product_score'=>1,'status'=>1,'add_time'=>$now-40*86400],
 ['oid'=>7,'unique'=>'rank-r7','product_id'=>2,'product_score'=>0,'status'=>1,'add_time'=>$now],
 ]));
$ratedShop=$services->publicRanking($shopId)['list'][0];
checkRank('shop star score uses weighted valid reviews in selected period',abs($ratedShop['rating_score']-3.7)<0.001);
checkRank('public shop card exposes only display fields',array_key_exists('type_name',$ratedShop) && !isset($ratedShop['score_total']) && !isset($ratedShop['rated_count']));
checkRank('shop rankings do not count as this product being ranked',$services->productRankings(1)===[]);
$pageId=$services->info($id)['page_id'];$page=json_decode(Db::name('theme')->where('id',$pageId)->value('home_data'),true);$page['is_show']=0;Db::name('theme')->where('id',$pageId)->update(['home_data'=>json_encode($page)]);
checkRank('hidden landing page suppresses detail badge',$services->productRankings(2)===[]);
$page['is_show']=1;Db::name('theme')->where('id',$pageId)->update(['home_data'=>json_encode($page)]);
Db::name('store_product')->where('id',3)->update(['is_show'=>0]);checkRank('unlisted product removed immediately',array_column($services->publicRanking($id)['list'],'id')===[2,1]);checkRank('approved review excerpt is bound without buyer identity',$services->publicRanking($id)['list'][1]['review_excerpt']==='公开评价摘要');
$closed=Db::name('merchant_shop')->insertGetId(['name'=>'Closed','code'=>'CLOSED','state'=>'closed','audit_status'=>'approved','profile'=>MerchantVault::encrypt([])]);Db::name('store_product')->where('id',2)->update(['seller_shop_id'=>$closed]);
checkRank('closed shops and their products excluded',array_column($services->publicRanking($id)['list'],'id')===[1] && $services->productRankings(2)===[]);
$services->deleteRanking($id);checkRank('deleting ranking preserves independently decorated page',Db::name('theme')->where('id',$info['page_id'])->where('is_del',0)->count()===1);
// Personalized conditions use the current viewer and correlate each shop's product predicates.
Db::name('store_product')->whereIn('id',[1,2,3])->update(['is_show'=>1,'seller_shop_id'=>$platform]);
Db::name('store_product')->where('id',1)->update(['params_list'=>json_encode([['name'=>'材质','value'=>'棉']]),'protection_list'=>'1','label_list'=>'1']);
Db::name('store_product')->where('id',2)->update(['params_list'=>json_encode([['name'=>'材质','value'=>'麻']])]);
Db::name('store_product_label')->insert(['id'=>1,'name'=>'精选']);
Db::name('store_product_protection')->insert(['id'=>1,'title'=>'七天无理由']);
Db::name('store_product_attr')->insert(['product_id'=>1,'attr_name'=>'颜色','attr_values'=>'红色,蓝色','type'=>0]);
Db::name('user_group')->insertAll([['id'=>1,'group_name'=>'新客'],['id'=>2,'group_name'=>'老客']]);
Db::name('user_label')->insert(['id'=>1,'label_name'=>'数码偏好']);
Db::name('system_user_level')->insert(['id'=>1,'name'=>'金卡','is_show'=>1]);
Db::name('user')->insertAll([['uid'=>11,'nickname'=>'新客甲','group_id'=>1,'level'=>1,'status'=>1],['uid'=>12,'nickname'=>'老客乙','group_id'=>2,'level'=>0,'status'=>1]]);
Db::name('user_label_relation')->insert(['uid'=>11,'label_id'=>1]);
$leaf=function($field,$op,$value){return ['type'=>'condition','field'=>$field,'op'=>$op,'value'=>$value];};
$group=function($children,$mode='all',$scope='item'){return compact('children','mode','scope')+['type'=>'group'];};
$personalTree=$group([
 $group([$leaf('customer.group_id','in',[1]),$leaf('id','in',[1])]),
 $group([$leaf('customer.group_id','in',[2]),$leaf('id','in',[2])]),
 $group([$leaf('customer.logged_in','in',['0']),$leaf('id','in',[3])]),
],'any');
$personalInput=array_replace($base,['name'=>'访问客户个性化榜','condition_tree'=>$personalTree,'top_n'=>3,'priority'=>9999]);
$personalId=$services->saveRanking(0,$personalInput);
foreach([[11,[1]],[12,[2]],[0,[3]]] as $case){$public=$services->publicRanking($personalId,$case[0]);$preview=$services->preview($personalInput+['preview_uid'=>$case[0]]);checkRank('personalized preview and public rank agree for viewer '.$case[0],array_column($public['list'],'id')===$case[1]&&array_column($preview['list'],'id')===$case[1]);}
checkRank('nested rule survives save reload', $services->info($personalId)['condition_tree']===Config::validate($personalInput)['condition_tree']);
checkRank('detail rank uses the same viewer',$services->productRankings(1,1,11)[0]['id']===$personalId && $services->productRankings(1,1,12)===[]);
$attributeTree=$group([$leaf('product.protection_ids','in',[1]),$leaf('product.spec','eq',['key'=>'颜色','value'=>'红色']),$leaf('product.attributes','eq',['key'=>'材质','value'=>'棉']),$leaf('shop.type_id','in',[(int)Db::name('merchant_shop')->where('id',$platform)->value('type_id')])]);
$attributeResult=$services->preview(array_replace($base,['condition_tree'=>$attributeTree]));
checkRank('product guarantees, named specs, named attributes and owning merchant are evaluated',array_column($attributeResult['list'],'id')===[1]);
checkRank('private predicate context is absent from preview',!isset($attributeResult['list'][0]['_shop'])&&!isset($attributeResult['list'][0]['attributes']));
$split=$group([$group([$leaf('product.attributes','eq',['key'=>'材质','value'=>'棉']),$leaf('product.price','gte',150)],'all','product')]);
checkRank('shop product predicates cannot be assembled from different products',$services->preview(array_replace($base,['entity_type'=>'shop','condition_tree'=>$split]))['list']===[]);
$split['children'][0]['children'][1]['value']=50;
checkRank('a single qualifying product admits its merchant',count($services->preview(array_replace($base,['entity_type'=>'shop','condition_tree'=>$split]))['list'])===1);
$none=$group([$leaf('id','in',[1]),$leaf('id','in',[2])],'none');
checkRank('none group negates the child union',array_column($services->preview(array_replace($base,['condition_tree'=>$none]))['list'],'id')===[3]);
rejectRank('empty nested group rejected',function()use($base,$group){Config::validate(array_replace($base,['condition_tree'=>$group([$group([])])]));});
rejectRank('unknown customer field rejected',function()use($base,$group,$leaf){Config::validate(array_replace($base,['condition_tree'=>$group([$leaf('customer.pwd','contains','x')]) ]));});
rejectRank('wrong operator type rejected',function()use($base,$group,$leaf){Config::validate(array_replace($base,['condition_tree'=>$group([$leaf('customer.level','gt',1)]) ]));});
$deep=$group([$leaf('sales','gte',1)]);for($d=0;$d<7;$d++)$deep=$group([$deep]);rejectRank('excessively deep trees rejected',function()use($base,$deep){Config::validate(array_replace($base,['condition_tree'=>$deep]));});
checkRank('missing viewer group does not match a negative membership condition',!Config::matches(['id'=>1],Config::validate(array_replace($base,['condition_tree'=>$group([$leaf('customer.group_id','not_in',[1])])])),['logged_in'=>0]));
checkRank('unassigned member level can be selected as empty',Config::matches(['id'=>1],Config::validate(array_replace($base,['condition_tree'=>$group([$leaf('customer.level','empty',null)])])),['logged_in'=>1,'level'=>0]));
Db::name('store_bargain')->insert(['id'=>1,'product_id'=>1,'title'=>'进行中','status'=>1,'start_time'=>$now-60,'stop_time'=>$now+600]);
Db::name('store_bargain')->insert(['id'=>2,'product_id'=>2,'title'=>'已结束','status'=>1,'start_time'=>$now-600,'stop_time'=>$now-1]);
checkRank('activity filters read enabled real activity periods rather than product display order',array_column($services->preview(array_replace($base,['condition_tree'=>$group([$leaf('product.activity_types','in',['bargain'])])]))['list'],'id')===[1]);
$readId=Db::name('system_menus')->where('unique_auth','marketing-ranking-list-api')->value('id');Db::name('system_role')->insert(['id'=>1,'role_name'=>'榜单只读','rules'=>(string)$readId,'status'=>1]);
class RankingPermissionProbe extends app\adminapi\controller\v1\marketing\Ranking { public function __construct() { $this->adminInfo=['level'=>1,'roles'=>[1]]; } public function probe($method,$path) { $this->permission($method,$path); } }
$probe=new RankingPermissionProbe();$probe->probe('get','list');try{$probe->probe('post','save/<id>');throw new RuntimeException('readonly role could save');}catch(crmeb\exceptions\AuthException $e){checkRank('read-only permission denies writes',true);}
echo "Ranking regressions complete.\n";
