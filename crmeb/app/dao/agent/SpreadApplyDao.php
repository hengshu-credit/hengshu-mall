<?php
// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2026 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------
namespace app\dao\agent;

use app\dao\BaseDao;
use app\model\agent\SpreadApply;

class SpreadApplyDao extends BaseDao
{
    protected function setModel(): string
    {
        return SpreadApply::class;
    }

    public function getConditionModel($where)
    {
        return $this->getModel()->where('is_del', 0)
            ->when($where['status'] !== '' && $where['status'] !== 'all', function ($query) use ($where) {
                $query->where('status', $where['status']);
            })->when($where['keyword'] !== '', function ($query) use ($where) {
                $query->whereLike('uid|nickname|real_name|phone', $where['keyword']);
            });
    }

    public function applyList($where, $page = 0, $limit = 0)
    {
        return $this->getConditionModel($where)->order('id desc')->when($page != 0, function ($query) use ($page, $limit) {
            $query->page($page, $limit);
        })->select()->toArray();
    }

    public function applyCount($where)
    {
        return $this->getConditionModel($where)->count();
    }
}