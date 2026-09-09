<template>
	<view :style="colorStyle">
		<goodsCate1 v-if="category == 1" ref="classOne" :isNew="isNew" :initialCategoryRequest="initialCategoryRequest" :categoryTarget="selectedCategory"></goodsCate1>
		<goodsCate2 v-if="category == 2" ref="classTwo" :isNew="isNew" :initialCategoryRequest="initialCategoryRequest" :categoryTarget="selectedCategory" @jumpIndex="jumpIndex"></goodsCate2>
		<goodsCate3 v-if="category == 3" ref="classThree" :isNew="isNew" :initialCategoryRequest="initialCategoryRequest" :categoryTarget="selectedCategory" @jumpIndex="jumpIndex"></goodsCate3>
		<pageFooter v-if="category == 1" @newDataStatus="newDataStatus" v-show="showBar"></pageFooter>
	</view>
</template>

<script>
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
	export default {
		computed: mapGetters(["isLogin", "uid"]),
		components: {
			goodsCate1,
			goodsCate2,
			goodsCate3,
			pageFooter,
		},
		mixins: [colors, categoryHistoryGesture],
		data() {
			return {
				category: "",
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
		onLoad(options) { this.readCategoryTarget(options); },
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
					let status = res.data.status;
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
