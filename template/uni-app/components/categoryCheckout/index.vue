<template><view v-if="visible" class="category-checkout-dock" :style="dockStyle" id="cart">
  <view :style="styles.inner"><view class="category-checkout-content" :class="{'floating-checkout':displayConfig.barLayout === 'floating'}">
    <button v-if="displayConfig.showCart" class="checkout-cart" @click="openCart" :aria-label="$t(displayConfig.cartText)" :style="{color:currentCount > 0 ? displayConfig.activeCartColor || 'var(--view-theme)' : displayConfig.cartColor || '#333',background:cartBackground}">
      <image v-if="displayConfig.cartDisplay !== 'text'" :src="imageUrl(cartIcon)" mode="aspectFit" :style="{width:displayConfig.cartIconSize*2+'rpx',height:displayConfig.cartIconSize*2+'rpx',filter:cartBackground !== 'transparent' && defaultCartIcon ? 'brightness(0) invert(1)' : ''}" />
      <text v-if="displayConfig.cartDisplay !== 'icon'">{{ $t(displayConfig.cartText) }}</text>
      <text v-if="currentCount > 0" class="checkout-count" :style="{background:displayConfig.cartBackground || 'var(--view-theme)'}">{{currentCount}}</text>
    </button>
    <button v-if="displayConfig.showAmount" class="checkout-amount" @click="openCart" :aria-label="$t(displayConfig.detailsText)" :style="{color:displayConfig.priceColor || 'var(--view-theme)'}">¥ {{currentAmount}}</button>
    <button v-if="displayConfig.showDetails" class="checkout-details" :style="{color:displayConfig.detailsColor}" @click="openCart">{{$t(displayConfig.detailsText)}}<text>⌃</text></button>
    <button v-if="displayConfig.showButton" class="checkout-submit" :disabled="currentCount <= 0" @click="checkout"
      :style="{background:displayConfig.buttonColor || (displayConfig.buttonStyle === 'solid' ? 'var(--view-theme)' : 'transparent'),color:displayConfig.buttonTextColor || (displayConfig.buttonStyle === 'solid' ? '#fff' : 'var(--view-theme)'),borderRadius:displayConfig.buttonRadius*2+'rpx'}">{{ $t(displayConfig.buttonText) }}{{displayConfig.showButtonCount ? '('+currentCount+')' : ''}}</button>
  </view></view>
