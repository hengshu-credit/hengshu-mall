<?php
declare(strict_types=1);
namespace app\services\activity\ranking;

use app\services\BaseServices;
use app\services\diy\ThemeServices;
use app\services\merchant\MerchantInstaller;
use app\services\merchant\MerchantProducts;
use app\services\merchant\MerchantServices;
use app\services\merchant\MerchantVault;
use app\services\product\product\ProductBrandInstaller;
use crmeb\exceptions\AdminException;
use crmeb\exceptions\ApiException;
use crmeb\services\CacheService;
use think\facade\Config;
use think\facade\Db;

class RankingServices extends BaseServices
{
    private function query() { return Db::name('marketing_ranking')->where('is_del',0); }
    private function hydrate(array $row): array
    {
        $config=json_decode($row['config'],true);
        if (!is_array($config)) throw new AdminException('榜单配置损坏');
        unset($row['config']); $row=array_replace($config,$row);
        if (!isset($row['rating_min_reviews'])) $row['rating_min_reviews']=0;
        foreach (['id','page_id','version','enabled','priority','top_n','start_time','end_time','update_time'] as $key) $row[$key]=(int)$row[$key];
        $row['status']=RankingConfig::status($row,time());
        $row['page_url']='/pages/annex/special/index?theme_id='.$row['page_id'];
        return $row;
    }
    public function info(int $id): array
    {
        RankingInstaller::ensureSchema();
        $row=$this->query()->where('id',$id)->find();
        if (!$row) throw new AdminException('榜单不存在或已删除');
        return $this->hydrate($row);
    }
    public function listing(array $filters): array
    {
        RankingInstaller::ensureSchema(); $query=$this->query();
        if (!empty($filters['keyword'])) $query->whereLike('name','%'.mb_substr(trim($filters['keyword']),0,60).'%');
        if (in_array($filters['entity_type']??'',['product','shop'],true)) $query->where('entity_type',$filters['entity_type']);
        if (isset($filters['enabled']) && $filters['enabled']!=='') $query->where('enabled',(int)$filters['enabled']);
        [$page,$limit,$default]=$this->getPageValue(); $count=(clone $query)->count();
        $rows=$query->order('priority desc,id asc')->page(max(1,$page),min(100,max(1,$limit?:$default)))->select()->toArray();
        return ['list'=>array_map([$this,'hydrate'],$rows),'count'=>$count];
    }
    public function saveRanking(int $id, array $input): int
    {
        RankingInstaller::ensureSchema(); MerchantInstaller::ensure(); ProductBrandInstaller::ensureSchema();
        $rule=RankingConfig::validate($input);
        // Validate all explicit references including exclusions and boosts, without bypassing eligibility.
        $ids=array_merge($rule['exclude_ids'],array_column($rule['adjustments'],'id'));
        if ($ids && $this->optionQuery($rule['entity_type'])->whereIn('id',array_unique($ids))->count()!==count(array_unique($ids))) throw new AdminException('排除或调整对象包含已删除的项目');
        foreach ($rule['conditions'] as $condition) {
            $type=['id'=>$rule['entity_type'],'category_ids'=>'category','brand_ids'=>'brand','label_ids'=>'label','shop_id'=>'shop','type_id'=>'shop_type'][$condition['field']]??null;
            if ($type && $this->optionQuery($type)->whereIn('id',$condition['value'])->count()!==count($condition['value'])) throw new AdminException('筛选范围包含已删除的项目');
        }
        foreach(RankingConditionTree::leaves($rule['condition_tree']??[]) as $condition){
            $field=RankingConditionTree::fields()[$condition['field']];
            if($field['reference']==='entity')$field['reference']=$rule['entity_type'];
            if($field['reference']&&!in_array($condition['op'],['empty','not_empty'],true)&&$this->optionQuery($field['reference'])->whereIn('id',$condition['value'])->count()!==count($condition['value']))throw new AdminException($field['label'].'包含已删除的选项');
        }
        return Db::transaction(function()use($id,$input,$rule){
            $now=time(); $data=array_intersect_key($rule,array_flip(['name','description','entity_type','enabled','priority','top_n','start_time','end_time']));
            $data['config']=json_encode($rule,JSON_UNESCAPED_UNICODE); $data['update_time']=$now;
            if ($id) {
                $old=$this->query()->where('id',$id)->lock(true)->find();
                if (!$old) throw new AdminException('榜单不存在');
                if ((int)($input['version']??0)!==(int)$old['version']) throw new AdminException('榜单已被修改，请刷新后重试');
                if ($rule['entity_type']!==$old['entity_type']) throw new AdminException('已有榜单不可更改排行对象，请新建榜单');
                if (!Db::name('theme')->where('id',$old['page_id'])->where('is_del',0)->count()) throw new AdminException('关联装修页已删除，请恢复页面后保存');
                $this->query()->where('id',$id)->update($data+['version'=>$old['version']+1]);
            } else {
                $id=(int)Db::name('marketing_ranking')->insertGetId($data+['add_time'=>$now]);
                $component=['name'=>'marketingRanking','entityType'=>$rule['entity_type'],'cname'=>'营销排行榜','timestamp'=>1000,'id'=>'id1000','rankingId'=>$id,'title'=>'','showTitle'=>true,'showDescription'=>true,'showMore'=>false,'showScore'=>false,'limit'=>100,'accentColor'=>'#c77932','isHide'=>false,'setUp'=>['tabVal'=>0]];
                $page=['type'=>'home','title'=>$rule['name'],'name'=>$rule['name'],'is_show'=>1,'is_bg_color'=>1,'color_picker'=>'#f7f5f0','actions_mode'=>'components','value'=>['1000'=>$component]];
                $pageId=app()->make(ThemeServices::class)->saveTheme(0,['type'=>'home','value'=>$page,'tid'=>0,'title'=>$rule['name'],'page_type'=>'micro']);
                Db::name('marketing_ranking')->where('id',$id)->update(['page_id'=>$pageId]);
            }
            return $id;
        });
    }
    public function setEnabled(int $id,$enabled): void
    {
        $enabled=RankingConfig::integer($enabled,0,1,'启用状态'); $this->info($id);
        $this->query()->where('id',$id)->inc('version')->update(['enabled'=>$enabled,'update_time'=>time()]);
    }
    public function deleteRanking(int $id): void
    {
        $this->info($id);
        $this->query()->where('id',$id)->inc('version')->update(['is_del'=>1,'enabled'=>0,'update_time'=>time()]);
    }
    private function optionQuery(string $type)
    {
        switch ($type) {
            case 'product': return Db::name('store_product')->where('is_del',0)->field('id,store_name as name,image,price');
            case 'shop': MerchantInstaller::ensure(); return Db::name('merchant_shop')->field('id,name');
            case 'shop_type': MerchantInstaller::ensure(); return Db::name('merchant_type')->field('id,name');
            case 'category': return Db::name('store_category')->field('id,cate_name as name');
            case 'brand': ProductBrandInstaller::ensureSchema(); return Db::name('store_product_brand')->field('id,name');
            case 'label': return Db::name('store_product_label')->where('is_del',0)->field('id,name');
            case 'protection': return Db::name('store_product_protection')->where('is_del',0)->field('id,title as name');
            case 'shop_tag': MerchantInstaller::ensure(); return Db::name('merchant_tag')->field('id,name');
            case 'user_group': return Db::name('user_group')->field('id,group_name as name');
            case 'user_label': return Db::name('user_label')->field('id,label_name as name');
            case 'user_level': return Db::name('system_user_level')->where('is_del',0)->field('id,name');
            case 'customer': return Db::name('user')->where('is_del',0)->field('uid as id,nickname as name');
            case 'seckill': case 'bargain': case 'combination': return Db::name('store_'.$type)->where('is_del',0)->field('id,title as name');
            case 'full_reduction': \app\services\activity\fullreduction\FullReductionInstaller::ensureSchema(); return Db::name('store_full_reduction')->where('is_del',0)->field('id,name');
        }
        throw new AdminException('选择类型不正确');
    }
    public function options(array $filters): array
    {
        $type=$filters['type']??'product';
        if($type==='condition_fields')return ['list'=>array_values(RankingConditionTree::fields())];
        if ($type==='ranking') return $this->listing($filters);
        $query=$this->optionQuery($type); $word=trim((string)($filters['keyword']??''));
        if ($word!=='') {
            $field=['product'=>'store_name','category'=>'cate_name','user_group'=>'group_name','user_label'=>'label_name','customer'=>'nickname','protection'=>'title','seckill'=>'title','bargain'=>'title','combination'=>'title'][$type]??'name';
            $query->where(function($q)use($field,$word,$type){$q->whereLike($field,'%'.mb_substr($word,0,60).'%'); if(ctype_digit($word)) $q->whereOr($type==='customer'?'uid':'id',(int)$word);});
        }
        if (!empty($filters['ids'])) $query->whereIn($type==='customer'?'uid':'id',RankingConfig::ids($filters['ids']));
        [$page,$limit,$default]=$this->getPageValue(); $count=(clone $query)->count();
        return ['list'=>$query->order($type==='customer'?'uid desc':'id desc')->page(max(1,$page),min(200,max(1,$limit?:$default)))->select()->toArray(),'count'=>$count];
    }
    /** Aggregate paid leaf-order quantities, removing refunded units and preserving sale-owner snapshots. */
    public function candidates(int $days, int $now): array
    {
        // Candidate data is visitor-independent. Reuse a short-lived snapshot so
        // every public request does not rescan all orders and decrypt every shop.
        $useCache=(string)Config::get('cache.default','file')==='redis';
        $cacheKey='ranking:candidates:v2:'.(int)$days.':'.intdiv($now,30);
        if($useCache){$cached=CacheService::get($cacheKey,null);if(is_array($cached)&&isset($cached['product'],$cached['shop']))return $cached;}
        MerchantInstaller::ensure(); ProductBrandInstaller::ensureSchema();
        $sales=Db::name('store_order_cart_info')->alias('c')->join('store_order o','o.id=c.oid')->leftJoin('store_product p','p.id=c.product_id')->where('o.paid',1)->where('o.pid','<>',-1)->where('o.is_system_del',0)->where('o.pay_time','<=',$now)->where('c.cart_num','>',0);
        $reviews=Db::name('store_product_reply')->where('is_del',0)->where('status',1)->where('reply_type','product')->where('add_time','<=',$now);
        if ($days) { $sales->where('o.pay_time','>=',$now-$days*86400); $reviews->where('add_time','>=',$now-$days*86400); }
        // Keep partially refunded orders in the denominator and remove only refunded units.
        // New cart snapshots carry merchant.id, preserving the sale owner after a product moves.
        $sales=$sales->group(['c.product_id','sale_shop_id'])->field("c.product_id,COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(c.cart_info,'$.merchant.id')), ''),p.seller_shop_id) as sale_shop_id,SUM(GREATEST(c.cart_num-c.refund_num,0)) as sales")->select()->toArray();
        $reviews=$reviews->group('product_id')->field('product_id,COUNT(*) as reviews,SUM(CASE WHEN product_score>=4 THEN 1 ELSE 0 END) as positive,SUM(CASE WHEN product_score BETWEEN 1 AND 5 THEN product_score ELSE 0 END) as score_total,SUM(CASE WHEN product_score BETWEEN 1 AND 5 THEN 1 ELSE 0 END) as rated_count')->select()->toArray();
        $salesByProduct=[]; $salesByShop=[];
        foreach($sales as $sale){$productId=(int)$sale['product_id'];$shopId=(int)$sale['sale_shop_id'];$quantity=(int)$sale['sales'];$salesByProduct[$productId]=($salesByProduct[$productId]??0)+$quantity;if($shopId>0)$salesByShop[$shopId]=($salesByShop[$shopId]??0)+$quantity;}
        $reviews=array_column($reviews,null,'product_id');
        $products=MerchantProducts::constrain(Db::name('store_product')->where('is_show',1)->where('is_del',0))->field('id,store_name as name,image,price,stock,seller_shop_id as shop_id,cate_id,label_list')->select()->toArray();
        $parents=Db::name('store_category')->column('pid','id'); $brands=[];
        foreach (Db::name('store_product_brand_relation')->field('product_id,brand_id')->select()->toArray() as $relation) $brands[$relation['product_id']][]=(int)$relation['brand_id'];
        $shops=[]; $typeNames=Db::name('merchant_type')->column('name','id');
        foreach (Db::name('merchant_shop')->where('state','open')->where('audit_status','approved')->select()->toArray() as $shop) {
            if (!(new MerchantServices())->available($shop)) continue;
            $profile=MerchantVault::decrypt($shop['profile']);
            $shops[(int)$shop['id']]=['id'=>(int)$shop['id'],'name'=>$shop['name'],'image'=>set_file_url($profile['logo']??''),'type_id'=>(int)$shop['type_id'],'type_name'=>$typeNames[$shop['type_id']]??'','shop_description'=>(string)($profile['description']??''),'sales'=>0,'reviews'=>0,'positive'=>0,'rating'=>0,'product_count'=>0,'score_total'=>0,'rated_count'=>0,'rating_score'=>null];
        }
        foreach ($products as &$row) {
            $row['id']=(int)$row['id']; $row['shop_id']=(int)$row['shop_id'];
            $row['sales']=(int)($salesByProduct[$row['id']]??0); $row['reviews']=(int)($reviews[$row['id']]['reviews']??0); $row['positive']=(int)($reviews[$row['id']]['positive']??0);
            $row['rating']=$row['reviews'] ? 100*$row['positive']/$row['reviews'] : 0;
            $row['score_total']=(int)($reviews[$row['id']]['score_total']??0); $row['rated_count']=(int)($reviews[$row['id']]['rated_count']??0);
            $row['rating_score']=$row['rated_count']?round($row['score_total']/$row['rated_count'],1):null;
            $row['price']=(float)$row['price']; $row['stock']=(int)$row['stock']; $row['image']=set_file_url($row['image']);
            $categories=[];
            foreach (array_filter(array_map('intval',explode(',',$row['cate_id']))) as $category) while ($category && !isset($categories[$category])) { $categories[$category]=true; $category=(int)($parents[$category]??0); }
            $row['category_ids']=array_keys($categories); $row['label_ids']=array_filter(array_map('intval',explode(',',(string)$row['label_list']))); $row['brand_ids']=$brands[$row['id']]??[];
            if (isset($shops[$row['shop_id']])) {
                $shop=&$shops[$row['shop_id']]; $shop['product_count']++; $shop['reviews']+=$row['reviews']; $shop['positive']+=$row['positive']; $shop['score_total']+=$row['score_total']; $shop['rated_count']+=$row['rated_count'];
            }
        }
        unset($row,$shop);
        foreach ($shops as &$shop) { $shop['sales']=(int)($salesByShop[$shop['id']]??0); $shop['rating']=$shop['reviews']?100*$shop['positive']/$shop['reviews']:0; $shop['rating_score']=$shop['rated_count']?round($shop['score_total']/$shop['rated_count'],1):null; }
        $shopProducts=[];
        foreach($products as $product){$owner=$product['shop_id'];if(!isset($shops[$owner]))continue;$shopProducts[$owner][]=array_intersect_key($product,array_flip(['id','name','image','price','sales','reviews','rating']));usort($shopProducts[$owner],function($a,$b){return($b['sales']<=>$a['sales'])?:($a['id']<=>$b['id']);});$shopProducts[$owner]=array_slice($shopProducts[$owner],0,6);}
        foreach($shops as &$shop)$shop['products']=$shopProducts[$shop['id']]??[];unset($shop);
        $result=['product'=>$products,'shop'=>array_values($shops)];
        if($useCache)CacheService::set($cacheKey,$result,30,'ranking');
        return $result;
    }
    public function preview(array $input): array
    {
        $rule=RankingConfig::validate($input); $now=time();
        $uid=RankingConfig::integer($input['preview_uid']??0,0,2147483647,'试算客户');$customer=RankingConditionData::customer($uid);
        if($uid&&empty($customer['logged_in']))throw new AdminException('试算客户不存在或已注销');
        $data=RankingConditionData::enrich($this->candidates($rule['window_days'],$now),$rule,$customer,$now);
        $result=RankingConfig::rank($data[$rule['entity_type']],$rule,$customer);$result['list']=$this->excerpts($result['list'],$rule['entity_type']);
        $fields=array_flip(['id','name','image','price','shop_id','sales','reviews','rating','product_count','rank','score','rating_score','type_name','shop_description','products','review_excerpt','base_score','score_parts','adjustment']);
        $result['list']=array_map(function($row)use($fields){return array_intersect_key($row,$fields);},$result['list']);
        return $result+['calculated_at'=>$now,'preview_uid'=>$uid];
    }
    private function publicRule(array $rule): array
    {
        return array_intersect_key($rule,array_flip(['id','name','description','entity_type','top_n','page_id','page_url','window_days','rating_min_reviews']));
    }
    public function publicRanking(int $id,int $uid=0): array
    {
        if (!RankingInstaller::available()) throw new ApiException('榜单暂不可用');
        $raw=$this->query()->where('id',$id)->find();
        if (!$raw) throw new ApiException('榜单暂不可用');
        $rule=$this->hydrate($raw);
        if ($rule['status']!=='running' || !$this->pageVisible($rule)) throw new ApiException('榜单暂不可用');
        $now=time();$customer=RankingConditionData::customer($uid);$data=RankingConditionData::enrich($this->candidates($rule['window_days'],$now),$rule,$customer,$now);
        $ranked=RankingConfig::rank($data[$rule['entity_type']],$rule,$customer);
        $ranked['list']=$this->excerpts($ranked['list'],$rule['entity_type']);
        $fields=array_flip(['id','name','image','price','shop_id','sales','reviews','rating','product_count','rank','score','rating_score','type_name','shop_description','products','review_excerpt']);
        return ['ranking'=>$this->publicRule($rule),'list'=>array_map(function($row)use($fields){return array_intersect_key($row,$fields);},$ranked['list']),'calculated_at'=>$now];
    }
    private function excerpts(array $rows,string $type): array
    {
        if(!$rows||$type!=='product')return $rows;
        $latest=Db::name('store_product_reply')->whereIn('product_id',array_column($rows,'id'))->where('status',1)->where('is_del',0)->where('reply_type','product')->where('comment','<>','')->group('product_id')->field('MAX(id)')->buildSql();
        $comments=Db::name('store_product_reply')->whereIn('id',$latest)->column('comment','product_id');
        foreach($rows as &$row)$row['review_excerpt']=$comments[$row['id']]??'';
        return $rows;
    }
    private function pageVisible(array $rule): bool
    {
        $page=Db::name('theme')->where('id',$rule['page_id'])->where('is_del',0)->value('home_data');
        $page=json_decode((string)$page,true);
        if (!$page || empty($page['is_show'])) return false;
        foreach ($page['value']??[] as $item) if (($item['name']??'')==='marketingRanking' && (int)($item['rankingId']??0)===(int)$rule['id'] && empty($item['isHide'])) return true;
        return false;
    }
    public function productRankings(int $productId, int $limit=1,int $uid=0): array
    {
        if (!RankingInstaller::available()) return [];
        $rows=$this->query()->where('entity_type','product')->where('enabled',1)->where('start_time','<=',time())->where(function($q){$q->where('end_time',0)->whereOr('end_time','>',time());})->order('priority desc,id asc')->select()->toArray();
        if (!$rows) return [];
        $data=[]; $result=[]; $now=time();$customer=RankingConditionData::customer($uid);
        foreach ($rows as $raw) {
            $rule=$this->hydrate($raw);
            if (!$this->pageVisible($rule)) continue;
            $days=$rule['window_days'];
            if (!isset($data[$days])) $data[$days]=$this->candidates($days,$now);
            $products=array_column($data[$days]['product'],null,'id');
            if (!isset($products[$productId])) continue;
            $conditionData=RankingConditionData::enrich($data[$days],$rule,$customer,$now);
            $ranked=RankingConfig::rank($conditionData['product'],$rule,$customer);
            foreach ($ranked['list'] as $row) if ($row['id']===$productId) { $result[]=$this->publicRule($rule)+['rank'=>$row['rank'],'_priority'=>(int)$rule['priority']]; break; }
        }
        // Examine every eligible product ranking before choosing the best placement.
        usort($result, function($a,$b) { return ($a['rank'] <=> $b['rank']) ?: (($b['_priority'] <=> $a['_priority']) ?: ($a['id'] <=> $b['id'])); });
        if (!$result) return [];
        $best=$result[0]; unset($best['_priority']);
        return [$best];
    }
}
