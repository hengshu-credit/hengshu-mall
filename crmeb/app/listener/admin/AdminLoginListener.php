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

namespace app\listener\admin;

/**
 * 管理员登录事件监听器
 * @package app\listener\admin
 */
class AdminLoginListener
{
    /**
     * 处理管理员登录事件
     * @param array $event 事件数据 [key: 队列检测key, timer: 定时器状态]
     * @return array [queue: 队列状态, timer: 定时器状态]
     */
    public function handle($event)
    {
        $queueStatus = $this->checkQueueStatus($event);
        $timerStatus = $this->checkTimerStatus();

        return [$queueStatus, $timerStatus];
    }

    /**
     * 检查消息队列状态
     * @param array $event
     * @return bool
     */
    private function checkQueueStatus(array $event): bool
    {
        try {
            if (sys_config('queue_open', 0) == 0) {
                return true;
            }

            if (empty($event)) {
                return false;
            }

            [$key] = $event;

            $queueFilePath = root_path('runtime') . '.queue';
            if (!file_exists($queueFilePath)) {
                return false;
            }

            $content = file_get_contents($queueFilePath);
            return $key === $content;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * 检查定时任务状态
     * @return bool
     */
    private function checkTimerStatus(): bool
    {
        try {
            $timerFilePath = root_path('runtime') . '.timer';

            if (!file_exists($timerFilePath)) {
                return false;
            }

            $timer = file_get_contents($timerFilePath);
            if (empty($timer)) {
                return false;
            }

            $currentTime = time();
            $isValid = $timer <= $currentTime && $timer > ($currentTime - 70);

            return $isValid;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
