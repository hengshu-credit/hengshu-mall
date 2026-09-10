<template>
	<view :style="colorStyle">
        <view class="category-title-shell" :style="{height:titleHeight+'px',background:categoryDecoration.title_background_color,color:categoryDecoration.title_text_color}"><page-title v-if="titleVisible" :dataConfig="categoryDecoration.title_component" /></view>
		<goodsCate1 v-if="category == 1" ref="classOne" :decoration="categoryDecoration" :navigationHeight="navigationHeight" :titleHeight="titleHeight" :isNew="isNew" :initialCategoryRequest="initialCategoryRequest" :categoryTarget="selectedCategory"></goodsCate1>
		<goodsCate2 v-if="category == 2" ref="classTwo" :decoration="categoryDecoration" :navigationHeight="navigationHeight" :titleHeight="titleHeight" :isNew="isNew" :initialCategoryRequest="initialCategoryRequest" :categoryTarget="selectedCategory" @jumpIndex="jumpIndex"></goodsCate2>
		<goodsCate3 v-if="category == 3" ref="classThree" :decoration="categoryDecoration" :navigationHeight="navigationHeight" :titleHeight="titleHeight" :isNew="isNew" :initialCategoryRequest="initialCategoryRequest" :categoryTarget="selectedCategory" @jumpIndex="jumpIndex"></goodsCate3>
		<pageFooter v-if="category" :mainNavigationOnly="category != 1" :activePath="categoryNavigationPath" @newDataStatus="newDataStatus" @heightChange="navigationHeight = $event"></pageFooter>
	</view>
</template>

