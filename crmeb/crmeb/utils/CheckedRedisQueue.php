<?php
namespace crmeb\utils;

use think\queue\connector\Redis;

/** Payment-only adapter: the bundled connector otherwise returns an ID even when Redis rejects a write. */
class CheckedRedisQueue extends Redis
{
    public static function wrap(Redis $connector): self
    {
        $checked = new self($connector->redis, $connector->default, $connector->retryAfter, $connector->blockFor);
        $checked->app = $connector->app;
        $checked->connection = $connector->connection;
        return $checked;
    }

    public function pushRaw($payload, $queue = null, array $options = [])
    {
        if ($this->redis->rPush($this->getQueue($queue), $payload) === false) return false;
        return json_decode($payload, true)['id'] ?? null;
    }

    protected function laterRaw($delay, $payload, $queue = null)
    {
        if ($this->redis->zAdd($this->getQueue($queue) . ':delayed', $this->availableAt($delay), $payload) === false) return false;
        return json_decode($payload, true)['id'] ?? null;
    }
}
