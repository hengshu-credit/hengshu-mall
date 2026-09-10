<?php
namespace app\services\product\product;

use app\dao\product\product\StoreProductBrandDao;
use app\services\BaseServices;
use crmeb\exceptions\AdminException;
use think\db\exception\PDOException;
use think\facade\Db;

class StoreProductBrandServices extends BaseServices
{
    public function __construct(StoreProductBrandDao $dao)
    {
        $this->dao = $dao;
        ProductBrandInstaller::ensureSchema();
    }

    private function categories(): array
    {
        return Db::name('store_category')->column('id,pid,cate_name', 'id');
    }

    public function brandList(array $where): array
    {
        [$page, $limit, $defaultLimit] = $this->getPageValue();
        if (!empty($where['cate_id'])) $where['scope'] = ProductBrandScope::ancestors(ProductBrandScope::ids([$where['cate_id']]), $this->categories());
        $count = $this->dao->brandQuery($where)->count();
        $list = $this->dao->brandQuery($where)->order('sort desc,id desc')->page(max(1, $page), $limit ?: $defaultLimit)->select()->toArray();
        return ['list' => $this->hydrate($list), 'count' => $count];
    }

    public function brandInfo(int $id): array
    {
        $brand = $this->dao->brandQuery()->where('id', $id)->find();
        if (!$brand) throw new AdminException('品牌不存在');
        return $this->hydrate([$brand->toArray()])[0];
    }

    private function hydrate(array $brands): array
    {
        if (!$brands) return [];
        $ids = array_column($brands, 'id');
        $links = Db::name('store_product_brand_cate')->whereIn('brand_id', $ids)->select()->toArray();
        $counts = Db::name('store_product_brand_relation')->whereIn('brand_id', $ids)->group('brand_id')->column('COUNT(*) AS total', 'brand_id');
        $categories = $this->categories();
        foreach ($brands as &$brand) {
            foreach (['id', 'sort', 'status', 'is_global'] as $key) $brand[$key] = (int)$brand[$key];
            $brand['cate_ids'] = $brand['cate_names'] = [];
            foreach ($links as $link) {
                if ((int)$link['brand_id'] !== $brand['id']) continue;
                $id = (int)$link['cate_id'];
                $brand['cate_ids'][] = $id;
                $brand['cate_names'][] = $categories[$id]['cate_name'] ?? '已删除分类';
            }
            $brand['product_count'] = (int)($counts[$brand['id']] ?? 0);
        }
        return $brands;
    }

