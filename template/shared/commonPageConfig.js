export const COMMON_PAGE_KEYS = [
  'goodsList', 'goodsSearch', 'orderList', 'orderDetail', 'orderPayStatus',
  'merchantStreet', 'merchantFollowed', 'merchantRanking', 'userSubpage',
  'activityList', 'activityDetail', 'pointsMall', 'newsList', 'newsDetail',
];

const base = {
  page_title: '',
  show_title: true,
  title_color: '#222222',
  title_background_color: '#FFFFFF',
  background_color: '#F5F5F5',
  background_image: '',
  show_search: false,
  search_placeholder: '搜索商品名称',
  search_background_color: '#FFFFFF',
  search_text_color: '#333333',
  list_layout: 'list',
  card_background_color: '#FFFFFF',
  card_radius: 16,
  card_gap: 12,
  card_title_color: '#333333',
  price_color: '',
  empty_text: '暂无内容',
  show_recommend: true,
  navigation_mode: 'home',
};

const overrides = {
  goodsList: { show_search: true, list_layout: 'grid', empty_text: '暂无商品，去看点别的吧' },
  goodsSearch: { show_search: true, empty_text: '暂无搜索结果' },
  orderList: { empty_text: '暂无订单' },
  orderDetail: { show_recommend: false },
  orderPayStatus: { show_recommend: false },
  merchantStreet: { show_search: true, search_placeholder: '搜索店铺名称', empty_text: '暂无营业店铺', card_radius: 24, card_gap: 22 },
  merchantFollowed: { empty_text: '你还没有关注店铺', card_radius: 24, card_gap: 24 },
  merchantRanking: { empty_text: '暂无上榜商品', show_recommend: false, card_radius: 24, card_gap: 22 },
  userSubpage: { show_recommend: false },
  activityList: { empty_text: '暂无活动' },
  activityDetail: { show_recommend: false },
  pointsMall: { empty_text: '暂无积分商品' },
  newsDetail: { show_recommend: false },
};

// A field appears in the editor only after the corresponding page consumes it.
export const COMMON_PAGE_CONTROLS = {
  goodsList: ['title', 'background', 'search', 'listLayout', 'card', 'cardTitle', 'empty', 'recommend'],
  goodsSearch: ['title', 'search', 'recommend'],
  orderList: ['title', 'background', 'card', 'empty'],
  orderDetail: ['title', 'background'],
  orderPayStatus: ['title', 'background'],
  merchantStreet: ['title', 'background', 'search', 'card', 'cardGap', 'cardTitle', 'empty'],
  merchantFollowed: ['title', 'background', 'card', 'cardGap', 'cardTitle', 'empty'],
  merchantRanking: ['title', 'background', 'card', 'cardGap', 'empty'],
  userSubpage: ['title'],
  activityList: ['title'],
  activityDetail: ['title'],
  pointsMall: ['title'],
  newsList: ['title'],
  newsDetail: ['title'],
};

export function commonPageDefaults(page) {
  return { ...base, ...(overrides[page] || {}), page_key: page };
}

export function normalizeCommonPage(value, page) {
  const result = commonPageDefaults(page);
  if (!value || typeof value !== 'object') return result;
  Object.keys(result).forEach(key => {
    if (value[key] !== undefined) result[key] = value[key];
  });
  result.show_title = !!result.show_title;
  result.show_search = !!result.show_search;
  result.show_recommend = !!result.show_recommend;
  result.card_radius = Math.max(0, Math.min(60, Number(result.card_radius) || 0));
  result.card_gap = Math.max(0, Math.min(60, Number(result.card_gap) || 0));
  if (!['grid', 'list'].includes(result.list_layout)) result.list_layout = 'list';
  if (!['home', 'custom', 'none'].includes(result.navigation_mode)) result.navigation_mode = 'home';
  return result;
}

export function normalizeCommonPages(value) {
  const source = value && typeof value === 'object' ? value : {};
  return COMMON_PAGE_KEYS.reduce((result, page) => {
    result[page] = normalizeCommonPage(source[page], page);
    return result;
  }, {});
}

export function commonPageStyle(value, page, unit = 'rpx', imageUrl = url => url, scale = 1) {
  const config = normalizeCommonPage(value, page);
  return {
    backgroundColor: config.background_color,
    backgroundImage: config.background_image ? `url(${JSON.stringify(imageUrl(config.background_image))})` : 'none',
    backgroundRepeat: config.background_image ? 'no-repeat' : 'initial',
    backgroundSize: config.background_image ? '100% auto' : 'auto',
    '--common-page-title-color': config.title_color,
    '--common-page-title-background': config.title_background_color,
    '--common-page-search-background': config.search_background_color,
    '--common-page-search-color': config.search_text_color,
    '--common-page-card-background': config.card_background_color,
    '--common-page-card-radius': `${config.card_radius * scale}${unit}`,
    '--common-page-card-gap': `${config.card_gap * scale}${unit}`,
    '--common-page-card-title': config.card_title_color,
    '--common-page-price': config.price_color || 'var(--view-theme)',
  };
}
