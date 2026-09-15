import { getThemeInfo } from '@/api/api.js';
import store from '@/store';

// One launch-only handoff, never a persistent page/price cache. An ad may stay
// open for a while, so discard data older than five seconds before entering home.
let startupHome = null;
const scope = data => JSON.stringify([
  data.theme_id || 0, store.state.app.token || '', uni.getStorageSync('locale') || '',
]);

export function prefetchHome() {
  const themeId = uni.getStorageSync('previewThemeId');
  const data = themeId ? { theme_id: themeId } : {};
  const entry = { key: scope(data), started: Date.now() };
  startupHome = entry;
  entry.promise = getThemeInfo('home', data).catch(() => {
    if (startupHome === entry) startupHome = null;
    return null;
  });
}

export function loadHome(data = {}) {
  const entry = startupHome;
  startupHome = null;
  if (entry && entry.key === scope(data) && Date.now() - entry.started < 5000) {
    return entry.promise.then(response => response || getThemeInfo('home', data));
  }
  return getThemeInfo('home', data);
}