    public function saveBrand(int $id, array $data): int
    {
        if (!is_string($data['name'] ?? null)) throw new AdminException('请输入品牌名称');
        $data['name'] = trim($data['name']);
        if ($data['name'] === '' || mb_strlen($data['name']) > 100) throw new AdminException('品牌名称需为1至100个字符');
        foreach (['status', 'is_global'] as $field) {
            if (!in_array($data[$field] ?? null, [0, 1, '0', '1'], true)) throw new AdminException('品牌状态或适用范围不正确');
            $data[$field] = (int)$data[$field];
        }
        if (filter_var($data['sort'] ?? null, FILTER_VALIDATE_INT) === false || $data['sort'] < 0 || $data['sort'] > 999999) throw new AdminException('排序需为0至999999的整数');
        $data['sort'] = (int)$data['sort'];
        foreach (['logo' => 512, 'description' => 1000] as $field => $length) {
            if (!is_string($data[$field] ?? null) || mb_strlen($data[$field]) > $length) throw new AdminException('品牌图片或简介长度不正确');
            $data[$field] = trim($data[$field]);
        }
        if ($data['logo'] !== '' && !preg_match('#^(https?://[^\\s]+|/(?!/)[^\\s]*)$#D', $data['logo'])) throw new AdminException('品牌图片地址不正确');
        $cateIds = ProductBrandScope::ids($data['cate_ids'] ?? []);
        if ($data['is_global']) $cateIds = [];
        elseif (!$cateIds) throw new AdminException('请至少选择一个适用分类');
        ProductBrandScope::ancestors($cateIds, $this->categories());
        unset($data['cate_ids']);
        $data = array_intersect_key($data, array_flip(['name', 'logo', 'description', 'sort', 'status', 'is_global']));
        try {
            return $this->transaction(function () use ($id, $data, $cateIds) {
                if ($id && !Db::name('store_product_brand')->where('id', $id)->lock(true)->find()) throw new AdminException('品牌不存在');
                if (Db::name('store_product_brand')->where('name', $data['name'])->where('id', '<>', $id)->count()) throw new AdminException('品牌名称已存在');
                if ($id) Db::name('store_product_brand')->where('id', $id)->update($data);
                else $id = Db::name('store_product_brand')->insertGetId($data + ['add_time' => time()]);
                Db::name('store_product_brand_cate')->where('brand_id', $id)->delete();
                if ($cateIds) Db::name('store_product_brand_cate')->insertAll(array_map(function ($cateId) use ($id) { return ['brand_id' => $id, 'cate_id' => $cateId]; }, $cateIds));
                return (int)$id;
            });
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), '1062') !== false) throw new AdminException('品牌名称已存在');
            throw $e;
        }
    }

    public function setBrandStatus(int $id, $status): void
    {
        if (!in_array($status, [0, 1, '0', '1'], true)) throw new AdminException('品牌状态不正确');
        $this->brandInfo($id);
        Db::name('store_product_brand')->where('id', $id)->update(['status' => (int)$status]);
    }

    public function deleteBrand(int $id): void
    {
        $this->transaction(function () use ($id) {
            if (!Db::name('store_product_brand')->where('id', $id)->lock(true)->find()) throw new AdminException('品牌不存在');
            if (Db::name('store_product_brand_relation')->where('brand_id', $id)->count()) throw new AdminException('该品牌已关联商品，请先解除关联或停用品牌');
            Db::name('store_product_brand_cate')->where('brand_id', $id)->delete();
            Db::name('store_product_brand')->where('id', $id)->delete();
        });
    }

    public function options($cateIds, $selectedIds = []): array
    {
        $scope = ProductBrandScope::ancestors(ProductBrandScope::ids($cateIds), $this->categories());
        $selectedIds = ProductBrandScope::ids($selectedIds);
        $brands = $this->dao->brandQuery(['status' => 1, 'scope' => $scope])->order('sort desc,name asc,id asc')->select()->toArray();
        $availableIds = array_map('intval', array_column($brands, 'id'));
        $missing = array_values(array_diff($selectedIds, $availableIds));
        if ($missing) $brands = array_merge($brands, $this->dao->brandQuery()->whereIn('id', $missing)->select()->toArray());
        $brands = array_map(function ($brand) use ($availableIds) {
            return ['id' => (int)$brand['id'], 'name' => $brand['name'], 'logo' => $brand['logo'], 'available' => in_array((int)$brand['id'], $availableIds, true)];
        }, $brands);
        foreach (array_diff($selectedIds, array_column($brands, 'id')) as $id) $brands[] = ['id' => $id, 'name' => '已删除品牌 #' . $id, 'logo' => '', 'available' => false];
        return $brands;
    }

    public function productBrandIds(int $productId): array
    {
        return array_map('intval', Db::name('store_product_brand_relation')->where('product_id', $productId)->order('brand_id')->column('brand_id'));
    }

    public function productBrands(int $productId): array
    {
        $ids = $this->productBrandIds($productId);
        return $ids ? $this->hydrate($this->dao->brandQuery()->whereIn('id', $ids)->order('id')->select()->toArray()) : [];
    }

    /** Call inside the product transaction so invalid selections roll back every product change. */
    public function syncProductBrands(int $productId, $brandIds, array $cateIds): void
    {
        $brandIds = ProductBrandScope::ids($brandIds);
        sort($brandIds);
        if ($brandIds) {
            $brands = Db::name('store_product_brand')->whereIn('id', $brandIds)->order('id')->lock(true)->select()->toArray();
            if (count($brands) !== count($brandIds)) throw new AdminException('所选品牌不存在，请重新选择');
            $scope = ProductBrandScope::ancestors(ProductBrandScope::ids($cateIds), $this->categories());
            $applicable = $scope ? Db::name('store_product_brand_cate')->whereIn('brand_id', $brandIds)->whereIn('cate_id', $scope)->column('brand_id') : [];
            foreach ($brands as $brand) {
                if (!(int)$brand['status'] || (!(int)$brand['is_global'] && !in_array($brand['id'], $applicable))) throw new AdminException('品牌“' . $brand['name'] . '”已停用或不适用于当前商品分类，请重新选择');
            }
        }
        Db::name('store_product_brand_relation')->where('product_id', $productId)->delete();
        if ($brandIds) Db::name('store_product_brand_relation')->insertAll(array_map(function ($id) use ($productId) { return ['product_id' => $productId, 'brand_id' => $id]; }, $brandIds));
    }
}
