<?php
// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2026 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------

use think\facade\Route;

/**
 * diy 相关路由
 */
Route::group('diy', function () {

    Route::get('get_list', 'v1.diy.Diy/getList')->option(['real_name' => 'Diy模板列表']);
    Route::get('get_info/:id', 'v1.diy.Diy/getInfo')->option(['real_name' => 'Diy模板数据详情']);
    Route::get('get_diy_info/:id', 'v1.diy.Diy/getDiyInfo')->option(['real_name' => 'Diy模板数据详情']);
    Route::delete('del/:id', 'v1.diy.Diy/del')->option(['real_name' => '删除DIY模板']);
    Route::put('set_status/:id', 'v1.diy.Diy/setStatus')->option(['real_name' => '使用DIY模板']);
    Route::get('create', 'v1.diy.Diy/create')->option(['real_name' => '添加表单']);
    Route::post('create', 'v1.diy.Diy/save')->option(['real_name' => '添加DIY']);
    Route::post('save/[:id]', 'v1.diy.Diy/saveData')->option(['real_name' => '添加DIY模板']);
    Route::post('diy_save/[:id]', 'v1.diy.Diy/saveDiyData')->option(['real_name' => '添加DIY模板']);
    Route::get('get_url', 'v1.diy.Diy/getUrl')->option(['real_name' => '获取前端页面路径']);
    Route::get('get_category', 'v1.diy.Diy/getCategory')->option(['real_name' => '获取商品分类']);
    Route::get('get_product', 'v1.diy.Diy/getProduct')->option(['real_name' => '获取商品列表']);
    Route::get('get_store_status', 'v1.diy.Diy/getStoreStatus')->option(['real_name' => '获取门店自提开启状态']);
    Route::get('recovery/:id', 'v1.diy.Diy/Recovery')->option(['real_name' => '还原Diy默认数据']);
    Route::get('get_by_category', 'v1.diy.Diy/getByCategory')->option(['real_name' => '获取所有二级分类']);
    Route::get('set_recovery/:id', 'v1.diy.Diy/setRecovery')->option(['real_name' => '设置Diy默认数据']);
    Route::get('get_product_list', 'v1.diy.Diy/getProductList')->option(['real_name' => '获取商品列表']);
    Route::get('get_color_change/:type', 'v1.diy.Diy/getColorChange')->option(['real_name' => '获取风格设置']);
    Route::put('color_change/:status/:type', 'v1.diy.Diy/colorChange')->option(['real_name' => '换色和分类保存']);
    Route::get('get_member', 'v1.diy.Diy/getMember')->option(['real_name' => '个人中心详情']);
    Route::get('get_page_category', 'v1.diy.PageLink/getCategory')->option(['real_name' => '获取页面链接分类']);
    Route::get('get_page_link/:cate_id', 'v1.diy.PageLink/getLinks')->option(['real_name' => '获取页面链接']);
    Route::post('member_save', 'v1.diy.Diy/memberSaveData')->option(['real_name' => '个人中心保存']);
    Route::get('get_routine_code/:id', 'v1.diy.Diy/getRoutineCode')->option(['real_name' => 'diy小程序预览码']);
    Route::get('open_adv/info', 'v1.diy.Diy/getOpenAdv')->option(['real_name' => '获取开屏广告']);
    Route::post('open_adv/add', 'v1.diy.Diy/openAdvAdd')->option(['real_name' => '保存开屏广告']);
    Route::get('groom_list/:type', 'v1.diy.Diy/getGroomList')->option(['real_name' => '推荐商品']);
    Route::get('link/category', 'v1.diy.PageLink/getLinkCategory')->option(['real_name' => '获取链接分类']);
    Route::get('link/category/form/:cate_id/[:pid]', 'v1.diy.PageLink/getLinkCategoryForm')->option(['real_name' => '链接分类表单']);
    Route::post('link/category/save/:cate_id', 'v1.diy.PageLink/getLinkCategorySave')->option(['real_name' => '链接分类保存']);
    Route::delete('link/category/del/:cate_id', 'v1.diy.PageLink/getLinkCategoryDel')->option(['real_name' => '链接分类删除']);
    Route::get('link/list/:cate_id', 'v1.diy.PageLink/getLinkList')->option(['real_name' => '链接列表']);
    Route::post('link/save/:id', 'v1.diy.PageLink/getLinkSave')->option(['real_name' => '链接保存']);
    Route::delete('link/del/:id', 'v1.diy.PageLink/getLinkDel')->option(['real_name' => '链接删除']);
})->middleware([
    \app\http\middleware\AllowOriginMiddleware::class,
    \app\adminapi\middleware\AdminAuthTokenMiddleware::class,
    \app\adminapi\middleware\AdminCheckRoleMiddleware::class,
    \app\adminapi\middleware\AdminLogMiddleware::class
])->option(['mark' => 'diy', 'mark_name' => '页面装修']);


