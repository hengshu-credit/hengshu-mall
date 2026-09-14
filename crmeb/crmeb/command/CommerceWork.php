<?php
namespace crmeb\command;
class CommerceWork extends \think\console\Command
{
    protected function configure(){
        $this->setName('commerce:work')->setDescription('主动恢复交易待办与退款未知状态')
            ->addOption('once',null,\think\console\input\Option::VALUE_NONE,'执行一轮后退出');
    }
    protected function execute(\think\console\Input $input,\think\console\Output $output){
        do {
            try {
                app()->make(\app\services\order\OrderPaymentDispatchServices::class)->recoverLegacy();
                $result=app()->make(\app\services\system\CommerceTaskServices::class)->tick();
                if($result['examined']||$input->getOption('once'))$output->writeln(json_encode($result));
            }catch(\Throwable $e){
                $output->error('交易待办扫描失败：'.get_class($e));
                if($input->getOption('once'))return 1;
            }
            if(!$input->getOption('once'))sleep(5);
        }while(!$input->getOption('once'));
        return 0;
    }
}
