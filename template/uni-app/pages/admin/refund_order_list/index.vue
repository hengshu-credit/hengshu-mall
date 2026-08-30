<template>
	<view class="pos-order-list" ref="container">
		<!-- #ifdef MP || APP-PLUS -->
		<NavBar titleText="售后订单" bagColor="#F5F5F5" :iconColor="iconColor" :textColor="iconColor" :isScrolling="isScrolling" showBack></NavBar>
		<!-- #endif -->
		<view class="searchCon acea-row">
			<view class="search acea-row row-middle">
				<text class="iconfont icon-ic_search"></text>
				<input class="inputs" placeholder='请输入订单号/售后单号/用户ID/手机号' placeholder-class='placeholder' confirm-type='search' name="search" v-model="where.keywords"
					@confirm="searchSubmit"></input>
			</view>
			<!-- <view class="btn" @click="filterShow = true">
				<text class="iconfont icon-a-icon_filter1x"></text>
			</view> -->
		</view>
		<view class="nav acea-row row-around row-middle" id="nav" :style="{
			top: getHeight.barTop + getHeight.barHeight + 'px'}">
			<view class="item" :class="state == 1 ? 'on' : ''" @click="changeStatus(1)">
				待审核
				<image src="../static/adorn.png" v-if="state == 1"></image>
			</view>
			<view class="item" :class="state == 2 ? 'on' : ''" @click="changeStatus(2)">
				待退货
				<image src="../static/adorn.png" v-if="state == 2"></image>
			</view>
			<view class="item" :class="state == 3 ? 'on' : ''" @click="changeStatus(3)">
				待收货
				<image src="../static/adorn.png" v-if="state == 3"></image>
			</view>
			<view class="item" :class="state == 4 ? 'on' : ''" @click="changeStatus(4)">
				已完成
				<image src="../static/adorn.png" v-if="state == 4"></image>
			</view>
		</view>
		<view class="list" v-if="list.length">
			<view class="item" v-for="(item, index) in list" :key="index">
				<view class="order-num acea-row row-between-wrapper" @click="toDetail(item)">
					<view>
						<view>售后单号：{{ item.order_id }}</view>
					</view>
					<view class="state" v-if="[0, 1, 2].includes(item.refund_type)">待审核</view>
					<view class="state" v-if="[4, 5].includes(item.refund_type)">
						待退货
					</view>
					<view class="state" v-if="[3, 6].includes(item.refund_type)">已完成</view>
				</view>
				<view class="pos-order-goods">
					<view class="goods acea-row" @click="toDetail(item)">
						<scroll-view class="picTxt scroll-view" scroll-x="true" v-if="item._info.length > 1">
							<view class="pictrue" v-for="(val, key) in item._info" :key="key">
								<image :src="val.cart_info.productInfo.attrInfo ? val.cart_info.productInfo.attrInfo.image : val.cart_info.productInfo.image" />
							</view>
						</scroll-view>
						<view class="picTxt" v-else>
							<view class="acea-row" v-for="(val, key) in item._info" :key="key">
								<view class="pictrue">
									<image :src="val.cart_info.productInfo.attrInfo ? val.cart_info.productInfo.attrInfo.image : val.cart_info.productInfo.image" />
								</view>
								<view class="text">
									<view class="info line2">
										<!-- <text v-if="val.cart_info.is_gift == 1" class="label">[赠品]</text> -->
										{{ val.cart_info.productInfo.store_name }}
									</view>
									<view class="attr" v-if="val.cart_info.productInfo.attrInfo">
										{{ val.cart_info.productInfo.attrInfo.suk }}
									</view>
								</view>
							</view>
						</view>
						<view class="money">
							<!-- <view class="x-money">￥{{ item.pay_price }}</view> -->
							<BaseMoney :money="item.pay_price" symbolSize="20" integerSize="32" decimalSize="20"></BaseMoney>
							<view class="num">共{{ item.total_num }}件</view>
							<!-- 	<view class="y-money">
								￥{{ val.cart_info.productInfo.ot_price }}
							</view> -->
							<!-- <view class="info" v-if="val.cart_info.refund_num && item._status._type !=-2">{{val.cart_info.refund_num}}件退款中</view> -->
						</view>
					</view>
				</view>
				<!-- <view class="public-total">
					共{{ item.total_num }}件商品，实付款
					<span class="money">￥{{ item.pay_price }}</span> ( 邮费 ¥{{
	            item.pay_postage
	          }}
					)
				</view> -->
				<view class="operation acea-row row-between-wrapper">
					<view v-if="item.refund_type == 1" class="more acea-row row-middle">
						<text class="iconfont icon-ic_returnmoney"></text>仅退款
					</view>
					<view v-else-if="item.refund_type == 2" class="more acea-row row-middle">
						<text class="iconfont icon-ic_returnofgoods"></text>退货退款
					</view>
					<view v-else></view>
					<view class="acea-row row-middle">
						<view class="btn" @click="modify(item, 1)">订单备注</view>
						<view class="btn on" @click="modify(item,'2',1)" v-if="item.refund_type == 1">
							退款审核
						</view>
						<view class="btn on" @click="modify(item,'2',0)" v-if="item.refund_type == 2">
							退款审核
						</view>
						<view class="btn" v-if="item.refund_type == 5" @click="goLogistics(item)">查看物流</view>
						<view class="btn on" v-if="item.refund_type == 5" @click="modify(item, 2, 1)">确认收货</view>
					</view>
				</view>
			</view>
		</view>
		<emptyPage v-else title="暂无订单～" src="/statics/images/noOrder.gif"></emptyPage>
		<Loading :loaded="loaded" :loading="loading"></Loading>
		<PriceChange :change="change" :orderInfo="orderInfo" :isRefund="isRefund" v-on:statusChange="statusChange($event)" v-on:closechange="changeclose($event)" v-on:savePrice="savePrice"
			:status="status"></PriceChange>
		<view class="mask" v-if="filterShow" @click="filterShow = false"></view>
		<view class="filter-popup" :class="{ on: filterShow }">
			<view class="content">
				<view class="item">
					<view class="title">按退货类型</view>
					<view class="acea-row list">
						<view class="cell" v-for="(item, index) in dateList" :key="index" :class="{ on: item.val == apply_type }" @click="dateChange(item.val)">{{ item.label }}</view>
					</view>
				</view>
			</view>
		</view>
		<home></home>
	</view>
