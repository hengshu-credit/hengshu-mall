import { navigationComponent } from './navigationComponent';
import { merchantLink } from './merchantLinks';

export function scopedNavigation(value, shopId = 0) {
  if (!value || !Array.isArray(value.menuList) || !value.menuList.length) return {};
  const config = navigationComponent(value);
  config.mainNavigation = { ...config.mainNavigation, pageScoped: true };
  config.menuList = config.menuList.map(item => ({ ...item, link: merchantLink(item.link, shopId) }));
  return config;
}

export function pageNavigation(page, shopId = 0) {
  const modules = Object.values(page && page.value || {}).filter(Boolean);
  return scopedNavigation(modules.find(item => ['pageFoot', 'mainNavigation'].includes(item.name)), shopId);
}

export function routeQuery(url = '') {
  const query = {};
  (url.split('?')[1] || '').split('#')[0].split('&').filter(Boolean).forEach(part => {
    const [key, ...value] = part.split('=');
    try { query[decodeURIComponent(key)] = decodeURIComponent(value.join('=')); } catch (error) {}
  });
  return query;
}

export function merchantPreviewContext(url = '') {
  const path = url.split('?')[0], query = routeQuery(url);
  const shopId = ['/pages/merchant/shop', '/pages/merchant/category'].includes(path)
    ? Number(query.id) : path.startsWith('/pages/merchant/') ? Number(query.shop_id) : Number(query.preview_shop_id);
  return { shopId: shopId > 0 ? shopId : 0, pageId: Number(query.shop_page_id) > 0 ? Number(query.shop_page_id) : 0 };
}

// Preview state travels only along the current shop's routes, never through global storage.
export function merchantPreviewLink(url, context) {
  if (!url || !context || !context.shopId || !context.pageId) return url;
  const path = url.split('?')[0], query = routeQuery(url);
  if (query.shop_page_id) return url;
  let targetShop = 0;
  if (['/pages/merchant/shop', '/pages/merchant/category'].includes(path)) targetShop = Number(query.id);
  else if (['/pages/merchant/products', '/pages/merchant/ranking'].includes(path)) targetShop = Number(query.shop_id);
  else if (path === '/pages/goods_details/index') targetShop = context.shopId;
  if (targetShop !== context.shopId) return url;
  return url + (url.includes('?') ? '&' : '?') + 'shop_page_id=' + context.pageId + '&preview_shop_id=' + context.shopId;
}
