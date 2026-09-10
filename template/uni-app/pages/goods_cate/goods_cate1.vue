<template>
	<view class='productSort copy-data category-decorated' :class="decorationClasses" :style="[decorationStyle, {height:pageHeight}]">
		<view v-if="categoryAppearance.show_search" class="category-search-shell">
          <header-serch :dataConfig="categoryAppearance.search_component" :special="1" />
        </view>
        <view v-show="categoryAppearance.show_category && !categoryAppearance.category_hidden" class="category-module-shell" :style="categoryOuterStyle">
		<view class="scroll-box" :style="categoryModuleStyle">
			<view class='aside'>
				<scroll-view scroll-y="true" scroll-with-animation='true' style="height: calc(100% - 100rpx)">
					<view v-if="categoryAppearance.show_recommend" class="item acea-row row-center-wrapper" :class="{on: navActive === -1}" @click="tap(-1, 'category-recommend')">{{ $t(categoryAppearance.recommend_text) }}</view>
                    <view class='item acea-row row-center-wrapper' :class='index==navActive?"on":""'
						v-for="(item,index) in productList" :key="index" @click='tap(index,"b"+index)'>
						<text>{{$t(item.cate_name)}}</text>
					</view>
					<!-- #ifdef APP-PLUS -->
					<view class="item" v-if="newData.status && newData.status.status"></view>
					<!-- #endif -->
				</scroll-view>
			</view>


			<view class='conter'>
				<scroll-view scroll-y="true" :scroll-into-view="toView" @scroll="scroll" scroll-with-animation='true'
					style="height: 100%;" class="conterScroll">
					<view class="category-scroll-origin"></view>
					<category-banner :config="categoryAppearance" @load="infoScroll" />
                    <view v-if="categoryAppearance.show_recommend" id="category-recommend" class="recommend-section">
                      <view class="title"><view class="name">{{ $t(categoryAppearance.recommend_text) }}</view></view>
                      <view class="list acea-row" :style="{display:'grid',gridTemplateColumns:'repeat('+categoryAppearance.columns+',minmax(0,1fr))'}">
                        <navigator v-for="item in productList.slice(0,12)" :key="item.id" class="item acea-row row-column row-middle" :url="'/pages/goods/goods_list/index?cid='+item.id" style="width:100%">
                          <view class="picture" :style="{borderRadius:categoryAppearance.image_radius+'rpx',overflow:'hidden'}"><image :src="item.pic || defimg" :mode="categoryAppearance.image_fit === 'contain' ? 'aspectFit' : 'aspectFill'" :style="{borderRadius:categoryAppearance.image_radius+'rpx'}" /></view>
                          <view v-if="categoryAppearance.show_category_name" class="name line1">{{ $t(item.cate_name) }}</view>
                        </navigator>
                      </view>
                    </view>
                    <block v-for="(item,index) in productList" :key="index">
						<view class='listw' :id="'b'+index">
							<view class='title acea-row row-center-wrapper'>
								<view class='line'></view>
								<view class='name'>{{$t(item.cate_name)}}</view>
								<view class='line'></view>
							</view>
							<view class='list acea-row' :style="{display:'grid',gridTemplateColumns:'repeat('+categoryAppearance.columns+',minmax(0,1fr))'}">
								<navigator hover-class='none'
									:url='"/pages/goods/goods_list/index?cid="+item.id+"&title="+item.cate_name'
									class='item acea-row row-column row-middle' style="width:100%">
									<view class='picture' :style="{borderRadius:categoryAppearance.image_radius+'rpx',overflow:'hidden'}">
										<image :src="item.pic || defimg" :mode="categoryAppearance.image_fit === 'contain' ? 'aspectFit' : 'aspectFill'" :style="{borderRadius:categoryAppearance.image_radius+'rpx'}" lazy-load></image>
									</view>
									<view v-if="categoryAppearance.show_category_name" class='name line1'>{{$t(`全部商品`)}}</view>
								</navigator>
								<block v-for="(itemn,indexn) in item.children" :key="indexn">
									<navigator hover-class='none'
										:url='"/pages/goods/goods_list/index?sid="+itemn.id+"&title="+itemn.cate_name'
										class='item acea-row row-column row-middle' style="width:100%">
										<view class='picture' :style="{borderRadius:categoryAppearance.image_radius+'rpx',overflow:'hidden'}">
											<image :src="itemn.pic" :mode="categoryAppearance.image_fit === 'contain' ? 'aspectFit' : 'aspectFill'" :style="{borderRadius:categoryAppearance.image_radius+'rpx'}" lazy-load></image>
										</view>
										<view v-if="categoryAppearance.show_category_name" class='name line1'>{{$t(itemn.cate_name)}}</view>
									</navigator>
								</block>
							</view>
						</view>
					</block>
					<view :style='"height:"+(height-300)+"rpx;"' v-if="number<15"></view>
				</scroll-view>
			</view>
		</view>
		</view>
    <view :style="{height:checkoutHeight+'px',flexShrink:0}"></view>
    <category-checkout :config="checkoutConfig" :standalone="true" :navigationHeight="navigationHeight" @heightChange="checkoutHeight = $event" />
	</view>
