<?php
declare(strict_types=1);

namespace app\services\product\product;

use app\services\system\config\JdCrawlerConfig;
use crmeb\exceptions\AdminException;
use crmeb\services\CacheService;
use GuzzleHttp\Client;

/** HTTP boundary to the independently deployed browser collector. */
class JdCrawlerServices
{
    public function isJdUrl(string $url): bool
    {
        $host = strtolower((string)parse_url(trim($url), PHP_URL_HOST));
        return $host === 'jd.com' || substr($host, -7) === '.jd.com' || $host === '3.cn' || substr($host, -5) === '.3.cn';
    }

    public function canonicalUrl(string $url): string
    {
        if (strlen($url) > 2048 || preg_match('/[\x00-\x20\x7f]/', $url)) {
            throw new AdminException('请输入有效的京东商品详情链接');
        }
        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $scheme = strtolower($parts['scheme'] ?? '');
        if (!in_array($scheme, ['http', 'https'], true) || isset($parts['user']) || isset($parts['pass']) ||
            (isset($parts['port']) && $parts['port'] !== ($scheme === 'https' ? 443 : 80))) {
            throw new AdminException('请输入有效的京东商品详情链接');
        }
        $path = $parts['path'] ?? '';
        $pattern = $host === 'item.jd.com' ? '#^/([0-9]{1,20})\.html$#' : '#^/product/([0-9]{1,20})\.html$#';
        if (!in_array($host, ['item.jd.com', 'item.m.jd.com'], true) || !preg_match($pattern, $path, $match)) {
            throw new AdminException('请使用京东商品详情链接（item.jd.com 或 item.m.jd.com），短链接请先在浏览器打开后复制完整地址');
        }
        return 'https://item.jd.com/' . $match[1] . '.html';
    }

    public function start(string $url, int $adminId): array
    {
        $url = $this->canonicalUrl(trim($url));
        $result = $this->request('POST', '/v1/jobs', ['url' => $url]);
        $id = $result['job_id'] ?? '';
        if (!$this->validTaskId($id) || !in_array($result['state'] ?? '', ['queued', 'running'], true)) {
            throw new AdminException('京东采集服务返回了无效的任务，请检查服务版本');
        }
        // Separate tag keeps configuration cache clearing from dropping active tasks.
        if (!CacheService::set($this->cacheKey($id), ['admin_id' => $adminId, 'url' => $url], 900, 'jd_collection')) {
            throw new AdminException('无法保存采集任务状态，请检查商城缓存服务');
        }
        return ['task_id' => $id, 'state' => $result['state']];
    }

    public function poll(string $id, int $adminId): array
    {
        if (!$this->validTaskId($id)) throw new AdminException('采集任务编号无效');
        $owner = CacheService::get($this->cacheKey($id));
        if (!is_array($owner) || (int)$owner['admin_id'] !== $adminId) {
            throw new AdminException('采集任务已过期或无权访问，请重新采集');
        }
        $result = $this->request('GET', '/v1/jobs/' . $id);
        if (($result['job_id'] ?? '') !== $id) throw new AdminException('京东采集服务返回了错误的任务编号');
        $state = $result['state'] ?? '';
        if (in_array($state, ['queued', 'running'], true)) return ['task_id' => $id, 'state' => $state];
        if ($state === 'failed') throw new AdminException($this->errorMessage($result['error']['code'] ?? ''));
        if ($state !== 'succeeded' || !is_array($result['product'] ?? null)) throw new AdminException('京东采集服务返回的数据格式不正确');
        $product = $result['product'];
        if ($this->canonicalUrl((string)($product['source_url'] ?? '')) !== $owner['url'] ||
            $owner['url'] !== 'https://item.jd.com/' . ($product['sku_id'] ?? '') . '.html') {
            throw new AdminException('采集结果与请求的京东商品不一致，请重新采集');
        }
        return ['product' => $product];
    }

