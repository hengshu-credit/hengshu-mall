<template>
  <view
    v-if="visible && product.seller_shop_id && product.merchant_name"
    class="merchant-name"
    @tap.stop="openShop"
    ><text class="merchant-icon" aria-hidden="true" /><text class="merchant-name-text">{{ product.merchant_name }}</text><text class="merchant-enter">进店<text class="merchant-enter-arrow">›</text></text></view>
</template>
<script>
import { shopUrl } from "../../../shared/merchantDecoration";
export default {
  inject: { merchantDisplay: { default: null } },
  props: {
    product: { type: Object, default: () => ({}) },
    show: { default: undefined },
  },
  data: () => ({ themeShow: !!uni.getStorageSync("showMerchantName") }),
  computed: {
    visible() {
      const scoped = this.merchantDisplay ? this.merchantDisplay() : undefined;
      return this.show === undefined ? (scoped === undefined ? this.themeShow : scoped) : !!this.show;
    },
  },
  created() {
    this.onMerchantDisplay = (value) => {
      this.themeShow = !!value;
    };
    uni.$on("merchant-name-display", this.onMerchantDisplay);
  },
  beforeDestroy() {
    uni.$off("merchant-name-display", this.onMerchantDisplay);
  },
  methods: {
    openShop() {
      uni.navigateTo({
        url: shopUrl(
          this.product.seller_shop_id,
          uni.getStorageSync("previewThemeId")
        ),
      });
    },
  },
};
</script>
<style scoped lang="scss">
@import '../../../shared/merchantPresentation.scss';
@include merchant-entry(1rpx);
</style>
