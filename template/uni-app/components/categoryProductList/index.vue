<template>
  <view class="category-products" :class="appearance.product_layout">
    <view class="category-product" v-for="(item, index) in tempArr" :key="item.id" @click="$emit('detail', item)">
      <view class="product-image" :style="{ borderRadius: appearance.image_radius + 'rpx' }">
        <image :src="appearance.product_layout === 'large' && item.recommend_image ? item.recommend_image : item.image" :mode="appearance.image_fit === 'cover' ? 'aspectFill' : 'aspectFit'" />
        <marketing-style :marketing-style="item.marketing_style" />
        <text v-if="isActivity(item) && activityLabel(item)" class="activity-label">{{ $t(activityLabel(item)) }}</text>
      </view>
      <view class="product-info" :style="{ textAlign: appearance.text_align, fontWeight: appearance.text_bold ? 700 : 400 }">
        <view v-if="appearance.show_product_name" class="product-title" :style="{ WebkitLineClamp: appearance.name_lines }">{{ item.store_name }}</view>
        <view class="product-bottom"><text class="product-price">{{ $t('￥') }}{{ item.price }}</text>
          <view v-if="appearance.buy_button_style" class="purchase-controls">
            <text v-if="item.stock <= 0" class="sold-out">{{ $t('已售罄') }}</text>
            <view v-else class="category-buy" :class="'style-' + appearance.buy_button_style" @click.stop="buy(item, index)">
              <text v-if="appearance.buy_button_style < 5" class="iconfont" :class="appearance.buy_button_style < 3 ? 'icon-gouwuche6' : 'icon-jiahao'"></text>
              <text v-else>{{ appearance.buy_button_style < 7 ? $t(item.spec_type ? '选规格' : '选购') : $t('加入购物车') }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
import { normalizeCategoryPage } from '../../../shared/categoryPageConfig';
export default {
  name: 'CategoryProductList',
  props: { decoration: { type: Object, default: () => ({}) }, tempArr: { type: Array, default: () => [] }, isLogin: { type: Boolean, default: false } },
  data() { return { addIng: false }; },
  computed: { appearance() { return normalizeCategoryPage(this.decoration); } },
  methods: {
    isActivity(item) { return item.activity && ['1', '2', '3'].includes(String(item.activity.type)); },
    activityLabel(item) {
      const types = { 1: ['seckill', '秒杀'], 2: ['bargain', '砍价'], 3: ['combination', '拼团'] };
      const entry = item.activity && types[item.activity.type];
      return entry && this.$permission(entry[0]) ? entry[1] : '';
    },
    buy(item, index) {
      if (item.stock <= 0) return;
      if (this.isActivity(item) || Number(item.is_virtual) > 0 || Number(item.cart_button) !== 1) this.$emit('detail', item);
      else this.$emit('gocartduo', item);
    },
    changeQuantity(add, index, item) { if (this.addIng) return; this.addIng = true; this.$emit('ChangeCartNumDan', add, index, item); },
  },
};
</script>
<style scoped lang="scss">
@import '../../../shared/categoryProductStyle.scss';
@include category-product-layout(1rpx);
</style>
