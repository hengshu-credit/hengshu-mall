CREATE TABLE IF NOT EXISTS `eb_marketing_style` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `kind` varchar(16) NOT NULL,
  `mobile_image` varchar(1000) NOT NULL,
  `pc_image` varchar(1000) NOT NULL DEFAULT '',
  `start_time` bigint unsigned NOT NULL,
  `end_time` bigint unsigned NOT NULL,
  `enabled` tinyint unsigned NOT NULL DEFAULT 0,
  `priority` int unsigned NOT NULL DEFAULT 0,
  `scope_type` varchar(16) NOT NULL DEFAULT 'all',
  `scope_ids` text NOT NULL,
  `is_del` tinyint unsigned NOT NULL DEFAULT 0,
  `add_time` int unsigned NOT NULL DEFAULT 0,
  `update_time` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `active_styles` (`is_del`,`enabled`,`start_time`,`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销边框和活动氛围';

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`module`,`menu_path`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'营销样式','admin','/marketing/style/list',CAST(p.id AS CHAR),1,1,1,1,'marketing-style-list'
FROM `eb_system_menus` p WHERE p.menu_path='/marketing' AND p.pid=0 AND p.is_del=0
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-list') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'创建或编辑样式',CONCAT(p.path,'/',p.id),3,1,0,1,'marketing-style-save' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-list' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-save');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'启停样式',CONCAT(p.path,'/',p.id),3,1,0,1,'marketing-style-status' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-list' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-status');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'删除样式',CONCAT(p.path,'/',p.id),3,1,0,1,'marketing-style-delete' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-list' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-delete');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'样式列表','marketing/style/list','GET',CONCAT(p.path,'/',p.id),2,1,0,1,'marketing-style-list-api' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-list' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-list-api');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'样式详情','marketing/style/info/<id>','GET',CONCAT(p.path,'/',p.id),2,1,0,1,'marketing-style-info-api' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-list' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-info-api');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'样式使用范围','marketing/style/options','GET',CONCAT(p.path,'/',p.id),2,1,0,1,'marketing-style-options-api' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-list' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-options-api');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'保存样式','marketing/style/save/<id>','POST',CONCAT(p.path,'/',p.id),2,1,0,1,'marketing-style-save-api' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-save' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-save-api');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'启停样式','marketing/style/status/<id>','PUT',CONCAT(p.path,'/',p.id),2,1,0,1,'marketing-style-status-api' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-status' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-status-api');

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`) SELECT p.id,'删除样式','marketing/style/del/<id>','DELETE',CONCAT(p.path,'/',p.id),2,1,0,1,'marketing-style-delete-api' FROM `eb_system_menus` p WHERE p.unique_auth='marketing-style-delete' AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='marketing-style-delete-api');
