<template>
  <div class="merchant-preview" :style="[styles.outer,themeVariables]">
    <div class="component-surface" :style="styles.inner">
      <div v-if="previewLoading || previewError" class="preview-state">{{previewLoading ? '正在读取当前店铺内容' : previewError}}</div>
      <template v-else-if="config.name === 'shopHeader'">
        <div class="shop-utility-nav"><span>‹ 返回</span><span>商城首页</span></div>
        <div v-if="config.showSearch" class="search" style="margin-bottom: 16px">
          <i class="el-icon-search" /> {{ config.searchPlaceholder }}
        </div>
        <div
          class="shop-heading shop-header-profile" :class="'layout-' + config.headerLayout"
          :style="
            config.headerLayout === 1
              ? { flexDirection: 'column', textAlign: 'center' }
              : config.headerLayout === 2
              ? { flexDirection: 'row-reverse' }
              : {}
          "
        >
          <img v-if="config.showLogo && shop.logo" :src="shop.logo" /><div v-else-if="config.showLogo" class="shop-avatar">{{shop.name.slice(0,1)}}</div>
          <div class="shop-text"><b class="shop-name">{{shop.name}}</b><small class="shop-description" v-if="config.showDescription">{{shop.description || '欢迎光临本店'}}</small></div>
          <div v-if="config.showFollow" class="shop-follow-control is-stacked"><small v-if="config.showFollowers">{{previewFollowers}} 人关注</small><span class="shop-button" :style="{ background: primary }">{{
            config.followText
          }}</span></div>
        </div>
        <div v-if="config.showNavigation" class="shop-header-tabs"><b :style="{color:primary}">店铺首页</b><span>店铺分类</span></div>
      </template>
      <div
        v-else-if="config.name === 'shopFollow'"
        style="display: flex; align-items: center; justify-content: space-between"
      >
        <span v-if="config.showTitle">{{ config.title }}</span
        ><div class="shop-follow-control"><small v-if="config.showFollowers">{{previewFollowers}} 人关注</small><span class="shop-button" :style="{ background: primary }">{{ config.followText }}</span></div>
      </div>
      <template v-else-if="config.name === 'recommendGroup'">
        <div
          class="recommend-row"
          :style="{
            gridTemplateColumns: 'repeat(' + Math.min(config.columns, config.groups.length) + ',minmax(0,1fr))',
          }"
        >
          <div v-for="(group, index) in config.groups" :key="index" class="recommend-card">
            <b :style="{color:config.recommendTitleColor||'#333333'}">{{ group.title }}</b
            ><small :style="{ color: config.recommendSubtitleColor||primary }">{{ group.subtitle }}</small>
            <img v-if="group.image.url || (previewGroups[index]||{}).image || !livePreview" :src="group.image.url || (previewGroups[index]||{}).image || productPlaceholder" />
            <div v-else class="group-empty"><i class="el-icon-picture-outline" /></div>
          </div>
        </div>
      </template>
      <template v-else-if="config.name === 'productRank'">
        <div class="rank-strip">
          <span class="rank-label">TOP 榜单</span
          ><span
            >{{ config.rankScope === 'category' ? '商品分类 · ' : ''
            }}{{ config.rankType === 'rating' ? '好评榜' : '销量榜' }}第2名</span
          ><i class="el-icon-arrow-right" />
        </div>
      </template>
      <template v-else-if="config.name === 'shopInfo'">
        <div class="shop-heading">
          <img v-if="config.showLogo && shop.logo" :src="shop.logo" /><div v-else-if="config.showLogo" class="shop-avatar">{{shop.name.slice(0,1)}}</div>
          <div class="shop-text">
            <b>{{shop.name}}</b><small v-if="config.showDescription">{{ shop.description || '欢迎光临本店' }}</small>
          </div>
          <span v-if="config.showMore" class="shop-button" :style="{ background: primary }">{{
            config.buttonText
          }}</span>
        </div>
        <div v-if="config.showScores" class="scores">
          <span>商品描述 <b :style="{ color: primary }">{{score(shop.product_score)}}</b></span
          ><span>卖家服务 <b :style="{ color: primary }">{{score(shop.service_score)}}</b></span>
        </div>
        <template v-if="config.showProducts"
          ><div class="section-title">{{ config.productTitle }}</div>
          <div class="product-grid" :style="grid">
            <div v-for="item in products" :key="item.id" class="product">
              <img :src="item.image" />
              <div>{{item.store_name}}</div>
              <merchant-label v-if="config.showMerchantName" :name="item.merchant_name" /><b :style="{ color: primary }">¥{{item.price}}</b>
            </div>
          </div><div v-if="!products.length" class="preview-state">店铺暂无推荐商品</div></template
        >
      </template>
      <template v-else>
        <div v-if="config.showTitle" class="section-heading">
          <b>{{ config.title }}</b
          ><small v-if="config.showMore">{{ config.moreText }}<i class="el-icon-arrow-right" /></small>
        </div>
        <template v-if="config.name === 'shopStreet'"
          ><div v-for="item in shops" :key="item.id" class="shop-heading street">
            <img v-if="config.showLogo && item.logo" :src="item.logo" /><div v-else-if="config.showLogo" class="shop-avatar">{{item.name.slice(0,1)}}</div>
            <div class="shop-text">
              <b>{{item.name}}</b><small v-if="config.showDescription">{{item.description}}</small>
            </div>
            <span class="shop-button" :style="{ background: primary }">{{ config.buttonText }}</span>
          </div></template
        >
        <div v-else-if="config.name === 'productRanking'" class="ranking-row">
          <div v-for="rank in config.rankTypes" :key="rank" class="ranking-card" :style="{ background: light }">
            <b :style="{ color: primary }">{{ rank === 'rating' ? '好评榜' : '销量榜' }}</b>
            <div class="ranking-inner">
              <div v-for="item in rankedProducts(rank)" :key="item.id" class="ranking-product">
                <div class="rank-image">
                  <img :src="item.image" /><span
                    :style="{ background: item.rank === 1 ? primary : item.rank === 2 ? '#ffbd32' : '#9aa6c2' }"
                    >{{ item.rank }}</span
                  >
                </div>
                <div class="shop-text">
                  <div>{{item.store_name}}</div>
                  <merchant-label v-if="config.showMerchantName" :name="item.merchant_name" /><b :style="{ color: primary }">¥{{item.price}}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
        <template v-else
          ><div v-if="config.showSearch" class="search"><i class="el-icon-search" /> 搜索店铺商品</div>
          <div v-if="config.showSort" class="sort">
            <span :style="{ color: primary }">综合</span><span>销量</span><span>新品</span><span>价格</span>
          </div>
          <div class="product-grid" :style="grid">
            <div v-for="item in products" :key="item.id" class="product">
              <img :src="item.image" />
              <div>{{item.store_name}}</div>
              <merchant-label v-if="config.showMerchantName" :name="item.merchant_name" /><b :style="{ color: primary }">¥{{item.price}}</b>
            </div>
          </div><div v-if="!products.length" class="preview-state">暂无商品</div></template
        >
      </template>
    </div>
  </div>
