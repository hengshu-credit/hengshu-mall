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
namespace crmeb\services;

use think\facade\Cache;

class LockService
{
    /**
     * @param $key
     * @param $fn
     * @param int $ex
     * @return mixed
     * @author 吴汐
     * @email 442384644@qq.com
     * @date 2023/03/01
     */
    public function exec($key, $fn, int $ex = 6)
    {
        $token = bin2hex(random_bytes(24));
        $acquired = false;
        try {
            $this->lock($key, $token, $ex);
            $acquired = true;
            return $fn();
        } finally {
            if ($acquired) $this->unlock($key, $token);
        }
    }

    public function tryLock($key, $value = '1', $ex = 6)
    {
        return Cache::store('redis')->handler()->set('lock_' . $key, $value, ["NX", "EX" => $ex]);
    }

    public function lock($key, $value = '1', $ex = 6)
    {
        $deadline = microtime(true) + min(6, max(1, (int)$ex));
        do {
            if ($this->tryLock($key, $value, max(1, (int)$ex))) return true;
            usleep(random_int(10000, 30000));
        } while (microtime(true) < $deadline);
        throw new \crmeb\exceptions\ApiException('操作处理中，请稍后重试');
    }

    public function unlock($key, $value = '1')
    {
        $script = <<< EOF
if (redis.call("get", "lock_" .. KEYS[1]) == ARGV[1]) then
	return redis.call("del", "lock_" .. KEYS[1])
else
	return 0
end
EOF;
        return Cache::store('redis')->handler()->eval($script, [$key, $value], 1) > 0;
    }
}
