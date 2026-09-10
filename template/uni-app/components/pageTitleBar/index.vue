<template>
  <view class="page-title-bar" :style="{background, color}">
    <view class="title-actions title-actions-left"><page-action-buttons :buttons="displayActions.left" :config="displayActions" :product="product" @action="activate" /></view>
    <view class="page-title-text">{{ $t(title) }}</view>
    <view class="title-actions title-actions-right"><page-action-buttons :buttons="displayActions.right" :config="displayActions" :product="product" @action="activate" /></view>
  </view>
</template>
<script>
import PageActionButtons from '@/components/pageActionButtons/index.vue';
import { headerActions } from '../../../shared/pageActions';
export default {
  components: { PageActionButtons },
  props: { title: {type:String,default:''}, background: {type:String,default:'#FFFFFF'}, color: {type:String,default:'#000000'}, actions: {type:Object,default:()=>({})}, managing: Boolean, product: {type:Object,default:()=>({})} },
  computed: {
    displayActions() {
      const config = headerActions(this.actions);
      if (this.managing) ['left','right'].forEach(side => config[side].forEach(action => { if (action.type === 'cartManage') action.label = '取消'; }));
      return config;
    },
  },
  methods: { activate(type) { this.$emit(type); this.$emit('action',type); } },
};
</script>
<style scoped>
.page-title-bar{height:44px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr);align-items:center;padding:0 8px;box-sizing:border-box;width:100%;flex-shrink:0}
.page-title-text{text-align:center;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.title-actions{display:flex;align-items:center;min-width:0;overflow:hidden}.title-actions-right{justify-content:flex-end}
.title-actions ::v-deep .page-action-buttons{flex-shrink:1;max-width:100%;gap:2rpx}.title-actions ::v-deep .page-action-button{min-width:0;flex:1;padding:4rpx 6rpx}.title-actions ::v-deep .action-label{max-width:72rpx}
</style>
