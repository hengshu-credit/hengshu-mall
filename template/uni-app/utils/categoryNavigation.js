import { getThemeInfo } from '@/api/api.js';

export const CATEGORY_PAGE = '/pages/goods_cate/goods_cate';
const PENDING_CATEGORY = 'pendingCategorySelection';

export function categoryTarget(options = {}) {
  const id = value => /^\d+$/.test(String(value)) && Number(value) > 0 ? Number(value) : 0;
  return { cid: id(options.cid || options.cate_id || options.id), sid: id(options.sid) };
}

export function categoryLink(url) {
  const [pathname, query = ''] = url.split('?');
  const options = {};
  query.split('&').forEach(pair => {
    const [key, value = ''] = pair.split('=');
    try { options[decodeURIComponent(key)] = decodeURIComponent(value); } catch (_) {}
  });
  return { pathname, options, target: categoryTarget(options) };
}

export function takeCategoryTarget() {
  const target = uni.getStorageSync(PENDING_CATEGORY);
  if (target) uni.removeStorageSync(PENDING_CATEGORY);
  return target || null;
}

export function openCategoryPage(options = {}) {
  const target = categoryTarget(options);
  const query = Object.keys(target).filter(key => target[key]).map(key => `${key}=${target[key]}`).join('&');
  // H5 switchTab replaces browser history. Push the same tab route to retain Back/Forward.
  // #ifdef H5
  return getApp().$router.push({ type: 'switchTab', path: CATEGORY_PAGE + (query ? `?${query}` : '') });
  // #endif
  // #ifndef H5
  uni.setStorageSync(PENDING_CATEGORY, target);
  return uni.switchTab({ url: CATEGORY_PAGE });
  // #endif
}

export function openHomeCategory(url) {
  const { options } = categoryLink(url);
  const themeId = uni.getStorageSync('previewThemeId');
  return getThemeInfo('category', themeId ? { theme_id: themeId } : {}).then(res => {
    if ([2, 3].includes(Number(res.data.status))) return openCategoryPage(options);
    return uni.navigateTo({ url });
  }, () => uni.navigateTo({ url }));
}

export function resolveCategoryTarget(categories, target) {
  const requested = target.sid || target.cid;
  for (let index = 0; index < categories.length; index++) {
    const category = categories[index];
    const childIndex = (category.children || []).findIndex(child => Number(child.id) === requested && requested > 0);
    if (childIndex >= 0) return { index, childIndex, cid: Number(category.id), sid: requested };
    if (Number(category.id) === requested) return { index, childIndex: 0, cid: Number(category.id), sid: 0 };
  }
  const index = Math.max(0, categories.findIndex(category => Number(category.id) === target.cid));
  return categories[index] ? { index, childIndex: 0, cid: Number(categories[index].id), sid: 0 } : null;
}
