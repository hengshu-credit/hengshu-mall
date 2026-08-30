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
namespace crmeb\command;

use app\services\system\config\SystemConfigServices;
use Channel\Server;
use crmeb\services\workerman\chat\ChatService;
use crmeb\services\workerman\WorkermanService;
use think\console\Command;
use think\console\Input;
use think\console\input\Argument;
use think\console\input\Option;
use think\console\Output;
use Workerman\Worker;

class Workerman extends Command
{
    /**
     * @var array
     */
    protected $config = [];

    /**
     * @var Worker
     */
    protected $workerServer;

    /**
     * @var Worker
     */
    protected $chatWorkerServer;

    /**
     * @var Server
     */
    protected $channelServer;

    /**
     * @var Input
     */
    public $input;

    /**
     * @var Output
     */
    public $output;

    protected function configure()
    {
        // 指令配置
        $this->setName('workerman')
            ->addArgument('status', Argument::REQUIRED, 'start/stop/reload/status/connections')
            ->addArgument('server', Argument::OPTIONAL, 'admin/chat/channel')
            ->addOption('d', null, Option::VALUE_NONE, 'daemon（守护进程）方式启动')
            ->setDescription('start/stop/restart workerman');
    }

    protected function init(Input $input, Output $output)
    {
        global $argv;
        $argv[1] = $input->getArgument('status') ?: 'start';
        $server = $input->getArgument('server');
        if ($input->hasOption('d')) {
            $argv[2] = '-d';
        } else {
            unset($argv[2]);
        }

        $this->config = config('workerman');

        return $server;
    }

    protected function execute(Input $input, Output $output)
    {
        $server = $this->init($input, $output);
        /** @var SystemConfigServices $services */
        $services = app()->make(SystemConfigServices::class);
        $sslConfig = $services->getSslFilePath();
//        $confing['wss_open'] = $sslConfig['wssOpen'] ?? 0;
        $confing['wss_open'] = 0;
        $confing['wss_local_cert'] = $sslConfig['wssLocalCert'] ?? '';
        $confing['wss_local_pk'] = $sslConfig['wssLocalpk'] ?? '';
        // 证书最好是申请的证书
        if ($confing['wss_open']) {
            $context = [
                'ssl' => [
                    // 请使用绝对路径
                    'local_cert' => realpath('public' . $confing['wss_local_cert']), // 也可以是crt文件
                    'local_pk' => realpath('public' . $confing['wss_local_pk']),
                    'verify_peer' => false,
                ]
            ];
        } else {
            $context = [];
        }
        Worker::$pidFile = app()->getRootPath() . 'runtime/workerman.pid';
        Worker::$logFile = app()->getRootPath() . 'runtime/workerman.log';
        if (!$server || $server == 'admin') {
            var_dump('admin');
            //创建 admin 长连接服务
            $this->workerServer = new Worker($this->config['admin']['protocol'] . '://' . $this->config['admin']['ip'] . ':' . $this->config['admin']['port'], $context);
            $this->workerServer->count = $this->config['admin']['serverCount'];
            if ($confing['wss_open']) {
                $this->workerServer->transport = 'ssl';
            }
        }

        if (!$server || $server == 'chat') {
            var_dump('chat');
            //创建 h5 chat 长连接服务
            $this->chatWorkerServer = new Worker($this->config['chat']['protocol'] . '://' . $this->config['chat']['ip'] . ':' . $this->config['chat']['port'], $context);
            $this->chatWorkerServer->count = $this->config['chat']['serverCount'];
            if ($confing['wss_open']) {
                $this->chatWorkerServer->transport = 'ssl';
            }
        }

        if (!$server || $server == 'channel') {
            var_dump('channel');
            //创建内部通讯服务
            $this->channelServer = new Server($this->config['channel']['ip'], $this->config['channel']['port']);
        }
        $this->bindHandle();
        try {
            Worker::runAll();
        } catch (\Exception $e) {
            $output->warning($e->getMessage());
        }
    }

    /**
     * 绑定 Workerman 各事件回调
     *
     * 本方法负责把“管理后台长连接服务”和“聊天室长连接服务”分别与对应的业务处理类进行绑定，
     * 使得当客户端连接、发送消息、进程启动或断开时，能够自动调用相应的业务逻辑。
     *
     * 1. 若已创建 admin 服务（$this->workerServer 不为 null）：
     *    - 实例化 WorkermanService，传入当前 worker 实例与 channel 服务实例
     *    - 将 onConnect / onMessage / onWorkerStart / onClose 四个事件绑定到 WorkermanService 的同名方法
     *
     * 2. 若已创建 chat 服务（$this->chatWorkerServer 不为 null）：
     *    - 实例化 ChatService，传入当前 chat worker 实例与 channel 服务实例
     *    - 同样绑定上述四个事件到 ChatService 的同名方法
     *
     * 通过这种方式，业务代码与 Workerman 核心解耦，便于后续维护与扩展。
     */
    protected function bindHandle()
    {
        // 绑定 admin 服务事件
        // 只有当 admin 长连接服务实例已创建（$this->workerServer 不为 null）时才进行绑定
        if (!is_null($this->workerServer)) {
            // 实例化 WorkermanService，传入当前 admin worker 实例与 channel 服务实例
            // WorkermanService 负责处理管理后台相关的业务逻辑
            $server = new WorkermanService($this->workerServer, $this->channelServer);
            
            // 将 Workerman 的四个核心事件绑定到 WorkermanService 的同名方法
            // 当客户端连接成功时触发
            $this->workerServer->onConnect = [$server, 'onConnect'];
            // 当收到客户端发来的消息时触发
            $this->workerServer->onMessage = [$server, 'onMessage'];
            // 当 worker 进程启动时触发（每个进程生命周期内仅一次）
            $this->workerServer->onWorkerStart = [$server, 'onWorkerStart'];
            // 当客户端断开连接时触发
            $this->workerServer->onClose = [$server, 'onClose'];
        }

        // 绑定 chat 服务事件
        // 只有当 chat 长连接服务实例已创建（$this->chatWorkerServer 不为 null）时才进行绑定
        if (!is_null($this->chatWorkerServer)) {
            // 实例化 ChatService，传入当前 chat worker 实例与 channel 服务实例
            // ChatService 负责处理聊天室相关的业务逻辑
            $chatServer = new ChatService($this->chatWorkerServer, $this->channelServer);
            
            // 将 Workerman 的四个核心事件绑定到 ChatService 的同名方法
            // 当客户端连接成功时触发
            $this->chatWorkerServer->onConnect = [$chatServer, 'onConnect'];
            // 当收到客户端发来的消息时触发
            $this->chatWorkerServer->onMessage = [$chatServer, 'onMessage'];
            // 当 worker 进程启动时触发（每个进程生命周期内仅一次）
            $this->chatWorkerServer->onWorkerStart = [$chatServer, 'onWorkerStart'];
            // 当客户端断开连接时触发
            $this->chatWorkerServer->onClose = [$chatServer, 'onClose'];
        }
    }
}
