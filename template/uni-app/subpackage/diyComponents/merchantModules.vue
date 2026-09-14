<template>
  <common-wrapper v-if="visible" :config="config">
    <view class="merchant-module">
      <view v-if="loading && !loaded" class="module-state">加载中…</view>
      <view v-else-if="error" class="module-state" @tap="reload"
        >{{ error }}，点击重试</view
      >
      <template v-else-if="config.name === 'shopHeader' && currentShop">
        <view class="shop-utility-nav"
          ><text @tap="backShop">‹ 返回</text
          ><text @tap="backMall">商城首页</text></view
        >
        <view
          v-if="config.showSearch"
          class="shop-search"
          style="margin-bottom: 28rpx"
          ><text class="iconfont icon-ic_search" /><input
            v-model="keyword"
            :placeholder="config.searchPlaceholder"
            confirm-type="search"
            @confirm="searchShop"
          /><text @tap="searchShop">搜索</text></view
        >
        <view
          class="shop-heading shop-header-profile" :class="'layout-' + config.headerLayout"
          :style="
            config.headerLayout === 1
              ? { flexDirection: 'column', textAlign: 'center' }
              : config.headerLayout === 2
              ? { flexDirection: 'row-reverse' }
              : {}
          "
          ><image
            v-if="config.showLogo && currentShop.logo"
            :src="currentShop.logo"
            mode="aspectFill" /><view
            v-else-if="config.showLogo"
            class="shop-avatar"
            >{{ currentShop.name.slice(0, 1) }}</view
          ><view class="shop-text"
            ><view class="shop-name line1">{{ currentShop.name }}</view
            ><view
              v-if="config.showDescription"
              class="shop-description line2"
              >{{ currentShop.description || "欢迎光临本店" }}</view
            ></view
          ><follow-button
            v-if="config.showFollow"
            :stacked="true"
            :shopId="effectiveShopId"
            :followText="config.followText"
            :followedText="config.followedText"
            :showCount="config.showFollowers"
        /></view>
        <view v-if="config.showNavigation" class="shop-header-tabs"
          ><text class="active">店铺首页</text
          ><text @tap="openShopCategory">店铺分类</text></view
        >
      </template>
      <view v-else-if="config.name === 'shopFollow'" class="section-heading"
        ><text v-if="config.showTitle">{{ config.title }}</text
        ><follow-button
          :shopId="effectiveShopId"
          :followText="config.followText"
          :followedText="config.followedText"
          :showCount="config.showFollowers"
      /></view>
      <template v-else-if="config.name === 'recommendGroup'"
        ><view
          class="recommend-groups"
          :style="{
            gridTemplateColumns:
              'repeat(' +
              Math.min(config.columns, config.groups.length) +
              ',minmax(0,1fr))',
          }"
          ><view
            v-for="(group, index) in config.groups"
            :key="index"
            class="recommend-card"
            @tap="openGroup(group)"
            ><view class="group-title line1" :style="{color:config.recommendTitleColor||'#333333'}">{{ group.title }}</view
            ><view class="group-subtitle line1" :style="{color:config.recommendSubtitleColor||'var(--view-theme)'}">{{ group.subtitle }}</view
            ><image
              v-if="group.image.url || (groupProducts[index] || {}).image"
              :src="asset(group.image.url || groupProducts[index].image)"
              mode="aspectFill" /><view v-else class="group-empty"
              ><text class="iconfont icon-ic_image" /></view></view></view
      ></template>
      <view
        v-else-if="config.name === 'productRank' && rank"
        class="rank-strip"
        @tap="openRank(rank)"
        ><text class="rank-label">TOP 榜单</text
        ><text class="line1"
          >{{ rank.category_name ? rank.category_name + " · " : ""
          }}{{ rank.type === "rating" ? "好评榜" : "销量榜" }}第{{
            rank.rank
          }}名</text
        ><text class="iconfont icon-ic_rightarrow"
      /></view>
      <template v-else-if="config.name === 'shopInfo' && currentShop">
        <view class="shop-heading"
          ><image
            v-if="config.showLogo && currentShop.logo"
            :src="currentShop.logo"
            mode="aspectFill"
          /><view class="shop-avatar" v-else-if="config.showLogo">{{
            currentShop.name.slice(0, 1)
          }}</view
          ><view class="shop-text"
            ><view class="shop-name line1">{{ currentShop.name }}</view
            ><view
              v-if="config.showDescription"
              class="shop-description line2"
              >{{
                currentShop.description ||
                "在售商品 " + currentShop.product_count + " 件"
              }}</view
            ></view
          ><view
            v-if="config.showMore"
            class="shop-button"
            @tap="openShop(currentShop.id)"
            >{{ config.buttonText }}</view
          ></view
        >
        <view v-if="config.showScores" class="shop-scores"
          ><text
            >商品描述
            <text class="score">{{
              score(currentShop.product_score)
            }}</text></text
          ><text
            >卖家服务
            <text class="score">{{
              score(currentShop.service_score)
            }}</text></text
          ></view
        >
        <template v-if="config.showProducts"
          ><view class="product-title">{{ config.productTitle }}</view
          ><product-grid
            :products="products"
            :columns="config.columns"
            :showMerchantName="config.showMerchantName"
          /><view v-if="!products.length" class="module-state"
            >店铺暂无推荐商品</view
          ></template
        >
      </template>
      <template v-else>
        <view v-if="config.showTitle" class="section-heading"
          ><text>{{ config.title }}</text
          ><text v-if="config.showMore" class="more" @tap="openMore"
            >{{ config.moreText
            }}<text class="iconfont icon-ic_rightarrow" /></text
        ></view>
        <template v-if="config.name === 'shopStreet'"
          ><view
            v-for="item in shops"
            :key="item.id"
            class="shop-heading shop-street"
            @tap="openShop(item.id)"
            ><image
              v-if="config.showLogo && item.logo"
              :src="item.logo"
              mode="aspectFill"
            /><view v-else-if="config.showLogo" class="shop-avatar">{{
              item.name.slice(0, 1)
            }}</view
            ><view class="shop-text"
              ><view class="shop-name line1">{{ item.name }}</view
              ><view
                v-if="config.showDescription"
                class="shop-description line2"
                >{{
                  item.description || "在售商品 " + item.product_count + " 件"
                }}</view
              ></view
            ><view class="shop-button">{{ config.buttonText }}</view></view
          ><view v-if="!shops.length" class="module-state"
            >暂无营业店铺</view
          ></template
        >
        <scroll-view
          v-else-if="config.name === 'productRanking'"
          scroll-x
          class="ranking-scroll"
          ><view class="ranking-row"
            ><view
              v-for="board in boards"
              :key="board.type"
              class="ranking-card"
              ><view class="ranking-title" @tap="openRank(board)"
                >{{ board.type === "rating" ? "好评榜" : "销量榜"
                }}<text class="iconfont icon-ic_rightarrow" /></view
              ><view class="ranking-inner"
                ><view
                  v-for="item in board.products"
                  :key="item.id"
                  class="ranking-product"
                  @tap="openProduct(item)"
                  ><view class="rank-image"
                    ><easy-loadimage
                      :image-src="item.image"
                      :marketing-style="item.marketing_style"
                      width="106rpx"
                      height="106rpx"
                      borderRadius="10rpx"
                    /><text :class="'position-' + item.rank">{{
                      item.rank
                    }}</text></view
                  ><view class="rank-text"
                    ><view class="line1">{{ item.store_name }}</view
                    ><merchant-name
                      :product="item"
                      :show="config.showMerchantName" /><base-money
                      :money="item.price"
                      symbolSize="20"
                      integerSize="28"
                      decimalSize="20" /></view></view
                ><view v-if="!board.products.length" class="module-state"
                  >暂无上榜商品</view
                ></view
              ></view
            ></view
          ></scroll-view
        >
        <template v-else-if="config.name === 'shopProducts'"
          ><view v-if="config.showSearch" class="shop-search"
            ><text class="iconfont icon-ic_search" /><input
              v-model="keyword"
              placeholder="搜索店铺商品"
              confirm-type="search"
              @confirm="reload"
            /><text @tap="reload">搜索</text></view
          ><view v-if="config.showSort" class="sort-tabs"
            ><text
              v-for="tab in sortTabs"
              :key="tab.value"
              :class="{ active: sort === tab.value }"
              @tap="changeSort(tab.value)"
              >{{ tab.label }}</text
            ></view
          ><product-grid
            :products="products"
            :columns="config.columns"
            :showMerchantName="config.showMerchantName"
          /><view v-if="!products.length" class="module-state">暂无商品</view
          ><view
            v-else-if="products.length < count"
            class="load-more"
            @tap="loadMore"
            >{{ loading ? "加载中…" : "加载更多" }}</view
          ><view v-else class="module-state">已展示全部商品</view></template
        >
      </template>
    </view>
  </common-wrapper>
