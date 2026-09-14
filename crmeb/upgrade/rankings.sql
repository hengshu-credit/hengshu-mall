CREATE TABLE IF NOT EXISTS `eb_marketing_ranking` (
 `id` int unsigned NOT NULL AUTO_INCREMENT,
 `name` varchar(60) NOT NULL,
 `description` varchar(300) NOT NULL DEFAULT '',
 `entity_type` varchar(16) NOT NULL DEFAULT 'product',
 `enabled` tinyint unsigned NOT NULL DEFAULT 0,
 `priority` int unsigned NOT NULL DEFAULT 0,
 `top_n` int unsigned NOT NULL DEFAULT 20,
 `start_time` bigint unsigned NOT NULL DEFAULT 0,
 `end_time` bigint unsigned NOT NULL DEFAULT 0,
 `config` mediumtext NOT NULL,
 `page_id` int unsigned DEFAULT NULL,
 `version` int unsigned NOT NULL DEFAULT 1,
 `is_del` tinyint unsigned NOT NULL DEFAULT 0,
 `add_time` int unsigned NOT NULL DEFAULT 0,
 `update_time` int unsigned NOT NULL DEFAULT 0,
 PRIMARY KEY (`id`), UNIQUE KEY `ranking_page` (`page_id`),
 KEY `active_rankings` (`is_del`,`enabled`,`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品和店铺营销排行榜';
