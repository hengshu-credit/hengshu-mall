import { headerActions, pageAction } from './pageActions';
import { pageTitleFromPage, syncLegacyPageTitle } from './pageTitleComponent';
import { searchBoxComponent } from './searchBoxComponent';
import { checkoutComponent } from './checkoutComponent';
import { commonStyleDefaults } from './componentStyle';
export const categoryPageDefaults = () => ({
  status: 1, show_title: 1, title_hidden: 0, show_category: 1, category_hidden: 0, search_hidden: 0,
  show_search: 1, search_placeholder: '搜索商品名称', columns: 3,
  image_fit: 'contain', image_radius: 8, background_color: '#FFFFFF', active_color: '',
  banner_enabled: 0, banner_image: '', banner_link: '',
  page_title: '', title_background_color: '#FFFFFF', title_text_color: '#000000',
  background_image: '', background_repeat: 'no-repeat', background_size: '100% auto',
  show_category_name: 1, show_recommend: 0, recommend_text: '推荐',
  product_layout: 'grid', sub_tab_style: 'solid', text_align: 'left', text_bold: 0,
  name_lines: 2, show_product_name: 1, buy_button_style: 1,
  side_background_color: '#F7F7F7', side_text_color: '#424242', side_active_text_color: '',
  side_active_background_color: '#FFFFFF', side_indicator_color: '', group_title_color: '#333333', category_name_color: '#333333',
  sub_tab_text_color: '#666666', sub_tab_background_color: '#F5F5F5', sub_tab_active_text_color: '#FFFFFF', sub_tab_active_background_color: '',
  product_background_color: '#FFFFFF', product_title_color: '#333333', price_color: '', buy_button_color: '',
});
export function categoryLayoutPreset(status) {
  return { ...categoryPageDefaults(), status, product_layout:status === 2 ? 'large' : status === 3 ? 'list' : 'grid', buy_button_style:status === 2 ? 8 : status === 3 ? 6 : 1, text_bold:status === 2 ? 1 : 0 };
}
export function normalizeCategoryPage(value) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch (_) { value = {}; } }
  if (typeof value === 'number') value = { status: value };
  const result = categoryLayoutPreset(value && Number(value.status) || 1);
  if (value && typeof value === 'object') {
    if (Number(value.status) === 2) result.product_layout = 'large';
    if (Number(value.status) === 3) result.product_layout = 'list';
    Object.keys(result).forEach(key => { if (value[key] !== undefined) result[key] = typeof result[key] === 'number' ? Number(value[key]) : value[key]; });
    ['navigation_mode', 'navigation', 'search_style', 'category_style', 'layout_configs', 'search_actions', 'title_actions', 'title_component', 'search_component', 'checkout', 'actions_mode'].forEach(key => { if (value[key] !== undefined) result[key] = JSON.parse(JSON.stringify(value[key])); });
  }
  if (![1, 2, 3].includes(result.status)) result.status = 1;
  // PHP serializes an empty layout dictionary as []; do not let Vue create sparse arrays.
  const layouts = result.layout_configs;
  result.layout_configs = {};
  if (layouts && typeof layouts === 'object') {
    ['1', '2', '3'].forEach(key => {
      const layout = layouts[key];
      if (layout && typeof layout === 'object' && !Array.isArray(layout)) result.layout_configs[key] = layout;
    });
  }
  result.search_actions = headerActions(result.search_actions || { left: result.status > 1 ? [pageAction({type:'home'})] : [] });
  result.title_actions = headerActions(result.title_actions || {});
  result.title_component = pageTitleFromPage(result, '商品分类');
  syncLegacyPageTitle(result);
  result.search_component = searchBoxComponent(result.search_component || {
    ...(result.search_style || {}),
    tipConfig: { title: '提示文字', value: result.search_placeholder, place: '填写内容', max: 30 },
    isHide: !!result.search_hidden, headerActions: result.search_actions,
  });
  result.search_hidden = Number(!!result.search_component.isHide);
  result.search_placeholder = result.search_component.tipConfig.value;
  result.search_actions = result.search_component.headerActions;
  if (!result.actions_mode && result.checkout === undefined && result.status > 1) result.checkout = checkoutComponent();
  result.category_style = result.category_style || commonStyleDefaults();
  return result;
}
export function categoryPageStyle(config, themeColor = '#E93323') {
  const c = normalizeCategoryPage(config), style = {};
  Object.keys(c).filter(key => key.endsWith('_color')).forEach(key => {
    style['--cat-' + key.replace(/_/g, '-')] = c[key] || c.active_color || themeColor;
  });
  style.backgroundColor = c.background_color;
  style.backgroundImage = c.background_image ? 'url(' + JSON.stringify(c.background_image) + ')' : 'none';
  style.backgroundRepeat = c.background_repeat;
  style.backgroundSize = c.background_size;
  return style;
}
