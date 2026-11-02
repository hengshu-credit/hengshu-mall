import { getThemeInfo } from '@/api/api.js';
import { HTTP_REQUEST_URL } from '@/config/app';
import { normalizeCommonPage, commonPageStyle } from '../../shared/commonPageConfig';

const cache = {};
const pending = {};

function themeIdFrom(options = {}) {
  const optionId = Number(options.theme_id) || 0;
  if (optionId) return optionId;
  return Number(uni.getStorageSync('previewThemeId')) || 0;
}

function assetUrl(url) {
  if (!url || /^(?:https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return url.startsWith('/') ? `${HTTP_REQUEST_URL.replace(/\/$/, '')}${url}` : url;
}

export function loadCommonPage(page, options = {}) {
  const themeId = themeIdFrom(options);
  const key = `${themeId}:${page}`;
  if (cache[key]) return Promise.resolve(cache[key]);
  if (!pending[key]) {
    pending[key] = getThemeInfo('common', themeId ? { theme_id: themeId } : {}).then(res => {
      const pages = res && res.data && typeof res.data === 'object' ? res.data : {};
      cache[key] = normalizeCommonPage(pages[page], page);
      return cache[key];
    }).catch(() => {
      return normalizeCommonPage({}, page);
    }).finally(() => { delete pending[key]; });
  }
  return pending[key];
}

export default {
  data() {
    return { commonPage: normalizeCommonPage({}, this.$options.commonPageKey || 'userSubpage') };
  },
  computed: {
    commonPageStyle() {
      const unit = typeof window === 'undefined' ? 'rpx' : 'px';
      return commonPageStyle(this.commonPage, this.$options.commonPageKey || 'userSubpage', unit, assetUrl, unit === 'px' ? 0.5 : 1);
    },
  },
  created() {
    const page = this.$options.commonPageKey;
    if (!page) return;
    this.loadCommonPageConfig(page, {});
  },
  onLoad(options) {
    const page = this.$options.commonPageKey;
    if (!page) return;
    this.loadCommonPageConfig(page, options || {});
  },
  methods: {
    loadCommonPageConfig(page, options) {
      const sequence = this._commonPageSequence = (this._commonPageSequence || 0) + 1;
      loadCommonPage(page, options).then(config => {
      if (!this._isDestroyed && sequence === this._commonPageSequence) {
        this.commonPage = config;
        if (config.show_title && config.page_title && uni.setNavigationBarTitle) uni.setNavigationBarTitle({ title: config.page_title });
      }
      });
    },
    commonPageText(fallback, key) {
      const value = this.commonPage && this.commonPage[key];
      return value === undefined || value === '' ? fallback : value;
    },
  },
};
