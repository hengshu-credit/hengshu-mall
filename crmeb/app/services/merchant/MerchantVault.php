<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;

/** Private merchant data never goes to the generic public attachment store. */
class MerchantVault
{
    public static function directory(): string
    {
        // Multi-app HTTP requests alter getRuntimePath(); the root runtime is shared with CLI.
        $override = getenv('CRMEB_MERCHANT_STORAGE');
        $runtime = rtrim(app()->getRootPath(), '/\\') . '/runtime/';
        $dir = $override ? rtrim($override, '/\\') . '/' : $runtime . 'merchant_private/';
        if (!preg_match('#^(/|[a-zA-Z]:[\\\\/])#', $dir)) throw new AdminException('商户私有资料目录必须为绝对路径');
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new AdminException('无法创建商户私有资料目录');
        $public = realpath(app()->getRootPath() . 'public');
        $resolved = realpath($dir);
        if ($public && $resolved && (strtolower($resolved) === strtolower($public) || strpos(strtolower($resolved . '/'), strtolower($public . '/')) === 0)) throw new AdminException('商户私有资料不能放在公开目录');
        // CLI installers run as root in the bundled container, FPM runs as the runtime owner.
        if (function_exists('posix_geteuid') && posix_geteuid() === 0 && is_dir($runtime)) {
            $owner = fileowner($runtime); $group = filegroup($runtime);
            chown($dir, $owner); chgrp($dir, $group);
            if (is_file($dir . '.key')) { chown($dir . '.key', $owner); chgrp($dir . '.key', $group); }
        }
        return $dir;
    }

    private static function key(bool $create): string
    {
        $configured = getenv('CRMEB_MERCHANT_KEY');
        if ($configured !== false && $configured !== '') {
            if (!preg_match('/^[a-f0-9]{64}$/iD', $configured)) throw new AdminException('商户资料密钥配置不正确');
            return hex2bin($configured);
        }
        $file = self::directory() . '.key';
        if (!is_file($file) && $create) {
            if (\think\facade\Db::name('merchant_shop')->count() || \think\facade\Db::name('merchant_application')->count()) throw new AdminException('商户资料密钥缺失，请恢复原密钥，不可重新生成');
            $handle = @fopen($file, 'x+b');
            if ($handle) {
                if (!flock($handle, LOCK_EX)) throw new AdminException('无法锁定商户资料密钥');
                $key = random_bytes(32);
                if (fwrite($handle, $key) !== 32) throw new AdminException('无法保存商户资料密钥');
                fflush($handle);
                chmod($file, 0600);
                if (function_exists('posix_geteuid') && posix_geteuid() === 0) { chown($file, fileowner(self::directory())); chgrp($file, filegroup(self::directory())); }
                flock($handle, LOCK_UN);
                fclose($handle);
            }
        }
        $handle = @fopen($file, 'rb');
        if (!$handle) throw new AdminException('商户资料密钥缺失，请恢复原密钥');
        flock($handle, LOCK_SH);
        $key = stream_get_contents($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
        if (strlen($key) !== 32) throw new AdminException('商户资料密钥损坏，请恢复原密钥');
        return $key;
    }

    public static function encrypt(array $data): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'aes-256-gcm', self::key(true), OPENSSL_RAW_DATA, $iv, $tag, 'merchant-v1');
        if ($cipher === false) throw new AdminException('商户资料加密失败');
        return 'v1:' . base64_encode($iv . $tag . $cipher);
    }

    public static function decrypt(string $value): array
    {
        if ($value === '') return [];
        $raw = strpos($value, 'v1:') === 0 ? base64_decode(substr($value, 3), true) : false;
        if ($raw === false || strlen($raw) < 28) throw new AdminException('商户资料格式不正确');
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', self::key(false), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), 'merchant-v1');
        if ($plain === false) throw new AdminException('商户资料无法解密，请检查原密钥');
        $data = json_decode($plain, true);
        if (!is_array($data)) throw new AdminException('商户资料内容不正确');
        return $data;
    }

    public static function identity(string $kind, string $identity): string
    {
        return hash_hmac('sha256', $kind . ':' . strtoupper(trim($identity)), self::key(true));
    }
}
