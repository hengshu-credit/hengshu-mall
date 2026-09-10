<?php
namespace app\services\activity\fullreduction;

use app\dao\activity\fullreduction\StoreFullReductionDao;
use app\services\BaseServices;
use crmeb\exceptions\AdminException;
use think\facade\Db;

class StoreFullReductionServices extends BaseServices
{
    private const JSON_FIELDS = ['rules', 'product_ids', 'level_ids', 'member_ids'];

    public function __construct(StoreFullReductionDao $dao)
    {
        $this->dao = $dao;
        FullReductionInstaller::ensureSchema();
    }

    public function activityList(array $where): array
    {
        if (!is_string($where['name'] ?? '') || mb_strlen($where['name'] ?? '') > 60) throw new AdminException('活动名称查询条件不正确');
        if (!in_array($where['state'] ?? '', ['', 'pending', 'running', 'ended', 'disabled'], true)) throw new AdminException('活动状态查询条件不正确');
        if (!in_array($where['status'] ?? '', ['', 0, 1, '0', '1'], true)) throw new AdminException('启用状态查询条件不正确');
        [$page, $limit, $default] = $this->getPageValue();
        $now = time();
        $sort = in_array($where['sort_field'] ?? '', ['sort', 'start_time', 'end_time', 'status', 'id'], true) ? $where['sort_field'] : 'sort';
        $direction = ($where['sort_order'] ?? '') === 'descending' ? 'desc' : 'asc';
        $query = $this->dao->activityQuery($where, $now);
        $count = (clone $query)->count();
        $list = $query->order($sort . ' ' . $direction . ',id desc')->page(max(1, $page), min(100, max(1, $limit ?: $default)))->select()->toArray();
        return ['list' => array_map(function ($row) use ($now) { return $this->hydrate($row, $now); }, $list), 'count' => $count];
    }

    private function hydrate(array $row, ?int $now = null): array
    {
        foreach (self::JSON_FIELDS as $key) {
            $row[$key] = is_array($row[$key]) ? $row[$key] : json_decode($row[$key], true);
            if (!is_array($row[$key])) throw new AdminException('活动配置数据损坏，请联系管理员');
        }
        foreach (['id', 'start_time', 'end_time', 'unit', 'rules_type', 'discount_type', 'range_type', 'status', 'sort'] as $key) $row[$key] = (int)$row[$key];
        $row['state'] = FullReductionConfig::activityState($row, $now ?? time());
        $row['state_name'] = ['pending' => '未开始', 'running' => '进行中', 'ended' => '已结束', 'disabled' => '已停用'][$row['state']];
        $row['type_name'] = ($row['unit'] === 1 ? '满额' : '满件') . ($row['discount_type'] === 1 ? '减价' : '折扣');
        $row['start_time_text'] = date('Y-m-d H:i:s', $row['start_time']);
        $row['end_time_text'] = date('Y-m-d H:i:s', $row['end_time']);
        return $row;
    }

    private function findActivity(int $id, bool $lock = false): array
    {
        $row = $this->dao->activityQuery()->where('id', $id)->lock($lock)->find();
        if (!$row) throw new AdminException('满减活动不存在或已删除');
        return $this->hydrate($row->toArray());
    }

    public function activityInfo(int $id): array
    {
        $row = $this->findActivity($id);
        $row['products'] = $this->selectedOptions('product', $row['product_ids']);
        $row['levels'] = $this->selectedOptions('level', $row['level_ids']);
        $row['members'] = $row['member_type'] === 'all' ? [] : $this->selectedOptions($row['member_type'], $row['member_ids']);
        return $row;
    }

    private function optionQuery(string $type)
    {
        switch ($type) {
            case 'product': return Db::name('store_product')->where('is_del', 0)->where('presale', 0)->field('id,store_name as name,image,price,is_show');
            case 'level': return Db::name('system_user_level')->where('is_del', 0)->where('is_show', 1)->field('id,name');
            case 'tag': return Db::name('user_label')->field('id,label_name as name');
            case 'user': return Db::name('user')->where('is_del', 0)->where('status', 1)->field('uid as id,nickname as name,avatar as image');
        }
        throw new AdminException('选择项类型不正确');
    }

