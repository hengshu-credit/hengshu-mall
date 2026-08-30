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

namespace app\dao\user;

use think\model;
use app\dao\BaseDao;
use app\model\user\User;
use app\model\wechat\WechatUser;

/**
 *
 * Class UserWechatUserDao
 * @package app\dao\user
 */
class UserWechatUserDao extends BaseDao
{
    /**
     * @var string
     */
    protected $alias = '';

    /**
     * @var string
     */
    protected $join_alis = '';

    /**
     * 精确搜索白名单
     * @var string[]
     */
    protected $withField = ['uid', 'nickname', 'user_type', 'phone'];

    /**
     * 设置模型
     * @return string
     */
    protected function setModel(): string
    {
        return User::class;
    }

    public function joinModel(): string
    {
        return WechatUser::class;
    }

    /**
     * 关联模型
     * @param string $alias
     * @param string $join_alias
     * @return \crmeb\basic\BaseModel
     */
    public function getModel(string $alias = 'u', string $join_alias = 'w', $join = 'left')
    {
        $this->alias = $alias;
        $this->join_alis = $join_alias;
        /** @var WechatUser $wechcatUser */
        $wechcatUser = app()->make($this->joinModel());
        $table = $wechcatUser->getName();
        return parent::getModel()->alias($alias)->join($table . ' ' . $join_alias, $alias . '.uid = ' . $join_alias . '.uid', $join);
    }

    public function getList(array $where, $field = '*', int $page, int $limit)
    {
        return $this->getModel()->where($where)->field($field)->page($page, $limit)->select()->toArray();
    }

    /**
     * 获取总数
     * @param array $where
     * @return int
     */
    public function getCount(array $where): int
    {
        return $this->getModel()->where($where)->count();
    }

    /**
     * 组合条件模型条数
     * @param Model $model
     * @return int
     */
    public function getCountByWhere(array $where): int
    {
        return $this->searchWhere($where)->group($this->alias . '.uid')->count();
    }

    /**
     * 组合条件模型查询列表
     * @param Model $model
     * @return array
     */
    public function getListByModel(array $where, string $field = '', string $order = '', int $page, int $limit): array
    {
        return $this->searchWhere($where)->field($field)->page($page, $limit)->group($this->alias . '.uid')->order(($order ? $order . ' ,' : '') . $this->alias . '.uid desc')->select()->toArray();
    }

