CREATE TABLE IF NOT EXISTS `eb_store_product_quality` (
 `product_id` int unsigned NOT NULL,
 `status` varchar(16) NOT NULL DEFAULT 'pending',
 `profile` text NOT NULL,
 `snapshot_hash` char(64) NOT NULL DEFAULT '',
 `reviewer_id` int unsigned NOT NULL DEFAULT 0,
 `reviewed_at` int unsigned NOT NULL DEFAULT 0,
 `updated_at` int unsigned NOT NULL,
 PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `eb_store_product_quality_history` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `product_id` int unsigned NOT NULL,
 `reviewer_id` int unsigned NOT NULL,
 `snapshot_hash` char(64) NOT NULL,
 `snapshot` longtext NOT NULL,
 `created_at` int unsigned NOT NULL,
 PRIMARY KEY (`id`), KEY `product_history` (`product_id`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
