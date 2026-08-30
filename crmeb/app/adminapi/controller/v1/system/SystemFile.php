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

use think\facade\App;
use app\adminapi\controller\AuthController;
use app\services\system\log\SystemFileServices;

/**
 * 文件校验控制器
 * Class SystemFile
 * @package app\admin\controller\system
 *
 */
class SystemFile extends AuthController
{
    /**
     * @var SystemFileServices
     */
    protected $services;

    /**
     * 构造方法
     * SystemFile constructor.
     * @param App $app
     * @param SystemFileServices $services
     */
    public function __construct(App $app, SystemFileServices $services)
    {
        parent::__construct($app);
        $this->services = $services;
    }

    /**
     * 文件校验记录
     * @return mixed
     */
    public function index()
    {
        return app('json')->success(['list' => $this->services->getFileList()]);
    }

    /**
     * @return mixed
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\DbException
     * @throws \think\db\exception\ModelNotFoundException
     *
     * @date 2022/09/07
     * @author yyw
     */
    public function login()
    {
        [$password] = $this->request->postMore([
            'password',
        ], true);

        $adminInfo = $this->request->adminInfo();
        if (!$adminInfo) return app('json')->fail('非法操作');
        if ($adminInfo['level'] != 0) return app('json')->fail('非法操作');
        if ($password === '') return app('json')->fail('请输入密码');

        return app('json')->success($this->services->login($password, 'file_edit'));
    }

    //打开目录
    public function opendir()
    {
        [$dir, $fileDir, $superior] = $this->request->getMore([
            ['dir', ''],
            ['filedir', ''],
            ['superior', ''],
        ], true);
        return app('json')->success($this->services->opendir($dir, $fileDir, $superior));
    }

    //文件备注
    public function fileMark()
    {
        [$path, $fileToken] = $this->request->postMore([
            ['path', ''],
            ['fileToken', ''],
        ], true);
        if ($path == '') return app('json')->fail('参数错误');
        return app('json')->success($this->services->markForm($path, $fileToken));
    }

    //文件备注保存
    public function fileMarkSave()
    {
        [$full_path, $mark] = $this->request->postMore([
            ['full_path', ''],
            ['mark', ''],
        ], true);
        $full_path = $this->request->param('full_path');
        if ($full_path == '') return app('json')->fail('参数错误');
        $this->services->fileMarkSave($full_path, $mark);
        return app('json')->success('保存成功');
    }

    //读取文件
    public function openfile()
    {
        $file = $this->request->param('filepath');
        if (empty($file)) return app('json')->fail('平台错误：发生异常，请稍后重试');
        return app('json')->success($this->services->openfile($file));
    }

    //保存文件
    public function savefile()
    {
        $comment = $this->request->param('comment');
        $filepath = $this->request->param('filepath');
        if (empty($filepath)) {
            return app('json')->fail('文件路径不存在');
        }
        $res = $this->services->savefile($filepath, $comment);
        if ($res) {
            return app('json')->success('保存成功');
        } else {
            return app('json')->fail('保存失败');
        }
    }

    /**
     * 创建文件夹
     * @return mixed
     *
     * @date 2022/09/17
     * @author yyw
     */
    public function createFolder()
    {
        [$path, $name] = $this->request->postMore([
            ['path', ''],
            ['name', '']
        ], true);
        if (empty($path) || empty($name)) {
            return app('json')->fail('平台错误：发生异常，请稍后重试');
        }
        $data = [];
        try {
            $res = $this->services->createFolder($path, $name);
            if ($res) {
                $data = [
                    'children' => [],
                    'contextmenu' => true,
                    'isDir' => true,
                    'loading' => false,
                    'path' => $path,
                    'pathname' => $path . DS . $name,
                    'title' => $name,
                ];
            } else {
                return app('json')->fail('操作失败');
            }
        } catch (\Exception $e) {
            return app('json')->fail($e->getMessage());
        }
        return app('json')->success($data);
    }

    /**
     * 创建文件
     * @return mixed
     *
     * @date 2022/09/17
     * @author yyw
     */
    public function createFile()
    {
        [$path, $name] = $this->request->postMore([
            ['path', ''],
            ['name', '']
        ], true);
        if (empty($path) || empty($name)) {
            return app('json')->fail('平台错误：发生异常，请稍后重试');
        }
        $data = [];
        try {
            $res = $this->services->createFile($path, $name);
            if ($res) {
                $data = [
                    'children' => [],
                    'contextmenu' => true,
                    'isDir' => false,
                    'loading' => false,
                    'path' => $path,
                    'pathname' => $path . DS . $name,
                    'title' => $name,
                ];
            } else {
                return app('json')->fail('操作失败');
            }
        } catch (\Exception $e) {
            return app('json')->fail($e->getMessage());
        }
        return app('json')->success($data);
    }

    /**
     * 删除文件或文件夹
     * @return mixed
     *
     * @date 2022/09/17
     * @author yyw
     */
    public function delFolder()
    {
        [$path] = $this->request->postMore([
            ['path', '']
        ], true);
        if (empty($path)) {
            return app('json')->fail('平台错误：发生异常，请稍后重试');
        }
        try {
            $this->services->delFolder($path);
        } catch (\Exception $e) {
            return app('json')->fail($e->getMessage());
        }
        return app('json')->success('操作成功');
    }

    /**
     * 文件重命名
     * @return mixed
     *
     * @date 2022/09/28
     * @author yyw
     */
    public function rename()
    {
        [$newname, $oldname] = $this->request->postMore([
            ['newname', ''],
            ['oldname', '']
        ], true);
        if (empty($newname) || empty($oldname)) {
            return app('json')->fail('平台错误：发生异常，请稍后重试');
        }
        try {
            $this->services->rename($newname, $oldname);
        } catch (\Exception $e) {
            return app('json')->fail($e->getMessage());
        }
        return app('json')->success('操作成功');

    }


    public function copyFolder()
    {
        [$surDir, $toDir] = $this->request->postMore([
            ['surDir', ''],
            ['toDir', '']
        ], true);
        if (empty($surDir) || empty($toDir)) {
            return app('json')->fail('平台错误：发生异常，请稍后重试');
        }
        try {
            return app('json')->success($this->services->copyFolder($surDir, $toDir));
        } catch (\Exception $e) {
            return app('json')->fail($e->getMessage());
        }
    }

    /**
     * 写入文件md5
     * @return \think\Response
     * @author wuhaotian
     * @email 442384644@qq.com
     * @date 2026/2/25
     */
    public function writeMd5()
    {
        try {
            $this->services->writeMd5();
        } catch (\Exception $e) {
            return app('json')->fail($e->getMessage());
        }
        return app('json')->success('操作成功');
    }
}
