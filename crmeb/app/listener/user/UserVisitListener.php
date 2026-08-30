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
namespace app\listener\user;


use app\services\product\product\StoreVisitServices;
use crmeb\interfaces\ListenerInterface;

/**
 * 写入用户访问
 * Class UserVisitListener
 * @package app\listener\user
 */
class UserVisitListener implements ListenerInterface
{
    public function handle($event): void
    {
        [$uid, $product_id, $product_type, $cate, $type] = $event;

        //写入用户访问记录
        /** @var StoreVisitServices $storeVisit */
        $storeVisit = app()->make(StoreVisitServices::class);
        $storeVisit->setView($uid, $product_id, $product_type, $cate, $type);
    }
}