</template>

<script>
	import {
		getAdminOrderList,
		setAdminOrderPrice,
		setAdminRefundRemark,
		setOfflinePay,
		setOrderRefund,
		agreeExpress,
		adminRefundList,
	} from "@/api/admin";
	import Loading from '@/components/Loading/index'
	import PriceChange from '../components/PriceChange/index.vue'
	import emptyPage from '@/components/emptyPage.vue'
	import NavBar from '@/components/NavBar.vue'
	import {
		isMoney
	} from '@/utils/validate.js';
	import {
		HTTP_REQUEST_URL
	} from '@/config/app';
import home from '@/components/home';
	export default {
		name: "AdminOrderList",
		components: {
			Loading,
			PriceChange,
			emptyPage,
			NavBar,
			home
		},
		data() {
			return {
				getHeight: this.$util.getWXStatusHeight(),
				iconColor: '#333333',
				isScrolling: false,
				top: 0,
				navHeight: 0,
				isFixed: false,
				filterShow: false,
				openErp: false,
				current: "",
				change: false,
				types: 0,
				where: {
					keywords: '',
					refundTypes: 1,
					page: 1,
					limit: 10,
				},
					apply_type: '',
				list: [],
				loaded: false,
				loading: false,
				orderInfo: {},
				status: "",
				state: 1,
				isRefund: 0, //1是仅退款;0是退货退款
				imgHost: HTTP_REQUEST_URL,
				dateSelected: '',
				dateList: [{
						label: '全部',
						val: '',
					},
					{
						label: '退货退款',
						val: '2',
					},
					{
						label: '仅退款',
						val: '1',
					},
				],
				payList: [{
						label: '全部',
						val: '',
					},
					{
						label: '微信支付',
						val: '1'
					},
					{
						label: '支付宝支付',
						val: '4'
					},
					{
						label: '余额抵扣',
						val: '2'
					},
					{
						label: '线下支付',
						val: '3'
					},
				],
			};
		},
		onLoad(option) {
			let type = option.types;
			// this.getErpConfig();
		},
		onShow() {
			this.init();
		},
		mounted() {
			const query = uni.createSelectorQuery().in(this);
			query.select("#nav").boundingClientRect((data) => {
				this.top = data.top;
				this.navHeight = data.height;
			}).exec();
		},
		onPageScroll(option) {
			// if (this.top >= option.scrollTop) {
			// 	this.isFixed = false;
			// } else {
			// 	this.isFixed = true;
			// }
		},
		methods: {
			searchSubmit() {

			},
			statusChange(e) {
				this.status = e;
			},
			goDelivery(item) {
				if (this.openErp) return
				uni.navigateTo({
					url: '/pages/admin/delivery/index?id=' + item.order_id + '&listId=' + item.id + '&totalNum=' + item.total_num + '&orderStatus=' + item._status + '&comeType=1&productType=' +
						item.product_type
				})
			},
			getErpConfig() {
				erpConfig().then(res => {
					this.openErp = res.data.open_erp;
				}).catch(err => {
					this.$util.Tips({
						title: err
					})
				})
			},
			// 获取数据
			getIndex: function() {
				let that = this;
				if (that.loading || that.loaded) return;
				that.loading = true;
				let obj = adminRefundList(that.where);
				obj.then(
					res => {
						that.loading = false;
						that.loaded = res.data.length < that.where.limit;
						that.list.push.apply(that.list, res.data);
						that.where.page = that.where.page + 1;
					},
					err => {
						that.$util.Tips({
							title: err
						})
					}
				);
			},
			// 初始化
			init: function() {
				this.list = [];
				this.where.page = 1;
				this.loaded = false;
				this.loading = false;
				this.getIndex();
				this.current = "";
			},
			searchSubmit() {
				this.init();
			},
			// 导航切换
			changeStatus(val) {
				if (this.state != val) {
					this.state = val;
					this.where.refundTypes = val;
					this.init();
				}
			},
			// 商品操作
			modify: function(item, status, type) {
				if (this.openErp && status != 1) return
				this.change = true;
				this.status = status.toString();
				this.orderInfo = item;
				if (status == 2) {
					this.isRefund = type
				}
			},
			changeclose: function(msg) {
				this.change = msg;
				this.orderInfo = {};
			},
			objOrderRefund(data) {
				let that = this;
				setOrderRefund(data).then(
					res => {
						that.change = false;
						that.$util.Tips({
							title: res.msg
						});
						that.init();
					},
					err => {
						that.change = false;
						that.$util.Tips({
							title: err
						});
					}
				);
			},
			async savePrice(opt) {
				let that = this,
					data = {},
					price = opt.price,
					refund_price = opt.refund_price,
					refund_status = that.orderInfo.refund_status,
					remark = opt.remark;
				data.order_id = that.orderInfo.order_id;
				if (that.status == 0) {
					if (!isMoney(price)) {
						return that.$util.Tips({
							title: '请输入正确的金额'
						});
					}
					data.price = price;
					setAdminOrderPrice(data).then(
						res => {
							that.change = false;
							that.$util.Tips({
								title: '改价成功',
								icon: 'success'
							})
							that.init();
						},
						err => {
							that.change = false;
							that.$util.Tips({
								title: '改价失败',
								icon: 'none'
							})
						}
					);
				} else if (that.status == 2) {
					if (this.isRefund) {
						// setOrderRefund(data).then(
						// 	res => {
						// 		that.change = false;
						// 		that.$util.Tips({title: res.msg});
						// 		that.init();
						// 	},
						// 	err => {
						// 		that.change = false;
						// 		that.$util.Tips({title: err});
						// 	}
						// );
						if (!isMoney(refund_price)) {
							return that.$util.Tips({
								title: '请输入正确的金额'
							});
						}
						data.price = refund_price;
						data.type = opt.type;
						this.objOrderRefund(data);
					} else {
						if (opt.type == 1) {
							agreeExpress({id: this.orderInfo.id}).then(res => {
								that.change = false;
								that.$util.Tips({
									title: res.msg
								});
								that.init();
							}).catch(err => {
								that.change = false;
								that.$util.Tips({
									title: err
								});
							})
						}
						// else{
						// 	data.type = opt.type;
						// 	data.refuse_reason = opt.refuse_reason;
						// 	this.objOrderRefund(data);
						// }
						if (opt.type == 2) {
							data.type = opt.type;
							data.refuse_reason = opt.refuse_reason;
							this.objOrderRefund(data);
						}
					}
				} else if (that.status == 8) {
					data.type = opt.type;
					data.refuse_reason = opt.refuse_reason;
					this.objOrderRefund(data);
				} else {
					if (!remark) {
						return this.$util.Tips({
							title: '请输入备注'
						})
					}
					data.remark = remark;
					setAdminRefundRemark(data).then(
						res => {
							that.change = false;
							this.$util.Tips({
								title: res.msg,
								icon: 'success'
							})
							that.init();
						},
						err => {
							that.change = false;
							that.$util.Tips({
								title: err
							});
						}
					);
				}
			},
			toDetail(item) {
				uni.navigateTo({
					url: `/pages/admin/refund_order_detail/index?id=${item.order_id}`
				})
			},
			offlinePay: function(item) {
				if (this.openErp) return
				setOfflinePay({
					order_id: item.order_id
				}).then(
					res => {
						this.$util.Tips({
							title: res.msg,
							icon: "success"
						});
						this.init();
					},
					error => {
						this.$util.Tips(error);
					}
				);
			},
			dateChange(value) {
				this.filterShow = false;
				this.apply_type = value;
				this.where.refundTypes = value;
				this.init();
			},
			payChange(val) {
				this.filterShow = false;
				this.where.pay_type = val;
				this.init();
			},
			goLogistics(orderInfo) {
				uni.navigateTo({
					url: '/pages/admin/logistics/index?type=refund&orderId=' + orderInfo.order_id
				})
			},
		},
		onReachBottom() {
			this.getIndex()
		}
	}
