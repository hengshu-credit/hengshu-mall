<?php
namespace think\facade {
    class Cache {public static $redis;public static function store($name){return new self;}public function handler(){return self::$redis;}}
}
namespace {
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function getLang($message,$replace=[]){return $message;}
class RedisLockBoundary {
    public $values=[];public $tokens=[];
    public function set($key,$value,$options){$this->tokens[]=$value;if(isset($this->values[$key]))return false;$this->values[$key]=$value;return true;}
    public function eval($script,$args,$keys){[$key,$token]=$args;$key='lock_'.$key;if(($this->values[$key]??null)!==$token)return 0;unset($this->values[$key]);return 1;}
}
function lockCheck($ok,$name){if(!$ok)throw new \RuntimeException($name);echo 'PASS: '.$name.PHP_EOL;}
$redis=new RedisLockBoundary;\think\facade\Cache::$redis=$redis;$lock=new \crmeb\services\LockService;
$lock->exec('same-key',function()use($redis,$lock){unset($redis->values['lock_same-key']);$lock->tryLock('same-key','successor-token');});
lockCheck($redis->values['lock_same-key']==='successor-token','expired owner cannot delete successor ownership');
lockCheck($redis->tokens[0]!=='same-key'&&strlen($redis->tokens[0])>=32,'exec uses a unique acquisition token');
$start=microtime(true);$rejected=false;
try{$lock->lock('same-key','waiting-token',1);}catch(\crmeb\exceptions\ApiException $expected){$rejected=true;}
lockCheck($rejected&&microtime(true)-$start<2,'contention has a bounded wait');
try{$lock->exec('failed-action',function(){throw new \RuntimeException('action failed');});}catch(\RuntimeException $expected){}
lockCheck(!isset($redis->values['lock_failed-action']),'failed action releases only its own lease');
echo "Lock checks passed with deterministic Redis boundary.\n";
}