    /**
     * 设置搜索条件
     * @param $where array 条件数组
     * @param array|null $field 需要查询的字段
     * @return \crmeb\basic\BaseModel
     */
    public function searchWhere($where, ?array $field = [])
    {
        $model = $this->getModel();
        $userAlias = $this->alias . '.';
        $wechatUserAlias = $this->join_alis . '.';
        
        // --- 时间筛选模块 ---
        // 筛选类型：visitno(未访问), visit(访问时间), add_time(注册时间)
        if (isset($where['user_time_type']) && isset($where['user_time'])) {
            // 筛选指定时间内未访问的用户
            if ($where['user_time_type'] == 'visitno' && $where['user_time'] != '') {
                list($startTime, $endTime) = explode('-', $where['user_time']);
                if ($startTime && $endTime) {
                    $endTime = strtotime($endTime) + 24 * 3600;
                    // last_time 小于开始时间 或 大于结束时间（即不在该时间段内访问）
                    $model = $model->where($userAlias . "last_time < " . strtotime($startTime) . " OR " . $userAlias . "last_time > " . $endTime);
                }
            }
            // 筛选指定时间内访问过的用户
            if ($where['user_time_type'] == 'visit' && $where['user_time'] != '') {
                list($startTime, $endTime) = explode('-', $where['user_time']);
                if ($startTime && $endTime) {
                    $model = $model->where($userAlias . 'last_time', '>', strtotime($startTime));
                    $model = $model->where($userAlias . 'last_time', '<', strtotime($endTime) + 24 * 3600);
                }
            }
            // 筛选指定时间内注册的用户
            if ($where['user_time_type'] == 'add_time' && $where['user_time'] != '') {
                list($startTime, $endTime) = explode('-', $where['user_time']);
                if ($startTime && $endTime) {
                    $model = $model->where($userAlias . 'add_time', '>', strtotime($startTime));
                    $model = $model->where($userAlias . 'add_time', '<', strtotime($endTime) + 24 * 3600);
                }
            }
        }

        // --- 购买次数筛选 (单一数值) ---
        // pay_count: -1(0次), 其他数值(大于该数值)
        if (isset($where['pay_count']) && $where['pay_count'] != '') {
            if ($where['pay_count'] == '-1') {
                $model = $model->where($userAlias . 'pay_count', 0);
            } else {
                $model = $model->where($userAlias . 'pay_count', '>', $where['pay_count']);
            }
        }

        // --- 购买次数筛选 (区间) ---
        // pay_count_num: [min, max]
        if (isset($where['pay_count_num']) && count($where['pay_count_num']) == 2) {
            if ($where['pay_count_num'][0] != '' && $where['pay_count_num'][1] != '') {
                // 区间查询
                $model = $model->whereBetween($userAlias . 'pay_count', $where['pay_count_num']);
            } elseif ($where['pay_count_num'][0] != '' && $where['pay_count_num'][1] == '') {
                // 大于最小值
                $model = $model->where($userAlias . 'pay_count', '>', $where['pay_count_num'][0]);
            } elseif ($where['pay_count_num'][0] == '' && $where['pay_count_num'][1] != '') {
                // 小于最大值
                $model = $model->where($userAlias . 'pay_count', '<', $where['pay_count_num'][1]);
            }
        }

        // --- 消费金额筛选 (区间) ---
        // pay_count_money: [min, max] 统计 store_order 表中实际支付金额
        if (isset($where['pay_count_money']) && count($where['pay_count_money']) == 2) {
            $min = $where['pay_count_money'][0];
            $max = $where['pay_count_money'][1];
            
            if ($min !== '' || $max !== '') {
                $model = $model->where(function ($query) use ($userAlias, $min, $max) {
                    // 子查询：在 store_order 表中查找满足条件的记录
                    $query->whereExists(function ($q) use ($userAlias, $min, $max) {
                        $q->name('store_order')
                            ->whereColumn('uid', $userAlias . 'uid')
                            ->where('paid', 1) // 已支付
                            ->where('refund_status', 0); // 未退款
                        
                        // 根据区间条件筛选 pay_price
                        if ($min !== '' && $max !== '') {
                            $q->whereBetween('pay_price', [$min, $max]);
                        } elseif ($min !== '' && $max === '') {
                            $q->where('pay_price', '>', $min);
                        } elseif ($min === '' && $max !== '') {
                            $q->where('pay_price', '<', $max);
                        }
                    });
                    
                    // 特殊处理：如果最小值为0或空，需要包含没有订单记录的用户（即消费金额为0的用户）
                    if ($min === '' || $min == 0) {
                        $query->whereOr(function ($q) use ($userAlias) {
                            $q->whereNotExists(function ($sub) use ($userAlias) {
                                $sub->name('store_order')
                                    ->whereColumn('uid', $userAlias . 'uid')
                                    ->where('paid', 1)
                                    ->where('refund_status', 0);
                            });
                        });
                    }
                });
            }
        }

        // --- 充值次数筛选 (区间) ---
        // recharge_count: [min, max] 统计 user_recharge 表中的记录数
        if (isset($where['recharge_count']) && count($where['recharge_count']) == 2) {
            $min = $where['recharge_count'][0];
            $max = $where['recharge_count'][1];
            
            if ($min !== '' || $max !== '') {
                $model = $model->where(function ($query) use ($userAlias, $min, $max) {
                    // 子查询：通过分组统计充值记录数
                    $query->whereExists(function ($q) use ($userAlias, $min, $max) {
                        $q->name('user_recharge')
                            ->whereColumn('uid', $userAlias . 'uid')
                            ->field('uid')
                            ->group('uid')
                            ->having('COUNT(*) BETWEEN ' . (int)$min . ' AND ' . (int)$max);
                    });
                    
                    // 特殊处理：包含无充值记录的用户
                    if ($min === '' || $min == 0) {
                        $query->whereOr(function ($q) use ($userAlias) {
                            $q->whereNotExists(function ($sub) use ($userAlias) {
                                $sub->name('user_recharge')
                                    ->whereColumn('uid', $userAlias . 'uid');
                            });
                        });
                    }
                });
            }
        }

        // --- 余额筛选 (区间) ---
        // balance: [min, max]
        if (isset($where['balance']) && count($where['balance']) == 2) {
            if ($where['balance'][0] != '' && $where['balance'][1] != '') {
                $model = $model->whereBetween($userAlias . 'now_money', $where['balance']);
            } elseif ($where['balance'][0] != '' && $where['balance'][1] == '') {
                $model = $model->where($userAlias . 'now_money', '>', $where['balance'][0]);
            } elseif ($where['balance'][0] == '' && $where['balance'][1] != '') {
                $model = $model->where($userAlias . 'now_money', '<', $where['balance'][1]);
            }
        }

        // --- 积分筛选 (区间) ---
        // integral: [min, max]
        if (isset($where['integral']) && count($where['integral']) == 2) {
            if ($where['integral'][0] != '' && $where['integral'][1] != '') {
                $model = $model->whereBetween($userAlias . 'integral', $where['integral']);
            } elseif ($where['integral'][0] != '' && $where['integral'][1] == '') {
                $model = $model->where($userAlias . 'integral', '>', $where['integral'][0]);
            } elseif ($where['integral'][0] == '' && $where['integral'][1] != '') {
                $model = $model->where($userAlias . 'integral', '<', $where['integral'][1]);
            }
        }

        // --- 基础属性筛选 ---
        // 用户等级
        if (isset($where['level']) && $where['level']) {
            $model = $model->where($userAlias . 'level', $where['level']);
        }
        // 用户分组
        if (isset($where['group_id']) && $where['group_id']) {
            $model = $model->where($userAlias . 'group_id', $where['group_id']);
        }
        // 用户状态
        if (isset($where['status']) && $where['status'] != '') {
            $model = $model->where($userAlias . 'status', $where['status']);
        }
        // 是否为推广员
        if (isset($where['is_promoter']) && $where['is_promoter'] != '') {
            $model = $model->where($userAlias . 'is_promoter', $where['is_promoter']);
        }
        
        // --- 标签筛选 ---
        // label_id: 单个ID或ID数组/逗号分隔字符串
        if (isset($where['label_id']) && $where['label_id']) {
            $model = $model->whereIn($userAlias . 'uid', function ($query) use ($where) {
                if (is_array($where['label_id'])) {
                    $label_ids = array_map('intval', $where['label_id']);
                    $query->name('user_label_relation')->whereIn('label_id', $label_ids)->field('uid')->select();
                } else {
                    if (strpos($where['label_id'], ',') !== false) {
                        $label_ids = array_map('intval', explode(',', $where['label_id']));
                        $query->name('user_label_relation')->whereIn('label_id', $label_ids)->field('uid')->select();
                    } else {
                        $query->name('user_label_relation')->where('label_id', (int)$where['label_id'])->field('uid')->select();
                    }
                }
            });
        }
        
        // --- 会员状态筛选 ---
        // isMember: 0(非会员), 1(会员)
        if (isset($where['isMember']) && $where['isMember'] != '') {
            if ($where['isMember'] == 0) {
                $model = $model->where($userAlias . 'is_money_level', 0);
            } else {
                $model = $model->where($userAlias . 'is_money_level', '>', 0);
            }
        }

        // --- 关键字搜索 ---
        // field_key: 指定搜索字段 (nickname, phone, uid)
        // nickname: 搜索关键词
        $fieldKey = $where['field_key'] ?? '';
        $nickname = $where['nickname'] ?? '';
        if ($fieldKey && $nickname && in_array($fieldKey, $this->withField)) {
            switch ($fieldKey) {
                case "nickname":
                case "phone":
                    $model = $model->where($userAlias . trim($fieldKey), 'like', "%" . trim($nickname) . "%");
                    break;
                case "uid":
                    $model = $model->where($userAlias . trim($fieldKey), trim($nickname));
                    break;
            }
        } else if (!$fieldKey && $nickname) {
            // 未指定字段时，模糊搜索昵称、UID或手机号
            $model = $model->where($userAlias . 'nickname|' . $userAlias . 'uid|' . $userAlias . 'phone', 'LIKE', "%$where[nickname]%");
        }

        // --- 地域筛选 ---
        // country: domestic(国内), abroad(国外)
        if (isset($where['country']) && $where['country']) {
            if ($where['country'] == 'domestic') {
                $model = $model->where($wechatUserAlias . 'country', 'in', ['中国', 'China']);
            } else if ($where['country'] == 'abroad') {
                $model = $model->where($wechatUserAlias . 'country', 'not in', ['中国', '']);
            }
        }
        
        // --- 客户端类型筛选 ---
        // user_type: app, wechat, routine 等
        if (isset($where['user_type']) && $where['user_type']) {
            if ($where['user_type'] == 'app') {
                $model = $model->whereIn($userAlias . 'user_type', ['app', 'apple']);
            } else {
                $model = $model->where($userAlias . 'user_type', $where['user_type']);
            }
        }

        // --- 性别筛选 ---
        // sex: 1(男), 2(女), 0(未知)
        if (isset($where['sex']) && $where['sex'] !== '' && in_array($where['sex'], [0, 1, 2])) {
            $model = $model->where($wechatUserAlias . 'sex', $where['sex']);
        }
        
        // --- 省份筛选 ---
        if (isset($where['province']) && $where['province']) {
            $model = $model->where($wechatUserAlias . 'province', $where['province']);
        }
        
        // --- 城市筛选 ---
        if (isset($where['city']) && $where['city']) {
            $model = $model->where($wechatUserAlias . 'city', $where['city']);
        }

        // --- 通用时间筛选 ---
        // 使用模型搜索器 time
        if (isset($where['time'])) {
            $model->withSearch(['time'], ['time' => $where['time'], 'timeKey' => 'u.add_time']);
        }

        // --- 删除状态筛选 ---
        if (isset($where['is_del'])) {
            $model->where($userAlias . 'is_del', $where['is_del']);
        }

        // --- 指定ID筛选 ---
        if (isset($where['ids']) && count($where['ids'])) {
            $model->whereIn($userAlias . 'uid', $where['ids']);
        }

        // --- 代理等级筛选 ---
        if (isset($where['agent_level']) && $where['agent_level'] != '') {
            $model->where($userAlias . 'agent_level', $where['agent_level']);
        }

        return $field ? $model->field($field) : $model;
    }

    /**
     * 获取用户性别
     * @param $time
     * @param $userType
     * @return mixed
     */
    public function getSex($time, $userType)
    {
        return $this->getModel()->when($userType != '', function ($query) use ($userType) {
            $query->where($this->join_alis . '.user_type', $userType);
        })->where(function ($query) use ($time) {
            if ($time[0] == $time[1]) {
                $query->whereDay($this->join_alis . '.add_time', $time[0]);
            } else {
                $time[1] = date('Y/m/d', strtotime($time[1]) + 86400);
                $query->whereTime($this->join_alis . '.add_time', 'between', $time);
            }
        })->field('count(' . $this->alias . '.uid) as value,' . $this->join_alis . '.sex as name')
            ->group($this->join_alis . '.sex')->select()->toArray();
    }
}
