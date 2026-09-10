<?php
namespace crmeb\command;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\services\merchant\MerchantInstaller;
class MerchantInstall extends Command
{
    protected function configure() { $this->setName('merchant:install')->setDescription('安装商户档案、审核、历史与商品归属'); }
    protected function execute(Input $input, Output $output) { \app\services\merchant\MerchantVault::directory(); MerchantInstaller::ensure(true); MerchantInstaller::menus(); $output->writeln('商户管理已初始化'); }
}
