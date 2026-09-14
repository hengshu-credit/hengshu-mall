<template>
  <view class="shop-navigation" :class="{'tabs-only': !showTitle}"
    ><text v-if="showTitle" class="iconfont icon-fanhui2" @tap="back" /><view v-if="showTitle"
      class="shop-nav-title line1"
      >{{ shop.name || "店铺" }}</view
    ><view class="shop-nav-tabs"
      ><text :class="{ active: active === 'home' }" @tap="go('home')"
        >店铺首页</text
      ><text :class="{ active: active === 'category' }" @tap="go('category')"
        >店铺分类</text
      ></view
    ></view
  >
</template>
<script>
export default {
  props: {
    showTitle: { type: Boolean, default: true },
    shop: { type: Object, default: () => ({}) },
    active: { type: String, default: "home" },
  },
  methods: {
    back() {
      if (getCurrentPages().length > 1) uni.navigateBack();
      else uni.reLaunch({ url: "/pages/index/index" });
    },
    go(target) {
      if (this.active === target) return;
      const theme = uni.getStorageSync("previewThemeId");
      uni.redirectTo({
        url:
          "/pages/merchant/" +
          (target === "home" ? "shop" : "category") +
          "?id=" +
          this.shop.id +
          (theme ? "&theme_id=" + Number(theme) : ""),
      });
    },
  },
};
</script>
<style scoped>
.shop-navigation {
  height: 88px;
  background: #fff;
  position: relative;
  color: #333;
}
.shop-navigation.tabs-only { height: 44px; }
.shop-navigation > .iconfont {
  position: absolute;
  left: 14px;
  top: 14px;
  font-size: 18px;
}
.shop-nav-title {
  padding: 0 45px;
  height: 44px;
  line-height: 44px;
  text-align: center;
  font-size: 15px;
}
.shop-nav-tabs {
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28rpx;
}
.shop-nav-tabs text {
  height: 44px;
  line-height: 44px;
}
.shop-nav-tabs text + text { margin-left: 70rpx; }
.shop-nav-tabs .active {
  color: var(--view-theme);
  border-bottom: 4rpx solid var(--view-theme);
  font-weight: 600;
}
</style>
