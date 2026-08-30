<template>
	<view>
		<!-- #ifdef MP || APP-PLUS -->
<!-- 		<NavBar titleText="订单详情" :iconColor="iconColor" :textColor="iconColor" :isScrolling="isScrolling" showBack></NavBar> -->
		<!-- #endif -->
		<view class="headerBg">
			<view :style="{ height: `${getHeight.barTop}px` }"></view>
			<view :style="{ height: `${getHeight.barHeight}px` }"></view>
			<view class="inner"></view>
		</view>
		<view class="order-details pos-order-details">
			<view class="header">
				<view class="state">{{ title }}</view>
				<view class="data">
					订单号：{{ orderInfo.store_order_sn }}
				</view>
			</view>
			<view class="remarks acea-row row-middle  h-100" v-if="goname != 'looks'" @click="modify('1')">
				<text class="iconfont icon-ic_notes mr-10"></text>
				<text class="line1" style="text-align: left;">{{ orderInfo.remark ? orderInfo.remark : '订单未备注，点击添加备注信息' }}</text>
			</view>
			<!-- <view class="orderingUser acea-row row-middle" v-if="orderInfo.nickname">
				<span class="iconfont icon-yonghu2"></span>{{ orderInfo.nickname }}
			</view> -->
			<view class="acea-row row-middle user-box">
				<image :src="userInfo.avatar" class="image"></image>
				<view class="text">
					<view class="acea-row row-middle name">
						{{userInfo.nickname}}
						<view v-if="userInfo.isMember" class="svip">SVIP</view>
						<view v-if="userInfo.level_grade" class="grade acea-row row-middle"><text class="iconfont icon-huiyuandengji"></text>V{{userInfo.level_grade}}</view>
					</view>
					<view v-if="userInfo.phone" class="">{{userInfo.phone}}（ID:{{userInfo.uid}}）</view>
					<view v-else class="">ID:{{userInfo.uid}}</view>
				</view>
			</view>
			<!-- 拆单时 -->
			<view v-for="(j, indexw) in orderInfo.split" :key="indexw" v-if="orderInfo.split && orderInfo.split.length">
				<view class="splitTitle acea-row row-between-wrapper">
					<view>订单包裹{{indexw + 1}}</view>
					<view class="title">{{j._status._title}}</view>
				</view>
				<view class="pos-order-goods">
					<navigator :url="`/pages/admin/orderDetail/index?id=${j.order_id}`" hover-class="none" class="goods acea-row row-between-wrapper"
						v-for="(item, index) in j.cartInfo" :key="index">
						<view class="picTxt acea-row row-between-wrapper">
							<view class="pictrue">
								<image :src="item.productInfo.attrInfo?item.productInfo.attrInfo.image :item.productInfo.image"></image>
							</view>
							<view class="text acea-row row-between row-column">
								<view class="info line2">
									{{ item.productInfo.store_name }}
								</view>
								<view class="attr">{{ item.productInfo.attrInfo.suk }}</view>
							</view>
						</view>
						<view class="money">
							<view class="x-money">￥{{ item.productInfo.attrInfo?item.productInfo.attrInfo.price:item.productInfo.price }}</view>
							<view class="num">x {{ item.cart_num }}</view>
							<!-- <view class="y-money">￥{{ item.productInfo.ot_price }}</view> -->
						</view>
					</navigator>
				</view>
			</view>
			<view class="pos-order-goods split" v-if="orderInfo.cartInfo && orderInfo.cartInfo.length">
				<navigator :url="`/pages/goods_details/index?id=${item.product_id}`" hover-class="none" class="goods acea-row" v-for="(item, index) in orderInfo.cartInfo" :key="index">
					<view class="picTxt acea-row">
						<view class="pictrue">
							<image :src="item.productInfo.attrInfo?item.productInfo.attrInfo.image :item.productInfo.image" />
						</view>
						<view class="text">
							<view class="info line1">{{ item.productInfo.store_name }}</view>
							<view class="attr line1">{{ item.productInfo.attrInfo.suk }}</view>
						</view>
					</view>
					<view class="money">
						<!-- <view class="x-money">￥{{ item.productInfo.attrInfo?item.productInfo.attrInfo.price:item.productInfo.price }}</view> -->
						<BaseMoney :money="item.productInfo.attrInfo?item.productInfo.attrInfo.price :item.productInfo.price" symbolSize="20" integerSize="32" decimalSize="20"></BaseMoney>
						<view class="num">共{{ item.cart_num }}件</view>
						<view class="acea-row row-right">
							<view class="writeOff" v-if="item.refund_num  && orderInfo.refund_type != 6">{{item.refund_num}}件退款中</view>
							<view class="writeOff" v-if="orderInfo._status._type==2 && orderInfo.delivery_type == 'send'">
								<text v-if="item.refund_num">，</text>
								<text class="on" v-if="item.is_writeoff">已核销</text>
								<text v-if="!item.is_writeoff && item.surplus_num<item.cart_num">已核销{{parseInt(item.cart_num)-parseInt(item.surplus_num)}}件</text>
								<text v-if="!item.is_writeoff && item.surplus_num==item.cart_num">未核销</text>
							</view>
						</view>
					</view>
				</navigator>
				<view class="giveGoods">
					<view class="item acea-row row-between-wrapper" v-for="(item,index) in giveCartInfo" :key="index">
						<view class="picTxt acea-row row-middle">
							<view class="pictrue">
								<image :src="item.productInfo.attrInfo.image" v-if="item.productInfo.attrInfo"></image>
								<image :src="item.productInfo.image" v-else></image>
							</view>
							<view class="texts">
								<view class="name line1">[赠品]{{item.productInfo.store_name}}</view>
								<view class="limit line1" v-if="item.productInfo.attrInfo">{{item.productInfo.attrInfo.suk}}</view>
							</view>
						</view>
						<view class="num">x{{item.cart_num}}</view>
					</view>
					<view class="item acea-row row-between-wrapper" v-for="(item,index) in giveData.give_coupon" :key="index" v-if="giveData.give_coupon.length">
						<view class="picTxt acea-row row-middle">
							<view class="pictrue acea-row row-center-wrapper">
								<text class="iconfont icon-pc-youhuiquan"></text>
							</view>
							<view class="texts">
								<view class="line1">[赠品]{{item.coupon_title}}</view>
							</view>
						</view>
					</view>
					<view class="item acea-row row-between-wrapper" v-if="giveData.give_integral>0">
						<view class="picTxt acea-row row-middle">
							<view class="pictrue acea-row row-center-wrapper">
								<text class="iconfont icon-pc-jifen"></text>
							</view>
							<view class="texts">
								<view class="line1">[赠品]{{giveData.give_integral}}积分</view>
							</view>
						</view>
					</view>
				</view>
			</view>
			<!-- <view class="public-total" v-if="!orderInfo.split || !orderInfo.split.length">
				共{{ orderInfo.total_num }}件商品，实付款
				<span class="money">￥{{ orderInfo.pay_price }}</span> ( 邮费 ¥{{
		    orderInfo.pay_postage
		  }}
				)
			</view> -->
			<!-- 结束 -->
			<view class='wrapper'>
				<view class='item acea-row row-between'>
					<view>退款原因</view>
					<view class='conter'>{{orderInfo.refund_reason}}</view>
				</view>
				<view class='item acea-row row-between'>
					<view>退款金额</view>
					<view class='conter'>¥{{orderInfo.refund_price}}</view>
				</view>
				<view class='item acea-row row-between'>
					<view>申请件数</view>
					<view class='conter'>{{orderInfo.refund_num}}</view>
				</view>
			</view>
			<customForm :customForm="orderInfo.custom_form"></customForm>
			<view class="wrapper">
				<view class="item acea-row row-between">
					<view>订单编号：</view>
					<view class="conter acea-row row-middle row-right">
						{{ orderInfo.store_order_sn}}
						<text class="copy copy-data" @click="copyNum(orderInfo.store_order_sn)">复制</text>
					</view>
				</view>
				<view class="item acea-row row-between">
					<view>申请时间</view>
					<view class="conter">{{ orderInfo.add_time_y }} {{ orderInfo.add_time_h }}</view>
				</view>
				<view class="item acea-row row-between" v-show="[1,2,4,5].includes(orderInfo.refund_type)">
					<view>售后类型</view>
					<view class="conter" v-if="orderInfo.refund_type == 1">仅退款</view>
					<view class="conter" v-if="[2,4,5].includes(orderInfo.refund_type)">退货退款</view>
				</view>
				<view class="item acea-row row-between">
					<view>售后单号</view>
					<view class="conter">
						{{ orderInfo.order_id }}
						<text class="copy copy-data" @click="copyNum(orderInfo.order_id)">复制</text>
					</view>
				</view>
				<view class="item acea-row row-between" v-if="orderInfo.refund_type == 5">
					<view>物流单号</view>
					<view class="conter">{{ orderInfo.refund_express }}</view>
				</view>
				<view class="item acea-row row-between">
					<view>备注说明</view>
					<view class="conter">{{ orderInfo.mark }}</view>
				</view>
				<!-- <view class="item acea-row row-between" v-if="orderInfo.mark">
					<view v-if="statusType == -3">退款留言：</view>
					<view v-else>买家留言：</view>
					<view class="conter">{{ orderInfo.mark }}</view>
				</view>
				<view class="item acea-row row-between" v-if="orderInfo.refund_goods_explain">
					<view>退货留言：</view>
					<view class='conter'>{{orderInfo.refund_goods_explain}}</view>
				</view> -->
				<view class="item acea-row row-between" v-if="orderInfo.refund_img && orderInfo.refund_img.length">
					<view>退款凭证：</view>
					<view class="conter">
						<view class="pictrue" v-for="(item,index) in orderInfo.refund_img" :key="index">
							<image :src="item" mode="aspectFill" @click='getpreviewImage(index,1)'></image>
						</view>
					</view>
				</view>
				<view class="item acea-row row-between" v-if="orderInfo.refund_goods_img && orderInfo.refund_goods_img.length">
					<view>退货凭证：</view>
					<view class="conter">
						<view class="pictrue" v-for="(item,index) in orderInfo.refund_goods_img" :key="index">
							<image :src="item" mode="aspectFill" @click='getpreviewImage(index,0)'></image>
						</view>
					</view>
				</view>
			</view>
			<view class="wrapper" v-if="
		    orderInfo.delivery_type != 'fictitious' && orderInfo._status._type === 2 && (!orderInfo.split || !orderInfo.split.length)
		  ">
				<view class="item acea-row row-between">
					<view>配送方式：</view>
					<view class="conter" v-if="orderInfo.delivery_type === 'express'">
						快递
					</view>
					<view class="conter" v-if="orderInfo.delivery_type === 'send'">送货</view>
				</view>
				<view class="item acea-row row-between">
					<view v-if="orderInfo.delivery_type === 'express'">快递公司：</view>
					<view v-if="orderInfo.delivery_type === 'send'">送货人：</view>
					<view class="conter">{{ orderInfo.delivery_name }}</view>
				</view>
				<view class="item acea-row row-between">
					<view v-if="orderInfo.delivery_type === 'express'">快递单号：</view>
					<view v-if="orderInfo.delivery_type === 'send'">送货人电话：</view>
					<view class="conter">
						{{ orderInfo.delivery_id}}
						<span class="copy copy-data" @click="copyNum(orderInfo.delivery_id)">复制</span>
					</view>
				</view>
			</view>
			<view class="wrapper" v-if="orderInfo.refund_type == 5">
				<view class='item acea-row row-between'>
					<view>退货方式</view>
					<view class='conter'>快递退回</view>
				</view>
				<view class="item acea-row row-between" v-if="orderInfo.refund_express_name">
					<view>物流公司</view>
					<view class="conter">{{ orderInfo.refund_express_name }}</view>
				</view>
				<view class='item acea-row row-between' v-if="orderInfo.refund_express">
					<view>物流单号</view>
					<view class='conter'>{{ orderInfo.refund_express }}</view>
				</view>
				<view class="item acea-row row-between" v-if="orderInfo.refund_phone">
					<view>联系电话</view>
					<view class="conter">{{ orderInfo.refund_phone }}</view>
				</view>
			</view>
			<view class="height-add"></view>
			<view class="footer acea-row row-right row-middle" v-if="goname != 'looks'">
				<view class="more"></view>
				<view class="btn cancel" @click="modify('1')">订单备注</view>
				<view class="btn delivery" v-if="orderInfo.refund_type == 1" @click="modify('2',1)">退款审核</view>
				<view class="btn delivery" v-if="orderInfo.refund_type == 2" @click="modify('2',0)">退款审核</view>
				<view class="btn" v-if="orderInfo.refund_type == 5" @click="goLogistics(orderInfo)">查看物流</view>
				<view class="btn delivery" v-if="orderInfo.refund_type == 5" @click="modify('2',1)">确认收货</view>
			</view>
			<PriceChange :change="change" :orderInfo="orderInfo" :isRefund="isRefund" @closechange="changeclose" @savePrice="savePrice" :status="status">
			</PriceChange>
		</view>
	</view>