/**
 * diy_pro 相关路由
 */
Route::group('diy_pro', function () {
    Route::get('get_list', 'v1.diy.DiyPro/getList')->option(['real_name' => 'DiyPro模板列表']);
    Route::get('get_info/:id', 'v1.diy.DiyPro/getInfo')->option(['real_name' => 'DiyPro模板详情']);
    Route::post('save/:id', 'v1.diy.DiyPro/saveInfo')->option(['real_name' => 'DiyPro模板保存']);
    Route::get('get_product', 'v1.diy.DiyPro/getProduct')->option(['real_name' => '获取商品列表']);
    Route::post('update/name/:id', 'v1.diy.DiyPro/updateName')->option(['real_name' => '修改名称']);
    Route::get('export/data/:id', 'v1.diy.DiyPro/exportDIYData')->option(['real_name' => '导出DIY数据']);
    Route::post('import/data', 'v1.diy.DiyPro/importDIYData')->option(['real_name' => '导入DIY数据']);
    Route::get('text/field', 'v1.diy.DiyPro/textField')->option(['real_name' => '文本字段']);
})->middleware([
    \app\http\middleware\AllowOriginMiddleware::class,
    \app\adminapi\middleware\AdminAuthTokenMiddleware::class,
    \app\adminapi\middleware\AdminCheckRoleMiddleware::class,
    \app\adminapi\middleware\AdminLogMiddleware::class
])->option(['mark' => 'diy_pro', 'mark_name' => '页面装修']);


/**
 * 主题相关路由
 */
Route::group('theme', function () {
    Route::get('list', 'v1.diy.Theme/getThemeList')->option(['real_name' => '主题列表']);
    Route::get('info/:id/[:type]', 'v1.diy.Theme/getThemeInfo')->option(['real_name' => '主题详情']);
    Route::post('save/:id', 'v1.diy.Theme/saveTheme')->option(['real_name' => '保存主题']);
    Route::post('save_title/:id', 'v1.diy.Theme/saveThemeTitle')->option(['real_name' => '保存主题名称和简介']);
    Route::post('save_image/:id', 'v1.diy.Theme/saveThemeImage')->option(['real_name' => '保存主题的图片']);
    Route::get('article', 'v1.diy.Theme/getThemeArticleList')->option(['real_name' => '自定义组件-文章']);
    Route::get('coupon', 'v1.diy.Theme/getThemeCouponList')->option(['real_name' => '自定义组件-优惠券']);
    Route::get('product', 'v1.diy.Theme/getThemeProductList')->option(['real_name' => '自定义组件-商品']);
    Route::delete('del/:id', 'v1.diy.Theme/deleteTheme')->option(['real_name' => '删除主题']);
    Route::get('export/:id', 'v1.diy.Theme/exportTheme')->option(['real_name' => '主题导出']);
    Route::get('export_record/:record_id', 'v1.diy.Theme/getExportRecord')->option(['real_name' => '查询主题导出记录']);
    Route::post('import', 'v1.diy.Theme/importTheme')->option(['real_name' => '主题导入']);
    Route::get('use/:id', 'v1.diy.Theme/useTheme')->option(['real_name' => '使用主题']);
    Route::get('use_data/:id', 'v1.diy.Theme/useThemeData')->option(['real_name' => '使用主题数据']);
    Route::get('using', 'v1.diy.Theme/getUsingTheme')->option(['real_name' => '正在使用的主题']);
    Route::get('restore/:id', 'v1.diy.Theme/restoreTheme')->option(['real_name' => '还原主题']);
    Route::get('micro_page', 'v1.diy.Theme/getMicroPageList')->option(['real_name' => '微页面列表']);
})->middleware([
    \app\http\middleware\AllowOriginMiddleware::class,
    \app\adminapi\middleware\AdminAuthTokenMiddleware::class,
    \app\adminapi\middleware\AdminCheckRoleMiddleware::class,
    \app\adminapi\middleware\AdminLogMiddleware::class
])->option(['mark' => 'theme', 'mark_name' => '主题']);

/**
 * 主题组件相关路由
 */
Route::group('theme_module', function () {
    Route::get('list', 'v1.diy.ThemeModule/index')->option(['real_name' => '主题组件列表']);
    Route::post('save', 'v1.diy.ThemeModule/save')->option(['real_name' => '新增主题组件']);
    Route::delete('del/:id', 'v1.diy.ThemeModule/delete')->option(['real_name' => '删除主题组件']);
})->middleware([
    \app\http\middleware\AllowOriginMiddleware::class,
    \app\adminapi\middleware\AdminAuthTokenMiddleware::class,
    \app\adminapi\middleware\AdminCheckRoleMiddleware::class,
    \app\adminapi\middleware\AdminLogMiddleware::class
])->option(['mark' => 'theme_module', 'mark_name' => '主题组件']);
