<?php
namespace app\services\product\product;
use think\facade\Db;
class ProductQualityInstaller
{
    public static function install(): void
    {
        $db=Db::connect();$prefix=(string)$db->getConfig('prefix');
        if(!preg_match('/^[a-zA-Z0-9_]*$/D',$prefix)||$db->getPdo()->inTransaction())throw new \RuntimeException('Quality migration requires a standalone transaction');
        foreach(explode(';',str_replace('`eb_','`'.$prefix,file_get_contents(app()->getRootPath().'upgrade/product_quality.sql')))as $sql)if(trim($sql))Db::execute($sql);
    }
}