</template>
<script>
	import PriceChange from "../components/PriceChange/index.vue";
	import customForm from "../components/customForm";
	// #ifdef MP || APP-PLUS
	import NavBar from "@/components/NavBar.vue";
	// #endif
	import {
		getAdminOrderDetail,
		getAdminRefundDetail,
		setAdminOrderPrice,
		setAdminRefundRemark,
		setAdminOrderRemark,
		setOfflinePay,
		setOrderRefund,
		agreeExpress,
		getUserInfo,
	} from "@/api/admin";
	import {
		isMoney
	} from '@/utils/validate.js'

	export default {
		name: "AdminOrder",
		components: {
			PriceChange,
			customForm,
			// #ifdef MP || APP-PLUS
			NavBar,
			// #endif
		},
		props: {},
		data: function() {
			return {
				openErp: false,
				giveData: {
					give_integral: 0,
					give_coupon: []
				},
				giveCartInfo: [],
				totalNmu: 0,
				order: false,
				change: false,
				order_id: "",
				orderInfo: {
					_status: {}
				},
				status: "",
				title: "",
				payType: "",
				types: "",
				statusType: -3,
				clickNum: 1,
				goname: '',
				isRefund: 0, //1是仅退款;0是同意退货退款
				// #ifdef MP || APP-PLUS
				iconColor: '#FFFFFF',
				isScrolling: false,
				// #endif
				getHeight: this.$util.getWXStatusHeight(),
				userInfo: {},
			};
		},
		watch: {
			"$route.params.oid": function(newVal) {
				let that = this;
				if (newVal != undefined) {
					that.order_id = newVal;
					that.getIndex();
				}
			}
		},
		onLoad: function(option) {
			let self = this
			this.order_id = option.id;
			this.goname = option.goname
			// this.statusType = option.types
			this.getIndex();
			// this.getErpConfig();
		},
		onPageScroll(e) {
			// #ifdef MP || APP-PLUS
			if (e.scrollTop > 50) {
				this.iconColor = '#333333';
				this.isScrolling = true;
			} else {
				this.iconColor = '#FFFFFF';
				this.isScrolling = false;
			}
			// #endif
		},
		methods: {
			goLogistics(orderInfo) {
				uni.navigateTo({
					url: '/pages/admin/logistics/index?type=refund&orderId=' + orderInfo.order_id
				})
			},
			goDelivery(orderInfo) {
				if (this.openErp) return
				uni.navigateTo({
					url: '/pages/admin/delivery/index?id=' + orderInfo.order_id + '&listId=' + orderInfo.id + '&totalNum=' + orderInfo.total_num + '&orderStatus=' + orderInfo.status +
						'&comeType=2&productType=' + orderInfo.product_type
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
			getpreviewImage(index, num) {
				uni.previewImage({
					urls: num ? this.orderInfo.refund_img : this.orderInfo.refund_goods_img,
					current: num ? this.orderInfo.refund_img[index] : this.orderInfo.refund_goods_img[index]
				});
			},
			more() {
				this.order = !this.order;
			},
			modify(status, type) {
				this.change = true;
				this.status = status;
				if (status == 2) {
					this.isRefund = type
				}
			},
			changeclose(msg) {
				this.change = msg;
			},
			getIndex() {
				let that = this;
				let obj = '';
				if (that.statusType == -3) {
					obj = getAdminRefundDetail(that.order_id)
				} else {
					obj = getAdminOrderDetail(that.order_id);
				}
				obj.then(res => {
					let num = 0;
					that.types = res.data._status._type;
					that.title = res.data._status._title;
					that.payType = res.data._status._payType;
					that.giveData.give_coupon = res.data.give_coupon;
					that.giveData.give_integral = res.data.give_integral;
					let cartObj = [],
						giftObj = [];
					res.data.cartInfo.forEach((item, index) => {
						num += item.cart_num
						if (item.is_gift == 1) {
							giftObj.push(item)
						} else {
							cartObj.push(item)
						}
					});
					this.totalNmu = num;
					res.data.cartInfo = cartObj;
					that.$set(that, 'giveCartInfo', giftObj);
					that.orderInfo = res.data;
					that.getUserInfo();
				}).catch(err => {
					return that.$util.Tips({
						title: err.msg
					});
				})
			},
			objOrderRefund(data) {
				let that = this;
				setOrderRefund(data).then(
					res => {
						that.change = false;
						that.$util.Tips({
							title: res.msg
						});
						that.getIndex();
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
						function() {
							that.change = false;
							that.$util.Tips({
								title: '改价成功',
								icon: 'success'
							})
							that.getIndex();
						},
						function() {
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
					} else {
						if (opt.type == 1) {
							agreeExpress({id: this.orderInfo.id}).then(res => {
								that.change = false;
								that.$util.Tips({
									title: res.msg
								});
								that.getIndex();
							}).catch(err => {
								that.change = false;
								that.$util.Tips({
									title: err
								});
							})
						}
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
					let obj = '';
					if (that.statusType == -3) {
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
							this.orderInfo.remark = remark;
							// that.getIndex();
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
			offlinePay: function() {
				if (this.openErp) return
				setOfflinePay({
					order_id: this.orderInfo.order_id
				}).then(
					res => {
						this.$util.Tips({
							title: res.msg,
							icon: 'success'
						});
						this.getIndex();
					},
					err => {
						this.$util.Tips({
							title: err
						});
					}
				);
			},
			copyNum(id) {
				uni.setClipboardData({
					data: id
				});
			},
			// #ifdef H5
			webCopy(item, index) {
				let items = item
				let indexs = index
				let self = this

				if (self.clickNum == 1) {
					self.clickNum += 1
					self.webCopy(items, indexs)
				}
			},
			// #endif
			getUserInfo() {
				getUserInfo(this.orderInfo.uid).then(res => {
					this.userInfo = res.data;
				});
			},
		}
	};
</script>

<style lang="scss" scoped>
	.headerBg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		background-image: linear-gradient(360deg, #F5F5F5 0%, rgba(245, 245, 245, 0) 100%),
			linear-gradient(270deg, #01ABF8 0%, #2A7EFB 100%);
		background-position: left bottom, left top;
		background-repeat: no-repeat;
		background-size: 100% 120rpx, 100% 100%;

		.inner {
			height: 356rpx;
		}
	}

	.order-details {
		position: absolute;
		width: 100%;
		padding: 0 20rpx;
	}

	.height-add {
		height: calc(120rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		height: calc(120rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
	}

	.giveGoods {
		.item {
			padding: 14rpx 30rpx 14rpx 0;
			margin-left: 30rpx;
			border-top: 1px solid #eee;

			.picTxt {
				.pictrue {
					width: 76rpx;
					height: 76rpx;
					border-radius: 6rpx;
					background-color: #F5F5F5;
					color: #2a7efb;

					.iconfont {
						font-size: 34rpx;
					}

					image {
						width: 100%;
						height: 100%;
						border-radius: 6rpx;
					}

					margin-right: 16rpx;
				}

				.texts {
					width: 360rpx;
					color: #999999;
					font-size: 20rpx;

					.name {
						color: #333;
					}

					.limit {
						font-size: 20rpx;
						margin-top: 4rpx;
					}
				}
			}

			.num {
				color: #999999;
				font-size: 20rpx;
			}
		}
	}

	.splitTitle {
		width: 100%;
		height: 80rpx;
		background-color: #fff;
		margin-top: 17rpx;
		border-bottom: 1px solid #e5e5e5;
		padding: 0 30rpx;
	}

	.splitTitle .title {
		color: #2291f8;
	}

	/*商户管理订单详情*/
	.pos-order-details .header {
		// background: linear-gradient(270deg, #1cd1dc 0%, #2291f8 100%);
	}

	.pos-order-details .header .state {}

	.pos-order-details .header .data {}

	.pos-order-details .header .data .order-num {
		font-size: 26upx;
		margin-bottom: 8upx;
	}

	.pos-order-details .remarks {
		padding-left: 32rpx;
		border-radius: 24rpx;
		background: #FFFFFF;
	}

	.pos-order-details .remarks .iconfont {
		font-size: 32rpx;
		color: #000000;
	}

	.pos-order-details .remarks input {
		flex: 1;
		height: 100rpx;
		padding-left: 20rpx;
		font-size: 28rpx;
	}

	.pos-order-details .remarks input::placeholder {
		color: #CCCCCC;
	}

	.pos-order-details .orderingUser {
		font-size: 26upx;
		color: #282828;
		padding: 0 30upx;
		height: 67upx;
		background-color: #fff;
		margin-top: 16upx;
		border-bottom: 1px solid #f5f5f5;
	}

	.pos-order-details .orderingUser .iconfont {
		font-size: 40upx;
		color: #2a7efb;
		margin-right: 15upx;
	}

	.pos-order-details .address {
		margin-top: 0;
	}

	.pos-order-details .footer .more {
		font-size: 27upx;
		color: #aaa;
		width: 100upx;
		height: 64upx;
		text-align: center;
		line-height: 64upx;
		margin-right: 25upx;
		position: relative;
	}

	.pos-order-details .footer .delivery {
		border-color: #2A7EFB !important;
		background: #2A7EFB;
		color: #FFFFFF !important;
	}

	.pos-order-details .footer .more .order .arrow {
		width: 0;
		height: 0;
		border-left: 11upx solid transparent;
		border-right: 11upx solid transparent;
		border-top: 20upx solid #e5e5e5;
		position: absolute;
		left: 15upx;
		bottom: -18upx;
	}

	.pos-order-details .footer .more .order .arrow:before {
		content: '';
		width: 0;
		height: 0;
		border-left: 9upx solid transparent;
		border-right: 9upx solid transparent;
		border-top: 19upx solid #fff;
		position: absolute;
		left: -10upx;
		bottom: 0;
	}

	.pos-order-details .footer .more .order {
		width: 200upx;
		background-color: #fff;
		border: 1px solid #eee;
		border-radius: 10upx;
		position: absolute;
		top: -200upx;
		z-index: 9;
	}

	.pos-order-details .footer .more .order .item {
		height: 77upx;
		line-height: 77upx;
	}

	.pos-order-details .footer .more .order .item~.item {
		border-top: 1px solid #f5f5f5;
	}

	.pos-order-details .footer .more .moreName {
		width: 100%;
		height: 100%;
	}

	/*订单详情*/
	.order-details .header {
		padding: 48rpx 0 30rpx 12rpx;
	}

	.order-details .header.on {
		background-color: #666 !important;
	}

	.order-details .header .pictrue {
		width: 110upx;
		height: 110upx;
	}

	.order-details .header .pictrue image {
		width: 100%;
		height: 100%;
	}

	.order-details .header .state {
		font-weight: 500;
		font-size: 36rpx;
		line-height: 50rpx;
		color: #FFFFFF;
	}

	.order-details .header .data {
		margin-top: 8rpx;
		font-size: 26rpx;
		line-height: 36rpx;
		color: #FFFFFF;
	}

	.order-details .header.on .data {
		margin-left: 0;
	}

	.order-details .header .data .state {
		font-size: 30upx;
		font-weight: bold;
		color: #fff;
		margin-bottom: 7upx;
	}

	/* .order-details .header .data .time{margin-left:20upx;} */
	.order-details .nav {
		background-color: #fff;
		font-size: 26upx;
		color: #282828;
		padding: 25upx 0;
	}

	.order-details .nav .navCon {
		padding: 0 40upx;
	}

	.order-details .nav .navCon .on {
		font-weight: bold;
		color: #e93323;
	}

	.order-details .nav .progress {
		padding: 0 65upx;
		margin-top: 10upx;
	}

	.order-details .nav .progress .line {
		width: 100upx;
		height: 2upx;
		background-color: #939390;
	}

	.order-details .nav .progress .iconfont {
		font-size: 25upx;
		color: #939390;
		margin-top: -2upx;
		width: 30upx;
		height: 30upx;
		line-height: 33upx;
		text-align: center;
		margin-right: 0 !important;
	}

	.order-details .address {
		position: relative;
		padding: 32rpx 32rpx 40rpx;
		border-radius: 24rpx;
		margin-top: 20rpx;
		background: #FFFFFF;
		overflow: hidden;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #999999;
	}

	.order-details .address .name {
		margin-bottom: 12rpx;
		font-weight: 500;
		font-size: 30rpx;
		line-height: 42rpx;
		color: #333333;
	}

	.order-details .address .name .iconfont {
		margin-right: 8rpx;
		font-size: 32rpx;
	}

	.order-details .address .name .phone {
		margin-left: 40upx;
	}

	.order-details .line {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 4rpx;
	}

	.order-details .line image {
		width: 100%;
		height: 100%;
		display: block;
	}

	.order-details .wrapper {
		padding: 32rpx 24rpx;
		border-radius: 24rpx;
		margin-top: 20rpx;
		background: #FFFFFF;
	}

	.order-details .wrapper .item {
		font-size: 28rpx;
		line-height: 40rpx;
		color: #333333;
	}

	.order-details .wrapper .item~.item {
		margin-top: 24rpx;
	}

	.order-details .wrapper .item .conter {
		// color: #868686;
		// width: 468rpx;
		// display: flex;
		// flex-wrap: nowrap;
		// justify-content: flex-end;
		// text-align: right;

		.pictrue {
			width: 80rpx;
			height: 80rpx;
			margin-left: 6rpx;

			image {
				width: 100%;
				height: 100%;
				border-radius: 6rpx;
			}
		}
	}

	.order-details .wrapper .item .conter .copy {
		height: 36rpx;
		padding: 0 12rpx;
		border: 0;
		border-radius: 18rpx;
		margin-left: 8rpx;
		background: #F5F5F5;
		font-size: 22rpx;
		line-height: 36rpx;
		color: #333333;
	}

	.order-details .wrapper .actualPay {
		margin-top: 26rpx;
	}

	.order-details .wrapper .actualPay .money {
		font-weight: bold;
		font-size: 30upx;
		color: #e93323;
	}

	.order-details .footer {
		width: 100%;
		height: 100upx;
		position: fixed;
		bottom: 0;
		left: 0;
		background-color: #fff;
		padding: 0 30upx;
		border-top: 1px solid #eee;
		height: calc(100rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		height: calc(100rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
		padding-bottom: calc(0rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		padding-bottom: calc(0rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
	}

	.order-details .footer .wait {
		color: #2a7efb;
		margin-right: 30rpx;
	}

	.order-details .footer .btn {
		width: 144rpx;
		height: 56rpx;
		border: 1rpx solid #CCCCCC;
		line-height: 54rpx;
		text-align: center;
		border-radius: 28rpx;
		font-size: 24rpx;
		color: #333333;
		transform: rotateZ(360deg);

		&.on {
			color: #c5c8ce !important;
			background: #f7f7f7 !important;
			border: 1px solid #dcdee2 !important;
		}
	}

	.order-details .footer .btn.default {
		color: #444;
		border: 1px solid #444;
	}

	.order-details .footer .btn~.btn {
		margin-left: 16rpx;
	}

	.pos-order-goods {
		padding: 32rpx 24rpx;
		border-radius: 24rpx;
		background: #FFFFFF;
	}

	.pos-order-goods.split {
		margin-top: 20rpx;
	}

	.pos-order-goods .title {
		height: 80upx;
		border-bottom: 1px solid #e5e5e5;
		padding: 0 30upx;
	}

	.pos-order-goods .btn {
		padding: 7upx 20upx;
		border: 1px solid #2a7efb;
		color: #2a7efb;
		border-radius: 30upx;
	}

	.pos-order-goods .goods~.goods {
		margin-top: 32rpx;
	}

	.pos-order-goods .goods .picTxt {
		flex: 1;
		min-width: 0;
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
		margin-top: 8rpx;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #999999;
	}

	.pos-order-goods .goods .money {
		width: 144rpx;
		text-align: right;
	}

	.pos-order-goods .goods .money .writeOff {
		font-size: 24upx;
		margin-top: 17upx;
		color: #1890FF;
	}

	.pos-order-goods .goods .money .writeOff .on {
		color: #FF7E00;
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

	.copy-data {
		font-size: 10px;
		color: #333;
		-webkit-border-radius: 1px;
		border-radius: 1px;
		border: 1px solid #666;
		padding: 0px 7px;
		margin-left: 12px;
		height: 20px;
	}

	.user-box {
		padding: 24rpx;
		border-radius: 24rpx;
		margin-top: 20rpx;
		background: #FFFFFF;

		.image {
			width: 80rpx;
			height: 80rpx;
			border-radius: 50%;
		}

		.text {
			flex: 1;
			padding-left: 20rpx;
			font-size: 24rpx;
			line-height: 34rpx;
			color: #999999;
		}

		.name {
			margin-bottom: 4rpx;
			font-weight: 500;
			font-size: 28rpx;
			line-height: 40rpx;
			color: #333333;
		}

		.svip {
			width: 56rpx;
			height: 26rpx;
			border-radius: 14rpx;
			margin-left: 12rpx;
			background: linear-gradient(90deg, #484643 0%, #1F1B17 100%);
			text-align: center;
			font-weight: 600;
			font-size: 18rpx;
			line-height: 26rpx;
			color: #FDDAA4;
		}

		.grade {
			height: 26rpx;
			padding: 0 10rpx;
			border: 1rpx solid #FACC7D;
			border-radius: 14rpx;
			margin-left: 10rpx;
			background: #FEF0D9;
			font-weight: 500;
			font-size: 18rpx;
			line-height: 24rpx;
			color: #DFA541;
			transform: rotateZ(360deg);

			.iconfont {
				margin-right: 6rpx;
				font-size: 18rpx;
			}
		}
	}
</style>
