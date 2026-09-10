<template><div :style="styles.outer"><div :style="styles.inner" class="checkout-preview-surface"><div class="checkout-preview" :class="{'floating-checkout':config.barLayout === 'floating'}">
  <span v-if="config.showCart" class="checkout-cart" :style="{color:selected ? config.activeCartColor || themeColor : config.cartColor || '#333',background:cartBackground}"><img v-if="config.cartDisplay !== 'text'" :src="assetURL(cartIcon)" :style="{width:config.cartIconSize+'px',height:config.cartIconSize+'px',filter:cartBackground !== 'transparent' && defaultCartIcon ? 'brightness(0) invert(1)' : ''}" /><span v-if="config.cartDisplay !== 'icon'">{{ config.cartText }}</span><span v-if="selected" class="checkout-count" :style="{background:config.cartBackground || themeColor}">2</span></span>
  <span v-if="config.showAmount" class="checkout-amount" :style="{color: config.priceColor || themeColor}">¥ {{ selected ? '198.00' : '0.00' }}</span>
  <span v-if="config.showDetails" class="checkout-details" :style="{color:config.detailsColor}">{{ config.detailsText }}<span>⌃</span></span>
  <b v-if="config.showButton" :style="{background:config.buttonColor || (config.buttonStyle === 'solid' ? themeColor : 'transparent'),color:config.buttonTextColor || (config.buttonStyle === 'solid' ? '#fff' : themeColor),borderRadius:config.buttonRadius+'px'}">{{ config.buttonText }}{{config.showButtonCount ? '('+(selected?2:0)+')' : ''}}</b>
</div></div></div></template>
<script>
import { componentStyle } from '../../../../shared/componentStyle';
import setting from '@/setting';
import { checkoutCartIcon, isDefaultCheckoutIcon } from '../../../../shared/checkoutComponent';
export default { props:{ config:Object, selected:Boolean, themeColor:{type:String,default:'#e93323'} },
  computed:{ cartBackground(){return this.config.cartBackground || (this.config.barLayout === 'floating' ? this.themeColor : 'transparent');}, defaultCartIcon(){return isDefaultCheckoutIcon(this.cartIcon);}, styles(){return componentStyle(this.config,'px',this.assetURL);}, cartIcon(){return checkoutCartIcon(this.config,this.selected);} },
  methods:{assetURL(url){if(url && url.startsWith('/static/'))url='/statics/mp_view'+url;return url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '').replace(/\/$/, '')+url : url;}}
};
</script>
<style scoped>
.checkout-preview{display:flex;align-items:center;gap:10px;min-height:50px;padding:7px 12px;box-sizing:border-box}.checkout-cart{display:flex;flex-direction:column;align-items:center;font-size:12px;line-height:1.3}.checkout-cart img{width:28px;height:28px;object-fit:contain}.checkout-amount{flex:1;text-align:right;font-size:16px}.checkout-preview b{margin-left:auto;min-width:90px;text-align:center;padding:0 12px;line-height:36px;font-weight:normal;font-size:14px}
</style>

<style scoped>
.checkout-cart{position:relative;border-radius:50%;flex-shrink:0;justify-content:center}.checkout-count{position:absolute;top:-3px;right:-4px;min-width:14px;line-height:14px;padding:0 3px;border:1px solid white;border-radius:12px;font-size:9px;color:white;text-align:center}.checkout-details{font-size:10px;white-space:nowrap}.floating-checkout{min-height:38px;padding:0 5px 0 0;gap:8px}.floating-checkout .checkout-cart{min-width:38px;min-height:38px}.floating-checkout .checkout-amount{flex:0 1 auto;text-align:left;font-weight:bold;white-space:nowrap;font-size:16px}.floating-checkout b{min-width:72px;padding:0 12px;line-height:28px;font-size:11px}.floating-checkout .checkout-cart>span:not(.checkout-count){font-size:9px}.floating-checkout .checkout-details{margin-right:auto}
</style>


