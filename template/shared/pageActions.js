export const ACTIONS = [
  { type: 'back', label: '返回', icon: 'icon-fanhui2' },
  { type: 'home', label: '首页', icon: 'icon-shouye6', link: '/pages/index/index' },
  { type: 'category', label: '分类', icon: 'icon-fenlei', link: '/pages/goods_cate/goods_cate' },
  { type: 'cart', label: '购物车', icon: 'icon-gouwuche', link: '/pages/order_addcart/order_addcart' },
  { type: 'user', label: '我的', icon: 'icon-gerenzhongxin', link: '/pages/user/index' },
  { type: 'collect', label: '收藏', icon: 'icon-shoucang4' },
  { type: 'share', label: '分享', icon: 'icon-fenxiang4' },
  { type: 'customer', label: '客服', icon: 'icon-kefu' },
  { type: 'scan', label: '扫一扫', icon: 'icon-saoyisao' },
  { type: 'search', label: '搜索', icon: 'icon-sousuo', link: '/pages/goods/goods_search/index' },
  { type: 'cartManage', label: '管理', icon: '' },
  { type: 'link', label: '页面跳转', icon: 'icon-baobeilianjie' },
  { type: 'url', label: 'URL跳转', icon: 'icon-baobeilianjie' },
];
export function pageAction(value = {}) {
  const base = ACTIONS.find(action => action.type === value.type) || ACTIONS[0];
  return { ...base, image: '', showLabel: false, enabled: true, ...JSON.parse(JSON.stringify(value)), type: base.type };
}
export function headerActions(value = {}) {
  return { color: '#333333', background: 'transparent', iconSize: 20, radius: 20, ...JSON.parse(JSON.stringify(value)),
    left: (value.left || []).slice(0, 3).map(pageAction), right: (value.right || []).slice(0, 3).map(pageAction) };
}
export function actionDisabled(action, product = {}) { return action.type === 'collect' && !product.id; }
export function actionIcon(action) {
  const icon = action.icon || '';
  if (!['link', 'url'].includes(action.type) || !['icon-lianjie', 'icon-baobeilianjie'].includes(icon)) return icon;
  // The legacy "lianjie" glyph is a diagram connector, not a navigation icon.
  const path = actionLink(action).replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0];
  const destination = ACTIONS.find(item => item.link === path);
  return destination ? destination.icon : 'icon-baobeilianjie';
}
export function actionLink(action) {
  if (action.type === 'url') {
    return typeof action.link === 'string' && action.link.length <= 1000 &&
      /^https?:\/\/(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d{1,5})?(?:[/?#][^\s<>"\\]*)?$/i.test(action.link) ? action.link : '';
  }
  const target = action.type === 'link' ? action.link : (ACTIONS.find(item => item.type === action.type) || {}).link;
  return typeof target === 'string' && /^\/pages\/[a-zA-Z0-9_/-]+(?:\?[^\s<>"\\]*)?$/.test(target) ? target : '';
}
