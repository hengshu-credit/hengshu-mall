<template>
  <view class="ranking-page" :style="colorStyle"
    ><view class="ranking-tabs"
      ><text :class="{ active: type === 'sales' }" @tap="change('sales')"
        >销量榜</text
      ><text :class="{ active: type === 'rating' }" @tap="change('rating')"
        >好评榜</text
      ></view
    ><view class="ranking-description"
      >{{
        type === "rating"
          ? "按已展示评价的好评率、评价数排序"
          : "按实际销量排序"
      }}
      · TOP {{ top }}</view
    ><view
      v-for="item in products"
      :key="item.id"
      class="rank-product"
      @tap="openProduct(item)"
      ><text class="rank-number" :class="{ leading: item.rank <= 3 }">{{
        item.rank
      }}</text
      ><easy-loadimage
        :image-src="item.image"
        :marketing-style="item.marketing_style"
        width="160rpx"
        height="160rpx"
        borderRadius="16rpx" /><view class="rank-info"
        ><view class="line2">{{ item.store_name }}</view
        ><merchant-name :product="item" /><base-money
          :money="item.price"
          symbolSize="24"
          integerSize="36"
          decimalSize="24" /></view></view
    ><view
      v-if="loading || error || !products.length"
      class="state"
      @tap="load"
      >{{
        loading ? "加载中…" : error ? error + "，点击重试" : "暂无上榜商品"
      }}</view
    ></view
  >
</template>
<script>
import colors from "@/mixins/color";
import { getRanking } from "@/api/storefront";
import { applyTheme } from "@/utils/theme";
import MerchantName from "@/components/merchantName";
import EasyLoadimage from "@/components/easy-loadimage/easy-loadimage.vue";
export default {
  components: { MerchantName, EasyLoadimage },
  mixins: [colors],
  data: () => ({
    products: [],
    type: "sales",
    shopId: 0,
    categoryId: 0,
    top: 20,
    loading: false,
    error: "",
    sequence: 0,
  }),
  onLoad(options) {
    this.type = options.type === "rating" ? "rating" : "sales";
    this.shopId = Number(options.shop_id) || 0;
    this.categoryId = Number(options.category_id) || 0;
    this.top = Math.min(100, Math.max(1, Number(options.top) || 20));
    if (options.theme_id)
      uni.setStorageSync("previewThemeId", Number(options.theme_id));
    applyTheme(uni.getStorageSync("previewThemeId") || 0);
    this.load();
  },
  onUnload() {
    this.sequence++;
  },
  methods: {
    change(type) {
      if (this.type !== type) {
        this.type = type;
        this.load();
      }
    },
    async load() {
      const seq = ++this.sequence;
      this.loading = true;
      this.error = "";
      this.products = [];
      try {
        const res = await getRanking({
          type: this.type,
          shop_id: this.shopId,
          category_id: this.categoryId,
          top: this.top,
        });
        if (seq === this.sequence) this.products = res.data;
      } catch (error) {
        if (seq === this.sequence) this.error = error.msg || "榜单读取失败";
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
    openProduct(item) {
      uni.navigateTo({ url: "/pages/goods_details/index?id=" + item.id });
    },
  },
};
</script>
<style scoped>
.ranking-page {
  padding: 24rpx;
  background: #f5f5f5;
  min-height: 100vh;
}
.ranking-tabs {
  display: flex;
  justify-content: center;
  gap: 70rpx;
  font-size: 32rpx;
  padding: 22rpx;
}
.ranking-tabs .active {
  color: var(--view-theme);
  font-weight: 600;
}
.ranking-description {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-bottom: 26rpx;
}
.rank-product {
  display: flex;
  align-items: center;
  gap: 20rpx;
  border-radius: 24rpx;
  background: #fff;
  margin-bottom: 22rpx;
  padding: 24rpx;
}
.rank-number {
  font-size: 32rpx;
  width: 34rpx;
  color: #999;
}
.rank-number.leading {
  color: var(--view-theme);
  font-weight: 700;
}
.rank-info {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  line-height: 40rpx;
}
.state {
  padding: 60rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}
</style>
