import { HTTP_REQUEST_URL } from '@/config/app';

export default {
  props: {
    marketingStyle: { type: Object, default: () => ({}) },
    marketingKind: { type: String, default: 'border' },
  },
  data() {
    return { marketingNow: Date.now(), marketingDesktop: false };
  },
  computed: {
    currentMarketingStyle() {
      const config = this.marketingStyle && this.marketingStyle[this.marketingKind];
      return config &&
        Number(config.start_time) * 1000 <= this.marketingNow &&
        Number(config.end_time) * 1000 > this.marketingNow
        ? config
        : null;
    },
    marketingImage() {
      const config = this.currentMarketingStyle;
      if (!config) return '';
      const url = this.marketingDesktop && config.pc_image ? config.pc_image : config.mobile_image;
      return url && url.startsWith('/') && !url.startsWith('/static/') ? HTTP_REQUEST_URL + url : url || '';
    },
  },
  watch: {
    marketingStyle: {
      immediate: true,
      deep: true,
      handler() {
        this.scheduleMarketingStyle();
      },
    },
  },
  mounted() {
    // #ifdef H5
    this.marketingDesktop = uni.getWindowInfo().windowWidth >= 768;
    // #endif
  },
  beforeDestroy() {
    clearTimeout(this._marketingStyleTimer);
  },
  methods: {
    scheduleMarketingStyle() {
      clearTimeout(this._marketingStyleTimer);
      this.marketingNow = Date.now();
      const config = this.marketingStyle && this.marketingStyle[this.marketingKind];
      if (!config) return;
      const next = [config.start_time, config.end_time]
        .map((value) => Number(value) * 1000)
        .filter((value) => value > this.marketingNow)
        .sort((a, b) => a - b)[0];
      if (next)
        this._marketingStyleTimer = setTimeout(
          () => this.scheduleMarketingStyle(),
          Math.min(2147483000, next - this.marketingNow + 20),
        );
    },
  },
};
