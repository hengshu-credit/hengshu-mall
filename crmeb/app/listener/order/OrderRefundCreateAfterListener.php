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

use app\jobs\RefundOrderJob;
use app\services\order\OutStoreOrderRefundServices;
use crmeb\interfaces\ListenerInterface;

/**
 * 售后单生成
 * Class orderRefundCreateAfter
 * @package app\listener\order
 */
class OrderRefundCreateAfterListener implements ListenerInterface
{
    public function handle($event): void
    {
        [$order] = $event;
    }
}
