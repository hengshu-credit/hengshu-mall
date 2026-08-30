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
namespace app\adminapi\controller\v1\agent;

use app\adminapi\controller\AuthController;
use app\services\agent\SpreadApplyServices;
use think\facade\App;

class SpreadApply extends AuthController
{
    /**
     * @var SpreadApplyServices
     */
    protected $services;

    /**
     * SpreadApply constructor.
     * @param App $app
     * @param SpreadApplyServices $services
     */
    public function __construct(App $app, SpreadApplyServices $services)
    {
        parent::__construct($app);
        $this->services = $services;
    }

    /**
     * 申请列表
     * @return mixed
     */
    public function applyList()
    {
        $where = $this->request->getMore([
            ['status', ''],
            ['keyword', ''],
        ]);
        return app('json')->success($this->services->applyList($where));
    }

    /**
     * 审核申请
     * @param $id
     * @param $uid
     * @param $status
     * @return mixed
     */
    public function applyExamine($id, $uid, $status)
    {
        [$refusal_reason] = $this->request->postMore([
            ['refusal_reason', ''],
        ], true);
        $this->services->applyExamine($id, $uid, $status, $refusal_reason);
        return app('json')->success($status == 1 ? '审核通过' : '拒绝成功');
    }

    /**
     * 删除申请
     * @param $id
     * @return mixed
     */
    public function applyDelete($id)
    {
        $this->services->applyDelete($id);
        return app('json')->success('删除成功');
    }
}
