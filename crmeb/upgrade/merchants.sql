CREATE TABLE IF NOT EXISTS `eb_merchant_subject` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `identity_key` char(64) NOT NULL,
  `name` varchar(200) NOT NULL DEFAULT '',
  `profile` mediumtext NOT NULL,
  `version` int unsigned NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY (`identity_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_shop` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `name` varchar(120) NOT NULL,
  `subject_id` int unsigned NOT NULL DEFAULT 0,
  `type_id` int unsigned NOT NULL,
  `profile` mediumtext NOT NULL,
  `state` varchar(20) NOT NULL DEFAULT 'preparing',
  `audit_status` varchar(20) NOT NULL DEFAULT 'draft',
  `is_platform` tinyint unsigned NOT NULL DEFAULT 0,
  `owner_uid` int unsigned NOT NULL DEFAULT 0,
  `version` int unsigned NOT NULL DEFAULT 1,
  `created_at` int unsigned NOT NULL,
  `updated_at` int unsigned NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY (`code`), KEY (`subject_id`), KEY (`type_id`,`state`), KEY (`owner_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_type` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `description` varchar(1000) NOT NULL DEFAULT '',
  `sort` int unsigned NOT NULL DEFAULT 0,
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `apply_selectable` tinyint unsigned NOT NULL DEFAULT 1,
  `version` int unsigned NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_tag` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#409EFF',
  `description` varchar(1000) NOT NULL DEFAULT '',
  `sort` int unsigned NOT NULL DEFAULT 0,
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `version` int unsigned NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_shop_tag` (
  `shop_id` int unsigned NOT NULL,
  `tag_id` int unsigned NOT NULL, PRIMARY KEY (`shop_id`,`tag_id`), KEY (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_application` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `shop_id` int unsigned NOT NULL DEFAULT 0,
  `uid` int unsigned NOT NULL DEFAULT 0,
  `kind` varchar(24) NOT NULL DEFAULT 'onboarding',
  `status` varchar(24) NOT NULL DEFAULT 'draft',
  `data` mediumtext NOT NULL,
  `version` int unsigned NOT NULL DEFAULT 1,
  `base_version` int unsigned NOT NULL DEFAULT 0,
  `subject_version` int unsigned NOT NULL DEFAULT 0,
  `submission_id` int unsigned NOT NULL DEFAULT 0,
  `reviewer_id` int unsigned NOT NULL DEFAULT 0,
  `reviewer_name` varchar(100) NOT NULL DEFAULT '',
  `opinion` varchar(2000) NOT NULL DEFAULT '',
  `created_at` int unsigned NOT NULL,
  `updated_at` int unsigned NOT NULL,
  `reviewed_at` int unsigned NOT NULL DEFAULT 0, PRIMARY KEY (`id`), KEY (`shop_id`,`status`), KEY (`uid`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_submission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int unsigned NOT NULL,
  `version` int unsigned NOT NULL,
  `data` mediumtext NOT NULL,
  `scope` text NOT NULL,
  `created_at` int unsigned NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY (`application_id`,`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `shop_id` int unsigned NOT NULL DEFAULT 0,
  `application_id` int unsigned NOT NULL DEFAULT 0,
  `event_key` varchar(100) NOT NULL,
  `event_type` varchar(30) NOT NULL,
  `stage` varchar(24) NOT NULL,
  `actor_id` int unsigned NOT NULL,
  `actor_kind` varchar(20) NOT NULL,
  `actor_name` varchar(100) NOT NULL,
  `source` varchar(30) NOT NULL,
  `summary` varchar(500) NOT NULL,
  `payload` mediumtext NOT NULL,
  `created_at` int unsigned NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY (`event_key`), KEY (`shop_id`,`id`), KEY (`application_id`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_history_scope` (
  `history_id` bigint unsigned NOT NULL,
  `shop_id` int unsigned NOT NULL, PRIMARY KEY (`history_id`,`shop_id`), KEY (`shop_id`,`history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_document` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `shop_id` int unsigned NOT NULL DEFAULT 0,
  `owner_id` int unsigned NOT NULL,
  `owner_kind` varchar(20) NOT NULL,
  `kind` varchar(30) NOT NULL,
  `name` varchar(255) NOT NULL,
  `storage_name` varchar(100) NOT NULL,
  `mime` varchar(100) NOT NULL,
  `size` int unsigned NOT NULL,
  `sha256` char(64) NOT NULL,
  `created_at` int unsigned NOT NULL, PRIMARY KEY (`id`), UNIQUE KEY (`storage_name`), KEY (`shop_id`), KEY (`owner_kind`,`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_document_relation` (
  `document_id` int unsigned NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_id` bigint unsigned NOT NULL, PRIMARY KEY (`document_id`,`target_type`,`target_id`), KEY (`target_type`,`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_account_shop` (
  `uid` int unsigned NOT NULL,
  `shop_id` int unsigned NOT NULL, PRIMARY KEY (`uid`,`shop_id`), KEY (`shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_merchant_install` (
  `id` tinyint unsigned NOT NULL,
  `version` int unsigned NOT NULL DEFAULT 0, PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
