<template>
  <div class="palette-previews" :style="variables">
    <section class="palette-page" data-page="home">
      <h4>商城首页</h4>
      <div class="mini-screen">
        <div class="mini-search">搜索喜欢的商品</div>
        <div class="home-banner">
          <div>生活好物<br /><small>发现日常的小美好</small></div>
          <img :src="goods[0]" alt="商品示意" />
        </div>
        <div class="mini-tabs"><b>精选</b><span>新品</span><span>热销</span></div>
        <div class="mini-grid">
          <article v-for="(img, i) in goods" :key="i">
            <img :src="img" alt="商品示意" />
            <p>品质生活精选好物</p>
            <strong>¥ {{ i ? '169.00' : '99.00' }}</strong
            ><i class="mini-add">＋</i>
          </article>
        </div>
        <div class="mini-nav"><b>首页</b><span>分类</span><span>购物车</span><span>我的</span></div>
      </div>
    </section>
    <section class="palette-page" data-page="category">
      <h4>
        商品分类
        <select v-model.number="layout" aria-label="分类预览布局">
          <option :value="1">分类导航</option>
          <option :value="2">大图商品</option>
          <option :value="3">图文列表</option>
        </select>
      </h4>
      <div class="mini-screen category-mini" :style="categoryStyle">
        <div class="mini-search">搜索商品名称</div>
        <category-preview :config="category" />
      </div>
    </section>
    <section class="palette-page" data-page="detail">
      <h4>商品详情</h4>
      <div class="mini-screen">
        <img class="detail-photo" :src="product" alt="商品详情示意" />
        <div class="detail-info">
          <strong>¥ 199.00</strong>
          <p>品质电热水壶 · 便捷生活</p>
          <span class="mini-tag">新品推荐</span>
          <div class="mini-tabs"><b>商品详情</b><span>商品评价</span></div>
          <div class="mini-actions">
            <span>首页</span><span>收藏</span><button class="secondary">加入购物车</button><button>立即购买</button>
          </div>
        </div>
      </div>
    </section>
    <section class="palette-page" data-page="user">
      <h4>个人中心</h4>
      <div class="mini-screen">
        <div class="user-banner">
          <i class="el-icon-user-solid"></i><span>商城会员<small>欢迎回来</small></span>
        </div>
        <div class="account-row">
          <div><strong>¥ 128.00</strong><span>余额</span></div>
          <div><strong>680</strong><span>积分</span></div>
          <div><strong>5</strong><span>优惠券</span></div>
        </div>
        <div class="order-card">
          <b>我的订单</b>
          <div>
            <span v-for="name in ['待付款', '待发货', '待收货']" :key="name"
              ><i class="el-icon-tickets"></i>{{ name }}</span
            >
          </div>
        </div>
        <div class="member-card">会员专享 <button>立即查看</button></div>
        <div class="mini-nav"><span>首页</span><span>分类</span><span>购物车</span><b>我的</b></div>
      </div>
    </section>
  </div>
</template>
<script>
import { paletteVariables } from '../../../../../../../shared/themePalette';
import { normalizeCategoryPage, categoryPageStyle } from '../../../../../../../shared/categoryPageConfig';
import CategoryPreview from './categoryModules/CategoryPreview';
export default {
  components: { CategoryPreview },
  props: { palette: Object },
  data() {
    return {
      layout: 1,
      goods: [require('@/assets/images/product-diy.png'), require('@/assets/images/product-diy.png')],
      product: require('@/assets/images/product-diy.png'),
    };
  },
  computed: {
    variables() {
      return paletteVariables(this.palette);
    },
    category() {
      return normalizeCategoryPage(this.layout);
    },
    categoryStyle() {
      return categoryPageStyle(this.category, this.palette.theme_color);
    },
  },
};
</script>
<style scoped lang="scss">
.palette-previews {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 22px;
  max-width: 850px;
}
.palette-page {
  min-width: 0;
}
h4 {
  font-size: 14px;
  margin: 0 0 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
select {
  font-size: 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 3px;
  padding: 4px;
}
.mini-screen {
  border: 1px solid #e8e8eb;
  background: #f7f8fa;
  min-height: 340px;
  overflow: hidden;
  color: #333;
  font-size: 12px;
  position: relative;
}
.mini-search {
  background: #fff;
  border-radius: 18px;
  padding: 8px 14px;
  color: #aaa;
  margin: 12px;
}
.home-banner,
.user-banner {
  background: linear-gradient(110deg, var(--view-theme), var(--view-gradient));
  color: white;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.home-banner {
  font-size: 20px;
}
.home-banner small {
  font-size: 11px;
}
.home-banner img {
  width: 38%;
  height: 95px;
  object-fit: contain;
  border-radius: 8px;
}
.mini-tabs {
  display: flex;
  justify-content: space-around;
  padding: 15px 8px;
  background: #fff;
}
.mini-tabs b,
.mini-nav b,
strong {
  color: var(--view-theme);
}
.mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px;
}
.mini-grid article {
  background: #fff;
  padding: 8px;
  border-radius: 6px;
}
.mini-grid img {
  width: 100%;
  height: 90px;
  object-fit: contain;
}
.mini-grid p {
  margin: 6px 0;
  font-size: 11px;
}
.mini-add {
  float: right;
  background: var(--view-theme);
  color: white;
  border-radius: 50%;
  font-style: normal;
  padding: 0 3px;
}
.mini-nav {
  display: flex;
  justify-content: space-around;
  padding: 16px 4px;
  background: #fff;
  border-top: 1px solid #f1f1f1;
}
.detail-photo {
  width: 100%;
  height: 215px;
  object-fit: cover;
  object-position: center;
}
.detail-info {
  padding: 12px;
  background: #fff;
}
.mini-tag {
  background: var(--view-op-ten);
  color: var(--view-theme);
  padding: 3px 6px;
  border-radius: 3px;
}
.mini-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  padding-top: 10px;
}
button {
  border: 0;
  background: linear-gradient(90deg, var(--view-theme), var(--view-gradient));
  color: #fff;
  border-radius: 18px;
  padding: 9px 8px;
  white-space: nowrap;
  font-size: 11px;
}
.mini-actions button {
  flex: 1;
}
.mini-actions .secondary {
  background: var(--view-bntColor);
  color: #333;
}
.user-banner {
  height: 130px;
  justify-content: flex-start;
  gap: 15px;
}
.user-banner > i {
  font-size: 30px;
  background: #fff5;
  border-radius: 50%;
  padding: 12px;
}
.user-banner small {
  display: block;
  margin-top: 8px;
}
.account-row {
  display: flex;
  justify-content: space-around;
  background: #fff;
  padding: 22px 8px;
}
.account-row span {
  display: block;
  margin-top: 8px;
  font-size: 11px;
}
.order-card {
  background: #fff;
  margin: 12px;
  padding: 15px;
}
.order-card > div {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}
.order-card i {
  display: block;
  color: var(--view-theme);
  font-size: 22px;
  text-align: center;
  margin-bottom: 8px;
}
.member-card {
  margin: 12px;
  padding: 12px;
  background: var(--view-op-ten);
  color: var(--view-theme);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category-mini {
  height: 398px;
  overflow: auto;
}
.category-mini ::v-deep .side-nav {
  width: 60px;
}
.category-mini ::v-deep .category-content {
  padding: 8px;
}
@media (max-width: 1250px) {
  .palette-previews {
    grid-template-columns: minmax(220px, 1fr);
    max-width: 400px;
  }
}
</style>
