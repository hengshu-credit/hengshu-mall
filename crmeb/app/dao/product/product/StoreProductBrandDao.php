<?php
namespace app\dao\product\product;

use app\dao\BaseDao;
use app\model\product\product\StoreProductBrand;
use think\facade\Db;

class StoreProductBrandDao extends BaseDao
{
    protected function setModel(): string
    {
        return StoreProductBrand::class;
    }

    public function brandQuery(array $where = [])
    {
        $query = $this->getModel()->db();
        if (isset($where['name']) && $where['name'] !== '') $query->whereLike('name', '%' . $where['name'] . '%');
        foreach (['status', 'is_global'] as $field) {
            if (isset($where[$field]) && $where[$field] !== '') $query->where($field, (int)$where[$field]);
        }
        if (isset($where['scope'])) {
            $ids = $where['scope'] ? Db::name('store_product_brand_cate')->whereIn('cate_id', $where['scope'])->column('brand_id') : [];
            $query->where(function ($q) use ($ids) {
                $q->where('is_global', 1);
                if ($ids) $q->whereOr('id', 'in', $ids);
            });
        }
        return $query;
    }
}
