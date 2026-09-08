<?php
/** Uses the real ThinkQueue connector and rejects commands at its Redis boundary. No network. */
require dirname(__DIR__, 2) . '/crmeb/vendor/autoload.php';
class PaymentBoundaryRedis extends Redis {
    public $result = false;
    public $commands = [];
    public function rPush($key, ...$values) { $this->commands[] = ['rpush', $key, $values]; return $this->result; }
    public function zAdd($key, $score_or_options, ...$values) { $this->commands[] = ['zadd', $key, $values]; return $this->result; }
}
$redis = new PaymentBoundaryRedis;
$original = new think\queue\connector\Redis($redis, 'payment-fixture');
$queue = class_exists(crmeb\utils\CheckedRedisQueue::class) ? crmeb\utils\CheckedRedisQueue::wrap($original) : $original;
$checks = [];
foreach (['push', 'later'] as $method) {
    $rejected = false;
    try { $id = $method === 'push' ? $queue->push('FixtureJob', ['id' => 1]) : $queue->later(10, 'FixtureJob', ['id' => 1]); $rejected = $id === false; }
    catch (Throwable $error) { $rejected = true; }
    $checks[] = ['test' => $method . ' detects rejected Redis command', 'pass' => $rejected];
}
$redis->result = 1;
$id = $queue->push('FixtureJob', ['id' => 1]);
$checks[] = ['test' => 'accepted Redis command retains job ID and queue name', 'pass' => is_string($id) && strlen($id) > 0 && $redis->commands[2][1] === 'queues:payment-fixture'];
$redis->result = 0; // ZADD may report an existing member; this is not an error.
$id = $queue->later(10, 'FixtureJob', ['id' => 1]);
$checks[] = ['test' => 'ZADD zero is not mistaken for failure', 'pass' => is_string($id) && strlen($id) > 0];
foreach ($checks as $check) fwrite(STDERR, ($check['pass'] ? 'PASS ' : 'FAIL ') . $check['test'] . "\n");
echo json_encode($checks, JSON_PRETTY_PRINT), "\n";
exit(count(array_filter($checks, function ($check) { return !$check['pass']; })) ? 1 : 0);