</template>

<script>
import { resolveCategoryTarget } from '@/utils/categoryNavigation.js';
	import categoryDecoration from '@/mixins/categoryDecoration.js';
	import headerSerch from '@/subpackage/diyComponents/headerSerch.vue';
	import categoryCheckout from '@/components/categoryCheckout';
import categoryBanner from '@/components/categoryBanner';
import categoryData from '@/mixins/categoryData.js';
	let sysHeight = uni.getWindowInfo().statusBarHeight + 'px';
	import {
		mapState,
		mapGetters
	} from "vuex"
	import {
		getNavigation
	} from '@/api/public.js'
	import pageFooter from '@/components/pageFooter/index.vue'
	const app = getApp();
	export default {
		mixins: [categoryDecoration, categoryData],
		props: { categoryTarget: { type: Object, default: () => ({ cid: 0, sid: 0 }) } },
		watch: {
			categoryTarget: { deep: true, handler() { this.positionCategory(); } },
		},
		components: {
            headerSerch, categoryCheckout,
			pageFooter, categoryBanner
		},
		data() {
			return {
				defimg: require('@/static/images/all_cat.png'),
				navlist: [],
				productList: [],
				navActive: 0,
				number: "",
				is_diy: uni.getStorageSync('is_diy'),
				height: 0,
				hightArr: [],
				toView: "",
				tabbarH: 0,
				footH: 0,
				windowHeight: 0,
				newData: {},
				activeRouter: '',
				pageHeight: '100%',
				sysHeight: sysHeight,
				// #ifdef APP-PLUS
				pageHeight: app.globalData.windowHeight,
				// #endif
				lock: false
			}
		},
		computed: {
			...mapState({
				cartNum: state => state.indexData.cartNum
			})
		},

		mounted() {
			let that = this
			// #ifdef H5
			uni.getSystemInfo({
				success: function(res) {
					that.pageHeight = res.windowHeight + 'px'
				}
			});
			// #endif
			let routes = getCurrentPages();
			let curRoute = routes[routes.length - 1].route
			this.activeRouter = '/' + curRoute
			!that.productList.length && this.getAllCategory(1);
		},
		methods: {
			positionCategory() {
				if (!this.categoryTarget.cid && !this.categoryTarget.sid) return;
				const selected = resolveCategoryTarget(this.productList, this.categoryTarget);
				if (selected) this.$nextTick(() => this.tap(selected.index, 'b' + selected.index));
			},
			getNav() {
				getNavigation({ page: 'category', theme_id: uni.getStorageSync('previewThemeId') || 0 }).then(res => {
					this.newData = res.data
				})
			},
			goRouter(item) {
				var pages = getCurrentPages();
				var page = (pages[pages.length - 1]).$page.fullPath;
				if (item.link == page) return
				uni.switchTab({
					url: item.link,
					fail(err) {
						uni.redirectTo({
							url: item.link
						})
					}
				})
			},
			footHeight(data) {
				this.footH = data
			},
			infoScroll: function() {
				let that = this;
				let len = that.productList.length;
				if (!len) {
					this.number = 0;
					this.hightArr = [];
					return;
				}
				this.number = that.productList[len - 1].children.length;
				//设置商品列表高度
				uni.getSystemInfo({
					success: function(res) {
						that.height = (res.windowHeight) * (750 / res.windowWidth) - 98;
					},
				});
				// Measure the ordered sections in one layout pass and update once.
				const query = uni.createSelectorQuery().in(this);
				query.selectAll('.category-scroll-origin, .listw').boundingClientRect();
				query.exec((res) => {
					const rects = res[0] || [];
					if (!this._isDestroyed) this.hightArr = rects.slice(1).map(rect => rect.top - rects[0].top);
				});
			},
			tap: function(index, id) {
				this.toView = id;
				this.navActive = index;
				this.$set(this, 'lock', true);
				uni.$emit('scroll');
			},
			getAllCategory: function(type) {
				let that = this;
				if (type || !uni.getStorageSync('CAT1_DATA')) {
					this.loadCategoryData().then(res => {
						if (this._isDestroyed) return;
						uni.setStorageSync('CAT1_DATA', res.data)
						that.productList = res.data;
						that.$nextTick(res => {
							that.infoScroll();
							that.positionCategory();
						})
					})
				} else {
					that.productList = uni.getStorageSync('CAT1_DATA')
					that.$nextTick(res => {
						that.infoScroll();
						that.positionCategory();
					})
				}
			},
			scroll: function(e) {
				this.notifyThemeScroll(e);
				let scrollTop = e.detail.scrollTop;
				let scrollArr = this.hightArr;
				uni.$emit('scroll');
				if (this.lock) {
					this.$set(this, 'lock', false);
					return;
				}
				if (!scrollArr.length || scrollTop < 0) return;
				if (this.categoryAppearance.show_recommend && scrollTop < scrollArr[0]) {
					this.navActive = -1;
					return;
				}
				let low = 0, high = scrollArr.length - 1;
				while (low < high) {
					const middle = Math.ceil((low + high) / 2);
					if (scrollTop >= scrollArr[middle]) low = middle;
					else high = middle - 1;
				}
				if (this.navActive !== low) this.navActive = low;
			},
			searchSubmitValue: function(e) {
				if (this.$util.trim(e.detail.value).length > 0)
					uni.navigateTo({
						url: '/pages/goods/goods_list/index?searchValue=' + e.detail.value
					})
				else
					return this.$util.Tips({
						title: this.$t(`搜索商品名称`)
					});
			},
		}
	}