</template>
<script>
import MerchantLabel from '@/components/merchantDecoration/MerchantLabel.vue';
import {editorThemeColors} from '../../../../shared/themeColors';
import { componentStyle } from '../../../../shared/componentStyle';
import merchantPreview from '@/mixins/merchantPreview';
export default {
  components: { MerchantLabel },
  mixins: [merchantPreview],
  props: { config: Object, colorStyle: { type: Object, default: () => ({}) } },
  data: () => ({ placeholder: require('@/assets/images/shan.png'), productPlaceholder: require('@/assets/images/product-diy.png') }),
  computed: {
    shop(){return this.previewShop || {name:'商户店铺名称',logo:this.livePreview?'':this.placeholder,description:'店铺简介'};},
    products(){return this.livePreview ? this.previewProducts : Array.from({length:Math.min(this.config.limit,6)},(_,id)=>({id,store_name:'商品名称商品',image:this.productPlaceholder,price:'199.00',merchant_name:'商户店铺名称'}));},
    shops(){return this.livePreview ? this.previewShops : Array.from({length:Math.min(this.config.limit,3)},(_,id)=>({...this.shop,id}));},
    themeVariables(){return editorThemeColors(this.colorStyle);},
    styles() {
      return componentStyle(this.config);
    },
    primary() {
      return this.colorStyle.theme || 'var(--prev-color-primary, #e93323)';
    },
    light() {
      return this.colorStyle.light || 'var(--prev-color-primary-light, #fff0ed)';
    },
    grid() {
      return { gridTemplateColumns: 'repeat(' + this.config.columns + ',minmax(0,1fr))' };
    },
    shopNote() {
      return '店铺简介以商户资料为准';
    },
  },
  methods: {
    score(value){return value === null || value === undefined ? '暂无评分' : Number(value).toFixed(1);},
    rankedProducts(type){return this.livePreview ? this.previewRankings[type] || [] : this.products.map((item,index)=>({...item,rank:index+1}));},
  },
};
</script>
<style scoped lang="scss">
@import '../../../../shared/merchantPresentation.scss';
.shop-follow-control.is-stacked{flex-direction:column-reverse;gap:0}
.shop-follow-control.is-stacked small{margin-top:6px}
.shop-follow-control.is-stacked .shop-button{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 12px;line-height:30px;border-radius:18px}

