<?php
namespace app\dao\activity\style;
use app\dao\BaseDao;
use app\model\activity\style\MarketingStyle;
class MarketingStyleDao extends BaseDao
{
    protected function setModel(): string { return MarketingStyle::class; }
    public function query(array $filters = [])
    {
        $query = $this->getModel()->db()->where('is_del', 0);
        if (($filters['keyword'] ?? '') !== '') {
            $keyword = trim((string)$filters['keyword']);
            $query->where(function ($q) use ($keyword) { $q->whereLike('name', '%' . $keyword . '%'); if (ctype_digit($keyword)) $q->whereOr('id', (int)$keyword); });
        }
        if (in_array($filters['kind'] ?? '', ['border','atmosphere'], true)) $query->where('kind', $filters['kind']);
        if (isset($filters['enabled']) && in_array($filters['enabled'], ['0','1',0,1], true)) $query->where('enabled', (int)$filters['enabled']);
        $now = time();
        switch ($filters['status'] ?? '') {
            case 'disabled': $query->where('enabled', 0); break;
            case 'upcoming': $query->where('enabled', 1)->where('start_time', '>', $now); break;
            case 'running': $query->where('enabled', 1)->where('start_time', '<=', $now)->where('end_time', '>', $now); break;
            case 'ended': $query->where('enabled', 1)->where('end_time', '<=', $now); break;
        }
        // Date filters select campaigns whose display intervals overlap the requested period.
        if (!empty($filters['from'])) $query->where('end_time', '>=', (int)$filters['from']);
        if (!empty($filters['to'])) $query->where('start_time', '<=', (int)$filters['to']);
        return $query;
    }
}