<script>
	import { normalizeCategoryPage } from '../../../shared/categoryPageConfig';
	import colors from "@/mixins/color";
	import categoryHistoryGesture from '@/mixins/categoryHistoryGesture.js';
	import { categoryTarget, takeCategoryTarget } from '@/utils/categoryNavigation.js';
	import { getCategoryList } from "@/api/store.js";
	import goodsCate1 from "./goods_cate1";
	import goodsCate2 from "./goods_cate2";
	import goodsCate3 from "./goods_cate3";
	import {
		getThemeInfo
	} from "@/api/api.js";
	import {
		mapGetters
	} from "vuex";
	import {
		getCategoryVersion
	} from "@/api/public.js";
	import pageFooter from "@/components/pageFooter/index.vue";
	import PageTitle from '@/subpackage/diyComponents/pageTitle.vue';
    import { verticalStyleSpace } from '../../../shared/componentStyle';
	export default {
		computed: {
            ...mapGetters(["isLogin", "uid"]),
            titleVisible() { return this.categoryDecoration.show_title && !this.categoryDecoration.title_component.isHide; },
            titleHeight() { return this.statusBarHeight + (this.titleVisible ? 44 + verticalStyleSpace(this.categoryDecoration.title_component) * uni.getWindowInfo().windowWidth / 375 : 0); },
            categoryNavigationPath() {
                const query = Object.keys(this.selectedCategory).filter(key => this.selectedCategory[key]).map(key => key + '=' + this.selectedCategory[key]).join('&');
                return '/pages/goods_cate/goods_cate' + (query ? '?' + query : '');
            },
        },
		components: {
			PageTitle,
			goodsCate1,
			goodsCate2,
			goodsCate3,
			pageFooter,
		},
		mixins: [colors, categoryHistoryGesture],
		data() {
			return {
				category: "",
                navigationHeight: 0, statusBarHeight: 0,
				categoryDecoration: normalizeCategoryPage(1),
				selectedCategory: { cid: 0, sid: 0 },
				initialCategoryRequest: null,
				is_diy: uni.getStorageSync("is_diy"),
				status: 0,
				version: "",
				isNew: false,
				isFooter: false,
				showBar: false,
			};
		},
		onLoad(options) {
            // #ifndef H5
            this.statusBarHeight = uni.getWindowInfo().statusBarHeight || 0;
            // #endif
            this.readCategoryTarget(options);
        },
		onReady() {},
		onShow() {
			const pending = takeCategoryTarget();
			if (pending) this.readCategoryTarget(pending);
			// #ifdef H5
			else if (this.$route) this.readCategoryTarget(this.$route.query);
			// #endif
			const refreshId = this._categoryRefreshId = (this._categoryRefreshId || 0) + 1;
			const previousCategory = this.category;
			// Category contents do not depend on the version or layout response.
			this.initialCategoryRequest = null;
			// #ifdef H5
			// Native mini-program props must remain serializable; share promises only on H5.
			this.initialCategoryRequest = previousCategory ? null : getCategoryList().catch(() => null);
			// #endif
			this.getCategoryVersion(refreshId, previousCategory);
			this.classStyle(refreshId);
		},
		onUnload() {
			this._categoryRefreshId = (this._categoryRefreshId || 0) + 1;
			this.initialCategoryRequest = null;
		},
		onPageScroll(e) {
			uni.$emit("scroll");
		},
		methods: {
			readCategoryTarget(options) {
				const target = categoryTarget(options);
				const key = JSON.stringify(target);
				if (key !== this._categoryTargetKey) {
					this._categoryTargetKey = key;
					this.selectedCategory = target;
				}
			},
			newDataStatus(val, num) {
				this.isFooter = val ? true : false;
				this.showBar = val ? true : false;
				this.pdHeight = num;
			},
			getCategoryVersion(refreshId, previousCategory) {
				uni.$emit("uploadFooter");
				return getCategoryVersion().then((res) => {
					if (this._isDestroyed || refreshId !== this._categoryRefreshId) return;
					if (
						!uni.getStorageSync("CAT_VERSION") ||
						res.data.version != uni.getStorageSync("CAT_VERSION")
					) {
						uni.setStorageSync("CAT_VERSION", res.data.version);
						if (previousCategory && previousCategory === this.category) uni.$emit("uploadCatData");
					}
				});
			},
			jumpIndex() {
				uni.reLaunch({
					url: "/pages/index/index",
				});
			},
			classStyle(refreshId) {
				let previewThemeId = uni.getStorageSync("previewThemeId");
				let data = {};
				if (previewThemeId) data.theme_id = previewThemeId;
				return getThemeInfo("category", data).then((res) => {
					if (this._isDestroyed || refreshId !== this._categoryRefreshId) return;
					this.categoryDecoration = normalizeCategoryPage(res.data);
                    const config = this.categoryDecoration;
                    // The category title is rendered by the page. Native title setters
                    // can restore titleNView on a cached tab and duplicate that title.
                    // #ifndef APP-PLUS
                    if (uni.setNavigationBarTitle) uni.setNavigationBarTitle({ title: config.page_title || this.$t('商品分类') });
                    if (uni.setNavigationBarColor) uni.setNavigationBarColor({ backgroundColor: config.title_background_color, frontColor: config.title_text_color });
                    // #endif
                    // #ifdef APP-PLUS
                    plus.navigator.setStatusBarStyle(config.title_text_color === '#000000' ? 'dark' : 'light');
                    // #endif
                    let status = config.status;
					this.category = status;
					uni.setStorageSync("is_diy", 1);
					this.$nextTick((e) => {
						if (this._isDestroyed || refreshId !== this._categoryRefreshId) return;
						if (status == 2 || status == 3) {
							uni.hideTabBar();
						} else {
							this.$refs.classOne.is_diy = 1;
							if (!this.is_diy) {
								uni.hideTabBar();
							} else {
								this.$refs.classOne.getNav();
							}
						}
					});
				});
			},
		},
		onReachBottom: function() {
			if (this.category == 2) {
				this.$refs.classTwo.productslist();
			}
			if (this.category == 3) {
				this.$refs.classThree.productslist();
			}
		},
	};
</script>
<style scoped lang="scss">
.category-title-shell {position:fixed;top:0;left:0;right:0;z-index:110;display:flex;flex-direction:column;justify-content:flex-end;}
.category-page-title {height:44px;line-height:44px;text-align:center;font-size:15px;padding:0 80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
	::v-deep.mask {
		z-index: 99;
	}

	::-webkit-scrollbar {
		width: 0;
		height: 0;
		color: transparent;
		display: none;
	}
</style>