</template>
<script>
import {recommendationDestination} from '../../../shared/recommendationLinks';
import CommonWrapper from "./commonWrapper.vue";
import ProductGrid from "@/components/merchantDecoration/ProductGrid.vue";
import MerchantName from "@/components/merchantName/index.vue";
import EasyLoadimage from "@/components/easy-loadimage/easy-loadimage.vue";
import FollowButton from "@/components/merchantDecoration/FollowButton.vue";
import {
  getShops,
  getShop,
  getShopProducts,
  getRanking,
  getProductRank,
} from "@/api/storefront";
import {
  merchantComponent,
  shopUrl,
  rankingUrl,
} from "../../../shared/merchantDecoration";
import { HTTP_REQUEST_URL } from "@/config/app";
export default {
  components: {
    CommonWrapper,
    ProductGrid,
    MerchantName,
    EasyLoadimage,
    FollowButton,
  },
  props: {
    dataConfig: { type: Object, default: () => ({}) },
    shopId: { type: Number, default: 0 },
    shopData: { type: Object, default: () => ({}) },
    productData: { type: Object, default: () => ({}) },
  },
  data: () => ({
    loading: false,
    loaded: false,
    error: "",
    shops: [],
    products: [],
    boards: [],
    groupProducts: [],
    currentShop: null,
    rank: null,
    count: 0,
    page: 1,
    keyword: "",
    sort: "default",
    sequence: 0,
    sortTabs: [
      { label: "综合", value: "default" },
      { label: "销量", value: "sales" },
      { label: "新品", value: "new" },
      { label: "价格↑", value: "price_asc" },
      { label: "价格↓", value: "price_desc" },
    ],
  }),
  computed: {
    config() {
      return merchantComponent(this.dataConfig.name, this.dataConfig);
    },
    effectiveShopId() {
      return (
        this.shopId ||
        (["shopInfo", "productRank", "shopHeader", "shopFollow"].includes(
          this.config.name
        )
          ? Number(this.productData.seller_shop_id || 0)
          : Number(this.config.shopId || 0))
      );
    },
    requestKey() {
      return JSON.stringify([
        this.dataConfig,
        this.effectiveShopId,
        this.productData.id,
      ]);
    },
    visible() {
      if (this.config.isHide) return false;
      if (
        ["shopInfo", "shopHeader", "shopFollow"].includes(this.config.name) &&
        !this.effectiveShopId
      )
        return false;
      if (this.config.name === "productRank")
        return !!this.rank || this.loading;
      return true;
    },
  },
  watch: {
    requestKey: {
      handler() {
        this.sort = this.config.sort;
        this.keyword = this.config.keyword || "";
        this.reload();
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    this.sequence++;
  },
  methods: {
    backShop() {
      if (getCurrentPages().length > 1) uni.navigateBack();
      else this.backMall();
    },
    backMall() {
      uni.switchTab({ url: "/pages/index/index" });
    },
    openShopCategory() {
      uni.navigateTo({
        url: "/pages/merchant/category?id=" + this.effectiveShopId,
      });
    },
    searchShop() {
      uni.navigateTo({
        url:
          "/pages/merchant/products?shop_id=" +
          this.effectiveShopId +
          "&keyword=" +
          encodeURIComponent(this.keyword),
      });
    },
    asset(url) {
      return url && url.startsWith("/") ? HTTP_REQUEST_URL + url : url;
    },
    score(value) {
      return value === null || value === undefined
        ? "暂无评分"
        : Number(value).toFixed(1);
    },
    async reload() {
      const seq = ++this.sequence;
      this.loading = true;
      this.loaded = false;
      this.error = "";
      this.page = 1;
      this.products = [];
      this.rank = null;
      this.currentShop = null;
      const c = this.config;
      const filters = {
        shop_id: this.effectiveShopId,
        category_id: c.categoryId,
        recommend: c.recommend || "",
      };
      try {
        if (c.name === "shopStreet") {
          const res = await getShops({
            ids: c.shopIds,
            type_id: c.typeId,
            limit: c.limit,
          });
          if (seq === this.sequence) this.shops = res.data.list;
        } else if (
          ["shopInfo", "shopHeader"].includes(c.name) &&
          this.effectiveShopId
        ) {
          const [shop, products] = await Promise.all([
            this.shopData.id === this.effectiveShopId
              ? Promise.resolve({ data: this.shopData })
              : getShop(this.effectiveShopId),
            c.showProducts
              ? getShopProducts({ ...filters, sort: c.sort, limit: c.limit })
              : Promise.resolve({ data: { list: [] } }),
          ]);
          if (seq === this.sequence) {
            this.currentShop = shop.data;
            this.products = products.data.list;
          }
        } else if (c.name === "recommendGroup") {
          const rows = await Promise.all(
            c.groups.map((group) =>
              group.image.url
                ? Promise.resolve({ data: { list: [] } })
                : getShopProducts({
                    ...filters,
                    category_id: group.categoryId,
                    recommend: group.type,
                    sort: group.type === "new" ? "new" : "sales",
                    limit: 1,
                  })
            )
          );
          if (seq === this.sequence)
            this.groupProducts = rows.map((res) => res.data.list[0] || {});
        } else if (c.name === "productRanking") {
          const boards = await Promise.all(
            c.rankTypes.map(async (type) => ({
              type,
              shop_id: filters.shop_id,
              category_id: filters.category_id,
              products: (
                await getRanking({
                  ...filters,
                  type,
                  top: Math.min(c.limit, c.topN),
                })
              ).data,
            }))
          );
          if (seq === this.sequence) this.boards = boards;
        } else if (c.name === "productRank" && this.productData.id) {
          const res = await getProductRank(this.productData.id, {
            type: c.rankType,
            scope: c.rankScope,
            category_id: c.categoryId,
            top: c.topN,
          });
          if (seq === this.sequence) this.rank = res.data.ranking;
        } else if (c.name === "shopProducts") {
          const res = await getShopProducts({
            ...filters,
            keyword: this.keyword,
            sort: this.sort,
            limit: c.limit,
            page: 1,
          });
          if (seq === this.sequence) {
            this.products = res.data.list;
            this.count = res.data.count;
          }
        }
      } catch (error) {
        if (seq === this.sequence) this.error = error.msg || "加载失败";
      } finally {
        if (seq === this.sequence) {
          this.loading = false;
          this.loaded = true;
        }
      }
    },
    async loadMore() {
      if (this.loading) return;
      const seq = this.sequence;
      this.loading = true;
      try {
        const next = this.page + 1;
        const res = await getShopProducts({
          shop_id: this.effectiveShopId,
          category_id: this.config.categoryId,
          recommend: this.config.recommend || "",
          keyword: this.keyword,
          sort: this.sort,
          limit: this.config.limit,
          page: next,
        });
        if (seq === this.sequence) {
          this.products = this.products.concat(res.data.list);
          this.count = res.data.count;
          this.page = next;
        }
      } catch (error) {
        if (seq === this.sequence)
          uni.showToast({
            title: error.msg || "加载失败，请重试",
            icon: "none",
          });
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
    changeSort(value) {
      this.sort = value;
      this.reload();
    },
    themeId() {
      return Number(uni.getStorageSync("previewThemeId") || 0);
    },
    openShop(id) {
      uni.navigateTo({ url: shopUrl(id, this.themeId()) });
    },
    openProduct(item) {
      uni.navigateTo({ url: "/pages/goods_details/index?id=" + item.id });
    },
    openRank(board) {
      uni.navigateTo({
        url: rankingUrl(
          {
            rankType: board.type,
            categoryId: board.category_id,
            topN: board.top || this.config.topN,
          },
          board.shop_id || 0,
          this.themeId()
        ),
      });
    },
    openGroup(group) {
      const target=recommendationDestination(group,this.effectiveShopId,this.themeId());
      if(!target.url)return;
      if(target.type==='url')return uni.navigateTo({url:'/pages/annex/web_view/index?url='+encodeURIComponent(target.url)});
      this.$util.JumpPath(target.url);
    },
    openMore() {
      if (this.config.name === "productRanking")
        this.openRank(
          this.boards[0] || {
            type: "sales",
            shop_id: this.effectiveShopId,
            category_id: this.config.categoryId,
          }
        );
      else if (this.config.name === "shopProducts")
        uni.navigateTo({
          url:
            "/pages/merchant/products?shop_id=" +
            this.effectiveShopId +
            "&category_id=" +
            this.config.categoryId,
        });
      else
        uni.navigateTo({
          url:
            "/pages/merchant/street" +
            (this.themeId() ? "?theme_id=" + this.themeId() : ""),
        });
    },
  },
};
</script>
<style lang="scss" scoped>
@import '../../../shared/merchantPresentation.scss';

.shop-utility-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24rpx;
  margin-bottom: 20rpx;
}
.shop-header-tabs {
  display: flex;
  justify-content: center;
  margin-top: 24rpx;
  font-size: 28rpx;
}
.shop-header-tabs text {
  padding: 12rpx 0;
}
.shop-header-tabs text + text { margin-left: 72rpx; }
.shop-header-tabs .active {
  color: var(--view-theme);
  border-bottom: 3rpx solid var(--view-theme);
}
.merchant-module {
  color: #333;
  font-size: 26rpx;
}
.module-state {
  padding: 30rpx 10rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 26rpx;
}
.more {
  font-size: 24rpx;
  font-weight: 400;
  color: #999;
}
.more .iconfont {
  font-size: 22rpx;
}
.recommend-groups {
  display: grid;
  gap: 16rpx;
}
.recommend-card {
  min-width: 0;
  text-align: center;
}
.group-title {
  font-size: 24rpx;
  font-weight: 600;
}
.group-subtitle {
  font-size: 20rpx;
  color: var(--view-theme);
  margin: 8rpx 0 12rpx;
}
.recommend-card image,
.group-empty {
  width: 100%;
  height: 130rpx;
  border-radius: 12rpx;
  background: #f3f9ff;
}
.group-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccdceb;
}
.rank-strip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
}
.rank-strip > .line1 {
  flex: 1;
}
.rank-label {
  background: #252525;
  color: #f8d887;
  border-radius: 6rpx;
  padding: 6rpx 10rpx;
  font-size: 20rpx;
  white-space: nowrap;
}
.shop-heading {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.shop-heading > image,
.shop-avatar {
  height: 96rpx;
  width: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.shop-avatar {
  background: var(--view-minorColorT);
  color: var(--view-theme);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
}
.shop-text {
  flex: 1;
  min-width: 0;
}
.shop-name {
  font-size: 30rpx;
  font-weight: 500;
}
.shop-description {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.shop-button {
  background: var(--view-theme);
  background-image: linear-gradient(
    90deg,
    var(--view-theme),
    var(--view-gradient)
  );
  padding: 14rpx 26rpx;
  border-radius: 40rpx;
  color: #fff;
  font-size: 24rpx;
  flex-shrink: 0;
}
.shop-scores {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #999;
  padding-top: 30rpx;
}
.score {
  color: var(--view-theme);
  margin-left: 6rpx;
}
.product-title {
  padding-top: 26rpx;
  margin: 30rpx 0 24rpx;
  border-top: 1rpx solid #f5f5f5;
}
.shop-street {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.ranking-scroll {
  width: 100%;
  white-space: nowrap;
}
.ranking-row {
  display: flex;
  gap: 20rpx;
}
.ranking-card {
  width: calc(50% - 10rpx);
  min-width: 300rpx;
  flex-shrink: 0;
  background: var(--view-minorColorT);
  padding: 18rpx;
  border-radius: 20rpx;
  white-space: normal;
}
.ranking-title {
  color: var(--view-theme);
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}
.ranking-inner {
  margin-top: 20rpx;
  border-radius: 16rpx;
  background: #fff;
  padding: 12rpx;
}
.ranking-product {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 16rpx;
  font-size: 24rpx;
}
.rank-image {
  width: 106rpx;
  flex-shrink: 0;
  position: relative;
}
.rank-image > text {
  position: absolute;
  top: 0;
  left: 0;
  background: #9aa6c2;
  color: #fff;
  font-size: 22rpx;
  padding: 0 6rpx;
}
.rank-image > .position-1 {
  background: var(--view-theme);
}
.rank-image > .position-2 {
  background: #ffbd32;
}
.rank-text {
  flex: 1;
  min-width: 0;
}
.shop-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  font-size: 24rpx;
}
.shop-search input {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
}
.sort-tabs {
  display: flex;
  justify-content: space-between;
  padding: 26rpx 8rpx;
  font-size: 26rpx;
}
.sort-tabs .active {
  color: var(--view-theme);
}
.load-more {
  text-align: center;
  padding: 26rpx;
  color: var(--view-theme);
  font-size: 26rpx;
}
@include shop-header-layout(1rpx);
</style>