    private function selectedOptions(string $type, array $ids): array
    {
        if (!$ids) return [];
        $options = $this->optionQuery($type)->whereIn($type === 'user' ? 'uid' : 'id', $ids)->select()->toArray();
        $byId = array_column($options, null, 'id');
        return array_map(function ($id) use ($byId) {
            $option = $byId[$id] ?? ['id' => $id, 'name' => '已失效 #' . $id, 'unavailable' => true];
            $option['id'] = (int)$option['id'];
            return $option;
        }, $ids);
    }

    public function options(array $where): array
    {
        $type = $where['type'] ?? '';
        if (!is_string($type)) throw new AdminException('选择项类型不正确');
        if ($type === 'product_filters') return $this->productFilters();
        $query = $this->optionQuery($type);
        if ($type === 'product') $this->filterProducts($query, $where);
        $keyword = $where['keyword'] ?? '';
        if (!is_string($keyword) || mb_strlen($keyword) > 60) throw new AdminException('搜索关键词不能超过60个字符');
        $pk = $type === 'user' ? 'uid' : 'id';
        $name = ['product' => 'store_name', 'level' => 'name', 'tag' => 'label_name', 'user' => 'nickname'][$type];
        if ($keyword !== '') $query->where(function ($q) use ($keyword, $pk, $name) {
            $q->whereLike($name, '%' . $keyword . '%');
            if (ctype_digit($keyword)) $q->whereOr($pk, (int)$keyword);
        });
        [$page, $limit, $default] = $this->getPageValue();
        $count = (clone $query)->count();
        $list = $query->order($pk . ' desc')->page(max(1, $page), min(100, max(1, $limit ?: $default)))->select()->toArray();
        foreach ($list as &$row) $row['id'] = (int)$row['id'];
        return compact('list', 'count');
    }

    private function productFilters(): array
    {
        \app\services\product\product\ProductBrandInstaller::ensureSchema();
        $categories = Db::name('store_category')->field('id,pid,cate_name as label')->order('sort desc,id')->select()->toArray();
        $tree = function ($parent, array $seen = []) use (&$tree, $categories) {
            $items = [];
            foreach ($categories as $category) {
                $id = (int)$category['id'];
                if ((int)$category['pid'] !== $parent || isset($seen[$id])) continue;
                $children = $tree($id, $seen + [$id => true]);
                $item = ['value' => $id, 'label' => $category['label']];
                if ($children) $item['children'] = $children;
                $items[] = $item;
            }
            return $items;
        };
        return [
            'categories' => $tree(0),
            'brands' => Db::name('store_product_brand')->field('id,name')->order('sort desc,id')->select()->toArray(),
            'labels' => Db::name('store_product_label')->where('is_del', 0)->field('id,name')->order('sort desc,id')->select()->toArray(),
        ];
    }

    private function filterProducts($query, array $where): void
    {
        $ids = [];
        foreach (['category_id', 'brand_id', 'label_id'] as $field) {
            $value = $where[$field] ?? 0;
            $ids[$field] = in_array($value, ['', null, 0, '0'], true) ? 0 : FullReductionConfig::ids([$value])[0];
        }
        if ($ids['category_id']) {
            $categories = Db::name('store_category')->column('pid', 'id');
            if (!isset($categories[$ids['category_id']])) throw new AdminException('所选分类不存在');
            $scope = [$ids['category_id']];
            for ($i = 0; $i < count($scope); $i++) {
                foreach ($categories as $id => $parent) if ((int)$parent === $scope[$i] && !in_array((int)$id, $scope, true)) $scope[] = (int)$id;
            }
            $query->where(function ($q) use ($scope) {
                foreach ($scope as $id) $q->whereFindInSet('cate_id', $id, 'OR');
            });
        }
        if ($ids['brand_id']) {
            \app\services\product\product\ProductBrandInstaller::ensureSchema();
            $query->whereIn('id', function ($q) use ($ids) {
                $q->name('store_product_brand_relation')->where('brand_id', $ids['brand_id'])->field('product_id');
            });
        }
        if ($ids['label_id']) $query->whereFindInSet('label_list', $ids['label_id']);
    }

