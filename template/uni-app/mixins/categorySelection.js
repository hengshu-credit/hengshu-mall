import { resolveCategoryTarget } from '@/utils/categoryNavigation.js';

export default {
  props: { categoryTarget: { type: Object, default: () => ({ cid: 0, sid: 0 }) } },
  watch: {
    categoryTarget: {
      deep: true,
      handler(target) { if (this.categoryList.length) this.selectCategoryTarget(target); },
    },
  },
  methods: {
    loadProductCategories(refresh, cacheKey) {
      const cached = !refresh && uni.getStorageSync(cacheKey);
      const request = cached ? Promise.resolve({ data: cached }) : this.loadCategoryData();
      return request.then(res => {
        if (this._isDestroyed) return;
        if (!cached) uni.setStorageSync(cacheKey, res.data);
        this.categoryList = (res.data || []).map(category => ({
          ...category,
          children: [{ id: 0, cate_name: this.$t('全部') }, ...(category.children || []).filter(child => Number(child.id) !== 0)],
        }));
        this.selectCategoryTarget(this.cid ? { cid: this.cid, sid: this.sid } : this.categoryTarget);
      });
    },
    selectCategoryTarget(target) {
      const selected = resolveCategoryTarget(this.categoryList, target);
      this._productRequestId = (this._productRequestId || 0) + 1;
      this.loading = false;
      this.page = 1;
      this.tempArr = [];
      this.loadend = !selected;
      if (!selected) {
        this.cid = this.sid = this.navActive = this.tabClick = 0;
        this.categoryErList = [];
        return;
      }
      this.cid = selected.cid;
      this.sid = selected.sid;
      this.navActive = selected.index;
      this.categoryTitle = this.categoryList[selected.index].cate_name;
      this.categoryErList = this.categoryList[selected.index].children;
      this.tabClick = selected.childIndex;
      this.tabLeft = Math.max(0, (this.tabClick - 1) * (this.isWidth + 6));
      this.iSlong = true;
      this.productslist();
    },
  },
};
