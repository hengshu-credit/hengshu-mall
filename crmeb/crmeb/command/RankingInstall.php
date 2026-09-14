<?php
namespace crmeb\command;
use app\services\activity\ranking\RankingInstaller;
use think\console\Command;
use think\console\Input;
use think\console\Output;
class RankingInstall extends Command
{
    protected function configure() { $this->setName('ranking:install')->setDescription('幂等安装排行榜及后台权限'); }
    protected function execute(Input $input, Output $output)
    {
        if (!RankingInstaller::install()) throw new \RuntimeException('请先初始化后台营销菜单');
        $output->info('排行榜已安装。子管理员请分配排行榜及页面装修权限。');
        return 0;
    }
}
