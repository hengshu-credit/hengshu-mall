<?php
declare(strict_types=1);
namespace app\services\activity\ranking;

use crmeb\exceptions\AdminException;

/** Declarative, typed conditions. No expressions or SQL from configuration are executed. */
class RankingConditionTree
{
    public static function fields(): array
    {
        static $cache=null;if($cache!==null)return $cache;
        $fields=[];
        $add=function($key,$label,$group,$kind='number',$reference='',array $options=[])use(&$fields){
            $fields[$key]=compact('key','label','group','kind','reference','options');
        };
        foreach(['id'=>'编号','sales'=>'成交件数','reviews'=>'评价数','rating'=>'好评率','price'=>'售价','stock'=>'库存','product_count'=>'在售商品数'] as $key=>$label)$add($key,$label,['榜单对象','基础指标']);
        $add('id','指定对象',['榜单对象','基础属性'],'reference','entity');
        $add('name','名称',['榜单对象','基础属性'],'text');
        foreach(['category_ids'=>['分类（含子分类）','category'],'label_ids'=>['标签','label'],'protection_ids'=>['服务保障','protection'],'brand_ids'=>['品牌','brand'],'shop_id'=>['所属商户','shop']] as $key=>$meta)$add('product.'.$key,$meta[0],['商品','归属与标签'],'reference',$meta[1]);
        foreach(['id'=>'商品编号','price'=>'售价','stock'=>'库存','sales'=>'成交件数','reviews'=>'评价数','rating'=>'好评率'] as $key=>$label)$add('product.'.$key,$label,['商品','基础属性']);
        foreach(['name'=>'名称','store_info'=>'简介','keyword'=>'关键词','bar_code'=>'商品编码','spu'=>'SPU','unit_name'=>'单位'] as $key=>$label)$add('product.'.$key,$label,['商品','基础属性'],'text');
        $add('product.add_time','添加时间',['商品','基础属性'],'date');
        foreach(['is_show'=>'上架状态','is_new'=>'新品','is_hot'=>'热卖','is_best'=>'精品','is_benefit'=>'优惠','is_postage'=>'包邮','is_virtual'=>'虚拟商品','vip_product'=>'会员专享'] as $key=>$label)$add('product.'.$key,$label,['商品','状态'],'enum','',['0'=>'否','1'=>'是']);
        $add('product.spec_type','规格类型',['商品','规格'],'enum','',['0'=>'单规格','1'=>'多规格']);
        $add('product.spec','规格名称 / 值',['商品','规格'],'pair');
        $add('product.attributes','属性名称 / 值',['商品','属性'],'pair');
        $add('product.activity_types','有效活动类型',['商品','活动'],'enum','',['seckill'=>'秒杀','bargain'=>'砍价','combination'=>'拼团','full_reduction'=>'满减满折','presale'=>'预售']);
        foreach(['seckill'=>'秒杀商品','bargain'=>'砍价活动','combination'=>'拼团活动','full_reduction'=>'满减满折活动'] as $key=>$label)$add('product.'.$key.'_ids',$label,['商品','活动'],'reference',$key);
        foreach(['id'=>['指定商户','shop'],'type_id'=>['商户类型','shop_type'],'tag_ids'=>['商户标签','shop_tag']] as $key=>$meta)$add('shop.'.$key,$meta[0],['商户','类型与标签'],'reference',$meta[1]);
        foreach(['name'=>'名称','description'=>'简介','business_scope'=>'经营范围','business_address'=>'经营地址','registered_address'=>'注册地址'] as $key=>$label)$add('shop.'.$key,$label,['商户','基础属性'],'text');
        $add('shop.subject_kind','主体类别',['商户','基础属性'],'enum','',['company'=>'企业','organization'=>'组织','individual'=>'个体工商户','person'=>'个人']);
        $add('shop.created_at','入驻时间',['商户','基础属性'],'date');
        $add('shop.is_platform','平台自营',['商户','状态'],'enum','',['0'=>'否','1'=>'是']);
        $add('shop.state','经营状态',['商户','状态'],'enum','',['open'=>'营业','preparing'=>'筹备','closed'=>'关闭','suspended'=>'暂停']);
        $add('shop.audit_status','审核状态',['商户','状态'],'enum','',['approved'=>'已通过','pending'=>'待审核','rejected'=>'已拒绝']);
        $add('customer.logged_in','登录状态',['访问客户','状态'],'enum','',['0'=>'游客','1'=>'已登录']);
        foreach(['group_id'=>['客户分组','user_group'],'label_ids'=>['客户标签','user_label'],'level'=>['会员等级','user_level']] as $key=>$meta)$add('customer.'.$key,$meta[0],['访问客户','分组标签等级'],'reference',$meta[1]);
        foreach(['uid'=>'客户编号','integral'=>'积分','exp'=>'经验值','now_money'=>'账户余额','pay_count'=>'累计付款次数'] as $key=>$label)$add('customer.'.$key,$label,['访问客户','基础属性']);
        $add('customer.nickname','昵称',['访问客户','基础属性'],'text');
        $add('customer.add_time','注册时间',['访问客户','基础属性'],'date');
        $add('customer.last_time','最近访问时间',['访问客户','基础属性'],'date');
        $add('customer.status','账户状态',['访问客户','状态'],'enum','',['0'=>'禁用','1'=>'正常']);
        $add('customer.is_promoter','推广员',['访问客户','状态'],'enum','',['0'=>'否','1'=>'是']);
        $add('customer.user_type','注册来源',['访问客户','基础属性'],'enum','',['h5'=>'H5','wechat'=>'公众号','routine'=>'小程序','app'=>'APP']);
        foreach($fields as &$field)$field['operators']=self::operators($field['kind']);unset($field);
        $cache=$fields;return $fields;
    }
    public static function operators(string $kind): array
    {
        if(in_array($kind,['reference','enum'],true))return ['in','not_in','all_in','empty','not_empty'];
        if(in_array($kind,['text','pair'],true))return ['eq','neq','contains','not_contains','empty','not_empty'];
        return ['eq','neq','gt','gte','lt','lte','between','empty','not_empty'];
    }
    public static function validate($tree,string $entity): array
    {
        $count=0;return self::node($tree,$entity,0,$count,'item');
    }
    private static function text($value,int $max=100): string
    {
        if(!is_string($value)||mb_strlen($value)>$max||preg_match('/[\x00-\x1f<>]/u',$value))throw new AdminException('条件文字不正确');
        return trim($value);
    }
    private static function numeric($v): float
    {
        if(is_bool($v)||!is_numeric($v)||!is_finite((float)$v)||$v<0||$v>4102444800)throw new AdminException('条件数值不正确');return(float)$v;
    }
    private static function node($node,string $entity,int $depth,int &$count,string $scope): array
    {
        if(!is_array($node)||++$count>100||$depth>6)throw new AdminException('条件树最多100个节点、6层嵌套');
        if(($node['type']??'')==='group'){
            $mode=$node['mode']??'all';$ownScope=$node['scope']??'item';$children=$node['children']??null;
            if(!in_array($mode,['all','any','none'],true)||!in_array($ownScope,['item','product'],true)||!is_array($children)||count($children)>20||($depth>0&&!$children)||($depth===0&&$ownScope!=='item'))throw new AdminException('条件组关系、范围或子条件不正确；空子组请删除');
            if($ownScope==='product'&&($entity!=='shop'||$scope==='product'))throw new AdminException('关联商品条件组只能用于店铺榜，且不能重复嵌套');
            $nextScope=$ownScope==='product'?'product':$scope;$result=[];
            foreach($children as $child)$result[]=self::node($child,$entity,$depth+1,$count,$nextScope);
            return ['type'=>'group','mode'=>$mode,'scope'=>$ownScope,'children'=>$result];
        }
        if(($node['type']??'')!=='condition'||$depth===0)throw new AdminException('条件树必须从条件组开始');
        $field=$node['field']??'';$meta=self::fields()[$field]??null;$op=$node['op']??'';
        if(!$meta||!in_array($op,$meta['operators'],true))throw new AdminException('条件字段或运算符不正确');
        if($entity==='shop'&&strpos($field,'product.')===0&&$scope!=='product')throw new AdminException('店铺榜的商品条件请放入“同一商品满足”条件组');
        if(($entity==='shop'&&in_array($field,['price','stock'],true))||($entity==='product'&&$field==='product_count'))throw new AdminException('该指标不适用于当前榜单对象');
        $value=$node['value']??null;$empty=in_array($op,['empty','not_empty'],true);
        if($meta['kind']==='pair'){
            if(!is_array($value))throw new AdminException('请填写属性名称和值');
            $key=self::text($value['key']??'');if($key==='')throw new AdminException('属性名称不能为空');
            $text=$empty?'':self::text($value['value']??'');if(!$empty&&$text==='')throw new AdminException('属性值不能为空');$value=['key'=>$key,'value'=>$text];
        }elseif($empty)$value=null;
        elseif($meta['kind']==='reference'){$value=RankingConfig::ids($value);if(!$value)throw new AdminException('请选择条件范围');}
        elseif($meta['kind']==='enum'){
            if(!is_array($value)||!$value||count($value)>20)throw new AdminException('请选择条件选项');
            foreach($value as $v)if(!is_string($v)&&!is_int($v))throw new AdminException('条件选项格式不正确');
            $value=array_values(array_unique(array_map('strval',$value)));foreach($value as $v)if(!array_key_exists($v,$meta['options']))throw new AdminException('条件选项不存在');
        }elseif($meta['kind']==='text'){$value=self::text($value);if($value==='')throw new AdminException('条件文字不能为空');}
        elseif($op==='between'){
            if(!is_array($value)||count($value)!==2)throw new AdminException('请填写区间起止值');$value=array_map([self::class,'numeric'],array_values($value));if($value[0]>$value[1])throw new AdminException('区间起始值不能大于结束值');
        }else $value=self::numeric($value);
        return compact('field','op','value')+['type'=>'condition'];
    }
    public static function leaves(array $tree): array
    {
        if(($tree['type']??'')==='condition')return[$tree];$leaves=[];foreach($tree['children']??[] as $child)$leaves=array_merge($leaves,self::leaves($child));return $leaves;
    }
    public static function matches(array $tree,array $row,string $entity,array $customer): bool
    {
        return self::evaluate($tree,['item'=>$row,'product'=>$entity==='product'?$row:[],'shop'=>$entity==='shop'?$row:($row['_shop']??[]),'customer'=>$customer]);
    }
    private static function evaluate(array $node,array $context): bool
    {
        if($node['type']==='group'){
            if(($node['scope']??'item')==='product'){
                $group=$node;$group['scope']='item';
                foreach($context['item']['_products']??[] as $product)if(self::evaluate($group,array_replace($context,['product'=>$product])))return true;
                return false;
            }
            $values=[];foreach($node['children'] as $child)$values[]=self::evaluate($child,$context);
            if(!$values)return true;
            return $node['mode']==='all'?!in_array(false,$values,true):($node['mode']==='any'?in_array(true,$values,true):!in_array(true,$values,true));
        }
        $path=explode('.',$node['field'],2);$actual=count($path)===1?($context['item'][$path[0]]??null):($context[$path[0]][$path[1]]??null);
        $value=$node['value'];$op=$node['op'];
        // Reference ID 0 means "unassigned" in the mall's customer/group schemas.
        if(self::fields()[$node['field']]['kind']==='reference'&&($actual===0||$actual==='0'))$actual=[];
        if(in_array($node['field'],['product.spec','product.attributes'],true)){$actual=$actual[$value['key']]??null;$value=$value['value'];}
        $missing=$actual===null||$actual===''||$actual===[];
        if($op==='empty')return $missing;if($op==='not_empty')return !$missing;
        // Missing data is never a match for inequality/not-in either. Guests can be selected explicitly.
        if($actual===null||$actual==='')return false;
        if(in_array($op,['in','not_in','all_in'],true)){$intersection=array_intersect(array_map('strval',(array)$actual),array_map('strval',$value));return $op==='all_in'?count(array_unique($intersection))===count($value):($op==='in'?(bool)$intersection:!$intersection);}
        $actuals=(array)$actual;
        if(in_array($op,['eq','neq'],true)&&in_array(self::fields()[$node['field']]['kind'],['number','date'],true))return is_numeric($actual)&&($op==='eq'?((float)$actual===(float)$value):((float)$actual!==(float)$value));
        $positive=false;foreach($actuals as $a){
            switch($op){case 'eq':case 'neq':$ok=(string)$a===(string)$value;break;case 'contains':case 'not_contains':$ok=mb_stripos((string)$a,(string)$value)!==false;break;case 'gt':$ok=is_numeric($a)&&$a>$value;break;case 'gte':$ok=is_numeric($a)&&$a>=$value;break;case 'lt':$ok=is_numeric($a)&&$a<$value;break;case 'lte':$ok=is_numeric($a)&&$a<=$value;break;case 'between':$ok=is_numeric($a)&&$a>=$value[0]&&$a<=$value[1];break;default:$ok=false;}
            if($ok){$positive=true;break;}
        }
        return in_array($op,['neq','not_contains'],true)?!$positive:$positive;
    }
}
