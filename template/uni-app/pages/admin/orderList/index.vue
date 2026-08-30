<template>
	<view class="pos-order-list pb-safe" ref="container">
		<!-- 固定在顶部的搜索栏和导航栏 -->
		<view class="fixed-header">
			<view class="searchCon acea-row">
				<view class="search acea-row row-middle">
					<text class="iconfont icon-ic_search"></text>
					<input class="inputs" placeholder='请输入用户手机号/用户昵称/订单号/商品名称' placeholder-class='placeholder' confirm-type='search' name="search" v-model="where.keyword" @confirm="searchSubmit"></input>
				</view>
				<view class="btn" @click="filterShow = true">
					<text class="iconfont icon-a-icon_filter1x"></text>
				</view>
			</view>
			<view class="nav acea-row row-around row-middle" id="nav">
				<view class="item" :class="state == -1 ? 'on' : ''" @click="changeStatus(-1)">
					全部
					<image src="../static/adorn.png" v-if="state == -1"></image>
				</view>
				<view class="item" :class="state == 0 ? 'on' : ''" @click="changeStatus(0)">
					待付款
					<image src="../static/adorn.png" v-if="state == 0"></image>
				</view>
				<view class="item" :class="state == 1 ? 'on' : ''" @click="changeStatus(1)">
					待发货/核销
					<image src="../static/adorn.png" v-if="state == 1"></image>
				</view>
				<view class="item" :class="state == 2 ? 'on' : ''" @click="changeStatus(2)">
					待收货
					<image src="../static/adorn.png" v-if="state == 2"></image>
				</view>
				<view class="item" :class="state == 3 ? 'on' : ''" @click="changeStatus(3)">
					待评价
					<image src="../static/adorn.png" v-if="state == 3"></image>
				</view>
			</view>
		</view>
		<!-- 可滚动的列表区域 -->
		<scroll-view class="list-scroll" scroll-y @scrolltolower="getIndex">
			<view class="list" v-if="list.length">
				<view class="item" v-for="(item, index) in list" :key="index">
				<view class="order-num acea-row row-between-wrapper" @click="toDetail(item)">
					<view>
						<!-- <countDown v-if="item.status == 0 && item.paid == 0 && item.pay_type != 'offline'" tipText="剩余：" dayText=" " hourText="小时" minuteText="分钟" secondText=" " dotColor="#FF7E00"
							colors="#FF7E00" :datatime="item.stop_time" :isSecond="false">
						</countDown> -->
						<view>订单号：{{ item.order_id }}</view>
					</view>
					<view class="state" :class="(item.refund_status==0 && where.status != 0 && item.refund.length)?'on':''">
						{{item.refund_status==1?'退款中':item.refund_status==2?'已退款':item.refund_status==3?'拒绝退款':item.status_name.status_name}}
						<text v-if="item.refund_status==0 && where.status != 0 && item.refund.length">{{item.is_all_refund?'，退款中':'，部分退款中'}}</text>
					</view>
				</view>
				<view class="pos-order-goods">
					<view class="goods acea-row" @click="toDetail(item)">
						<scroll-view class="picTxt scroll-view" scroll-x="true" v-if="item.cart_id.length > 1">
							<view class="pictrue" v-for="(val, key) in item._info" :key="key">
								<image :src="val.cart_info.productInfo.attrInfo?val.cart_info.productInfo.attrInfo.image:val.cart_info.productInfo.image" />
							</view>
						</scroll-view>
						<view class="picTxt" v-else>
							<view class="acea-row" v-for="(val, key) in item._info" :key="key">
								<view class="pictrue">
									<image :src="val.cart_info.productInfo.attrInfo?val.cart_info.productInfo.attrInfo.image:val.cart_info.productInfo.image" />
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
						</view>
					</view>
				</view>
				<view class="operation acea-row row-between-wrapper">
					<view class="more">
					</view>
					<view class="acea-row row-middle">
						<view class="bnt" @click="modify(item, 1)">订单备注</view>
						<view class="bnt" :class="openErp?'on':''" @click="modify(item, 0)" v-if="item._status == 1 && item.is_cancel == 0">
							一键改价
						</view>
						<view class="bnt primary" :class="openErp?'on':''" v-if="item.status == 0 && item.paid == 0 && item.is_cancel == 0" @click="confirmPay(item)">
							确认付款
						</view>
						<view class="bnt primary" :class="openErp?'on':''"
							v-if="item._status == 2 && item.shipping_type == 1 && (item.pink_id == 0 || (item.pink_id > 0 && item.pinkStatus == 2))"
							@click="goDelivery(item)">发送货
						</view>
						<navigator class="bnt primary" :url="'/pages/admin/logistics/index?orderId='+item.order_id" 
							v-if="item._status == 4 && item.delivery_type == 'express'">查看物流
						</navigator>
						<view class="bnt primary" v-if="item.shipping_type == 2 &&
                (item.status == 0 || item.status == 5) &&
                item.paid == 1 &&
                item.refund_status === 0" @click="verify(item)">订单核销</view>
					</view>
				</view>
				</view>
			</view>
			<view v-else class="px-20 mt-20 empty-wrapper">
				<emptyPage title="暂无订单～" src="/statics/images/noOrder.gif"></emptyPage>
			</view>
		</scroll-view>
		<Loading :loaded="loaded" :loading="loading"></Loading>
		<PriceChange :change="change" :orderInfo="orderInfo" :isRefund="isRefund" v-on:statusChange="statusChange($event)" v-on:closechange="changeclose($event)" v-on:savePrice="savePrice"
			:status="status"></PriceChange>
		<view class="mask" v-if="filterShow" @click="filterShow = false"></view>
		<view class="filter-popup" :class="{ on: filterShow }">
			<view class="search-box">
				<view class="search acea-row row-middle">
					<text class="iconfont icon-ic_search"></text>
					<input class="input" placeholder='请输入要查询的订单' placeholder-class='placeholder' confirm-type='search' name="search" v-model="where.keyword" @confirm="searchSubmit"></input>
				</view>
			</view>
			<view class="content">
				<view class="item">
					<view class="title">按下单时间</view>
					<view class="acea-row list">
						<view class="cell" v-for="(item, index) in dateList" :key="index" :class="{ on: item.val == dateSelected }" @click="dateChange(item.val)">{{ item.label }}</view>
					</view>
				</view>
				<view class="item">
					<view class="title">按支付方式</view>
					<view class="acea-row list">
						<view class="cell" v-for="(item, index) in payList" :key="index" :class="{ on: item.val == where.pay_type }" @click="payChange(item.val)">{{ item.label }}</view>
					</view>
				</view>
			</view>
		</view>
		<view v-if="confirmShow" class="mask"></view>
		<view v-if="confirmShow" class="confirm-popup">
			<view class="title">确认付款</view>
			<view class="info">确认该订单用户已付款</view>
			<view class="acea-row btn-box">
				<view class="btn" @click="confirmShow = false">取消</view>
				<view class="btn primary" @click="offlinePay">确认</view>
			</view>
		</view>
		<view class="footerH"></view>
		<footerPage></footerPage>
	</view>