</view></template>
<script>
import { checkoutComponent, checkoutCartIcon, isDefaultCheckoutIcon } from '../../../shared/checkoutComponent';
import { componentStyle } from '../../../shared/componentStyle';
import { vcartList } from '@/api/order.js';
import { HTTP_REQUEST_URL } from '@/config/app';
export default {
  props: {config:{type:Object,default:()=>({})}, count:{type:[Number,String],default:0}, amount:{type:[Number,String],default:0}, navigationHeight:{type:Number,default:0}, standalone:{type:Boolean,default:false}},
  data(){return{cartItems:[]};},
  computed:{ cartBackground(){return this.displayConfig.cartBackground || (this.displayConfig.barLayout === 'floating' ? 'var(--view-theme)' : 'transparent');}, defaultCartIcon(){return isDefaultCheckoutIcon(this.cartIcon);},
    displayConfig(){return checkoutComponent(this.config);},
    cartIcon(){return checkoutCartIcon(this.displayConfig,this.currentCount > 0);},
    visible(){return !!this.config.name && !this.config.isHide;},
    styles(){return componentStyle(this.displayConfig,'rpx',this.imageUrl);},
    dockStyle(){return {...this.styles.outer,bottom: this.navigationHeight+'px'};},
    currentCount(){return this.standalone ? this.cartItems.reduce((total,item)=>total+Number(item.cart_num||0),0) : Number(this.count);},
    currentAmount(){return this.standalone ? this.cartItems.reduce((total,item)=>total+Math.max(0,Number(item.truePrice||0)*Number(item.cart_num||0)-Number(item.full_reduction_price||0)),0).toFixed(2) : (Number(this.amount)||0).toFixed(2);},
  },
  watch:{config:{deep:true,handler(){this.$nextTick(this.measure);}},navigationHeight(){this.$nextTick(this.measure);}},
  mounted(){this.measure(); if(this.standalone){this.loadCart();uni.$on('theme-page-show',this.loadCart);}},
  beforeDestroy(){if(this.standalone)uni.$off('theme-page-show',this.loadCart);this.$emit('heightChange',0);},
  methods:{
    imageUrl(url){return url && url.startsWith('/') && !url.startsWith('/static/') ? HTTP_REQUEST_URL+url : url;},
    loadCart(){if(!this.visible || !this.$store.getters.isLogin){this.cartItems=[];return;}return vcartList().then(res=>{if(!this._isDestroyed)this.cartItems=Array.isArray(res.data)?res.data:[];}).catch(()=>{this.cartItems=[];});},
    measure(){if(!this.visible){this.$emit('heightChange',0);return;}uni.createSelectorQuery().in(this).select('.category-checkout-dock').boundingClientRect(rect=>{if(!this._isDestroyed)this.$emit('heightChange',rect?rect.height:0);}).exec();},
    openCart(){if(this.standalone)this.$util.JumpPath('/pages/order_addcart/order_addcart');else this.$emit('cart');},
    checkout(){if(this.currentCount<=0)return;if(this.standalone){const ids=this.cartItems.map(item=>item.id).filter(Boolean);if(ids.length)this.$util.JumpPath('/pages/goods/order_confirm/index?cartId='+ids.join(','));}else this.$emit('checkout');},
  },
};
</script>
<style scoped>
.category-checkout-dock{position:fixed;left:0;right:0;bottom:0;z-index:277;padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}.category-checkout-content{display:flex;align-items:center;gap:20rpx;min-height:100rpx;padding:14rpx 24rpx;box-sizing:border-box}.checkout-cart{position:relative;margin:0;padding:0;background:transparent;line-height:1.3;overflow:visible}.checkout-cart::after,.checkout-submit::after{border:0}.checkout-cart .iconfont{font-size:52rpx}.checkout-cart image{width:56rpx;height:56rpx}.checkout-count{position:absolute;top:-6rpx;right:-8rpx;border-radius:30rpx;background:var(--view-theme);color:#fff;font-size:20rpx;padding:0 8rpx}.checkout-amount{flex:1;text-align:right;font-size:32rpx;min-width:0}.checkout-submit{margin:0 0 0 auto;font-size:28rpx;min-width:180rpx;line-height:72rpx;padding:0 24rpx;white-space:nowrap}.checkout-submit[disabled]{opacity:.45}
/* #ifdef H5 */
.category-checkout-dock{bottom:var(--store-nav-offset,0px)!important}
/* #endif */
</style>

<style scoped>.checkout-cart{display:flex;flex-direction:column;align-items:center;font-size:24rpx}.checkout-amount{margin:0;padding:0;line-height:1.5;background:transparent}.checkout-amount::after{border:0}</style>

<style scoped>
.checkout-cart{border-radius:50%;flex-shrink:0;justify-content:center}.checkout-details{font-size:20rpx;white-space:nowrap;margin:0;padding:0;line-height:1.3;background:transparent}.checkout-details::after{border:0}.floating-checkout{min-height:76rpx;padding:0 10rpx 0 0;gap:16rpx}.floating-checkout .checkout-cart{min-width:76rpx;min-height:76rpx}.floating-checkout .checkout-amount{flex:0 1 auto;text-align:left;font-weight:bold;white-space:nowrap;font-size:32rpx}.floating-checkout .checkout-submit{min-width:144rpx;padding:0 24rpx;line-height:56rpx;font-size:22rpx}.floating-checkout .checkout-cart>text:not(.checkout-count){font-size:18rpx}.floating-checkout .checkout-details{margin-right:auto}.floating-checkout .checkout-count{border:2rpx solid #fff;line-height:28rpx;font-size:18rpx;min-width:28rpx;padding:0 6rpx;text-align:center}
</style>


