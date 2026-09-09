<?php
declare(strict_types=1);

namespace app\services\system\config;

use crmeb\exceptions\AdminException;

/** Extends the existing collection configuration without requiring a manual SQL upgrade. */
class JdCrawlerConfig
{
    const KEYS = ['jd_crawler_enabled', 'jd_crawler_url', 'jd_crawler_token'];

    public static function serviceUrl(string $url): string
    {
        $url = rtrim(trim($url), '/');
        $parts = parse_url($url);
        if (strlen($url) > 2048 || preg_match('/[\x00-\x20\x7f]/', $url) ||
            !in_array($parts['scheme'] ?? '', ['http', 'https'], true) || empty($parts['host']) ||
            isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']) ||
            !empty($parts['path'])) {
            throw new AdminException('京东采集服务地址应为 http(s)://主机:端口，不含路径、账号或查询参数');
        }
        return $url;
    }

    public function rules($builder): array
    {
        return [
            $builder->radio('jd_crawler_enabled', '京东独立采集', (int)sys_config('jd_crawler_enabled', 0))->options([
                ['value' => 0, 'label' => '关闭'], ['value' => 1, 'label' => '开启'],
            ])->appendRule('suffix', ['type' => 'div', 'class' => 'tips-info', 'domProps' => ['innerHTML' => '开启后京东详情链接使用独立采集服务，其他平台继续使用原采集接口。']]),
            $builder->input('jd_crawler_url', '京东采集服务地址', (string)sys_config('jd_crawler_url', 'http://jd-crawler:8091'))
                ->placeholder('http://jd-crawler:8091')->col(18),
            $builder->input('jd_crawler_token', '京东采集访问密钥', '')->type('password')->col(18)
                ->placeholder(sys_config('jd_crawler_token', '') ? '已配置，留空保留原密钥' : '填写独立服务的 JD_CRAWLER_TOKEN，至少32位')
                ->appendRule('suffix', ['type' => 'div', 'class' => 'tips-info', 'domProps' => ['innerHTML' => '服务与商城独立运行；请先在服务的专用浏览器登录京东。密钥只在服务端使用。']]),
        ];
    }

    public function validate(array $post): array
    {
        foreach (self::KEYS as $key) {
            if (array_key_exists($key, $post) && !is_scalar($post[$key])) throw new AdminException('京东采集配置格式不正确');
        }
        if (isset($post['jd_crawler_enabled'])) {
            if (!in_array($post['jd_crawler_enabled'], [0, 1, '0', '1'], true)) throw new AdminException('京东采集开关无效');
            $post['jd_crawler_enabled'] = (int)$post['jd_crawler_enabled'];
        }
        if (isset($post['jd_crawler_url'])) $post['jd_crawler_url'] = self::serviceUrl((string)$post['jd_crawler_url']);
        if (isset($post['jd_crawler_token'])) {
            $post['jd_crawler_token'] = trim((string)$post['jd_crawler_token']);
            if ($post['jd_crawler_token'] === '') unset($post['jd_crawler_token']);
            elseif (strlen($post['jd_crawler_token']) < 32 || strlen($post['jd_crawler_token']) > 256 || preg_match('/[\x00-\x20\x7f]/', $post['jd_crawler_token'])) {
                throw new AdminException('京东采集访问密钥需为32至256位且不含空白字符');
            }
        }
        if (($post['jd_crawler_enabled'] ?? sys_config('jd_crawler_enabled', 0)) == 1) {
            self::serviceUrl((string)($post['jd_crawler_url'] ?? sys_config('jd_crawler_url', '')));
            if (strlen((string)($post['jd_crawler_token'] ?? sys_config('jd_crawler_token', ''))) < 32) throw new AdminException('启用京东采集前请先配置访问密钥');
        }
        return $post;
    }

    public function prepareSave(array $post, SystemConfigServices $configs): array
    {
        if (!array_intersect(self::KEYS, array_keys($post))) return $post;
        $post = $this->validate($post);
        $parent = $configs->getOne(['menu_name' => 'system_product_copy_type']);
        if (!$parent) throw new AdminException('未找到商品采集配置分类');
        $labels = ['京东独立采集', '京东采集服务地址', '京东采集访问密钥'];
        foreach (self::KEYS as $index => $key) {
            if (!isset($post[$key]) || $configs->getOne(['menu_name' => $key])) continue;
            $configs->save([
                'menu_name' => $key, 'type' => 'text', 'input_type' => 'input', 'config_tab_id' => $parent['config_tab_id'],
                'value' => json_encode($post[$key]), 'info' => $labels[$index], 'desc' => '', 'required' => '',
                'sort' => 0, 'status' => 1, 'level' => 0, 'link_id' => 0, 'link_value' => 0,
            ]);
        }
        return $post;
    }
}
