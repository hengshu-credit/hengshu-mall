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
namespace app\adminapi\controller\v1\system;

use app\adminapi\controller\AuthController;
use app\services\system\SystemTicketServices;
use think\facade\App;

class SystemTicket extends AuthController
{
    public function __construct(App $app, SystemTicketServices $services)
    {
        parent::__construct($app);
        $this->services = $services;
    }

    public function ticketList()
    {
        $where = $this->request->getMore([
            ['type', 0],
            ['keyword', ''],
        ]);
        return app('json')->success($this->services->ticketList($where));
    }

    public function ticketForm($id)
    {
        return app('json')->success($this->services->ticketForm($id));
    }

    public function ticketSave($id)
    {
        $data = $this->request->postMore([
            ['print_name', ''],
            ['type', 0],
            ['yly_user_id', ''],
            ['yly_app_id', ''],
            ['yly_app_secret', ''],
            ['yly_sn', ''],
            ['fey_user', ''],
            ['fey_ukey', ''],
            ['fey_sn', ''],
            ['times', 1],
            ['print_type', 1],
            ['status', 1],
        ]);
        $this->services->ticketSave($id, $data);
        return app('json')->success('保存成功');
    }

    public function ticketSetStatus($id, $status)
    {
        $this->services->ticketSetStatus($id, $status);
        return app('json')->success('修改成功');
    }

    public function ticketDel($id)
    {
        $this->services->ticketDel($id);
        return app('json')->success('删除成功');
    }

    public function ticketContent($id)
    {
        return app('json')->success($this->services->ticketContent($id));
    }

    public function ticketContentSave($id)
    {
        $data = $this->request->postMore([
            ['header', 0],
            ['delivery', 0],
            ['buyer_remarks', 0],
            ['goods', []],
            ['freight', 0],
            ['preferential', 0],
            ['pay', []],
            ['custom', 0],
            ['order', []],
            ['code', 0],
            ['code_url', ''],
            ['show_notice', 0],
            ['notice_content', '']
        ]);
        $this->services->ticketContentSave($id, $data);
        return app('json')->success('保存成功');
    }
}