</script>
<style scoped lang="scss">
	::v-deep uni-scroll-view {
		padding-bottom: 0 !important;
	}

	.sys-title {
		z-index: 10;
		position: relative;
		height: 40px;
		line-height: 40px;
		font-size: 30rpx;
		color: #333;
		background-color: #fff;
		// #ifdef APP-PLUS
		text-align: center;
		// #endif
		// #ifdef MP
		text-align: left;
		padding-left: 30rpx;
		// #endif
	}

	.sys-head {
		background-color: #fff;
	}

	.productSort {
		display: flex;
		flex-direction: column;
		//#ifdef MP
		height: calc(100vh - var(--window-top)) !important;
		//#endif
		//#ifndef MP
		height: 100vh //#endif
	}

	.productSort .header {
		width: 100%;
		height: 96rpx;
		background-color: #fff;
		border-bottom: 1rpx solid #f5f5f5;
	}

	.productSort .header .input {
		width: 700rpx;
		height: 60rpx;
		background-color: #f5f5f5;
		border-radius: 50rpx;
		box-sizing: border-box;
		padding: 0 25rpx;
	}

	.productSort .header .input .iconfont {
		font-size: 35rpx;
		color: #555;
	}

	.productSort .header .input .placeholder {
		color: #999;
	}

	.productSort .header .input input {
		font-size: 26rpx;
		height: 100%;
		width: 597rpx;
	}

	.productSort .scroll-box {
		flex: 1;
		overflow: hidden;
		display: flex;
	}

	// #ifndef MP
	uni-scroll-view {
		padding-bottom: 100rpx;
	}

	// #endif

	.productSort .aside {
		width: 180rpx;
		height: 100%;
		overflow: hidden;
		background-color: #f7f7f7;
	}

	.productSort .aside .item {
		height: 100rpx;
		width: 100%;
		font-size: 26rpx;
		color: #424242;
		text-align: center;
	}

	.productSort .aside .item.on {
		background-color: #fff;
		border-left: 4rpx solid var(--view-theme);
		width: 100%;
		color: var(--view-theme);
		font-weight: bold;
	}

	.productSort .conter {
		flex: 1;
		height: 100%;
		overflow: hidden;
		padding: 0 14rpx;
		background-color: #fff;
		position: relative;
		padding-bottom: 200rpx;
	}

	.productSort .conter .listw {
		padding-top: 20rpx;
	}

	.productSort .conter .listw .title {
		height: 90rpx;
	}

	.productSort .conter .listw .title .line {
		width: 100rpx;
		height: 2rpx;
		background-color: #f0f0f0;
	}

	.productSort .conter .listw .title .name {
		font-size: 28rpx;
		color: #333;
		margin: 0 30rpx;
		font-weight: bold;
	}

	.productSort .conter .list {
		flex-wrap: wrap;
	}

	.productSort .conter .list .item {
		width: 177rpx;
		margin-top: 26rpx;
	}

	.productSort .conter .list .item .picture {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
	}

	.productSort .conter .list .item .picture image {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.productSort .conter .list .item .picture {

		::v-deep,
		::v-deep image,
		::v-deep .easy-loadimage,
		::v-deep uni-image {

			width: 120rpx;
			height: 120rpx;
			border-radius: 50%;
		}
	}

	.productSort .conter .list .item .name {
		font-size: 24rpx;
		color: #333;
		height: 56rpx;
		line-height: 56rpx;
		width: 120rpx;
		text-align: center;
	}
</style>

<style lang="scss">
@import "./decoration.scss";
</style>
