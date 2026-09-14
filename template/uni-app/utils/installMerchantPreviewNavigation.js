import { merchantPreviewContext, merchantPreviewLink } from '../../shared/decorationContext';

export function installMerchantPreviewNavigation() {
  ['navigateTo', 'redirectTo', 'reLaunch'].forEach(name => uni.addInterceptor(name, {
    invoke(options) {
      const pages = getCurrentPages(), page = pages[pages.length - 1];
      if (!page || !options.url) return;
      const query = Object.entries(page.options || {}).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
      const url = page.$page && page.$page.fullPath || '/' + page.route.replace(/^\//, '') + (query ? '?' + query : '');
      options.url = merchantPreviewLink(options.url, merchantPreviewContext(url));
    },
  }));
}
