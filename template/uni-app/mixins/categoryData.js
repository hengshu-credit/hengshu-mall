import { getCategoryList } from '@/api/store.js';
import { getShopCategories } from '@/api/storefront';

export default {
  props: {
    shopId: {type:Number,default:0},
    initialCategoryRequest: { default: null },
  },
  mounted() {
    uni.$on('uploadCatData', this.handleCategoryRefresh);
  },
  beforeDestroy() {
    uni.$off('uploadCatData', this.handleCategoryRefresh);
    this._productRequestId = (this._productRequestId || 0) + 1;
  },
  methods: {
    handleCategoryRefresh() {
      this.getAllCategory(1);
      if (this.refreshCategoryCart) this.refreshCategoryCart();
    },
    loadCategoryData() {
      if (this.shopId) return getShopCategories(this.shopId);
      const initial = !this._initialCategoryUsed && this.initialCategoryRequest;
      this._initialCategoryUsed = true;
      // Share only this page entry's already-started read. Refreshes stay fresh.
      const request = initial ? initial.then(response => response || getCategoryList()) : getCategoryList();
      return request.then(response => JSON.parse(JSON.stringify(response)));
    },
  },
};
