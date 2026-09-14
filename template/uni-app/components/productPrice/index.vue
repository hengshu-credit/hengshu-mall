<template>
  <discount-explanation mode="product" :context="{product,displayedPrice:money}">
    <view class="product-price-amount">
      <base-money v-if="summary.amount" v-bind="$attrs" :money="summary.amount" />
      <text v-else>—</text>
      <text v-if="showReference && summary.reference" class="product-price-reference">¥{{ summary.reference }}</text>
    </view>
  </discount-explanation>
</template>
<script>
import DiscountExplanation from '../discountExplanation/index.vue';
import BaseMoney from '../BaseMoney.vue';
import { productPriceSummary } from '../../../shared/priceExplanation';
export default {
  inheritAttrs: false,
  components: { DiscountExplanation, BaseMoney },
  props: { product:{type:Object,default:()=>({})}, money:{type:[Number,String],default:undefined}, showReference:{type:Boolean,default:true} },
  computed: { summary(){return productPriceSummary(this.product,this.money);} },
};
</script>
<style scoped>
.product-price-amount { display: inline-flex; align-items: baseline; flex-wrap: wrap; min-width: 0; }
.product-price-reference { margin-left: 10rpx; font-size: 20rpx; line-height: 1.5; font-weight: 400; color: #aaa; text-decoration: line-through; white-space: nowrap; }
</style>
