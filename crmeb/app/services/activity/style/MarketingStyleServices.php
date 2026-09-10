<?php
declare(strict_types=1);
namespace app\services\activity\style;

use app\dao\activity\style\MarketingStyleDao;
use app\services\BaseServices;
use app\services\product\product\ProductBrandInstaller;
use crmeb\exceptions\AdminException;
use think\facade\Db;

class MarketingStyleServices extends BaseServices
{
    public function __construct(MarketingStyleDao $dao) { $this->dao = $dao; }

    private function hydrate($row): array
    {
        $row = is_array($row) ? $row : $row->toArray();
        $row['scope_ids'] = is_array($row['scope_ids']) ? $row['scope_ids'] : json_decode($row['scope_ids'], true);
        if (!is_array($row['scope_ids'])) throw new AdminException('营销样式范围数据损坏');
        foreach (['id','enabled','priority','start_time','end_time','add_time','update_time'] as $key) $row[$key] = (int)$row[$key];
        $row['status'] = MarketingStyleConfig::status($row, time());
        $row['status_name'] = ['disabled'=>'已停用','upcoming'=>'未开始','running'=>'进行中','ended'=>'已结束'][$row['status']];
        $row['kind_name'] = $row['kind'] === 'border' ? '营销边框' : '活动氛围';
        return $row;
    }

    public function styleList(array $filters): array
    {
        MarketingStyleInstaller::ensureSchema();
        [$page,$limit,$default] = $this->getPageValue();
        $query = $this->dao->query($filters);
        $count = (clone $query)->count();
        $list = $query->order('priority desc,id desc')->page(max(1,$page), min(100,max(1,$limit ?: $default)))->select()->toArray();
        foreach ($list as &$row) {
            $row = $this->hydrate($row);
            $row['product_count'] = $this->productQuery($row['scope_type'], $row['scope_ids'])->count();
        }
        return compact('list','count');
    }

    public function info(int $id): array
    {
        MarketingStyleInstaller::ensureSchema();
        $row = $this->dao->query()->where('id',$id)->find();
        if (!$row) throw new AdminException('营销样式不存在或已删除');
        $row = $this->hydrate($row);
        $row['scope_items'] = [];
        if ($row['scope_type'] !== 'all') {
            $type = ['products'=>'product','categories'=>'category','brands'=>'brand','labels'=>'label'][$row['scope_type']];
            $items = $this->optionQuery($type)->whereIn('id',$row['scope_ids'])->select()->toArray();
            $items = array_column($items,null,'id');
            foreach ($row['scope_ids'] as $itemId) $row['scope_items'][] = $items[$itemId] ?? ['id'=>$itemId,'name'=>'已失效 #'.$itemId,'unavailable'=>true];
        }
        return $row;
    }

    private function optionQuery(string $type)
    {
        switch ($type) {
            case 'product': return Db::name('store_product')->where('is_del',0)->field('id,store_name as name,image,price');
            case 'category': return Db::name('store_category')->field('id,cate_name as name,pid');
            case 'brand': ProductBrandInstaller::ensureSchema(); return Db::name('store_product_brand')->field('id,name,logo as image');
            case 'label': return Db::name('store_product_label')->where('is_del',0)->field('id,name');
        }
        throw new AdminException('使用范围类型不正确');
    }

    public function options(array $filters): array
    {
        $type = (string)($filters['type'] ?? 'product');
        $query = $this->optionQuery($type);
        $keyword = trim((string)($filters['keyword'] ?? ''));
        if ($keyword !== '') {
            $column = ['product'=>'store_name','category'=>'cate_name','brand'=>'name','label'=>'name'][$type];
            $query->where(function ($q) use ($column,$keyword) { $q->whereLike($column,'%'.$keyword.'%'); if (ctype_digit($keyword)) $q->whereOr('id',(int)$keyword); });
        }
        [$page,$limit,$default] = $this->getPageValue();
        $count = (clone $query)->count();
        $list = $query->order('id desc')->page(max(1,$page),min(100,max(1,$limit ?: $default)))->select()->toArray();
        return compact('list','count');
    }