    protected function request(string $method, string $path, array $body = []): array
    {
        if (!JdCrawlerConfig::enabled()) throw new AdminException('请先在商品采集配置的基础配置中选择本地京东采集服务（启用京东独立采集）');
        $url = JdCrawlerConfig::serviceUrl((string)sys_config('jd_crawler_url', ''));
        $token = (string)sys_config('jd_crawler_token', '');
        if (strlen($token) < 32 || preg_match('/[\x00-\x20\x7f]/', $token)) throw new AdminException('请先配置京东采集服务的访问密钥');
        try {
            $options = [
                'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
                'connect_timeout' => 3, 'timeout' => 12, 'allow_redirects' => false, 'http_errors' => false,
            ];
            if ($method === 'POST') $options['json'] = $body;
            $response = (new Client())->request($method, $url . $path, $options);
            $stream = $response->getBody();
            $text = $stream->read(2 * 1024 * 1024 + 1);
            if (strlen($text) > 2 * 1024 * 1024) throw new AdminException('京东采集返回数据过大');
            $result = json_decode($text, true);
            $status = $response->getStatusCode();
            if (!is_array($result)) throw new AdminException('京东采集服务响应无效，请检查服务地址和版本');
            if ($status < 200 || $status >= 300) {
                $code = $result['error']['code'] ?? ($status === 401 ? 'unauthorized' : '');
                throw new AdminException($this->errorMessage($code));
            }
            return $result;
        } catch (AdminException $e) {
            throw $e;
        } catch (\Throwable $e) {
            // Transport exception URLs/headers can contain internal information.
            throw new AdminException('无法连接京东采集服务，请检查服务运行状态、地址和网络');
        }
    }

    private function validTaskId($id): bool
    {
        return is_string($id) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D', $id) === 1;
    }

    private function cacheKey(string $id): string { return 'jd_collection_' . $id; }

    private function errorMessage(string $code): string
    {
        $messages = [
            'unauthorized' => '京东采集服务密钥不匹配，请检查商品采集配置',
            'busy' => '京东采集服务正在处理其他商品，请稍后重试',
            'invalid_url' => '京东商品链接无效，请复制完整的商品详情地址',
            'not_found' => '京东采集任务已过期，请重新采集',
            'timeout' => '京东采集超时，请检查采集浏览器后重试',
            'login_required' => '京东登录已失效，请在采集服务的专用浏览器中登录后重试',
            'verification_required' => '京东需要人工验证，请在采集服务的专用浏览器中完成验证后重试',
            'browser_unavailable' => '采集浏览器未就绪，请检查京东采集服务',
            'service_restarted' => '京东采集服务已重启，请重新采集',
        ];
        return $messages[$code] ?? '未能获取有效的京东商品信息，请检查商品是否可访问以及采集浏览器的登录状态';
    }

    private function text($value, int $length = 255): string
    {
        return mb_substr(trim(strip_tags(is_scalar($value) ? (string)$value : '')), 0, $length);
    }

    private function images($values, int $limit): array
    {
        if (!is_array($values)) throw new AdminException('京东商品图片格式不正确');
        $images = [];
        foreach (array_slice($values, 0, $limit) as $value) {
            if (!is_string($value) || strlen($value) > 2048 || preg_match('/[\x00-\x20\x7f]/', $value)) throw new AdminException('京东商品包含无效图片地址');
            $parts = parse_url($value);
            $host = strtolower($parts['host'] ?? '');
            if (($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) ||
                (isset($parts['port']) && $parts['port'] !== 443) ||
                !preg_match('/(^|\.)(360buyimg\.com|jdimg\.com|jd\.com)$/D', $host)) {
                throw new AdminException('京东商品包含非京东素材地址');
            }
            $images[] = $value;
        }
        return array_values(array_unique($images));
    }

