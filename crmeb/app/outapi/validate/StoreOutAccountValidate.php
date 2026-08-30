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

namespace app\outapi\validate;

use think\Validate;

class StoreOutAccountValidate extends Validate
{
    protected $regex = ['account' => '/^[a-zA-Z0-9]{4,30}$/'];

    /**
     * @var string[]
     */
    protected $rule = [
        'appid' => 'require|account',
        'appsecret' => 'min:6|max:32',
        'title' => 'max:120'
    ];

    /**
     * @var string[]
     */
    protected $message = [
        'appid.require' => '请填写账号',
        'appid.account' => '账号必须为数字或者字母的组合4-30位',
        'appsecret.min' => '密码必须是在6到16位之间',
        'appsecret.max' => '密码必须是在6到16位之间',
        'title.max' => '描述内容不能超过120字',
    ];

    protected $scene = [
        'save' => ['appid', 'appsecret', 'title'],
        'update' => ['appsecret', 'title'],
    ];
}
