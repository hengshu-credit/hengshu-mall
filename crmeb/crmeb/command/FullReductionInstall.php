<?php
namespace crmeb\command;

use app\services\activity\fullreduction\FullReductionInstaller;
use think\console\Command;
use think\console\Input;
use think\console\Output;

class FullReductionInstall extends Command
{
    protected function configure()
    {
        $this->setName('full-reduction:install')->setDescription('幂等安装满减活动表和后台菜单');
    }

    protected function execute(Input $input, Output $output)
    {
        if (!FullReductionInstaller::install()) throw new \RuntimeException('营销顶级菜单不存在，请先初始化后台菜单');
        $output->info('满减活动表和菜单已安装。刷新后台菜单或重新登录；子管理员请分配满减活动权限。');
        return 0;
    }
}
