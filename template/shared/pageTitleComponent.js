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
