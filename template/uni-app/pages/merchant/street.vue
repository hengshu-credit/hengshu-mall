<template>
  <view class="street-page" :style="colorStyle"
    ><view class="street-search"
      ><text class="iconfont icon-ic_search" /><input
        v-model="keyword"
        placeholder="搜索店铺名称"
        confirm-type="search"
        @confirm="load(true)"
      /><text @tap="load(true)">搜索</text></view
    ><view
      v-for="shop in shops"
      :key="shop.id"
      class="store-card"
      @tap="openShop(shop)"
      ><image v-if="shop.logo" :src="shop.logo" mode="aspectFill" /><view
        v-else
        class="avatar"
        >{{ shop.name.slice(0, 1) }}</view
      ><view class="info"
        ><view class="name line1">{{ shop.name }}</view
        ><view class="description line2">{{
          shop.description || "在售商品 " + shop.product_count + " 件"
        }}</view></view
      ><view class="enter">进店</view></view
    ><view v-if="error" class="state" @tap="load(!shops.length)"
      >{{ error }}，点击重试</view
    ><view v-else class="state" @tap="load(false)">{{
      loading
        ? "加载中…"
        : shops.length < count
        ? "加载更多"
        : shops.length
        ? "已展示全部店铺"
        : "暂无营业店铺"
    }}</view></view
  >
</template>
<script>
import colors from "@/mixins/color";
import { getShops } from "@/api/storefront";
import { shopUrl } from "../../../shared/merchantDecoration";
import { applyTheme } from "@/utils/theme";
export default {
  mixins: [colors],
  data: () => ({
    shops: [],
    keyword: "",
    page: 0,
    count: 0,
    loading: false,
    error: "",
    sequence: 0,
  }),
  onLoad(options) {
    if (options.theme_id)
      uni.setStorageSync("previewThemeId", Number(options.theme_id));
    applyTheme(uni.getStorageSync("previewThemeId") || 0);
    this.load(true);
  },
  onUnload() {
    this.sequence++;
  },
  onReachBottom() {
    this.load(false);
  },
  onPullDownRefresh() {
    this.load(true).finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    async load(reset) {
      if (!reset && (this.loading || this.shops.length >= this.count)) return;
      const seq = ++this.sequence;
      this.loading = true;
      this.error = "";
      if (reset) {
        this.page = 0;
        this.shops = [];
      }
      try {
        const res = await getShops({
          keyword: this.keyword,
          page: this.page + 1,
          limit: 20,
        });
        if (seq === this.sequence) {
          this.shops = this.shops.concat(res.data.list);
          this.count = res.data.count;
          this.page++;
        }
      } catch (error) {
        if (seq === this.sequence) this.error = error.msg || "店铺读取失败";
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
    openShop(shop) {
      uni.navigateTo({
        url: shopUrl(shop.id, uni.getStorageSync("previewThemeId")),
      });
    },
  },
};
</script>
<style scoped>
.street-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}
.street-search {
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-radius: 40rpx;
  background: #fff;
  padding: 18rpx 24rpx;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}
.street-search input {
  flex: 1;
  font-size: 28rpx;
  min-width: 0;
}
.store-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  padding: 26rpx;
  border-radius: 24rpx;
  margin-bottom: 22rpx;
}
.store-card image,
.avatar {
  height: 100rpx;
  width: 100rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.avatar {
  background: var(--view-minorColorT);
  color: var(--view-theme);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 30rpx;
}
.description {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.enter {
  background: var(--view-theme);
  color: #fff;
  padding: 14rpx 26rpx;
  border-radius: 40rpx;
  font-size: 24rpx;
}
.state {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 40rpx;
}
</style>
