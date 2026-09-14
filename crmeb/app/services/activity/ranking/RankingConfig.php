<?php
declare(strict_types=1);
namespace app\services\activity\ranking;

use crmeb\exceptions\AdminException;

/** The same eligibility and score calculation powers previews, pages and detail badges. */
class RankingConfig
{
    public static function fields(string $type): array
    {
        $common = ['id'=>'编号','name'=>'名称','sales'=>'成交件数','reviews'=>'评价数','rating'=>'好评率'];
        return $type === 'shop' ? $common + ['type_id'=>'店铺类型','product_count'=>'在售商品数']
            : $common + ['category_ids'=>'商品分类（含子分类）','brand_ids'=>'品牌','label_ids'=>'标签','shop_id'=>'所属店铺','price'=>'售价','stock'=>'库存'];
    }
    public static function metrics(string $type): array
    {
        return ['sales'=>'成交件数','reviews'=>'评价数','rating'=>'好评率'] + ($type === 'shop' ? ['product_count'=>'在售商品数'] : ['price'=>'售价','stock'=>'库存']);
    }
    public static function integer($value, int $min, int $max, string $label): int
    {
        if (is_bool($value) || filter_var($value,FILTER_VALIDATE_INT) === false || $value < $min || $value > $max) throw new AdminException($label.'不正确');
        return (int)$value;
    }
    private static function number($value, float $min, float $max, string $label): float
    {
        if (!is_numeric($value) || !is_finite((float)$value) || $value < $min || $value > $max) throw new AdminException($label.'不正确');
        return (float)$value;
    }
    private static function text($value, int $max, string $label): string
    {
        if (!is_string($value) || mb_strlen($value)>$max || preg_match('/[\x00-\x1F<>]/u',$value)) throw new AdminException($label.'格式或长度不正确');
        return trim($value);
    }
    public static function ids($value): array
    {
        if (!is_array($value) || count($value)>200) throw new AdminException('最多选择200项');
        return array_values(array_unique(array_map(function($id){return self::integer($id,1,2147483647,'编号');},$value)));
    }
    public static function validate(array $input): array
    {
        $data = [];
        $data['name'] = self::text($input['name']??'',60,'榜单名称');
        if ($data['name']==='') throw new AdminException('请填写榜单名称');
        $data['description'] = self::text($input['description']??'',300,'榜单说明');
        $data['entity_type'] = $input['entity_type']??'product';
        if (!in_array($data['entity_type'],['product','shop'],true)) throw new AdminException('榜单对象不正确');
        foreach (['enabled'=>[0,1,0],'priority'=>[0,999999,0],'top_n'=>[1,100,20],'start_time'=>[0,4102444800,0],'end_time'=>[0,4102444800,0]] as $key=>$range) $data[$key]=self::integer($input[$key]??$range[2],$range[0],$range[1],$key);
        if ($data['end_time'] && $data['end_time'] <= $data['start_time']) throw new AdminException('结束时间须晚于开始时间');
        $data['window_days'] = self::integer($input['window_days']??30,0,90,'统计周期');
        if (!in_array($data['window_days'],[0,7,30,90],true)) throw new AdminException('统计周期不正确');
        $data['match_mode']=$input['match_mode']??'all';
        if (!in_array($data['match_mode'],['all','any'],true)) throw new AdminException('条件关系不正确');
        $data['condition_tree']=isset($input['condition_tree'])?RankingConditionTree::validate($input['condition_tree'],$data['entity_type']):null;
        $conditions=$data['condition_tree']!==null?[]:($input['conditions']??[]);
        if (!is_array($conditions) || count($conditions)>20) throw new AdminException('筛选条件最多20条');
        $data['conditions']=[];
        foreach ($conditions as $condition) {
            if (!is_array($condition)) throw new AdminException('筛选条件格式不正确');
            $field=$condition['field']??''; $op=$condition['op']??''; $value=$condition['value']??null;
            if (!isset(self::fields($data['entity_type'])[$field])) throw new AdminException('筛选字段不正确');
            if ($field==='name') {
                if ($op!=='contains') throw new AdminException('名称请使用包含条件');
                $value=self::text($value,60,'筛选名称');
                if ($value==='') throw new AdminException('筛选名称不能为空');
            } elseif (in_array($field,['id','type_id','category_ids','brand_ids','label_ids','shop_id'],true)) {
                if (!in_array($op,['in','not_in'],true)) throw new AdminException('范围运算符不正确');
                $value=self::ids($value);
                if (!$value) throw new AdminException('请选择筛选范围');
            } else {
                if (!in_array($op,['gte','lte'],true)) throw new AdminException('数值运算符不正确');
                $value=self::number($value,0,$field==='rating'?100:1000000000,'筛选数值');
            }
            $data['conditions'][]=compact('field','op','value');
        }
        $data['exclude_ids']=self::ids($input['exclude_ids']??[]);
        $data['sort_mode']=$input['sort_mode']??'single';
        if (!in_array($data['sort_mode'],['single','composite'],true)) throw new AdminException('排行方式不正确');
        $metrics=$input['metrics']??[['field'=>'sales','direction'=>'desc','weight'=>100]];
        if (!is_array($metrics) || !$metrics || count($metrics)>5 || ($data['sort_mode']==='single' && count($metrics)!==1)) throw new AdminException('请选择1至5个指标，单指标模式仅允许一个指标');
        $data['metrics']=[]; $seen=[]; $weight=0;
        foreach ($metrics as $metric) {
            if (!is_array($metric)) throw new AdminException('指标格式不正确');
            $field=$metric['field']??''; $direction=$metric['direction']??'desc';
            if (!isset(self::metrics($data['entity_type'])[$field]) || isset($seen[$field]) || !in_array($direction,['asc','desc'],true)) throw new AdminException('指标不可重复，且排序方向须有效');
            $seen[$field]=true;
            $part=self::number($metric['weight']??0,0.01,100,'指标权重'); $weight+=$part;
            $data['metrics'][]=['field'=>$field,'direction'=>$direction,'weight'=>$part];
        }
        if (abs($weight-100)>0.001) throw new AdminException('指标权重合计须为100%');
        $adjustments=$input['adjustments']??[];
        if (!is_array($adjustments) || count($adjustments)>200) throw new AdminException('最多调整200个对象');
        $data['adjustments']=[]; $seen=[];
        foreach ($adjustments as $adjustment) {
            if (!is_array($adjustment)) throw new AdminException('权重调整格式不正确');
            $id=self::integer($adjustment['id']??0,1,2147483647,'调整对象');
            if (isset($seen[$id])) throw new AdminException('同一对象只能调整一次');
            $seen[$id]=true;
            $reason=self::text($adjustment['reason']??'',100,'调整原因');
            if ($reason==='') throw new AdminException('请填写权重调整原因');
            $data['adjustments'][]=['id'=>$id,'factor'=>self::number($adjustment['factor']??1,0,10,'权重系数'),'bonus'=>self::number($adjustment['bonus']??0,-100,100,'加减分'),'reason'=>$reason];
        }
        return $data;
    }
    public static function status(array $rule, int $now): string
    {
        if (empty($rule['enabled']) || !empty($rule['is_del'])) return 'disabled';
        if ($rule['start_time']>$now) return 'upcoming';
        if ($rule['end_time'] && $rule['end_time']<=$now) return 'ended';
        return 'running';
    }
    public static function matches(array $row, array $rule, array $customer=[]): bool
    {
        if (in_array((int)$row['id'],$rule['exclude_ids'],true)) return false;
        if(isset($rule['condition_tree']))return RankingConditionTree::matches($rule['condition_tree'],$row,$rule['entity_type'],$customer);
        $matches=[];
        foreach ($rule['conditions'] as $condition) {
            $actual=$row[$condition['field']]??0; $value=$condition['value'];
            switch ($condition['op']) {
                case 'contains': $ok=mb_stripos((string)$actual,$value)!==false; break;
                case 'in': case 'not_in':
                    $ok=(bool)array_intersect((array)$actual,$value);
                    if ($condition['op']==='not_in') $ok=!$ok;
                    break;
                case 'gte': $ok=$actual >= $value; break;
                case 'lte': $ok=$actual <= $value; break;
                default: $ok=false;
            }
            $matches[]=$ok;
        }
        return !$matches || ($rule['match_mode']==='all' ? !in_array(false,$matches,true) : in_array(true,$matches,true));
    }
    public static function rank(array $candidates, array $rule, array $customer=[]): array
    {
        $candidates=array_values(array_filter($candidates,function($row)use($rule,$customer){return self::matches($row,$rule,$customer);}));
        if (!$candidates) return ['list'=>[],'candidate_count'=>0];
        $ranges=[];
        foreach ($rule['metrics'] as $metric) {
            $values=array_column($candidates,$metric['field']);
            $ranges[$metric['field']]=[min($values),max($values)];
        }
        $adjustments=array_column($rule['adjustments'],null,'id');
        foreach ($candidates as &$row) {
            $score=0; $parts=[];
            foreach ($rule['metrics'] as $metric) {
                $field=$metric['field']; [$min,$max]=$ranges[$field]; $raw=(float)$row[$field];
                $normalized=$max>$min ? 100*($raw-$min)/($max-$min) : ($max>0?100:0);
                if ($metric['direction']==='asc' && $max>$min) $normalized=100-$normalized;
                // No reviews never outrank reviewed products by requesting ascending rating.
                if ($field==='rating' && empty($row['reviews'])) $normalized=0;
                $score+=$normalized*$metric['weight']/100;
                $parts[]=['field'=>$field,'raw'=>$raw,'normalized'=>round($normalized,4),'weight'=>$metric['weight']];
            }
            $adjust=$adjustments[$row['id']]??['factor'=>1,'bonus'=>0,'reason'=>''];
            // Preserve precision through sorting: rounding early can invert close single-metric ranks.
            $row['base_score']=$score; $row['score']=$score*$adjust['factor']+$adjust['bonus'];
            $row['adjustment']=$adjust; $row['score_parts']=$parts;
        }
        unset($row);
        usort($candidates,function($a,$b){return ($b['score']<=>$a['score']) ?: (($b['base_score']<=>$a['base_score']) ?: ($a['id']<=>$b['id']));});
        $count=count($candidates); $candidates=array_slice($candidates,0,$rule['top_n']);
        foreach ($candidates as $index=>&$row) { $row['rank']=$index+1; $row['base_score']=round($row['base_score'],6); $row['score']=round($row['score'],6); }
        return ['list'=>$candidates,'candidate_count'=>$count];
    }
}
