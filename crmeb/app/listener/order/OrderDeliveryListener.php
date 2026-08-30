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
namespace app\listener\order;


use app\jobs\TakeOrderJob;
use crmeb\interfaces\ListenerInterface;

/**
 * 订单到期自动收货
 * Class OrderDeliveryListener
 * @package app\listener\order
 */
class OrderDeliveryListener implements ListenerInterface
{
    public function handle($event): void
    {
        [$orderInfo, $storeTitle, $data, $type] = $event;

        //到期自动收货
        $time = sys_config('system_delivery_time') ?? 0;
        if ($time != 0) {
            $sevenDay = 24 * 3600 * $time;
            $sevenDay = $sevenDay + 180;
            TakeOrderJob::dispatchSecs((int)$sevenDay, [$orderInfo->id]);
        }
    }
}
