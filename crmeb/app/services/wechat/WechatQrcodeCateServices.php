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
namespace app\services\wechat;


use app\dao\wechat\WechatQrcodeCateDao;
use app\services\BaseServices;
use crmeb\exceptions\AdminException;
use crmeb\services\FormBuilder as Form;
use think\facade\Route as Url;

/**
 * Class WechatQrcodeCateServices
 * @package app\services\wechat
 * @method getCateList() 分类列表
 */
class WechatQrcodeCateServices extends BaseServices
{
    /**
     * WechatQrcodeCateServices constructor.
     * @param WechatQrcodeCateDao $dao
     */
    public function __construct(WechatQrcodeCateDao $dao)
    {
        $this->dao = $dao;
    }

    /**
     * 添加编辑分类表单
     * @param int $id
     * @return array
     * @throws \FormBuilder\Exception\FormBuilderException
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     */
    public function createForm($id = 0)
    {
        $info = $this->dao->get($id);
        $f[] = Form::hidden('id', $id);
        $f[] = Form::input('cate_name', '分组名称', $info['cate_name'] ?? '')->maxlength(10)->required();
        return create_form($id ? '修改分组' : '添加分组', $f, Url::buildUrl('/app/wechat_qrcode/cate/save'), 'POST');
    }

    /**
     * 保存数据
     * @param $data
     * @return bool
     */
    public function saveData($data)
    {
        $id = $data['id'];
        $data['add_time'] = time();
        if ($id) {
            unset($data['id']);
            $res = $this->dao->update($id, $data);
        } else {
            $res = $this->dao->save($data);
        }
        if (!$res) throw new AdminException('保存失败');
        return true;
    }

    /**
     * 删除分类
     * @param int $id
     * @return bool
     */
    public function delCate($id = 0)
    {
        $count = app()->make(WechatQrcodeServices::class)->count(['cate_id' => $id]);
        if ($count) throw new AdminException('该分类有下级分类，无法删除');
        if (!$id) throw new AdminException('参数错误');
        $res = $this->dao->update($id, ['is_del' => 1]);
        if (!$res) throw new AdminException('删除失败');
        return true;
    }

}
