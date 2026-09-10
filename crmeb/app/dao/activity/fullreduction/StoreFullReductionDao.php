<?php
namespace app\dao\activity\fullreduction;

use app\dao\BaseDao;
use app\model\activity\fullreduction\StoreFullReduction;

class StoreFullReductionDao extends BaseDao
{
    protected function setModel(): string
    {
        return StoreFullReduction::class;
    }

    public function activityQuery(array $where = [], ?int $now = null)
    {
        $now = $now ?? time();
        $query = $this->getModel()->db()->where('is_del', 0);
        if (($where['name'] ?? '') !== '') $query->whereLike('name', '%' . $where['name'] . '%');
        if (($where['status'] ?? '') !== '') $query->where('status', (int)$where['status']);
        switch ($where['state'] ?? '') {
            case 'disabled': $query->where('status', 0); break;
            case 'pending': $query->where('status', 1)->where('start_time', '>', $now); break;
            case 'running': $query->where('status', 1)->where('start_time', '<=', $now)->where('end_time', '>', $now); break;
            case 'ended': $query->where('status', 1)->where('end_time', '<=', $now); break;
        }
        return $query;
    }
}
