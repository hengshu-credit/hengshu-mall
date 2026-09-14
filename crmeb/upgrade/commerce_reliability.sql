CREATE TABLE IF NOT EXISTS `eb_commerce_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_key` varchar(190) NOT NULL,
  `kind` varchar(32) NOT NULL,
  `business_id` bigint unsigned NOT NULL,
  `step` varchar(64) NOT NULL,
  `payload` longtext NOT NULL,
  `state` varchar(16) NOT NULL DEFAULT 'pending',
  `attempts` int unsigned NOT NULL DEFAULT 0,
  `next_attempt_at` int unsigned NOT NULL DEFAULT 0,
  `lease_until` int unsigned NOT NULL DEFAULT 0,
  `lease_token` varchar(64) NOT NULL DEFAULT '',
  `last_error` varchar(1000) NOT NULL DEFAULT '',
  `created_at` int unsigned NOT NULL,
  `updated_at` int unsigned NOT NULL,
  `finished_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`), UNIQUE KEY `task_key` (`task_key`),
  KEY `ready_tasks` (`state`,`next_attempt_at`,`id`),
  KEY `expired_leases` (`state`,`lease_until`), KEY `business_tasks` (`kind`,`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_recharge_refund_attempt` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `recharge_id` int unsigned NOT NULL,
  `uid` int unsigned NOT NULL,
  `refund_no` varchar(64) NOT NULL,
  `driver` varchar(32) NOT NULL,
  `state` varchar(20) NOT NULL DEFAULT 'prepared',
  `principal` decimal(18,2) NOT NULL,
  `gift` decimal(18,2) NOT NULL DEFAULT 0,
  `reserved` decimal(18,2) NOT NULL,
  `payload` longtext NOT NULL,
  `remote_reference` varchar(128) NOT NULL DEFAULT '',
  `last_error` varchar(1000) NOT NULL DEFAULT '',
  `created_at` int unsigned NOT NULL,
  `updated_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `one_refund` (`recharge_id`), UNIQUE KEY `refund_no` (`refund_no`),
  KEY `unresolved` (`state`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `eb_commerce_operation` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `operation_key` varchar(190) NOT NULL,
  `kind` varchar(32) NOT NULL,
  `uid` int unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `result_id` bigint unsigned NOT NULL DEFAULT 0,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `operation_key` (`operation_key`), KEY `account_operations` (`uid`,`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
