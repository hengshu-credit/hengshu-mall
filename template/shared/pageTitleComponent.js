import { commonStyleDefaults } from './componentStyle';
import { headerActions } from './pageActions';

export function pageTitleComponent(value = {}, timestamp = Date.now() * 1000) {
  return {
    ...commonStyleDefaults(), name: 'pageTitleBar', cname: '页面标题',
    timestamp, id: 'id' + timestamp, isHide: false, setUp: { tabVal: 0 },
    title: '页面标题', textColor: '#000000',
    ...JSON.parse(JSON.stringify(value)),
    headerActions: headerActions(value.headerActions || { left: [], right: [] }),
  };
}

// Convert the old topic-page heading once. The mode also records an intentional
// deletion, so an empty component list never recreates the title on reload.
export function microPageWithTitle(page = {}) {
  const result = { ...page, page_title_mode: 'component', value: { ...(page.value || {}) } };
  const items = Object.values(result.value);
  if (page.page_title_mode === 'component' || items.some(item => item.name === 'pageTitleBar')) return result;
  const timestamps = items.map(item => Number(item.timestamp)).filter(Number.isFinite);
  let timestamp = Math.min(1000, ...timestamps) - 1;
  while (Object.prototype.hasOwnProperty.call(result.value, timestamp)) timestamp--;
  const title = String(page.title || '页面标题').trim().slice(0, 30) || '页面标题';
  result.value[timestamp] = pageTitleComponent({ title }, timestamp);
  return result;
}

export function defaultMicroPage() {
  return microPageWithTitle({ type: 'home', title: '专题页', name: '专题页', is_show: 1,
    navigation_mode: 'page', actions_mode: 'components', value: {} });
}

// Read earlier category/cart themes into the same component used by every DIY page.
export function pageTitleFromPage(page, fallback, defaultActions = {}) {
  if (page.title_component && page.title_component.name === 'pageTitleBar') return pageTitleComponent(page.title_component);
  return pageTitleComponent({
    ...commonStyleDefaults(page.title_background_color || '#FFFFFF'),
    title: page.page_title || fallback, textColor: page.title_text_color || '#000000',
    isHide: !!page.title_hidden, headerActions: page.title_actions || defaultActions,
  });
}

export function syncLegacyPageTitle(page) {
  const title = page.title_component;
  page.page_title = title.title;
  page.title_text_color = title.textColor;
  page.title_background_color = title.componentBgConfig?.colorConfig?.color?.[0]?.item || '#FFFFFF';
  page.title_actions = title.headerActions;
  page.title_hidden = Number(!!title.isHide);
  return page;
}
