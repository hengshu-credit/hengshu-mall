<?php
declare(strict_types=1);

namespace app\services\product\product;

use app\jobs\ProductCopyJob;
use crmeb\services\CacheService;

/** Video import status is advisory; a remaining JD URL also indicates unfinished import. */
class JdVideoImportServices
{
    public function isRemoteVideo(string $url): bool
    {
        return (bool)preg_match('/(^|\.)(jd\.com|360buyimg\.com|jdimg\.com)$/D', strtolower((string)parse_url($url, PHP_URL_HOST)));
    }

    public function state(int $id, string $hash, string $state): void
    {
        try { CacheService::set('jd_video_import_' . $id, ['hash' => $hash, 'state' => $state], 604800, 'jd_collection'); }
        catch (\Throwable $error) { /* The persisted source URL still identifies unfinished transfer. */ }
    }

    public function warnings(int $id, string $url): array
    {
        if (!$this->isRemoteVideo($url)) return [];
        try { $status = CacheService::get('jd_video_import_' . $id); } catch (\Throwable $error) { $status = null; }
        $state = is_array($status) && ($status['hash'] ?? '') === hash('sha256', $url) ? ($status['state'] ?? '') : '';
        if ($state === 'failed') return ['京东视频转存失败，商品已保存；请检查素材服务，并在素材库上传原始视频后替换。'];
        if (in_array($state, ['queued', 'running'], true)) return ['商品已保存，京东视频正在原样转存素材库；完成前请勿上架，请稍后重新打开商品确认。'];
        return ['京东视频尚未转存素材库，当前仍是来源地址；请检查采集队列，或上传原始视频后替换。'];
    }

    public function schedule(int $id, string $url): array
    {
        $hash = hash('sha256', $url);
        $this->state($id, $hash, 'queued');
        try {
            // Queue logs may include arguments; pass a fingerprint, never a signed media URL.
            if ($this->publish($id, $hash) === false) $this->state($id, $hash, 'failed');
        } catch (\Throwable $error) {
            $this->state($id, $hash, 'failed');
        }
        try {
            $status = CacheService::get('jd_video_import_' . $id);
            if (is_array($status) && ($status['hash'] ?? '') === $hash && ($status['state'] ?? '') === 'stored') return [];
        } catch (\Throwable $error) {}
        return $this->warnings($id, $url);
    }

    protected function publish(int $id, string $hash)
    {
        return ProductCopyJob::dispatch('copyVideo', [$id, $hash]);
    }
}