</script>

<style lang="scss" scoped>
	.pos-order-list {
		padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
		padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/
	}

	.searchCon {
		padding: 10rpx 20rpx;

		.search {
			flex: 1;
			height: 72rpx;
			padding: 0 32rpx;
			border-radius: 36rpx;
			background: #FFFFFF;

			.iconfont {
				margin-right: 16rpx;
				font-size: 32rpx;
				color: #999999;
			}

			.inputs {
				flex: 1;
				font-size: 28rpx;
				color: #333333;
			}

			.placeholder {
				font-size: 26rpx;
				color: #ccc;
			}
		}

		.btn {
			width: 72rpx;
			height: 72rpx;
			border-radius: 50%;
			margin-left: 20rpx;
			background: #FFFFFF;
			text-align: center;

			.iconfont {
				font-size: 32rpx;
				line-height: 72rpx;
				color: #666666;
			}
		}
	}

	.pos-order-list .nav {
		position: sticky;
		top: 0;
		right: 0;
		left: 0;
		z-index: 99;
		background: #F5F5F5;
		font-size: 26rpx;
		line-height: 42rpx;
		color: #333333;

		.item {
			position: relative;
			padding: 28rpx 0;

			image {
				width: 14rpx;
				height: 14rpx;
				display: block;
				position: absolute;
				bottom: 20rpx;
				right: -4rpx;
			}
		}
	}

	.pos-order-list .nav .item.on {
		font-weight: 500;
		font-size: 30rpx;
		color: #2A7EFB;
	}

	.pos-order-list .list {
		padding: 0 20rpx;
	}

	.pos-order-list .nothing {
		margin-top: 120upx;
		text-align: center;
		color: #cfcfcf;
	}

	.pos-order-list .list .item {
		padding: 32rpx 24rpx;
		border-radius: 24rpx;
		background-color: #fff;
	}

	.pos-order-list .list .item~.item {
		margin-top: 20rpx;
	}

	.pos-order-list .list .item .order-num {
		font-size: 28rpx;
		line-height: 40rpx;
		color: #333333;
	}

	.pos-order-list .list .item .order-num .state {
		color: #FF7E00;
	}

	.pos-order-list .list .item .order-num .state.on {
		font-size: 24rpx;
		width: 150rpx;
		text-align: right;
	}

	.pos-order-list .list .item .order-num .time {
		font-size: 26upx;
		font-weight: normal;
		color: #999;
	}

	.pos-order-list .list .item .operation .more {
		position: relative;
		font-size: 26rpx;
		color: #999999;
	}

	.pos-order-list .list .item .operation .more .iconfont {
		margin-right: 12rpx;
		font-size: 34rpx;
		color: #2A7EFB;
	}

	.pos-order-list .list .item .operation .icon-gengduo {
		font-size: 50upx;
		color: #aaa;
	}

	.pos-order-list .list .item .operation .order .arrow {
		width: 0;
		height: 0;
		border-left: 11upx solid transparent;
		border-right: 11upx solid transparent;
		border-top: 20upx solid #e5e5e5;
		position: absolute;
		left: 15upx;
		bottom: -18upx;
	}

	.pos-order-list .list .item .operation .order .arrow:before {
		content: '';
		width: 0;
		height: 0;
		border-left: 7upx solid transparent;
		border-right: 7upx solid transparent;
		border-top: 20upx solid #fff;
		position: absolute;
		left: -7upx;
		bottom: 0;
	}

	.pos-order-list .list .item .operation .order {
		width: 200upx;
		background-color: #fff;
		border: 1px solid #eee;
		border-radius: 10upx;
		position: absolute;
		top: -100upx;
		z-index: 9;
	}

	.pos-order-list .list .item .operation .order .items {
		height: 77upx;
		line-height: 77upx;
		text-align: center;
	}

	.pos-order-list .list .item .operation .order .items~.items {
		border-top: 1px solid #f5f5f5;
	}

	.pos-order-list .list .item .operation .btn {
		height: 56rpx;
		padding: 0 24rpx;
		border-radius: 28rpx;
		border: 1rpx solid #CCCCCC;
		font-size: 24rpx;
		line-height: 54rpx;
		color: #333333;

		&.on {
			color: #FFFFFF !important;
			background-color: #2A7EFB !important;
			border-color: #2A7EFB !important;
		}
	}

	.pos-order-list .list .item .operation .btn~.btn {
		margin-left: 16rpx;
	}

	.pos-order-list .list .item .operation .wait {
		margin-left: 30rpx;
	}

	.pos-order-goods .goods {
		padding: 26rpx 0;
	}

	.pos-order-goods .goods~.goods {
		border-top: 1px dashed #e5e5e5;
	}

	.pos-order-goods .goods .picTxt {
		flex: 1;
		min-width: 0;
	}

	.pos-order-goods .goods .scroll-view {
		box-sizing: border-box;
		white-space: nowrap;

		.pictrue {
			display: inline-block;

			+.pictrue {
				margin-left: 16rpx;
			}
		}
	}

	.pos-order-goods .goods .picTxt .pictrue {
		width: 136rpx;
		height: 136rpx;
	}

	.pos-order-goods .goods .picTxt .pictrue image {
		width: 100%;
		height: 100%;
		border-radius: 16rpx;
	}

	.pos-order-goods .goods .picTxt .text {
		flex: 1;
		min-width: 0;
		padding-left: 20rpx;
	}

	.pos-order-goods .goods .picTxt .text .info {
		font-size: 28rpx;
		line-height: 40rpx;
		color: #333333;
	}

	.pos-order-goods .goods .picTxt .text .info .label {
		color: #ff4c3c;
	}

	.pos-order-goods .goods .picTxt .text .attr {
		margin-top: 12rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #999999;
	}

	.pos-order-goods .goods .money {
		padding-left: 16rpx;
		text-align: right;
		font-size: 28upx;
	}

	.pos-order-goods .goods .money .info {
		margin-top: 18rpx;
		font-size: 24rpx;
	}

	.pos-order-goods .goods .money .x-money {
		color: #282828;
	}

	.pos-order-goods .goods .money .num {
		margin-top: 10rpx;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #999999;
	}

	.pos-order-goods .goods .money .y-money {
		color: #999;
		text-decoration: line-through;
	}

	.public-total {
		font-size: 28upx;
		color: #282828;
		border-top: 1px solid #eee;
		height: 92upx;
		line-height: 92upx;
		text-align: right;
		padding: 0 30upx;
		background-color: #fff;
	}

	.public-total .money {
		color: #ff4c3c;
	}

	.mask {
		z-index: 900;
	}

	.filter-popup {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 900;
		width: 100%;
		border-radius: 0 0 32rpx 32rpx;
		background: #FFFFFF;
		transform: translateY(-100%);
		transition: transform 0.3s;

		&.on {
			transform: translateY(0);
		}

		.search-box {
			padding: 10rpx 32rpx;
		}

		.search {
			height: 58rpx;
			padding: 0 32rpx;
			border-radius: 29rpx;
			background: #F5F5F5;
		}

		.iconfont {
			font-size: 28rpx;
			color: #999999;
		}

		.input {
			flex: 1;
			height: 58rpx;
			padding-left: 16rpx;
			font-size: 24rpx;
		}

		.content {
			padding: 32rpx 30rpx 58rpx;
		}

		.item {
			margin-top: 36rpx;

			&:first-child {
				margin-top: 0;
			}
		}

		.title {
			font-size: 28rpx;
			line-height: 40rpx;
			color: #333333;
		}

		.list {
			padding: 0;
			margin-right: -24rpx;
		}

		.cell {
			width: 154rpx;
			height: 56rpx;
			border: 1rpx solid #F5F5F5;
			border-radius: 28rpx;
			margin: 24rpx 24rpx 0 0;
			background: #F5F5F5;
			text-align: center;
			font-size: 24rpx;
			line-height: 54rpx;
			color: #333333;

			&.on {
				border-color: #2A7EFB;
				background: #E9F2FE;
				color: #2A7EFB;
			}
		}
	}
</style>