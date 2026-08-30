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
declare (strict_types=1);

namespace app\services\message;

use app\dao\system\MessageSystemDao;
use app\services\BaseServices;
use crmeb\exceptions\ApiException;

/**
 * 站内信services类
 * Class MessageSystemServices
 * @package app\services\system
 * @method save(array $data) 保存数据
 * @method mixed saveAll(array $data) 批量保存数据
 * @method update($id, array $data, ?string $key = null) 修改数据
 *
 */
class MessageSystemServices extends BaseServices
{

    /**
     * SystemNotificationServices constructor.
     * @param MessageSystemDao $dao
     */
    public function __construct(MessageSystemDao $dao)
    {
        $this->dao = $dao;
    }

    /**
     * 站内信列表
     * @param $uid
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function getMessageSystemList($uid)
    {
        [$page, $limit] = $this->getPageValue();
        $where['is_del'] = 0;
        $where['uid'] = $uid;
        $list = $this->dao->getMessageList($where, '*', $page, $limit);
        $count = $this->dao->getCount($where);
        if (!$list) return ['list' => [], 'count' => 0];
        foreach ($list as &$item) {
            $item['add_time'] = time_tran($item['add_time']);
            if ($item['data'] != '' && $this->getMsg($item['mark']) != 000000) {
                $item['content'] = getLang($this->getMsg($item['mark']), json_decode($item['data'], true));
            }
        }
        return ['list' => $list, 'count' => $count];
    }

    /**
     * 站内信详情
     * @param $where
     * @return array
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function getInfo($where)
    {
        $info = $this->dao->getOne($where);
        if (!$info || $info['is_del'] == 1) {
            throw new ApiException('数据不存在');
        }
        $info = $info->toArray();
        if ($info['look'] == 0) {
            $this->update($info['id'], ['look' => 1]);
        }
        if ($info['data'] != '' && $this->getMsg($info['mark']) != 000000) {
            $info['content'] = getLang($this->getMsg($info['mark']), json_decode($info['data'], true));
        }
        $info['add_time'] = time_tran($info['add_time']);
        return $info;
    }

    public function getMsg($mark)
    {
        switch ($mark) {
            case 'admin_pay_success_code':
                $code = '您有一笔支付成功的订单待处理，订单号{:order_id}！';
                break;
            case 'bind_spread_uid':
                $code = '恭喜，又一员猛将将永久绑定到您的团队，用户{:nickname}加入您的队伍！';
                break;
            case 'order_pay_success':
                $code = '您购买的商品已支付成功，支付金额{:pay_price}元，订单号{:order_id},感谢您的光临！';
                break;
            case 'order_take':
                $code = '亲，您的订单{:order_id},商品{:store_name}已确认收货,感谢您的光临！';
                break;
            case 'price_revision':
                $code = '您的订单{:order_id}，实际支付金额已被修改为{:pay_price}';
                break;
            case 'order_refund':
                $code = '您的订单{:order_id}已同意退款,退款金额{:refund_price}元。';
                break;
            case 'recharge_success':
                $code = '您成功充值￥{:price}，现剩余余额￥{:now_money}元';
                break;
            case 'integral_accout':
                $code = '亲，您成功获得积分{:gain_integral}，现有积分{:integral}';
                break;
            case 'order_brokerage':
                $code = '亲，恭喜您成功获得佣金{:brokerage_price}元';
                break;
            case 'bargain_success':
                $code = '亲，好腻害！你的朋友们已经帮你砍到底价了，商品名称{:title}，底价{:min_price}';
                break;
            case 'order_user_groups_success':
                $code = '亲，您的拼团已经完成了，拼团名称{:title}，团长{:nickname}';
                break;
            case 'send_order_pink_fial':
                $code = '亲，您的拼团失败，活动名称{:title}';
                break;
            case 'can_pink_success':
            case 'open_pink_success':
                $code = '亲，您已成功参与拼团，活动名称{:title}';
                break;
            case 'user_extract':
                $code = '亲，您成功提现佣金{:extract_number}元';
                break;
            case 'user_balance_change':
                $code = '亲，您发起的提现被驳回，返回佣金{:extract_number}元';
                break;
            case 'recharge_order_refund_status':
                $code = '亲，您充值的金额已退款,本次退款{:refund_price}元';
                break;
            case 'send_order_refund_no_status':
                $code = '您好！您的订单{:order_id}已拒绝退款。';
                break;
            case 'send_order_apply_refund':
                $code = '您有一笔退款订单待处理，订单号{:order_id}!';
                break;
            case 'order_deliver_success':
            case 'order_postage_success':
                $code = '亲爱的用户{:nickname}您的商品{:store_name}，订单号{:order_id}已发货，请注意查收';
                break;
            case 'send_order_pink_clone':
                $code = '亲，您的拼团取消，活动名称{:title}';
                break;
            case 'kefu_send_extract_application':
                $code = '您有一笔提现申请待处理，提现金额{:money}!';
                break;
            case 'send_admin_confirm_take_over':
                $code = '您有一笔订单已经确认收货，订单号{:order_id}!';
                break;
            case 'order_pay_false':
                $code = '您有未付款订单,订单号为:{:order_id}，商品数量有限，请及时付款。';
                break;
            default:
                $code = 000000;
                break;
        }
        return $code;
    }
}
