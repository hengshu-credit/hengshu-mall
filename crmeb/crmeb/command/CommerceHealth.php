<?php
namespace crmeb\command;
class CommerceHealth extends \think\console\Command
{
    protected function configure(){$this->setName('commerce:health')->setDescription('输出交易待办、退款与队列监控；异常退出1');}
    protected function execute(\think\console\Input $input,\think\console\Output $output){
        try{$result=app()->make(\app\services\system\CommerceHealthServices::class)->summary();$output->writeln(json_encode($result,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));return $result['healthy']?0:1;}
        catch(\Throwable $e){$output->error('交易监控不可用：'.get_class($e));return 1;}
    }
}
