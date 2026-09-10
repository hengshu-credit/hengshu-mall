<?php
namespace crmeb\command;
use app\services\activity\style\MarketingStyleInstaller;
use think\console\Command;
use think\console\Input;
use think\console\Output;
class MarketingStyleInstall extends Command
{
    protected function configure() { $this->setName('marketing-style:install')->setDescription('幂等安装营销样式表和菜单'); }
    protected function execute(Input $input, Output $output)
    {
        if (!MarketingStyleInstaller::install()) throw new \RuntimeException('营销菜单不存在，请先初始化后台');
        $output->info('营销样式已安装。子管理员请分配营销样式权限。');
        return 0;
    }
}