</template>

<script>
	import {
		getAdminOrderList,
		setAdminOrderPrice,
		setAdminOrderRemark,
		setAdminRefundRemark,
		setOfflinePay,
		setOrderRefund,
		orderRefundAgree,
		adminRefundList,
		orderVerific
	} from "@/api/admin";
	// import {
	// 	erpConfig
	// } from "@/api/esp.js";
	import Loading from '@/components/Loading/index'
	import PriceChange from '../components/PriceChange/index.vue'
	import footerPage from '../components/footerPage/index.vue'
	import countDown from '@/components/countDown/index.vue'
	import emptyPage from '@/components/emptyPage.vue'
	// #ifdef MP || APP-PLUS
	import NavBar from '@/components/NavBar.vue';
	// #endif
	import {
		isMoney
	} from '@/utils/validate.js';
	import {
		HTTP_REQUEST_URL
	} from '@/config/app';
	export default {
		name: "AdminOrderList",
		components: {
			Loading,
			PriceChange,
			footerPage,
			countDown,
			emptyPage,
			// #ifdef MP || APP-PLUS
			NavBar,
			// #endif
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
					page: 1,
					limit: 10,
					status: '',
					keyword: '',
					data: '', // 时间筛选
					type: '', // 订单类型
					pay_type: '', // 支付方式
				},
				list: [],
				loaded: false,
				loading: false,
				orderInfo: {},
				status: "",
				state: -1,
				isRefund: 0, //1是仅退款;0是退货退款
				imgHost: HTTP_REQUEST_URL,
				dateSelected: '',
				dateList: [{
						label: '全部',
						val: '',
					},
					{
						label: '三天内',
						val: '1',
					},
					{
						label: '一个月内',
						val: '2',
					},
					{
						label: '三个月内',
						val: '3',
					},
					{
						label: '半年内',
						val: '4',
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
						label: '余额支付',
						val: '2'
					},
					{
						label: '线下支付',
						val: '3'
					},
				],
				confirmOrder: {},
				confirmShow: false,
			};
		},
		onLoad(option) {
			let type = option.types;
			this.where.status = type || '';
			this.state = type || -1;
			// this.getErpConfig();
		},
		onShow() {
			this.init();
		},
		onPageScroll(option) {
			if (this.top - (this.getHeight.barTop + this.getHeight.barHeight) >= option.scrollTop) {
				this.isFixed = false;
			} else {
				this.isFixed = true;
			}
			// #ifdef MP
			if (option.scrollTop > 50) {
				this.isScrolling = true;
			} else if (option.scrollTop < 50) {
				this.isScrolling = false;
			}
			// #endif
		},
		mounted() {
			const query = uni.createSelectorQuery().in(this);
			query.select("#nav").boundingClientRect((data) => {
				this.top = data.top;
				this.navHeight = data.height;
			}).exec();
		},
		methods: {
			verify(item) {
				uni.showModal({
					title: '操作提示',
					content: '是否确认核销该订单？',
					success: (res) => {
						if (res.confirm) {
							orderVerific(item.verify_code, 1, 1)
								.then((res) => {
									item.status = 2;
									this.$util.Tips({
										title: res.msg
									});
								})
								.catch((res) => {
									// this.verify_code = '';
									return this.$util.Tips({
										title: res
									});
								});
						}
					}
				});
			},
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
				let obj = '';
				if (this.where.status == -3) {
					obj = adminRefundList(that.where);
				} else {
					obj = getAdminOrderList(that.where);
				}
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
					this.where.status = val == -1 ? '' : val;
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
						if (!isMoney(refund_price)) {
							return that.$util.Tips({
								title: '请输入正确的金额'
							});
						}
						data.price = refund_price;
						data.type = opt.type;
						this.objOrderRefund(data);
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
					} else {
						if (opt.type == 1) {
							orderRefundAgree(this.orderInfo.id).then(res => {
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
					let obj = '';
					if (that.where.status == -3) {
						obj = setAdminRefundRemark(data);
					} else {
						obj = setAdminOrderRemark(data);
					}
					obj.then(
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
					url: `/pages/admin/orderDetail/index?id=${item.order_id}&types=${this.where.status}`
				})
			},
			offlinePay: function() {
				if (this.openErp) return
				setOfflinePay({
					order_id: this.confirmOrder.order_id
				}).then(
					res => {
						this.confirmShow = false;
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
			confirmPay(item) {
				this.confirmOrder = item;
				this.confirmShow = true;
			},
			dateChange(value) {
				const date = new Date();
				const end = date.toLocaleString();
				let start = '';
				if (value == 1) {
					date.setDate(date.getDate() - 2)
					date.setHours(0, 0, 0, 0);
				} else if (value == 2) {
					date.setDate(1)
					date.setHours(0, 0, 0, 0);
				} else if (value == 3) {
					date.setMonth(date.getMonth() - 2)
					date.setDate(1)
					date.setHours(0, 0, 0, 0);
				} else if (value == 4) {
					date.setMonth(date.getMonth() - 5)
					date.setDate(1)
					date.setHours(0, 0, 0, 0);
				}
				start = date.toLocaleString();
				this.dateSelected = value;
				this.filterShow = false;
				this.where.data = start == end ? '' : `${start}-${end}`;
				this.init();
			},
			payChange(val) {
				this.filterShow = false;
				this.where.pay_type = val;
				this.init();
			},
		},
		onReachBottom() {
			this.getIndex()
		}
	}
</script>

<style lang="scss" scoped>
	.pos-order-list {
		::v-deep.navbar {
			.content {
				background: #F5F5F5 !important;
			}
		}
	}

	.fixed-header {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 99;
		background: #F5F5F5;
	}

	.list-scroll {
		height: calc(100vh - 180rpx);
		margin-top: 180rpx;
	}

	.empty-wrapper {
		padding-top: 200rpx;
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
				color: #333;
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
		color: $primary-admin;
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

		::v-deep.time {
			.title {
				color: #FF7E00;
			}
		}
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
		width: 180rpx;
		text-align: right;
	}

	.pos-order-list .list .item .order-num .time {
		font-size: 26upx;
		font-weight: normal;
		color: #999;
	}

	.pos-order-list .list .item .operation {}

	.pos-order-list .list .item .operation .more {
		position: relative;
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

	.pos-order-list .list .item .operation .bnt {
		width: 144rpx;
		height: 56rpx;
		border-radius: 28rpx;
		border: 1rpx solid #CCCCCC;
		text-align: center;
		font-size: 24rpx;
		line-height: 54rpx;
		color: #333333;

		&.primary {
			color: #FFFFFF !important;
			background-color: $primary-admin !important;
			border-color: $primary-admin !important;
		}
	}

	.pos-order-list .list .item .operation .bnt~.bnt {
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

	.filter-popup {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 100;
		width: 100%;
		border-radius: 0 0 32rpx 32rpx;
		background: #FFFFFF;
		transform: translateY(-120%);
		transition: transform 0.3s;

		&.on {
			padding-top: 20rpx;
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
				border-color: $primary-admin;
				background: $light-primary-admin;
				color: $primary-admin;
			}
		}
	}

	.footerH {
		height: 110rpx;
		height: calc(110rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		height: calc(110rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
	}

	.mask {
		z-index: 21;
	}

	.confirm-popup {
		position: fixed;
		top: 50%;
		right: 75rpx;
		left: 75rpx;
		z-index: 21;
		transform: translateY(-50%);
		border-radius: 32rpx;
		background: #FFFFFF;
		text-align: center;

		.title {
			padding: 40rpx 32rpx 0;
			font-weight: 500;
			font-size: 32rpx;
			line-height: 52rpx;
			color: #333333;
		}

		.info {
			padding: 24rpx 40rpx 0;
			font-size: 30rpx;
			line-height: 42rpx;
			color: #666666;
		}

		.btn-box {
			padding: 40rpx;
		}

		.btn {
			flex: 1;
			height: 72rpx;
			border: 1rpx solid $primary-admin;
			border-radius: 36rpx;
			margin-left: 32rpx;
			font-weight: 500;
			font-size: 26rpx;
			line-height: 70rpx;
			color: $primary-admin;
			transform: rotateZ(360deg);

			&.primary {
				background: $primary-admin;
				color: #FFFFFF;
			}
		}
	}
</style>