    /** Convert only verified current-SKU data into the existing product editor contract. */
    public function mapProduct(array $raw): array
    {
        $title = $this->text($raw['title'] ?? '', 128);
        $url = $this->canonicalUrl((string)($raw['source_url'] ?? ''));
        $images = $this->images($raw['images'] ?? [], 20);
        $details = $this->images($raw['detail_images'] ?? [], 100);
        $video = $this->videoUrl($raw['video_link'] ?? '');
        if ($title === '' || !$images) throw new AdminException('未采集到商品标题或主图，请检查京东登录状态后重试');
        $price = $raw['price'] ?? null;
        if ($price !== null && (!is_numeric($price) || !is_finite((float)$price) || $price < 0 || $price > 99999999)) {
            throw new AdminException('京东商品价格格式不正确');
        }
        $warnings = ['仅采集链接对应的商品规格；请核对价格、填写库存后保存。'];
        if ($price === null || (float)$price === 0.0) $warnings[] = '未取得有效售价，请手动填写商品价格。';
        if (!$details) $warnings[] = '未取得详情图片，请检查并补充商品详情。';
        foreach (array_slice(is_array($raw['warnings'] ?? null) ? $raw['warnings'] : [], 0, 10) as $warning) {
            if (in_array($warning, ['price_unavailable', 'images_unavailable', 'detail_images_unavailable'], true)) continue;
            if ($warning === 'video_stream_unavailable') {
                $warnings[] = '商品视频为流媒体，未取得可保存的视频文件，请在素材库另行上传原始视频。';
                continue;
            }
            if ($warning === 'video_url_too_long') {
                $warnings[] = '商品视频地址过长，未自动填入；请在素材库上传原始视频。';
                continue;
            }
            if (is_string($warning)) $warnings[] = $this->text($warning);
        }
        $params = [];
        foreach (['attributes', 'selected_specs'] as $field) {
            foreach (array_slice(is_array($raw[$field] ?? null) ? $raw[$field] : [], 0, 50) as $item) {
                if (!is_array($item)) continue;
                $name = $this->text($item['name'] ?? '', 64);
                $value = $this->text($item['value'] ?? '', 255);
                if ($name !== '' && $value !== '') $params[] = compact('name', 'value');
            }
        }
        $escape = function ($text) { return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
        $description = '<p>' . $escape($title) . '</p>';
        foreach ($params as $param) $description .= '<p>' . $escape($param['name']) . '：' . $escape($param['value']) . '</p>';
        foreach ($details as $image) $description .= '<p><img src="' . $escape($image) . '" alt="" /></p>';
        $attr = [
            'pic' => $images[0], 'price' => round((float)$price, 2), 'cost' => 0, 'ot_price' => 0,
            'stock' => 0, 'bar_code' => '', 'bar_code_number' => '', 'weight' => 0, 'volume' => 0,
            'brokerage' => 0, 'brokerage_two' => 0, 'vip_price' => 0, 'vip_proportion' => 0,
            'virtual_list' => [], 'coupon_id' => 0,
        ];
        return [
            'store_name' => $title, 'store_info' => $this->text($raw['subtitle'] ?? $title),
            'keyword' => '', 'unit_name' => '件', 'image' => $images[0], 'slider_image' => $images,
            'description' => $description, 'description_images' => $details, 'soure_link' => $url,
            'video_link' => $video, 'video_open' => $video !== '' ? 1 : 0,
            'price' => $attr['price'], 'ot_price' => 0, 'cost' => 0, 'stock' => 0, 'sales' => 0,
            'spec_type' => 0, 'attr' => $attr, 'items' => [], 'info' => ['value' => []],
            'params_list' => array_slice($params, 0, 8), 'collection_warnings' => array_values(array_unique($warnings)),
        ];
    }

    /** Only direct JD video files can enter the collection download queue. */
    public function videoUrl($value): string
    {
        if ($value === '' || $value === null) return '';
        if (!is_string($value) || strlen($value) > 500) throw new AdminException('京东视频地址无效或过长');
        $this->images([$value], 1);
        $extension = strtolower(pathinfo((string)parse_url($value, PHP_URL_PATH), PATHINFO_EXTENSION));
        if (!in_array($extension, ['mp4', 'webm', 'mov', 'm4v', 'ogv'], true)) {
            throw new AdminException('京东视频不是可保存的视频文件，请在素材库上传原始视频');
        }
        return $value;
    }
}
