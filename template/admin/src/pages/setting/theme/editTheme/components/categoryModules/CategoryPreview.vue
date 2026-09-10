<template>
  <div class="preview-body">
    <div class="side-nav">
      <div
        v-if="centerVersion === 1 && config.show_recommend"
        @click.stop="previewCategory = -1"
        :class="{ selected: previewCategory === -1 }"
      >
        {{ config.recommend_text }}
      </div>
      <div
        v-for="(item, i) in categories"
        :key="item.id"
        :class="{ selected: previewCategory === i }"
        @click.stop="previewCategory = i"
      >
        {{ item.cate_name }}
      </div>
    </div>
    <div class="category-content">
      <img
        v-if="config.banner_enabled && config.banner_image"
        class="banner"
        :src="config.banner_image"
        alt="顶部广告"
      />
      <template v-if="centerVersion === 1">
        <h4>{{ currentCategory.cate_name || '精选分类' }}</h4>
        <div class="category-grid" :style="{ gridTemplateColumns: 'repeat(' + config.columns + ',1fr)' }">
          <div v-for="(item, i) in categoryTiles" :key="item.id || i">
            <div class="category-picture" :style="{ borderRadius: config.image_radius / 2 + 'px' }">
              <img :src="assetUrl(item.pic || pictures[i % pictures.length])" :alt="item.cate_name" :style="{ objectFit: config.image_fit }" />
            </div>
            <span v-if="config.show_category_name">{{ item.cate_name }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="category-tabs">
          <div ref="subTabs" class="sub-tabs" :class="config.sub_tab_style">
            <button v-for="item in secondaryCategories" :key="item.id" type="button" :title="item.cate_name" :class="{selected:subCategory === item.id}" @click.stop="selectSubCategory(item.id)">{{item.cate_name}}</button>
          </div>
          <button type="button" class="sub-tabs-toggle" :aria-label="tabsExpanded ? '收起二级分类' : '展开二级分类'" :aria-expanded="String(tabsExpanded)" @click.stop="tabsExpanded = !tabsExpanded"><i :class="tabsExpanded ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i></button>
          <div v-if="tabsExpanded" class="sub-tabs-more" :class="config.sub_tab_style">
            <button v-for="item in secondaryCategories" :key="item.id" type="button" :class="{selected:subCategory === item.id}" @click.stop="selectSubCategory(item.id)">{{item.cate_name}}</button>
          </div>
        </div>
        <div v-if="tabsExpanded" class="sub-tabs-mask" @click.stop="tabsExpanded = false"></div>
        <div class="products category-products" :class="config.product_layout">
          <div class="category-product" v-for="item in previewProducts" :key="item.id">
            <div class="product-image" :style="{ borderRadius: config.image_radius / 2 + 'px' }">
              <img
                :src="assetUrl(item.image)"
                :alt="item.store_name"
                :style="{ objectFit: config.image_fit }"
              />
            </div>
            <div
              class="product-info"
              :style="{ textAlign: config.text_align, fontWeight: config.text_bold ? 700 : 400 }"
            >
              <div v-if="config.show_product_name" class="product-title" :style="{ WebkitLineClamp: config.name_lines }">
                {{item.store_name}}
              </div>
              <div class="product-bottom">
                <strong class="product-price">¥ {{Number(item.price || 0).toFixed(2)}}</strong
                ><span v-if="config.buy_button_style" class="category-buy" :class="'style-' + config.buy_button_style"
                  ><i
                    v-if="config.buy_button_style < 5"
                    :class="config.buy_button_style < 3 ? 'el-icon-shopping-cart-2' : 'el-icon-plus'"
                  ></i
                  ><template v-else>{{ config.buy_button_style < 7 ? '选规格' : '加入购物车' }}</template></span
                >
              </div>
            </div>
          </div>
          <p v-if="!previewProducts.length" class="preview-empty">{{productsLoading ? '商品加载中' : '该分类暂无上架商品'}}</p>
        </div>
      </template>
    </div>
  </div>
</template>
<script>
import { productListApi } from '@/api/product';
import { getProductList } from '@/api/diy';
import setting from '@/setting';
export default {
  props: { config: Object },
  data() {
    return {
      previewCategory: 0,
      catalog: [], products: [], productsLoading: false, subCategory: 0, tabsExpanded: false,
      pictures: [require('@/assets/images/product-diy.png')],
      sampleCategories: ['家居', '女装', '男装', '母婴', '运动', '数码', '食品'],
      sampleNames: ['全部商品', '床上用品', '生活好物', '数码配件', '电器', '精选礼品'],
      icons: [
        'el-icon-goods',
        'el-icon-house',
        'el-icon-coffee-cup',
        'el-icon-headset',
        'el-icon-mobile-phone',
        'el-icon-present',
      ],
    };
  },
  computed: {
    categories() { return this.catalog.length ? this.catalog : this.sampleCategories.map((cate_name,id)=>({id,cate_name})); },
    currentCategory() { return this.categories[this.previewCategory] || {}; },
    subCategories() { return this.currentCategory.children || this.currentCategory._child || []; },
    secondaryCategories() { return [{id:0,cate_name:'全部商品'}, ...this.subCategories.filter(item => Number(item.id) !== 0)]; },
    categoryTiles() { return this.catalog.length ? [{...this.currentCategory,cate_name:'全部商品'},...this.subCategories] : this.sampleNames.map((cate_name,id)=>({id,cate_name})); },
    previewProducts() { return this.catalog.length ? this.products : Array.from({length:6},(_,id)=>({id,store_name:'品质生活精选商品示意，展示商品名称',price:99,image:this.pictures[id % this.pictures.length]})); },
    centerVersion() {
      return this.config.status;
    },
  },
  watch: { previewCategory() { this.subCategory=0;this.tabsExpanded=false;this.$nextTick(()=>{if(this.$refs.subTabs)this.$refs.subTabs.scrollLeft=0;});this.loadProducts(); }, 'config.status'() { this.tabsExpanded=false;this.loadProducts(); } },
  async created() {
    try { const res=await productListApi({is_show:1});if(this._isDestroyed)return;this.catalog=Array.isArray(res.data.list)?res.data.list:[];this.loadProducts(); } catch (_) { /* A blank catalogue still has a usable layout example. */ }
  },
  beforeDestroy() { this._previewRequest=(this._previewRequest||0)+1; },
  methods: {
    assetUrl(url) { return url && /^\/(?:uploads|statics)\//.test(url) ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '').replace(/\/$/, '')+url : url; },
    selectSubCategory(id) {
      this.subCategory=id;this.tabsExpanded=false;this.loadProducts();
      this.$nextTick(()=>{
        const strip=this.$refs.subTabs, selected=strip && strip.querySelector('.selected');
        if (selected) strip.scrollLeft=Math.max(0, selected.offsetLeft - strip.offsetLeft - (strip.clientWidth-selected.offsetWidth)/2);
      });
    },
    async loadProducts() {
      if(!this.catalog.length || this.config.status === 1)return;
      const request=this._previewRequest=(this._previewRequest||0)+1;this.productsLoading=true;
      try { const res=await getProductList({cate_id:this.subCategory||this.currentCategory.id,page:1,limit:6,type:0});if(!this._isDestroyed&&request===this._previewRequest)this.products=Array.isArray(res.data.list)?res.data.list:[]; }
      catch (_) { if(request===this._previewRequest)this.products=[]; }
      finally { if(request===this._previewRequest)this.productsLoading=false; }
    },
  },
};
</script>
<style scoped lang="scss">
.category-picture,
.product-picture {
  overflow: hidden;
}
.category-picture img,
.product-picture img {
  width: 100%;
  height: 100%;
  display: block;
}
.products.large .product-picture {
  height: 220px;
}
.products.grid .product-picture {
  height: auto;
  aspect-ratio: 1;
}
.preview-body {
  display: flex;
  min-height: 440px;
}
.side-nav {
  align-self: stretch;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  &::-webkit-scrollbar { display:none; }
  position: relative;
  z-index: 3;
  box-shadow: 4px 0 10px -5px rgba(0, 0, 0, .22);
  width: 78px;
  flex-shrink: 0;
  background: var(--cat-side-background-color);
  color: var(--cat-side-text-color);
  div {
    padding: 18px 4px;
    font-size: 12px;
    text-align: center;
    cursor: pointer;
  }
  .selected {
    background: var(--cat-side-active-background-color);
    color: var(--cat-side-active-text-color);
    border-left: 3px solid var(--cat-side-indicator-color);
    font-weight: 600;
  }
}
.category-content {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-width: 0;
  padding: 12px;
  h4 {
    color: var(--cat-group-title-color);
    font-size: 13px;
    margin: 12px 0 20px;
  }
}
.banner {
  width: 100%;
  height: auto;
  display: block;
}
.category-grid {
  display: grid;
  gap: 20px 8px;
  text-align: center;
  span {
    color: var(--cat-category-name-color);
    font-size: 10px;
    display: block;
    margin-top: 8px;
  }
}
.category-picture {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f3f7;
  i {
    font-size: 26px;
    color: #9aaabd;
  }
}
.category-tabs { position:relative;height:50px;z-index:5;flex-shrink:0;order:-1;background:var(--cat-background-color,#fff); }
.sub-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  width: calc(100% - 32px);
  height:50px;
  padding:10px 8px;
  align-items:center;
  scrollbar-width:none;
  &::-webkit-scrollbar{display:none}
  button {
    flex:0 0 75px;
    box-sizing:border-box;
    width:75px;
    height:28px;
    padding:0 6px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    font-size: 12px;
    border: 1px solid transparent;
    border-radius: 16px;
    color: var(--cat-sub-tab-text-color);
    background: var(--cat-sub-tab-background-color);
  }
  .selected {
    background: var(--cat-sub-tab-active-background-color);
    color: var(--cat-sub-tab-active-text-color);
  }
  &.outline .selected {
    background: transparent;
    border-color: var(--cat-sub-tab-active-background-color);
    color: var(--cat-sub-tab-active-background-color);
  }
}
.sub-tabs button,.sub-tabs-more button{cursor:pointer;font-family:inherit}
.sub-tabs-toggle{position:absolute;right:0;top:0;width:32px;height:50px;border:0;background:var(--cat-background-color,#fff);box-shadow:-5px 0 8px -7px #999;cursor:pointer;color:#666;z-index:2}
.sub-tabs-more{position:absolute;left:0;right:0;top:50px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px 8px;max-height:300px;overflow-y:auto;background:var(--cat-background-color,#fff);box-shadow:0 4px 8px #0001}
.sub-tabs-more button{min-width:0;min-height:32px;padding:6px;border:1px solid transparent;border-radius:16px;overflow-wrap:anywhere;font-size:12px;background:var(--cat-sub-tab-background-color);color:var(--cat-sub-tab-text-color)}
.sub-tabs-more .selected{background:var(--cat-sub-tab-active-background-color);color:var(--cat-sub-tab-active-text-color)}
.sub-tabs-more.outline .selected{background:transparent;color:var(--cat-sub-tab-active-background-color);border-color:var(--cat-sub-tab-active-background-color)}
.sub-tabs-mask{position:absolute;inset:50px 0 0;z-index:4;background:#0003}
.products {
  background: var(--cat-product-background-color);
  &.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  &.list .product {
    display: flex;
    gap: 8px;
    .product-picture {
      width: 72px;
      height: 72px;
      flex-shrink: 0;
    }
  }
}
.product {
  min-width: 0;
  margin-bottom: 12px;
}
.product-picture {
  height: 96px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #edf1f6;
  color: #9aaabd;
  font-size: 30px;
}
.product-info {
  flex: 1;
  min-width: 0;
}
.product-name {
  margin: 8px 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 10px;
  color: var(--cat-product-title-color);
}
.product-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
  strong {
    color: var(--cat-price-color);
    font-size: 12px;
  }
}
.buy-button {
  color: var(--cat-buy-button-color);
  font-size: 11px;
  padding: 3px;
  &.style-2,
  &.style-4,
  &.style-6,
  &.style-8 {
    background: var(--cat-buy-button-color);
    color: #fff;
    border-radius: 20px;
    padding: 4px 6px;
  }
  &.style-3,
  &.style-5,
  &.style-7 {
    border: 1px solid var(--cat-buy-button-color);
    border-radius: 4px;
  }
}
</style>

<style scoped lang="scss">
@use '../../../../../../../../shared/categoryProductStyle.scss' as categoryProduct;
@include categoryProduct.category-product-layout(.5px);
.preview-body>.side-nav{width:90px}.preview-body>.category-content{padding:0}.category-content h4,.category-grid,.banner{margin-left:8px;margin-right:8px}
</style>
