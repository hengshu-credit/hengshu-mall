<?php
namespace app\services\merchant;

use crmeb\exceptions\ApiException;
use think\facade\Db;

/** Public storefront projections. Never serialize the private merchant dossier. */
class MerchantStorefrontServices
{
    public function shops(array $filters = [], int $page = 1, int $limit = 20): array
    {
        MerchantInstaller::ensure();
        $query = Db::name('merchant_shop')->where('state', 'open')->where('audit_status', 'approved');
        if (!empty($filters['keyword'])) $query->whereLike('name', '%' . mb_substr(trim($filters['keyword']), 0, 80) . '%');
        if (!empty($filters['type_id'])) $query->where('type_id', (int)$filters['type_id']);
        $ids = array_slice(array_values(array_filter(array_map('intval', (array)($filters['ids'] ?? [])))), 0, 100);
        if ($ids) $query->whereIn('id', $ids);
        // Validity must be checked before pagination (expired dossiers are not public).
        $rows = $query->order('is_platform desc,id desc')->select()->toArray();
        $valid = array_values(array_filter($rows, function ($row) { return (new MerchantServices())->available($row); }));
        if ($ids) usort($valid, function ($a, $b) use ($ids) { return array_search((int)$a['id'], $ids) <=> array_search((int)$b['id'], $ids); });
        $slice = array_slice($valid, (max(1, $page) - 1) * min(50, max(1, $limit)), min(50, max(1, $limit)));
        return ['list' => array_map([$this, 'publicShop'], $slice), 'count' => count($valid)];
    }

    public function shop(int $id): array
    {
        MerchantInstaller::ensure();
        $row = Db::name('merchant_shop')->where('id', $id)->find();
        if (!$row || !(new MerchantServices())->available($row)) throw new ApiException('店铺暂未营业或不存在');
        $shop = $this->publicShop($row);
        $profile = MerchantVault::decrypt($row['profile']);
        $shop['shop_page'] = MerchantShopPages::page((int)($profile['shop_page_id'] ?? 0));
        $shop['categories'] = $this->categories($id);
        return $shop;
    }

    private function publicShop(array $row): array
    {
        $profile = MerchantVault::decrypt($row['profile']);
        $products = Db::name('store_product')->where('seller_shop_id', (int)$row['id'])->where('is_show', 1)->where('is_del', 0);
        $scores = Db::name('store_product_reply')->whereIn('product_id', Db::raw((clone $products)->field('id')->buildSql(false)))
            ->where('is_del', 0)->where('status', 1)->where('reply_type', 'product')
            ->field('COUNT(*) AS total,AVG(product_score) AS product_score,AVG(service_score) AS service_score')->find();
        return ['id' => (int)$row['id'], 'name' => $row['name'], 'logo' => set_file_url($profile['logo'] ?? ''),
            'description' => $profile['description'] ?? '', 'type_id' => (int)$row['type_id'],
            'product_count' => (clone $products)->count(), 'review_count' => (int)($scores['total'] ?? 0),
            'product_score' => !empty($scores['total']) ? round((float)$scores['product_score'], 1) : null,
            'service_score' => !empty($scores['total']) ? round((float)$scores['service_score'], 1) : null];
    }

    public static function decorateProducts(array $products): array
    {
        if (!$products) return [];
        MerchantInstaller::ensure();
        $ids = array_column($products, 'id');
        $owners = Db::name('store_product')->whereIn('id', $ids)->column('seller_shop_id', 'id');
        $shops = Db::name('merchant_shop')->whereIn('id', array_unique(array_values($owners)) ?: [-1])->column('name', 'id');
        foreach ($products as &$product) {
            $id = (int)($owners[$product['id']] ?? 0);
            $product['seller_shop_id'] = $id;
            $product['merchant_name'] = $id ? ($shops[$id] ?? '') : '';
        }
        return $products;
    }

    public function categories(int $shopId): array
    {
        $this->assertShop($shopId);
        $productIds = Db::raw($this->productQuery(['shop_id' => $shopId])->field('id')->buildSql(false));
        $links = Db::name('store_product_cate')->whereIn('product_id', $productIds)->field('cate_id,cate_pid')->select()->toArray();
        $ids = array_unique(array_merge(array_column($links, 'cate_id'), array_column($links, 'cate_pid')));
        if (!$ids) return [];
        $categories = Db::name('store_category')->where('is_show', 1)->whereIn('id', $ids)->field('id,pid,cate_name,pic,big_pic')->order('sort desc,id desc')->select()->toArray();
        $parents = []; $children = [];
        foreach ($categories as $category) {
            $category['pic'] = set_file_url($category['pic']);
            $category['big_pic'] = set_file_url($category['big_pic']);
            if (!(int)$category['pid']) $parents[] = $category;
            else $children[$category['pid']][] = $category;
        }
        foreach ($parents as &$category) $category['children'] = $children[$category['id']] ?? [];
        return $parents;
    }

