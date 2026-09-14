<template>
  <view class="discount-explanation" @tap.stop>
    <text v-if="mode==='product'" class="explanation-trigger" @tap.stop="expanded=!expanded">价格说明 {{ expanded ? '收起' : '查看' }}</text>
    <view v-if="mode!=='product' || expanded"><view v-for="(line,index) in lines" :key="index">{{ line }}</view></view>
  </view>
</template>
<script>
import { priceExplanation } from '../../../shared/priceExplanation';
export default {
  props: {mode:{type:String,default:'product'},context:{type:Object,default:()=>({})}},
  data:()=>({expanded:false}),
  computed:{lines(){return priceExplanation(this.mode,this.context);}},
};
</script>
<style scoped>
.discount-explanation { font-size: 22rpx; color: #666; line-height: 1.6; padding: 12rpx 0; }
.explanation-trigger { color: var(--view-theme, #555); }
</style>
