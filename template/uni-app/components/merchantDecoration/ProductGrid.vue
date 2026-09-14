<template>
  <view
    class="merchant-product-grid"
    :class="{ compact: columns > 2 }"
    :style="{ gridTemplateColumns: 'repeat(' + columns + ',minmax(0,1fr))' }"
    ><view v-for="item in products" :key="item.id" @tap="openProduct(item)"
      ><waterfalls-flow-item
        :item="item"
        goDetail="goDetail"
        :showMerchantName="showMerchantName"
        :imageHeight="
          Math.max(100, (706 - 20 * (columns - 1)) / columns) + 'rpx'
        " /></view
  ></view>
</template>
<script>
import WaterfallsFlowItem from "@/components/WaterfallsFlow/WaterfallsFlowItem.vue";
export default {
  components: { WaterfallsFlowItem },
  props: {
    products: { type: Array, default: () => [] },
    columns: { type: Number, default: 2 },
    showMerchantName: { default: undefined },
  },
  methods: {
    openProduct(item) {
      uni.navigateTo({ url: "/pages/goods_details/index?id=" + item.id });
    },
  },
};
</script>
<style scoped>
.merchant-product-grid {
  display: grid;
  gap: 20rpx;
}
.merchant-product-grid > view {
  min-width: 0;
}
.compact /deep/ .info_box {
  padding: 10rpx 6rpx;
}
.compact /deep/ .fs-28 {
  font-size: 24rpx;
}
.compact /deep/ .w-44 {
  display: none;
}
.compact /deep/ .lh-40rpx {
  line-height: 34rpx;
}
</style>