    public function saveStyle(int $id, array $input): int
    {
        MarketingStyleInstaller::ensureSchema();
        $data = MarketingStyleConfig::validate($input);
        if ($data['scope_type'] !== 'all') {
            $type = ['products'=>'product','categories'=>'category','brands'=>'brand','labels'=>'label'][$data['scope_type']];
            if ($this->optionQuery($type)->whereIn('id',$data['scope_ids'])->count() !== count($data['scope_ids'])) throw new AdminException('所选范围包含已失效项目，请重新选择');
        }
        $data['scope_ids'] = json_encode($data['scope_ids']);
        $data['update_time'] = time();
        return Db::transaction(function () use ($id,$data) {
            if ($id) {
                $row = $this->dao->query()->where('id',$id)->lock(true)->find();
                if (!$row) throw new AdminException('营销样式不存在或已删除');
                if ($row['kind'] !== $data['kind']) throw new AdminException('已创建的营销样式不能更改类型');
                $this->dao->update($id,$data);
                return $id;
            }
            $row = $this->dao->save($data + ['add_time'=>time()]);
            return (int)$row['id'];
        });
    }

    public function setEnabled(int $id, $enabled): void
    {
        if (!in_array($enabled,[0,1,'0','1',true,false],true)) throw new AdminException('启用状态不正确');
        $this->info($id);
        $this->dao->query()->where('id',$id)->update(['enabled'=>(int)(bool)$enabled,'update_time'=>time()]);
    }

    public function deleteStyle(int $id): void
    {
        $this->info($id);
        $this->dao->query()->where('id',$id)->update(['is_del'=>1,'enabled'=>0,'update_time'=>time()]);
    }

    private function categoryIds(array $roots): array
    {
        $result = array_fill_keys($roots,true);
        $categories = Db::name('store_category')->column('pid','id');
        do {
            $changed = false;
            foreach ($categories as $id=>$pid) if (isset($result[$pid]) && !isset($result[$id])) { $result[$id]=true; $changed=true; }
        } while ($changed);
        return array_map('intval',array_keys($result));
    }

    private function productQuery(string $scope, array $ids)
    {
        $query = Db::name('store_product')->where('is_del',0);
        if ($scope === 'products') $query->whereIn('id',$ids);
        elseif ($scope === 'brands') $query->whereIn('id',Db::name('store_product_brand_relation')->whereIn('brand_id',$ids)->column('product_id'));
        elseif (in_array($scope,['categories','labels'],true)) {
            $column = $scope === 'categories' ? 'cate_id' : 'label_list';
            if ($scope === 'categories') $ids = $this->categoryIds($ids);
            $query->where(function ($q) use ($column,$ids) { foreach ($ids as $id) $q->whereOr('FIND_IN_SET(:scope_id_'.$id.', '.$column.')',['scope_id_'.$id=>$id]); });
        }
        return $query;
    }

    /** Batch-resolve styles from product identities; original product images are never rewritten. */
    public function decorateProducts(array $list, string $idField = 'id'): array
    {
        if (!$list || !MarketingStyleInstaller::available()) return $list;
        $rows = $this->dao->query(['status'=>'running'])->order('priority desc,id desc')->select()->toArray();
        if (!$rows) return $list;
        $rules = array_map([$this,'hydrate'],$rows);
        $ids = array_values(array_filter(array_unique(array_map('intval',array_column($list,$idField)))));
        if (!$ids) return $list;
        $products = Db::name('store_product')->whereIn('id',$ids)->where('is_del',0)->field('id,cate_id,label_list')->select()->toArray();
        $parents = Db::name('store_category')->column('pid','id');
        $brands = [];
        if (in_array('brands',array_column($rules,'scope_type'),true)) foreach (Db::name('store_product_brand_relation')->whereIn('product_id',$ids)->select()->toArray() as $relation) $brands[$relation['product_id']][]=(int)$relation['brand_id'];
        $resolved = [];
        foreach ($products as $product) {
            $categories = [];
            foreach (array_filter(array_map('intval',explode(',',(string)$product['cate_id']))) as $category) {
                while ($category && !isset($categories[$category])) { $categories[$category]=true; $category=(int)($parents[$category]??0); }
            }
            $resolved[$product['id']] = MarketingStyleConfig::choose($rules,['ids'=>[(int)$product['id']], 'category_ids'=>array_keys($categories), 'brand_ids'=>$brands[$product['id']]??[], 'label_ids'=>array_filter(array_map('intval',explode(',',(string)$product['label_list'])))],time());
        }
        foreach ($list as &$product) {
            $style=$resolved[$product[$idField]??0]??[];
            $product['marketing_style']=['border'=>$style['border']??null,'atmosphere'=>$style['atmosphere']??null];
        }
        return $list;
    }
}
