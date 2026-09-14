<?php
namespace crmeb\command;
class CommerceInstall extends \think\console\Command
{
    protected function configure(){$this->setName('commerce:install')->setDescription('安装交易可靠性表与监控权限');}
    protected function execute(\think\console\Input $input,\think\console\Output $output){\app\services\system\CommerceReliabilityInstaller::install();$output->info('交易可靠性结构已就绪；请按需分配监控权限。');return 0;}
}
