CREATE TABLE IF NOT EXISTS `eb_store_product_brand` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `logo` varchar(512) NOT NULL DEFAULT '',
  `description` varchar(1000) NOT NULL DEFAULT '',
  `is_global` tinyint unsigned NOT NULL DEFAULT 1,
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `sort` int unsigned NOT NULL DEFAULT 0,
  `add_time` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brand_name` (`name`),
  KEY `status_sort` (`status`,`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品品牌';
CREATE TABLE IF NOT EXISTS `eb_store_product_brand_cate` (
  `brand_id` int unsigned NOT NULL,
  `cate_id` int unsigned NOT NULL,
  PRIMARY KEY (`brand_id`,`cate_id`),
  KEY `category_brand` (`cate_id`,`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌适用分类';
CREATE TABLE IF NOT EXISTS `eb_store_product_brand_relation` (
  `product_id` int unsigned NOT NULL,
  `brand_id` int unsigned NOT NULL,
  PRIMARY KEY (`product_id`,`brand_id`),
  KEY `brand_product` (`brand_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品品牌关联';

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`module`,`menu_path`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'商品品牌','admin','/product/brand/list',CAST(p.id AS CHAR),1,1,1,1,'admin-product-brand-list'
FROM `eb_system_menus` p WHERE (p.menu_path='/product' OR p.unique_auth IN ('admin-product','admin-store-index')) AND p.pid=0 AND p.is_del=0
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='admin-product-brand-list') LIMIT 1;

UPDATE `eb_system_menus` b JOIN `eb_system_menus` p
ON (p.menu_path='/product' OR p.unique_auth IN ('admin-product','admin-store-index')) AND p.pid=0 AND p.is_del=0
SET b.pid=p.id,b.menu_path='/product/brand/list',b.menu_name='商品品牌',b.module='admin',
b.path=CAST(p.id AS CHAR),b.auth_type=1
WHERE b.unique_auth='admin-product-brand-list';

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'添加或编辑品牌',CONCAT(p.path,'/',p.id),3,1,0,1,'admin-product-brand-save'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='admin-product-brand-save') LIMIT 1;
INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'修改品牌状态',CONCAT(p.path,'/',p.id),3,1,0,1,'admin-product-brand-status'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='admin-product-brand-status') LIMIT 1;
INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`path`,`auth_type`,`is_show`,`is_show_path`,`access`,`unique_auth`)
SELECT p.id,'删除品牌',CONCAT(p.path,'/',p.id),3,1,0,1,'admin-product-brand-delete'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='admin-product-brand-delete') LIMIT 1;

INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`access`,`unique_auth`)
SELECT p.id,'品牌列表','product/brand/list','GET',CONCAT(p.path,'/',p.id),2,1,1,'product-brand-list-api'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-list'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='product-brand-list-api') LIMIT 1;
INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`access`,`unique_auth`)
SELECT p.id,'品牌详情','product/brand/info/<id>','GET',CONCAT(p.path,'/',p.id),2,1,1,'product-brand-info-api'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-save'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='product-brand-info-api') LIMIT 1;
INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`access`,`unique_auth`)
SELECT p.id,'保存品牌','product/brand/save/<id>','POST',CONCAT(p.path,'/',p.id),2,1,1,'product-brand-save-api'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-save'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='product-brand-save-api') LIMIT 1;
INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`access`,`unique_auth`)
SELECT p.id,'品牌状态','product/brand/status/<id>/<status>','PUT',CONCAT(p.path,'/',p.id),2,1,1,'product-brand-status-api'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-status'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='product-brand-status-api') LIMIT 1;
INSERT INTO `eb_system_menus` (`pid`,`menu_name`,`api_url`,`methods`,`path`,`auth_type`,`is_show`,`access`,`unique_auth`)
SELECT p.id,'删除品牌','product/brand/del/<id>','DELETE',CONCAT(p.path,'/',p.id),2,1,1,'product-brand-delete-api'
FROM `eb_system_menus` p WHERE p.unique_auth='admin-product-brand-delete'
AND NOT EXISTS (SELECT 1 FROM `eb_system_menus` WHERE unique_auth='product-brand-delete-api') LIMIT 1;

UPDATE `eb_system_menus` SET `is_show_path`=1,`is_show`=1,`is_del`=0,`access`=1,
`auth_type`=CASE WHEN `unique_auth`='admin-product-brand-list' THEN 1 WHEN `unique_auth` LIKE 'admin-product-brand-%' THEN 3 ELSE 2 END
WHERE `unique_auth` IN (
 'admin-product-brand-list','admin-product-brand-save','admin-product-brand-status','admin-product-brand-delete',
 'product-brand-list-api','product-brand-info-api','product-brand-save-api','product-brand-status-api','product-brand-delete-api'
);
