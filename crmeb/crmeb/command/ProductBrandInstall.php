<?php
namespace crmeb\command;

use app\services\product\product\ProductBrandInstaller;
use crmeb\services\CacheService;
use think\console\Command;
use think\console\Input;
use think\console\Output;

class ProductBrandInstall extends Command
{
    protected function configure()
    {
        $this->setName('product-brand:install')->setDescription('幂等安装商品品牌表和后台菜单');
    }

    protected function execute(Input $input, Output $output)
    {
        if (!ProductBrandInstaller::install()) throw new \RuntimeException('商品顶级菜单不存在，请先初始化后台菜单');
        CacheService::delete('all_auth');
        $output->info('商品品牌表和菜单已安装。刷新后台菜单或重新登录；子管理员请分配品牌权限。');
        return 0;
    }
}