    private function productQuery(array $filters)
    {
        $query = MerchantProducts::constrain(Db::name('store_product')->where('is_show', 1)->where('is_del', 0));
        if (!empty($filters['shop_id'])) $query->where('seller_shop_id', (int)$filters['shop_id']);
        if (!empty($filters['category_id'])) $query->whereIn('id', function ($sub) use ($filters) {
            $sub->name('store_product_cate')->where(function ($cate) use ($filters) {
                $cate->where('cate_id', (int)$filters['category_id'])->whereOr('cate_pid', (int)$filters['category_id']);
            })->field('product_id');
        });
        if (!empty($filters['keyword'])) $query->whereLike('store_name', '%' . mb_substr(trim($filters['keyword']), 0, 80) . '%');
        $fields = ['new' => 'is_new', 'best' => 'is_best', 'benefit' => 'is_benefit', 'hot' => 'is_hot'];
        if (isset($fields[$filters['recommend'] ?? ''])) $query->where($fields[$filters['recommend']], 1);
        return $query;
    }

    public function products(array $filters = [], int $page = 1, int $limit = 20): array
    {
        if (!empty($filters['shop_id'])) $this->assertShop((int)$filters['shop_id']);
        $query = $this->productQuery($filters);
        $orders = ['default' => 'sort desc,id desc', 'sales' => 'sales desc,id desc', 'new' => 'add_time desc,id desc', 'price_asc' => 'price asc,id desc', 'price_desc' => 'price desc,id desc'];
        $count = (clone $query)->count();
        $rows = $query->field('id,store_name,image,price,ot_price,sales,stock,unit_name,seller_shop_id,activity,is_vip,vip_price')
            ->order($orders[$filters['sort'] ?? 'default'] ?? $orders['default'])->page(max(1, $page), min(50, max(1, $limit)))->select()->toArray();
        return ['list' => $this->publicProducts($rows), 'count' => $count];
    }

    private function assertShop(int $id): void
    {
        $row = (new MerchantServices())->rawShop($id);
        if (!(new MerchantServices())->available($row)) throw new ApiException('店铺暂未营业');
    }

    private function publicProducts(array $rows): array
    {
        foreach ($rows as &$row) { $row['image'] = set_file_url($row['image']); $row['label_list'] = []; }
        unset($row);
        $rows = self::decorateProducts($rows);
        return app()->make(\app\services\activity\style\MarketingStyleServices::class)->decorateProducts($rows);
    }

    /** Both the list and detail badge use this exact ordering and eligibility. */
    public function ranking(array $filters = [], int $top = 20): array
    {
        if (!empty($filters['shop_id'])) $this->assertShop((int)$filters['shop_id']);
        $query = $this->productQuery($filters);
        if (($filters['type'] ?? 'sales') === 'rating') {
            $reviews = Db::name('store_product_reply')->where('is_del', 0)->where('status', 1)->where('reply_type', 'product')
                ->group('product_id')->field('product_id,COUNT(*) AS reviews,AVG(product_score) AS score,SUM(CASE WHEN product_score >= 4 THEN 1 ELSE 0 END)/COUNT(*) AS positive_rate')->buildSql();
            $table = Db::name('store_product')->getTable();
            $query->join([$reviews => 'rank_reviews'], 'rank_reviews.product_id=' . $table . '.id')
                ->field($table . '.*,rank_reviews.reviews,rank_reviews.score,rank_reviews.positive_rate')
                ->order('rank_reviews.positive_rate desc,rank_reviews.reviews desc,rank_reviews.score desc,' . $table . '.id desc');
        } else $query->where('sales', '>', 0)->order('sales desc,id desc');
        $rows = $query->limit(min(100, max(1, $top)))->select()->toArray();
        // Keep the API projection small, excluding product internals/cost prices.
        $fields = array_flip(['id','store_name','image','price','ot_price','sales','stock','unit_name','activity','seller_shop_id','score','reviews','positive_rate']);
        $rows = array_map(function ($row) use ($fields) { return array_intersect_key($row, $fields); }, $rows);
        foreach ($rows as $index => &$row) $row['rank'] = $index + 1;
        unset($row);
        return $this->publicProducts($rows);
    }

    public function productRank(int $productId, array $filters = [], int $top = 20): ?array
    {
        $product = $this->productQuery([])->where('id', $productId)->find();
        if (!$product) return null;
        if (($filters['scope'] ?? 'category') === 'category' && empty($filters['category_id'])) {
            $filters['category_id'] = (int)Db::name('store_product_cate')->where('product_id', $productId)->order('cate_id')->value('cate_id');
            if (!$filters['category_id']) return null;
        }
        if (($filters['scope'] ?? '') === 'shop') {
            if (empty($product['seller_shop_id'])) return null;
            $filters['shop_id'] = (int)$product['seller_shop_id'];
        }
        $rankings = $this->ranking($filters, $top);
        foreach ($rankings as $row) if ((int)$row['id'] === $productId) return [
            'rank' => $row['rank'], 'type' => $filters['type'] ?? 'sales', 'shop_id' => (int)($filters['shop_id'] ?? 0),
            'category_id' => (int)($filters['category_id'] ?? 0), 'top' => min(100, max(1, $top)),
            'category_name' => !empty($filters['category_id']) ? (Db::name('store_category')->where('id', $filters['category_id'])->value('cate_name') ?: '') : '',
        ];
        return null;
    }
}
