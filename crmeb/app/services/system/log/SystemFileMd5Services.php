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

namespace app\services\system\log;

use app\dao\system\log\SystemFileMd5Dao;
use app\services\BaseServices;
use think\facade\Config;
use think\facade\Db;

class SystemFileMd5Services extends BaseServices
{
    public function __construct(SystemFileMd5Dao $dao)
    {
        $this->dao = $dao;
    }

    public function saveMd5List(array $list)
    {
        if (empty($list)) return true;
        return (bool)$this->transaction(function () use ($list) {
            return $this->dao->saveAll($list);
        });
    }

    public function clearMd5List()
    {
        $prefix = Config::get('database.connections.' . Config::get('database.default') . '.prefix');
        Db::execute('TRUNCATE TABLE `' . $prefix . 'system_file_md5`');
    }

    public function checkFile()
    {
        $rootPath = app()->getRootPath();
        $files = array_merge(
            $this->getDir($rootPath . 'app'),
            $this->getDir($rootPath . 'crmeb')
        );
        // 只找 .php 文件
        $files = array_filter($files, function ($path) {
            return pathinfo($path, PATHINFO_EXTENSION) === 'php';
        });
        $len = strlen($rootPath);
        // 当前列表
        $list = $this->dao->getColumn([], 'md5', 'filename');
        $currentList = [];
        foreach ($files as $path) {
            $currentList[substr($path, $len)] = md5_file($path);
        }

        // 忽略app/adminapi/controller/UpgradeController.php文件的改动
        unset($currentList['app/adminapi/controller/UpgradeController.php']);
        unset($list['app/adminapi/controller/UpgradeController.php']);

        $diffFiles = [];
        $newFiles = array_keys(array_diff_key($currentList, $list));
        $delFiles = array_keys(array_diff_key($list, $currentList));
        $changedFiles = array_keys(array_diff_assoc($currentList, $list));
        return array_values(array_unique(array_merge($newFiles, $delFiles, $changedFiles)));
    }

    public function getDir($dir)
    {
        $data = [];
        $this->searchDir($dir, $data);
        return $data;
    }

    public function searchDir($path, &$data)
    {
        if (is_dir($path) && !strpos($path, 'uploads')) {
            $files = scandir($path);
            foreach ($files as $file) {
                if ($file != '.' && $file != '..') {
                    $this->searchDir($path . '/' . $file, $data);
                }
            }
        }
        if (is_file($path)) {
            $data[] = $path;
        }
    }
}
