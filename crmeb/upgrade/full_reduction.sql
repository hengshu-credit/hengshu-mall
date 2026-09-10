CREATE TABLE IF NOT EXISTS `eb_store_full_reduction` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `start_time` int unsigned NOT NULL,
  `end_time` int unsigned NOT NULL,
  `unit` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1金额 2件数',
  `rules_type` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1阶梯 0循环',
  `discount_type` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1减价 2折扣',
  `rules` text NOT NULL,
  `range_type` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0全部 3指定 4排除',
  `product_ids` text NOT NULL,
  `level_ids` text NOT NULL,
  `member_type` varchar(10) NOT NULL DEFAULT 'all',
  `member_ids` text NOT NULL,
  `tag_match` varchar(3) NOT NULL DEFAULT 'any',
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `sort` int unsigned NOT NULL DEFAULT 50,
  `is_del` tinyint unsigned NOT NULL DEFAULT 0,
  `add_time` int unsigned NOT NULL,
  `update_time` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `activity_time` (`is_del`,`status`,`start_time`,`end_time`),
  KEY `activity_sort` (`is_del`,`sort`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='满减活动配置';

CREATE TABLE IF NOT EXISTS `eb_store_full_reduction_mutex` (
  `id` tinyint unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='串行校验满减活动冲突';

INSERT IGNORE INTO `eb_store_full_reduction_mutex` (`id`) VALUES (1);

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`module`,`menu_path`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'满减活动','admin','/marketing/full_reduction/list',CAST(p.id AS CHAR),1,1,1,1,'marketing-full-reduction-list'
FROM `eb_system_menus` p WHERE p.menu_path='/marketing' AND p.pid=0 AND p.is_del=0
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-list') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'添加或编辑满减活动',CONCAT(p.path,'/',p.id),3,1,1,1,'marketing-full-reduction-save'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-save') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'启停满减活动',CONCAT(p.path,'/',p.id),3,1,1,1,'marketing-full-reduction-status'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-status') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'删除满减活动',CONCAT(p.path,'/',p.id),3,1,1,1,'marketing-full-reduction-delete'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-delete') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'满减活动列表','marketing/full_reduction/list','GET',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-list-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-list-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'满减活动详情','marketing/full_reduction/info/<id>','GET',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-info-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-save'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-info-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'满减活动选择项','marketing/full_reduction/options','GET',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-options-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-save'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-options-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'保存满减活动','marketing/full_reduction/save/<id>','POST',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-save-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-save'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-save-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'满减活动排序','marketing/full_reduction/sort/<id>','PUT',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-sort-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-save'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-sort-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'启停满减活动','marketing/full_reduction/status/<id>','PUT',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-status-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-status'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-status-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'删除满减活动','marketing/full_reduction/del/<id>','DELETE',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-delete-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-delete'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-delete-api') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'批量删除满减活动','marketing/full_reduction/batch_delete','POST',CONCAT(p.path,'/',p.id),2,1,1,1,'marketing-full-reduction-batch-delete-api'
FROM `eb_system_menus` p WHERE p.unique_auth='marketing-full-reduction-delete'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-full-reduction-batch-delete-api') LIMIT 1;
