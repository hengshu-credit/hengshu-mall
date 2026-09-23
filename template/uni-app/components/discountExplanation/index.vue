<template>
  <view class="discount-explanation" :class="{'is-product':mode==='product'}" @tap.stop>
    <!-- #ifdef APP-PLUS || H5 -->
    <view class="price-portal-anchor" :portal-open="expanded" :change:portal-open="pricePortal.update" />
    <!-- #endif -->
    <template v-if="mode==='product'">
      <view class="price-detail-trigger" role="button" aria-label="查看价格明细" @tap.stop="expanded=true">
        <slot><text>{{ summary.amount ? '¥' + summary.amount : '—' }}</text></slot>
        <text class="price-detail-chevron" aria-hidden="true">›</text>
      </view>
      <view v-if="expanded" class="price-detail-overlay" @tap.stop="expanded=false" @touchmove.stop.prevent>
        <view class="price-detail-sheet" role="dialog" aria-label="价格明细" @tap.stop @touchmove.stop>
          <view class="price-detail-heading"><text>价格明细</text><text class="price-detail-close" role="button" aria-label="关闭价格明细" @tap.stop="expanded=false">×</text></view>
          <view class="price-detail-total"><text class="price-detail-symbol">¥</text>{{ summary.amount || '—' }}</view>
          <view class="price-detail-caption">{{ summary.saving ? '已计入优惠 ¥' + summary.saving : '当前商品价格' }}</view>
          <scroll-view scroll-y class="price-detail-content">
            <view v-for="row in summary.rows" :key="row.label" class="price-detail-row" :class="{'is-total':row.total}">
              <view class="price-detail-row-main"><text>{{ row.label }}</text><text :class="{'is-discount':row.discount}">{{ row.discount ? '−' : '' }}¥{{ row.amount }}</text></view>
              <view v-if="row.note" class="price-detail-note">{{ row.note }}</view>
            </view>
            <view class="price-detail-notes"><view v-for="(line,index) in lines" :key="index">{{ line }}</view></view>
          </scroll-view>
          <button class="price-detail-done" @tap.stop="expanded=false">知道了</button>
        </view>
      </view>
    </template>
    <view v-else><view v-for="(line,index) in lines" :key="index">{{ line }}</view></view>
  </view>
</template>
<script>
import { priceExplanation, productPriceSummary } from '../../../shared/priceExplanation';
export default {
  props: {mode:{type:String,default:'product'},context:{type:Object,default:()=>({})}},
  data:()=>({expanded:false}),
  computed:{
    lines(){return priceExplanation(this.mode,this.context);},
    summary(){return productPriceSummary(this.context.product,this.context.displayedPrice,this.context.explanation);},
  },
  watch:{'context.product.id'(){this.expanded=false;},'context.displayedPrice'(){this.expanded=false;}},
};
</script>
<!-- #ifdef APP-PLUS || H5 -->
<script module="pricePortal" lang="renderjs">
export default {
  methods: {
    update(open) {
      if (!open) { this.releasePricePortal(); return; }
      requestAnimationFrame(() => {
        const root = this.$el.closest('.discount-explanation') || this.$el;
        const overlay = root.querySelector('.price-detail-overlay');
        if (!overlay || this._priceOverlay === overlay) return;
        this.releasePricePortal();
        const colors = getComputedStyle(root);
        ['--view-theme','--view-priceColor','--view-gradient'].forEach(name => {
          const value = colors.getPropertyValue(name);
          if (value) overlay.style.setProperty(name, value);
        });
        document.body.appendChild(overlay);
        this._priceOverlay = overlay;
        // renderjs has no destruction hook; observe only while a sheet is open.
        this._priceObserver = new MutationObserver(() => {
          if (!root.isConnected || !overlay.isConnected) this.releasePricePortal();
        });
        this._priceObserver.observe(document.body, {childList:true,subtree:true});
      });
    },
    releasePricePortal() {
      if (this._priceObserver) this._priceObserver.disconnect();
      if (this._priceOverlay && this._priceOverlay.parentNode) this._priceOverlay.parentNode.removeChild(this._priceOverlay);
      this._priceObserver = null;
      this._priceOverlay = null;
    },
  },
};
</script>
<!-- #endif -->
<style scoped>
.price-portal-anchor { display:none; }
.discount-explanation { font-size: 22rpx; color: #666; line-height: 1.6; padding: 12rpx 0; }
.discount-explanation.is-product { display: inline-flex; min-width: 0; max-width: 100%; padding: 0; vertical-align: middle; color: inherit; }
.price-detail-trigger { display: inline-flex; align-items: center; flex-wrap: wrap; min-height: 44rpx; max-width: 100%; }
.price-detail-chevron { color: var(--view-priceColor, var(--view-theme)); font-size: 30rpx; line-height: 1; margin-left: 8rpx; flex-shrink: 0; }
.price-detail-overlay { position: fixed; z-index: 12000; top: 0; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,.42); text-align: left; font-weight: 400; }
.price-detail-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #fff; color: #333; border-radius: 32rpx 32rpx 0 0; padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.price-detail-heading { display: flex; align-items: center; justify-content: space-between; font-size: 32rpx; font-weight: 600; }
.price-detail-close { display: flex; align-items: center; justify-content: center; width: 60rpx; height: 60rpx; color: #999; font-size: 44rpx; font-weight: 400; }
.price-detail-total { margin-top: 24rpx; color: var(--view-priceColor, var(--view-theme)); text-align: center; font-size: 60rpx; font-weight: 700; line-height: 1.2; }
.price-detail-symbol { font-size: 32rpx; margin-right: 4rpx; }
.price-detail-caption { color: #999; text-align: center; font-size: 24rpx; margin: 12rpx 0 28rpx; }
.price-detail-content { max-height: 48vh; }
.price-detail-row { padding: 18rpx 0; }
.price-detail-row-main { display: flex; justify-content: space-between; font-size: 28rpx; }
.price-detail-row.is-total { border-bottom: 1rpx solid #eee; padding-bottom: 26rpx; font-weight: 600; }
.price-detail-note, .price-detail-notes { font-size: 22rpx; color: #999; line-height: 1.7; margin-top: 10rpx; }
.price-detail-notes { padding: 16rpx 0; }
.is-discount { color: var(--view-priceColor, var(--view-theme)); }
.price-detail-done { margin-top: 24rpx; height: 80rpx; line-height: 80rpx; border-radius: 44rpx; background: var(--view-theme); color: #fff; font-size: 28rpx; }
.price-detail-done::after { border: 0; }
</style>
