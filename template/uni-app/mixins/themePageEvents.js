import { refreshCurrentTheme } from '@/utils/theme';
export function emitThemeScroll(top) {
  const pages = getCurrentPages(), current = pages[pages.length - 1];
  if (current) uni.$emit('theme-page-scroll', { path: '/' + current.route, top });
}
export default {
  onPageScroll(event) { emitThemeScroll(event.scrollTop); },
  onShow() {
    const pages = getCurrentPages(), current = pages[pages.length - 1];
    if (current) {
      uni.$emit('theme-page-show', { path: '/' + current.route });
      refreshCurrentTheme();
    }
  },
};