    private function validateSelections(array $data): void
    {
        $groups = [['product', $data['product_ids']], ['level', $data['level_ids']]];
        if ($data['member_type'] !== 'all') $groups[] = [$data['member_type'], $data['member_ids']];
        foreach ($groups as [$type, $ids]) {
            if (!$ids) continue;
            if ($this->optionQuery($type)->whereIn($type === 'user' ? 'uid' : 'id', $ids)->count() !== count($ids)) {
                throw new AdminException('所选商品、会员、标签或等级已失效，请重新选择（预售商品不参与满减）');
            }
        }
        if ($data['member_type'] === 'level' && $data['level_ids'] && !array_intersect($data['level_ids'], $data['member_ids'])) {
            throw new AdminException('适用会员等级与参与客户限制没有交集');
        }
    }

    /** All writes take the same row lock before reading activities, including first creation. */
    private function lockActivities(): void
    {
        if (!Db::name('store_full_reduction_mutex')->where('id', 1)->lock(true)->find()) throw new AdminException('满减活动尚未初始化');
    }

    private function assertNoConflict(int $id, array $data): void
    {
        if (!$data['status'] || $data['end_time'] <= time()) return;
        $others = $this->dao->activityQuery(['status' => 1])->where('id', '<>', $id)
            ->where('start_time', '<', $data['end_time'])->where('end_time', '>', max(time(), $data['start_time']))->select()->toArray();
        foreach ($others as $other) {
            $other = $this->hydrate($other);
            if (FullReductionConfig::scopesOverlap($data, $other)) throw new AdminException('与活动“' . $other['name'] . '”的商品和时间范围冲突，请调整时间或商品范围');
        }
    }

    public function saveActivity(int $id, array $input): int
    {
        $data = FullReductionConfig::normalize($input);
        return Db::transaction(function () use ($id, $data) {
            $this->lockActivities();
            $old = $id ? $this->findActivity($id, true) : null;
            if ($data['end_time'] <= time() && (!$old || $old['end_time'] !== $data['end_time'])) throw new AdminException('活动截止时间必须晚于当前时间');
            if ($data['status'] && $data['end_time'] <= time() && (!$old || !$old['status'])) throw new AdminException('活动已结束，请先修改活动时间');
            $this->validateSelections($data);
            $this->assertNoConflict($id, $data);
            foreach (self::JSON_FIELDS as $key) $data[$key] = json_encode($data[$key], JSON_UNESCAPED_UNICODE);
            $data['update_time'] = time();
            if ($id) Db::name('store_full_reduction')->where('id', $id)->update($data);
            else $id = Db::name('store_full_reduction')->insertGetId($data + ['add_time' => time()]);
            return $id;
        });
    }

    public function setActivityStatus(int $id, $status): void
    {
        if (!in_array($status, [0, 1, '0', '1'], true)) throw new AdminException('活动状态不正确');
        Db::transaction(function () use ($id, $status) {
            $this->lockActivities();
            $data = $this->findActivity($id, true);
            if ((int)$status === 1) {
                $data['status'] = 1;
                $data = FullReductionConfig::normalize($data);
                if ($data['end_time'] <= time()) throw new AdminException('活动已结束，请先修改活动时间');
                $this->validateSelections($data);
                $this->assertNoConflict($id, $data);
            }
            Db::name('store_full_reduction')->where('id', $id)->update(['status' => (int)$status, 'update_time' => time()]);
        });
    }

    public function setActivitySort(int $id, $sort): void
    {
        if ((!is_int($sort) && !is_string($sort)) || filter_var($sort, FILTER_VALIDATE_INT) === false || $sort < 0 || $sort > 999999) throw new AdminException('排序需为0至999999的整数');
        Db::transaction(function () use ($id, $sort) {
            $this->lockActivities();
            $this->findActivity($id, true);
            Db::name('store_full_reduction')->where('id', $id)->update(['sort' => (int)$sort, 'update_time' => time()]);
        });
    }

    public function deleteActivities($ids): void
    {
        $ids = FullReductionConfig::ids($ids);
        if (!$ids || count($ids) > 100) throw new AdminException('请选择1至100个要删除的活动');
        Db::transaction(function () use ($ids) {
            $this->lockActivities();
            if ($this->dao->activityQuery()->whereIn('id', $ids)->count() !== count($ids)) throw new AdminException('部分活动不存在或已删除，请刷新后重试');
            Db::name('store_full_reduction')->whereIn('id', $ids)->update(['is_del' => 1, 'status' => 0, 'update_time' => time()]);
        });
    }
}
