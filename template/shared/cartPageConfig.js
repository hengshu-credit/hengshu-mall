import { commonStyleDefaults, componentStyle } from './componentStyle';
import { headerActions } from './pageActions';
import { pageTitleFromPage, syncLegacyPageTitle } from './pageTitleComponent';

export function normalizeCartPage(value = {}) {
  const defaults = {
    page_title: '购物车', background_color: '#F5F5F5', title_background_color: '#FFFFFF', title_text_color: '#000000',
    show_title: true, title_hidden: false, show_service: true, service_hidden: false, show_list:true, list_hidden:false, show_checkout:true, checkout_hidden:false,
    service_labels: ['100%正品保证', '所有商品精挑细选', '售后无忧'],
    show_recommend: true, empty_text: '暂无商品', checkout_text: '立即下单',
    price_color: '', button_color: '', button_text_color: '#FFFFFF', button_radius: 25,
    service_style: commonStyleDefaults('#F5F5F5'), list_style: commonStyleDefaults(), checkout_style: commonStyleDefaults(),
  };
  defaults.list_style.paddingConfig.val = 12;
  defaults.list_style.marginConfig.isAll = true;
  defaults.list_style.marginConfig.valList[2].val = 8;
  defaults.checkout_style.paddingConfig.isAll = true;
  defaults.checkout_style.paddingConfig.valList = [6, 15, 6, 15].map(val => ({ val }));
  const result = { ...defaults, ...JSON.parse(JSON.stringify(value || {})) };
  result.title_actions = headerActions(result.title_actions || { right: [{ type: 'cartManage', showLabel: true }] });
  result.title_component = pageTitleFromPage(result, '购物车');
  syncLegacyPageTitle(result);
  ['service_style', 'list_style', 'checkout_style'].forEach(key => { result[key] = { ...defaults[key], ...(result[key] || {}) }; });
  return result;
}

export function cartPageStyles(value, unit = 'px', imageUrl = url => url) {
  const c = normalizeCartPage(value), scale = unit === 'rpx' ? 2 : 1;
  const styles = { page: { backgroundColor: c.background_color, minHeight: '100vh' } };
  ['service', 'list', 'checkout'].forEach(key => { styles[key] = componentStyle(c[key + '_style'], unit, imageUrl); });
  styles.button = { background: c.button_color || 'var(--view-theme)', color: c.button_text_color, borderRadius: c.button_radius * scale + unit };
  styles.price = { color: c.price_color || 'var(--view-theme)' };
  return styles;
}