.preview-state{padding:12px;color:#909399;text-align:center;font-size:12px}
.shop-follow-control{display:flex;align-items:center;gap:8px;flex-shrink:0}
.shop-utility-nav{display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px}
.shop-header-tabs{display:flex;justify-content:center;gap:36px;margin-top:12px;font-size:14px}
.shop-avatar{width:50px;height:50px;flex-shrink:0;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--view-minorColorT);color:var(--view-theme);font-size:19px}
.group-empty{height:70px;display:flex;align-items:center;justify-content:center;background:#f7f7f7}
.merchant-preview {
  font-size: 13px;
  color: #333;
  text-align: left;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.section-heading > b {
  font-size: 16px;
}
.merchant-preview small {
  font-size: 11px;
  color: #999;
}
.recommend-row,
.product-grid {
  display: grid;
  gap: 10px;
}
.recommend-card {
  text-align: center;
  min-width: 0;
}
.recommend-card b {
  font-size: 12px;
  display: block;
}
.recommend-card small {
  display: block;
  font-size: 10px;
  margin: 5px 0;
}
.recommend-card img,
.product img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: #f3f9ff;
  border-radius: 6px;
  padding: 8px;
}
.rank-strip {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}
.rank-strip i {
  margin-left: auto;
}
.rank-label {
  color: #f8d887;
  background: #252525;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 10px;
}
.shop-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.shop-heading > img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: #f3f9ff;
  padding: 6px;
}
.shop-text {
  min-width: 0;
  flex: 1;
}
.shop-text small {
  display: block;
  margin-top: 5px;
}
.shop-button {
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 12px;
  flex-shrink: 0;
}
.scores {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  font-size: 11px;
  color: #999;
}
.scores b {
  font-weight: 400;
}
.section-title {
  border-top: 1px solid #f4f4f4;
  padding-top: 15px;
  margin: 16px 0 12px;
}
.product div {
  font-size: 12px;
  margin: 8px 0 4px;
}
.product b {
  font-size: 12px;
}
.product small {
  display: block;
  margin-bottom: 4px;
}
.street {
  padding: 12px 0;
  border-bottom: 1px solid #f4f4f4;
}
.ranking-row {
  display: flex;
  gap: 10px;
  overflow: hidden;
}
.ranking-card {
  min-width: 0;
  flex: 1;
  padding: 10px;
  border-radius: 10px;
}
.ranking-inner {
  margin-top: 10px;
  padding: 6px;
  background: white;
  border-radius: 8px;
}
.ranking-product {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
}
.rank-image {
  position: relative;
  width: 50px;
  flex-shrink: 0;
}
.rank-image img {
  width: 50px;
  height: 50px;
  padding: 6px;
  background: #f3f9ff;
  border-radius: 6px;
}
.rank-image span {
  position: absolute;
  top: 0;
  left: 0;
  color: white;
  padding: 1px 3px;
  font-size: 11px;
}
.search {
  background: #f5f5f5;
  border-radius: 20px;
  padding: 10px 15px;
  color: #999;
}
.sort {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
}
@include shop-header-layout(.5px);
</style>
