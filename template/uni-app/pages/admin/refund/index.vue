<template>
	<view class="refund">
		<view class="money-section">
			<view class="acea-row row-middle item">
				<view class="">退款金额</view>
				<input v-model="refundMoney" class="input" type="text" />
				<text class="iconfont icon-ic_edit"></text>
			</view>
			<view class="acea-row row-middle item">
				<view class="">退款类型</view>
				<view class="acea-row row-right radio-group">
					<view class="acea-row row-middle radio-item" :class="{ on: !isSplit}" @click="refundTypeChange(0)">
						<text class="iconfont" :class="isSplit ?'icon-ic_unselect' :'icon-ic_Selected'"></text>整单退款
					</view>
					<view class="acea-row row-middle radio-item" :class="{ on: isSplit}" @click="refundTypeChange(1)"
						v-if="splitGoods.length > 1">
						<text class="iconfont" :class="isSplit ?'icon-ic_Selected' :'icon-ic_unselect'"></text>分单退款
					</view>
				</view>
			</view>
		</view>
		<splitOrder v-if="isSplit" :splitGoods="splitGoods" :select_all="false" @getList="getList"></splitOrder>
		<view class="footer acea-row row-middle">
			<view class="all acea-row row-middle" v-if="isSplit" @click="allChange">
				<text class="iconfont" :class="isAll ?'icon-a-ic_CompleteSelect' :'icon-ic_unselect'"></text>
				全选
			</view>
			<view class="btn-box">
				<view class="btn" :style="{ width: isSplit?'auto':'100%'}" @click="openRefund">
					确认
					<text v-if="isSplit">({{ numTotal }})</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		getAdminOrderDetail,
		orderSplitInfo,
		openRefund,
	} from '@/api/admin.js';
	import splitOrder from '../components/splitOrder/index.vue';
	export default {
		components: {
			splitOrder,
		},
		data() {
			return {
				refundMoney: 0,
				isSplit: 0,
				isAll: false,
				splitGoods: [],
				goodsChecked: [],
				cart_ids: [],
			}
		},
		computed: {
			total() {
				return this.goodsChecked.reduce((total, item) => {
					return this.$util.$h.Add(total, this.$util.$h.Mul(item.truePrice, item.surplus_num));
				}, 0);
			},
			numTotal() {
				return this.goodsChecked.reduce((total, {
					surplus_num,
				}) => {
					return this.$util.$h.Add(total, surplus_num);
				}, 0);
			},
		},
		watch: {
			total(newValue, oldValue) {
				this.refundMoney = newValue
			},
		},
		onLoad(option) {
			this.order_id = option.id;
			this.listId = option.listId;
			this.getIndex();
			// this.splitList();
		},
		methods: {
			allChange() {
				this.isAll = !this.isAll;
				this.cart_ids = [];
				this.goodsChecked = [];
				for (let i = 0; i < this.splitGoods.length; i++) {
					this.splitGoods[i].checked = this.isAll;
					if (this.splitGoods[i].checked) {
						this.goodsChecked.push(this.splitGoods[i]);
						this.cart_ids.push(this.splitGoods[i].id);
					}
				}
			},
			refundTypeChange(value) {
				this.isSplit = value;
				if (value) {
					this.goodsChecked = []
				} else {
					this.goodsChecked = this.splitGoods
				}
			},
			splitList() {
				orderSplitInfo(this.listId).then(res => {
					let list = res.data;
					list.forEach((item) => {
						item.checked = false
						item.numShow = item.surplus_num
					})
					// this.splitGoods = list;
				}).catch(err => {
					return this.$util.Tips({
						title: err
					});
				})
			},
			getIndex() {
				let that = this;
				let obj = '';
				getAdminOrderDetail(that.order_id).then(res => {
					const {
						cartInfo
					} = res.data;
					let list = cartInfo.map(item => {
						return {
							id: item.id,
							checked: false,
							numShow: item.cart_num - item.refund_num,
							surplus_num: item.surplus_num,
							cart_info: item,
							truePrice: item.truePrice,
						};
					});
					this.splitGoods = list;
					this.goodsChecked = list;
				}).catch(err => {
					that.$util.Tips({
						title: err.msg
					});
				})
			},
			getList(val) {
				let that = this;
				let goodsChecked = [];
				let cart_ids = [];
				for (let i = 0; i < val.length; i++) {
					if (val[i].checked) {
						goodsChecked.push(val[i]);
						cart_ids.push(val[i].id);
					}
				}
				this.goodsChecked = goodsChecked;
				this.cart_ids = cart_ids;
				this.isAll = this.goodsChecked.length == this.splitGoods.length;
			},
			openRefund() {
				let cart_ids = [];
				let data = {
					refund_price: this.refundMoney,
					type: 1,
					is_split_order: this.isSplit,
				};
				cart_ids = this.goodsChecked.map(({
					id,
					surplus_num
				}) => {
					return {
						cart_id: id,
						cart_num: surplus_num
					}
				});
				data.cart_ids = cart_ids;
				openRefund(this.listId, data).then(res => {
					if (res.data.order_id) {
						// const pages = getCurrentPages();
						// pages.splice(pages.length - 2, 2)
						this.$util.Tips({
							title: res.msg
						}, {
							tab: 4,
							url: '/pages/admin/orderDetail/index?id=' + res.data.order_id + '&types=',
						});
					} else {
						this.$util.Tips({
							title: res.msg
						}, {
							tab: 3,
							url: 1,
						});
					}
				}).catch(err => {
					this.$util.Tips({
						title: err
					});
				})
			},
		},
	}
</script>

<style lang="scss" scoped>
	.refund {
		padding: 22rpx 20rpx;
	}

	.money-section {
		padding: 12rpx 0;
		border-radius: 24rpx;
		background: #FFFFFF;

		.item {
			height: 80rpx;
			padding: 0 24rpx;
			font-size: 28rpx;
			color: #333333;
		}

		.input {
			flex: 1;
			height: 80rpx;
			text-align: right;
			font-family: Regular;
			font-size: 36rpx;
			color: #FF7E00;
		}

		.icon-ic_edit {
			margin-left: 8rpx;
			font-size: 32rpx;
			color: #999999;
		}

		.radio-group {
			flex: 1;
		}

		.radio-item {
			font-size: 28rpx;
			color: #999999;

			+.radio-item {
				margin-left: 48rpx;
			}

			.iconfont {
				margin-right: 12rpx;
				font-size: 32rpx;
			}

			&.on {
				color: #333333;

				.iconfont {
					color: #2A7EFB;
				}
			}
		}
	}

	.footer {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		padding: 16rpx 20rpx 16rpx 32rpx;
		padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
		background: #FFFFFF;

		.btn {
			display: inline-block;
			height: 64rpx;
			padding: 0 40rpx;
			border-radius: 32rpx;
			background: #2A7EFB;
			font-weight: 500;
			font-size: 26rpx;
			line-height: 64rpx;
			color: #FFFFFF;
		}

		.all {
			font-size: 26rpx;
			color: #333333;

			.iconfont {
				margin-right: 12rpx;
				font-size: 40rpx;
				color: #CCCCCC;

				&.icon-a-ic_CompleteSelect {
					color: #2A7EFB;
				}
			}
		}

		.btn-box {
			flex: 1;
			text-align: right;

			.btn {
				text-align: center;
			}
		}
	}
</style>
