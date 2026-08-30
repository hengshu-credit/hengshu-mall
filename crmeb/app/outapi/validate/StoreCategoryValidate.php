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

class StoreCategoryValidate extends Validate
{
    /**
     * 定义验证规则
     * 格式：'字段名'    =>    ['规则1','规则2'...]
     *
     * @var array
     */
    protected $rule = [
        'pid' => 'number|egt:0',
        'cate_name' => 'require|max:25',
        'pic' => 'max:128',
        'big_pic' => 'max:200',
        'sort' => 'number|egt:0',
        'is_show' => 'in:0,1'
    ];

    /**
     * 定义错误信息
     * 格式：'字段名.规则名'    =>    '错误信息'
     *
     * @var array
     */
    protected $message = [
        'pid.number' => '父级ID参数类型错误',
        'pid.egt' => '父级ID参数类型错误',
        'cate_name.require' => '分类名称不能为空',
        'cate_name.max' => '分类名称长度不能超过25个字符',
        'pic.max' => '分类图标长度不能超过128个字符',
        'big_pic.max' => '分类大图长度不能超过200个字符',
        'sort.number' => '排序参数类型错误',
        'sort.egt' => '排序不能小于0',
        'is_show.in' => '状态必须是0-1之间的整数',
    ];

    protected $scene = [
        'save' => ['pid', 'cate_name', 'pic', 'big_pic', 'sort', 'is_show'],
    ];
}