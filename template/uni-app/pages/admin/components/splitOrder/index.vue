<template>
	<!-- 拆单订单 -->
	<view class='splitOrder' v-if="splitGoods.length">
		<view class="all" v-if="select_all">
			<checkbox-group @change="checkboxAllChange">
				<checkbox value="all" :checked="isAllSelect" />
				<text class='checkAll'>全选</text>
			</checkbox-group>
		</view>
		<checkbox-group @change="checkboxChange">
			<block v-for="(item,index) in splitGoods" :key="index">
				<view class='items acea-row row-between-wrapper'>
					<!-- #ifndef MP -->
					<checkbox :value="(item.id).toString()" :checked="item.checked" 
					color="#ffffff" backgroundColor="#ffffff"
					activeBackgroundColor="#2A7EFB" activeBorderColor="#2A7EFB"/>
					<!-- #endif -->
					<!-- #ifdef MP -->
					<checkbox :value="item.id" :checked="item.checked" />
					<!-- #endif -->
					<view class='picTxt acea-row row-between-wrapper'>
						<view class='pictrue'>
							<image :src='item.cart_info.productInfo.image'></image>
						</view>
						<view class='text'>
							<view class="acea-row row-between-wrapper">
								<view class='name line1'>{{item.cart_info.productInfo.store_name}}</view>
								<!-- <view>×{{item.cart_num}}</view> -->
							</view>
							<view class='infor line1'>
								属性：{{item.cart_info.productInfo.attrInfo.suk || '默认'}}</view>
							<view class="acea-row row-middle money-section">
								实付款：<view class='money'>¥{{item.cart_info.sum_true_price}}</view>
							</view>
						</view>
						<view class='carnum acea-row row-center-wrapper'>
							<view class="reduce iconfont icon-ic_Reduce" :class="item.surplus_num == 1 ? 'on' : ''" @click.stop='subCart(item)'></view>
							<view class='num'>{{item.surplus_num}}</view>
							<view class="plus iconfont icon-ic_increase" :class="item.surplus_num == item.numShow ? 'on' : ''" @click.stop='addCart(item)'></view>
						</view>
					</view>
				</view>
			</block>
		</checkbox-group>
	</view>
</template>

<script>
	export default {
		props: {
			splitGoods: {
				type: Array,
				default: () => []
			},
			select_all: {
				type: Boolean,
				default: true
			}
		},
		data() {
			return {
				isAllSelect: false
			};
		},
		mounted() {
		},
		methods: {
			subCart(item) {
				item.surplus_num = Number(item.surplus_num) - 1;
				if (item.surplus_num <= 1) {
					item.surplus_num = 1
				}
				this.$emit('getList', this.splitGoods);
			},
			addCart(item) {
				item.surplus_num = Number(item.surplus_num) + 1;
				if (item.surplus_num >= item.numShow) {
					item.surplus_num = item.numShow
				}
				this.$emit('getList', this.splitGoods);
			},
			inArray: function(search, array) {
				for (let i in array) {
					if (array[i] == search) {
						return true;
					}
				}
				return false;
			},
			checkboxChange(event) {
				let idList = event.detail.value;
				this.splitGoods.forEach((item) => {
					if (this.inArray(item.id, idList)) {
						item.checked = true;
					} else {
						item.checked = false;
					}
				})
				this.$emit('getList', this.splitGoods);
				if (idList.length == this.splitGoods.length) {
					this.isAllSelect = true;
				} else {
					this.isAllSelect = false;
				}
			},
			forGoods(val) {
				let that = this;
				if (!that.splitGoods.length) return
				that.splitGoods.forEach((item) => {
					if (val) {
						item.checked = true;
					} else {
						item.checked = false;
					}
				})
				that.$emit('getList', that.splitGoods);
			},
			checkboxAllChange(event) {
				let value = event.detail.value;
				if (value.length) {
					this.forGoods(1)
				} else {
					this.forGoods(0)
				}
			}
		}
	}
</script>

<style lang="scss">
	::v-deep checkbox .wx-checkbox-input.wx-checkbox-input-checked {
		border: 1px solid $primary-admin !important;
		background-color: $primary-admin !important;
		color: #fff !important;
	}
	.splitOrder {
		width: 710rpx;
		background-color: #fff;
		border-radius: 16rpx;
		margin: 24rpx auto 0 auto;
		padding: 32rpx 26rpx;
	}

	.splitOrder .all {
		padding: 20rpx 30rpx;
	}

	.splitOrder .all .checkAll {
		margin-left: 20rpx;
	}

	.splitOrder .items~.items {
		margin-top: 48rpx;
	}

	.splitOrder .items .picTxt {
		width: 604rpx;
		position: relative;
	}

	.splitOrder .items .picTxt .name {
		width: 444rpx;
	}

	.splitOrder .items .picTxt .pictrue {
		width: 136rpx;
		height: 136rpx;
	}

	.splitOrder .items .picTxt .pictrue image {
		width: 100%;
		height: 100%;
		border-radius: 16rpx;
	}

	.splitOrder .items .picTxt .text {
		width: 450rpx;
		font-size: 28rpx;
		color: #333;
		font-weight: 400;
	}

	.splitOrder .items .picTxt .text .reColor {
		color: #999;
	}

	.splitOrder .items .picTxt .text .reElection {
		margin-top: 20rpx;
	}

	.splitOrder .items .picTxt .text .reElection .title {
		font-size: 24rpx;
	}

	.splitOrder .items .picTxt .text .reElection .reBnt {
		width: 120rpx;
		height: 46rpx;
		border-radius: 23rpx;
		font-size: 26rpx;
	}

	.splitOrder .items .picTxt .text .infor {
		font-size: 22rpx;
		color: #999;
		margin-top: 12rpx;
		width: 284rpx;
	}

	.splitOrder .items .picTxt .text .money-section {
		margin-top: 18rpx;
		font-size: 22rpx;
		color: #999999;
	}

	.splitOrder .items .picTxt .text .money {
		font-size: 36rpx;
		color: #333;
		font-family: 'Regular';
		color: #FF7D00;
	}

	.splitOrder .items .picTxt .carnum {
		height: 36rpx;
		position: absolute;
		bottom: 0;
		right: 0;
	}

	.splitOrder .items .picTxt .carnum view {
		width: 66rpx;
		text-align: center;
		height: 100%;
		line-height: 36rpx;
		font-size: 24rpx;
		color: #333;
	}

	.splitOrder .items .picTxt .carnum .reduce {
		border-right: 0;
		border-radius: 3rpx 0 0 3rpx;
	}

	.splitOrder .items .picTxt .carnum .reduce.on {
		border-color: #e3e3e3;
		color: #dedede;
	}

	.splitOrder .items .picTxt .carnum .plus {
		border-left: 0;
		border-radius: 0 3rpx 3rpx 0;
		font-size: 26rpx;
	}

	.splitOrder .items .picTxt .carnum .plus.on {
		border-color: #e3e3e3;
		color: #dedede;
	}

	.splitOrder .items .picTxt .carnum .num {
		color: #282828;
		background: #F5F5F5;
		width: 72rpx;
	}
</style>