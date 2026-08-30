<template>
	<view>
		<!-- #ifdef MP || APP -->
		<NavBar titleText="配送员" :iconColor="iconColor" :textColor="iconColor" :isScrolling="isScrolling" showBack></NavBar>
		<!-- #endif -->
		<view class="headerBg"></view>
		<view class="order-index">
			<view class="header acea-row row-middle">
				<image :src="user.avatar" class="avatar"></image>
				<view class="text">
					<view class="name line1">{{ user.nickname }}</view>
					<view class="phone">{{ user.phone }}</view>
				</view>
				<view class="item">
					<!-- #ifdef APP-PLUS || MP-WEIXIN -->
					<view class="item">
						<view class="iconfont icon-ic_Scan ite" @click="to"></view>
					</view>
					<!-- #endif -->
					<!-- #ifdef H5 -->
					<view v-if="isWeixin" class="item">
						<view class="iconfont icon-ic_Scan ite" @click="to"></view>
					</view>
					<!-- #endif -->
				</view>
			</view>
			<view v-show="footer == 'tongji'" class="">
				<view class="wrapper">
					<view class="title acea-row row-between row-middle">
						<view class="uni-list-cell-db" @click="hiddened">
							<picker @change="bindPickerChange" :range="arrays" @cancel="cancel">
								<label class="aa">{{array.length && array[index].name}}</label>
								<text class='iconfont' :class='hidden==true?"icon-ic_downarrow":"icon-ic_uparrow"'></text>
							</picker>
						</view>
						<view class="tab acea-row">
							<view class="box" :class="detailtabs== 'today' ? 'on':''" @click="detailtab('today')">今日</view>
							<view class="box" :class="detailtabs== 'yesterday' ? 'on':''" @click="detailtab('yesterday')">昨日</view>
							<view class="box" :class="detailtabs== 'month' ? 'on':''" @click="detailtab('month')">本月</view>
						</view>
					</view>
					<Loading :loaded="loaded" :loading="loading"></Loading>
					<view class="list acea-row" v-if="!loading">
						<view class="item">
							<view class="num">{{ census.unsend || 0 }}</view>
							<view>待配送</view>
						</view>
						<view class="item">
							<view class="num">{{ census.send || 0 }}</view>
							<view>已配送</view>
						</view>
						<view class="item">
							<view class="num">{{ census.send_price || 0 }}</view>
							<view>配送金额</view>
						</view>
					</view>
				</view>
				<view class="public-wrapper">
					<view class="title">
						<view class="uni-list-cell-db" @click="hiddened">
							详细数据
						</view>
					</view>
					<view class="nav acea-row row-between-wrapper">
						<view class="data">日期</view>
						<view class="browse">订单数</view>
						<view class="turnover">配送金额</view>
					</view>
					<Loading :loaded="loaded" :loading="loading"></Loading>
					<view v-if="list.length" class="conter">
						<view class="item acea-row row-between-wrapper" v-for="(item, index) in list" :key="index">
							<view class="data">{{ item.time }}</view>
							<view class="browse">{{ item.count }}</view>
							<view class="turnover">¥ {{ item.price }}</view>
						</view>
					</view>
					<view v-else class="unconter">
						<view v-if="!loading">暂无数据</view>
					</view>
				</view>
			</view>
			<view v-show="footer == 'list'" class="tongji-index">
				<view class="tabbar acea-row">
					<view class="item" :class="{ active: type == 1 }">
						<view class="text-box"></view>
						<view class="item-box"></view>
						<view class="inner acea-row row-center row-middle" @click="tab('1')">待配送({{ count.unsend }})</view>
					</view>
					<view class="item" :class="{ active: type == 2 }">
						<view class="text-box"></view>
						<view class="item-box"></view>
						<view class="inner acea-row row-center row-middle" @click="tab('2')">已配送({{ count.send }})</view>
					</view>
				</view>
				<view class="content">
					<view class="item" v-for="(item,index) in orderlist" :key="index" @click="jump(item.id)">
						<view class="item-top acea-row row-between row-middle">
							<view class="">订单号：{{ item.order_id }}</view>
							<view style="color: #FF7E00;">{{type == 1?'待配送':'已配送'}}</view>
						</view>
						<view class="item-center acea-row">
							<scroll-view v-if="item.cart_id.length > 1" class="goods-section scroll-view" scroll-x="true">
								<image v-for="(value, i) in item._info" :key="i" :src="value.cart_info.productInfo.image" class="image"></image>
							</scroll-view>
							<view v-else class="goods-section">
								<view v-for="(value, i) in item._info" :key="i" class="acea-row">
									<image :src="value.cart_info.productInfo.image" class="image"></image>
									<view class="name-wrap">
										<view class="name line2">{{ value.cart_info.productInfo.store_name }}</view>
										<view class="attr line1">{{ value.cart_info.productInfo.attrInfo.suk }}</view>
									</view>
								</view>
							</view>
							<view class="money-section">
								<baseMoney :money="item.pay_price" symbolSize="20" integerSize="32" decimalSize="20"></baseMoney>
								<view class="num">共{{ item.total_num }}件</view>
							</view>
						</view>
						<view class="item-bottom acea-row">
							<view>配送地址：</view>
							<view class="info">{{ item.user_address }}</view>
						</view>
						<!-- <view class="content_box" v-for="(val, key) in item._info" :key="key">
							<image :src="val.cart_info.productInfo.image" mode=""></image>
							<view class="content_box_title">
								<view class="txt">
									<view class="textbox"><text class="icon-color" v-if="val.cart_info.is_gift">[赠品]</text>{{ val.cart_info.productInfo.store_name }}</view>
									<view>x {{ val.cart_info.cart_num }}</view>
								</view>
								<p class="attribute">属性：{{ val.cart_info.productInfo.attrInfo.suk }}</p>
								<p>¥ {{ val.cart_info.productInfo.attrInfo.price }} </p>
							</view>
						</view> -->
						<!-- <view class="content_bottom">
							<view></view>
							<view>共{{ item.total_num }}件商品，订单实付：<span class="money">￥{{ item.pay_price }}</span></view>
						</view> -->
					</view>
					<emptyPage v-if="!orderlist.length && !loading" title="暂无数据～" src="/statics/images/noOrder.gif"></emptyPage>
				</view>
				<Loading :loaded="loaded" :loading="loading"></Loading>
			</view>
		</view>
		<view class="footer">
			<view class="footer-inner acea-row">
				<view class="tab acea-row row-column row-center row-middle" :class="footer == 'list'?'on':''" @click="footerTab('list')">
					<image v-if="footer == 'list'" :src="imgHost+'/statics/images/admin-order-menu2.png'" class="image"></image>
					<image v-else :src="imgHost+'/statics/images/admin-order-menu1.png'" class="image"></image>
					<view class="font">订单列表</view>
				</view>
				<view class="tab acea-row row-column row-center row-middle" :class="footer == 'tongji'?'on':''" @click="footerTab('tongji')">
					<image v-if="footer == 'tongji'" :src="imgHost+'/statics/images/admin-order-menu4.png'" class="image"></image>
					<image v-else :src="imgHost+'/statics/images/admin-order-menu3.png'" class="image"></image>
					<view class="font">数据统计</view>
				</view>
			</view>
			<view class="safe-area-inset-bottom"></view>
		</view>
		<view class="footer-placeholder"></view>
		<view class="safe-area-inset-bottom"></view>
	</view>
</template>

<script>
	import {
		// getStatisticsInfo,
		// getStatisticsMonth,
		deliveryInfo,
		deliveryStatistics,
		deliveryList,
		deliveryOrderList,
		orderWriteoffInfo
	} from "@/api/admin";
	import Loading from '@/components/Loading/index.vue';
	import emptyPage from '@/components/emptyPage.vue'
	// #ifdef MP || APP
	import NavBar from '@/components/NavBar.vue';
	// #endif
	import {
		HTTP_REQUEST_URL
	} from '@/config/app';
	export default {
		name: 'adminOrder',
		components: {
			Loading,
			emptyPage,
			// #ifdef MP || APP
			NavBar,
			// #endif
		},
		data() {
			return {
				hidden: true,
				index: 0,
				detailtabs: 'today',
				footer: 'list',
				type: '1',
				arrays: [], //展示下拉时的数据
				array: [], //下拉时选择的数据
				storeInfoid: 0, //下拉时选择的数据ID 
				census: {},
				list: [],
				orderlist: [],
				count: {},
				page: 1,
				limit: 15,
				loaded: false,
				loading: false,
				user: {},
				ids: '',
				verify_code: '',
				// #ifdef H5
				isWeixin: this.$wechat.isWeixin(),
				// #endif
				imgHost: HTTP_REQUEST_URL,
				// #ifdef MP || APP
				iconColor: '#FFFFFF',
				isScrolling: false,
				// #endif
			}
		},
		onLoad() {
			// this.getIndex();
			// this.init()
			this.userInfo();
			this.footerTab('list')

			// this.$scroll(this.$refs.container, () => {
			// 	!this.loading && this.getList();
			// });
		},
		methods: {
			userInfo() {
				deliveryInfo().then(res => {
					this.user = res.data
					this.array = res.data.store_info.map(a => a);
					this.arrays = res.data.store_info.map(a => a.name);
					let obj = {
						id: 0,
						name: '全部'
					}
					this.array.unshift(obj);
					this.arrays.unshift(obj.name);
				})
			},
			getStatistics() {
				let data = {
					store_id: this.storeInfoid,
					data: this.detailtabs
				}
				deliveryStatistics(data).then(res => {
					this.census = res.data
				})
			},
			deliveryLists() {
				let data = {
					page: this.page,
					limit: this.limit,
					store_id: this.storeInfoid,
					data: this.detailtabs
				}
				if (this.loading || this.loaded) return;
				this.loading = true
				deliveryList(data).then(res => {
					this.loading = false
					this.loaded = res.data.length < this.limit
					this.page += 1
					// this.list = res.data
					this.list.push.apply(this.list, res.data);
				})
			},
			getOrderList() {
				if (this.loading || this.loaded) return;
				this.loading = true
				deliveryOrderList({
					type: this.type,
					page: this.page,
					limit: this.limit
				}).then(res => {
					this.loading = false
					this.count = res.data.data
					this.loaded = res.data.list.length < this.limit
					this.page += 1
					let arr = [];
					for (let i = 0; i < res.data.list.length; i++) {
						arr = [];
						for (let j = 0; j < res.data.list[i].user_address.length; j++) {
							if (res.data.list[i].user_address[j] != ' ') {
								arr.push(res.data.list[i].user_address[j]);
							}
						}
						res.data.list[i].user_address = arr.join('');
					}
					this.orderlist.push.apply(this.orderlist, res.data.list);
				})
			},
			init: function() {
				this.orderlist = [];
				this.list = [];
				this.page = 1;
				this.loaded = false;
				this.loading = false;
			},
			to() {
				var self = this;
				// #ifdef MP || APP
				uni.scanCode({
					scanType: ["qrCode", "barCode"],
					success(res) {
						self.verify_code = res.result
						self.codeChange();
					},
					fail(res) {},
				})
				// #endif
				//#ifdef H5
				this.$wechat.wechatEvevt('scanQRCode', {
					needResult: 1,
					scanType: ["qrCode", "barCode"]
				}).then(res => {
					let result = res.resultStr;
					if (result.includes(',')) {
						result = result.split(",")[1]
					}
					this.verify_code = result
					this.codeChange();
				});
				//#endif
			},
			// 立即核销
			codeChange: function() {
				let self = this
				let ref = /^[0-9]*$/;
				if (!this.verify_code) return self.$util.Tips({
					title: '请输入核销码'
				});
				if (!ref.test(this.verify_code)) return self.$util.Tips({
					title: '请输入正确的核销码'
				});
				self.$util.Tips({
					title: '查询中'
				});
				setTimeout(() => {
					orderWriteoffInfo(2, {
						verify_code: self.verify_code,
						code_type: 2
					}).then(res => {
						if (res.status == 200) {
							uni.navigateTo({
								url: './scanning/index?code=' + self.verify_code
							})
						} else {
							self.$util.Tips({
								title: res.msg
							});
						}
					}).catch(err => {
						self.$util.Tips({
							title: err
						});
					})
				}, 800);
			},
			footerTab: function(type) {
				this.footer = type
				this.init()
				if (type == 'tongji') {
					this.deliveryLists()
					this.getStatistics()
				}
				if (type == 'list') {
					this.getOrderList()
				}

			},
			tab(type) {
				this.type = type
				this.init()
				this.getOrderList()
			},
			hiddened: function(e) {
				this.hidden = !this.hidden;
			},
			cancel: function() {
				this.hidden = !this.hidden;
			},
			bindPickerChange: function(e) {
				this.hidden = !this.hidden;
				this.index = e.target.value
				this.storeInfoid = this.array[this.index].id
				this.init()
				this.getStatistics()
				this.deliveryLists()
			},
			detailtab: function(type) {
				this.detailtabs = type
				this.init()
				this.deliveryLists()
				this.getStatistics()
			},
			jump: function(id) {
				uni.navigateTo({
					url: 'orderDetail/index?id=' + id
				})
			}
		},
		onReachBottom() {
			if (this.footer == 'tongji') {
				this.deliveryList()
			}
			if (this.footer == 'list') {
				this.getOrderList()
			}
		}
	}
</script>

<style lang="scss" scoped>
	.footer-placeholder {
		height: 100rpx;
	}

	.safe-area-inset-bottom {
		height: 0;
		height: constant(safe-area-inset-bottom);
		height: env(safe-area-inset-bottom);
	}

	.nothing {
		width: 80%;
		margin: 0 auto;
		margin-top: 30px;
		text-align: center;
		color: #cfcfcf;
	}

	.ite {
		font-size: 20px;
	}

	.footer {
		position: fixed;
		left: 0;
		bottom: 0;
		width: 100%;
		background: #FFFFFF;

		.footer-inner {
			height: 100rpx;
		}

		.tab {
			flex: 1;
			font-size: 20rpx;
			line-height: 28rpx;
			color: #333333;

			.image {
				width: 40rpx;
				height: 40rpx;
				margin-bottom: 6rpx;
			}
		}

		.on {
			color: #2A7EFB;

			.font {
				color: #2A7EFB;
			}
		}
	}

	/*订单首页*/
	.headerBg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 516rpx;
		background: linear-gradient(270deg, #01ABF8 0%, #2A7EFB 100%);
	}

	.header {
		padding: 22rpx 40rpx 32rpx 32rpx;

		.avatar {
			width: 80rpx;
			height: 80rpx;
			border-radius: 50%;
		}

		.text {
			flex: 1;
			padding-left: 16rpx;
			font-size: 22rpx;
			line-height: 30rpx;
			color: #FFFFFF;
		}

		.name {
			font-weight: 500;
			font-size: 32rpx;
			line-height: 44rpx;
		}

		.phone {
			margin-top: 4rpx;
		}

		.items,
		.item {
			font-size: 24upx;
			color: #fff;
			height: 120upx;
			display: flex;
			align-items: center;

			image {
				width: 64upx;
				height: 64upx;
				border-radius: 60upx;
				border: 2upx solid #FFFFFF;
			}

			.font {
				display: inline-block;
				margin-left: 16upx;
				margin-right: 16upx;
				font-size: 30upx;
			}
		}
	}

	.order-index {
		position: relative;

		.tongji-index {
			padding: 0 20rpx;
			.empty-page{
				border-top-left-radius: 0;
				border-top-right-radius: 0;
			}
		}

		.tabbar {
			position: relative;
			z-index: 5;
			height: 96rpx;
			border-radius: 24rpx 24rpx 0 0;
			overflow: hidden;

			.item {
				position: relative;
				z-index: 5;
				flex: 1;
				font-size: 28rpx;
				color: #333333;

				&:last-child {
					.item-box {
						border-radius: 18rpx 0 0 0;
						transform: perspective(80rpx) scaleX(1.4) scaleY(1.5) rotateX(20deg) translate(20rpx, 0);
					}

					.text-box {
						border-radius: 0 24rpx 0 0;
					}
				}

				&.active {
					font-weight: 500;
					color: #2A7EFB;

					.item-box {
						display: block;
					}
				}
			}

			.text-box {
				position: absolute;
				bottom: 0;
				width: 100%;
				height: 78rpx;
				border-radius: 24rpx 0 0 0;
				background: rgba(255, 255, 255, 0.95);
			}

			.item-box {
				display: none;
				position: absolute;
				bottom: 0;
				z-index: 2;
				width: 100%;
				height: 96rpx;
				border-radius: 0 18rpx 0 0;
				background: #FFFFFF;
				transform-origin: center bottom;
				transform: perspective(80rpx) scaleX(1.4) scaleY(1.5) rotateX(20deg) translate(-20rpx, 0);
			}

			.inner {
				position: absolute;
				bottom: 0;
				z-index: 3;
				width: 100%;
				height: 78rpx;
			}
		}

		.content {
			.item {
				padding: 32rpx 24rpx;
				border-radius: 24rpx;
				margin-bottom: 20rpx;
				background: #FFFFFF;

				&:first-child {
					border-radius: 0 0 24rpx 24rpx;
				}
			}

			.item-top {
				font-size: 28rpx;
				line-height: 40rpx;
				color: #333333;
			}

			.item-center {
				margin-top: 26rpx;
			}

			.goods-section {
				flex: 1;
				min-width: 0;
				white-space: nowrap;

				.image {
					width: 136rpx;
					height: 136rpx;
					border-radius: 16rpx;
				}

				.name-wrap {
					flex: 1;
					min-width: 0;
					padding-left: 20rpx;
				}

				.name {
					font-size: 28rpx;
					line-height: 40rpx;
					color: #333333;
				}

				.attr {
					margin-top: 12rpx;
					font-size: 24rpx;
					line-height: 34rpx;
					color: #999999;
				}
			}

			.scroll-view {
				box-sizing: border-box;

				.image {
					margin-right: 16rpx;
				}
			}

			.item-bottom {
				padding: 18rpx 20rpx;
				border-radius: 8rpx;
				margin-top: 26rpx;
				background: #F5F5F5;
				font-size: 26rpx;
				line-height: 36rpx;
				color: #333333;

				.info {
					flex: 1;
					color: #999999;
				}
			}

			.scroll-view {
				box-sizing: border-box;

				.image {
					margin-right: 16rpx;
				}
			}

			.money-section {
				width: 102rpx;
				text-align: right;

				.num {
					margin-top: 8rpx;
					font-size: 24rpx;
					line-height: 34rpx;
					color: #999999;
				}
			}
		}
	}

	.order-index .header .icon-saoma {
		font-size: 40rpx;
		padding: 30rpx 20rpx 30rpx 80rpx;
	}

	.order-index .header .item,
	.order-index .header .items {
		font-size: 24upx;
		color: #fff;
		height: 120upx;
		display: flex;
		align-items: center;

	}

	.order-index .header .item .font,
	.order-index .header .items .font {
		display: inline-block;
		margin-left: 16upx;
		margin-right: 16upx;
		font-size: 30upx;

	}

	.order-index .header .items image {
		width: 64upx;
		height: 64upx;
		border-radius: 60upx;
		border: 2upx solid #FFFFFF;
	}

	.order-index .wrapper {
		width: 710rpx;
		border-radius: 24rpx;
		margin: 0 auto;
		background: #FFFFFF;
	}

	.order-index .wrapper .title .iconfont {
		color: #2291f8;
		font-size: 40upx;
		margin-right: 13upx;
		vertical-align: middle;
	}

	.order-index .wrapper .title {
		padding: 32rpx 24rpx;
		font-weight: 500;
		font-size: 30rpx;
		line-height: 42rpx;
		color: #333333;

		.uni-list-cell-db .iconfont {
			font-size: 24rpx;
			color: #CCCCCC;
			margin-left: 12rpx;
		}

		.tab {
			border-radius: 24rpx;
			background: #F5F5F5;

			.box {
				width: 96rpx;
				height: 48rpx;
				border-radius: 24rpx;
				text-align: center;
				font-weight: 400;
				font-size: 24rpx;
				line-height: 48rpx;
				color: #999999;
			}

			.on {
				background: #2A7EFB;
				color: #FFFFFF;
			}
		}
	}


	.order-index .wrapper .list .item {
		flex: 1;
		padding: 30rpx 0 38rpx;
		text-align: center;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #999999;
	}

	.order-index .wrapper .list .item .num {
		margin-bottom: 10rpx;
		font-family: SemiBold;
		font-size: 36rpx;
		line-height: 36rpx;
		color: #333333;
	}

	.public-wrapper .title {
		padding: 32rpx 24rpx 40rpx;
		font-weight: 500;
		font-size: 30rpx;
		line-height: 42rpx;
		color: #333333;

		.uni-list-cell-db .iconfont {
			font-size: 24upx;
			color: #999;
			margin-left: 14upx;
		}

		.tab {
			width: 240upx;
			height: 48upx;
			background: #F5F5F5;
			border-radius: 24upx;
			display: flex;
			justify-content: space-between;
			font-weight: 400;
			color: #999999;
			font-size: 24upx;

			.box {
				width: 82upx;
				height: 48upx;
				border-radius: 24upx;
				text-align: center;
				line-height: 48upx;
			}

			.on {
				background: #1890FF;
				color: #FFFFFF;
			}

		}
	}

	.public-wrapper .title .iconfont {
		color: #2291f8;
		font-size: 40upx;
		margin-right: 13upx;
		vertical-align: middle;
	}

	.public-wrapper {
		width: 710rpx;
		border-radius: 24rpx;
		margin: 20rpx auto 0;
		background: #FFFFFF;
	}

	.public-wrapper .nav {
		padding: 0 40rpx;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #999999;
	}

	.public-wrapper .data {
		width: 45%;
		text-align: left;
	}

	.public-wrapper .browse {
		width: 25%;
	}

	.public-wrapper .turnover {
		width: 30%;
		text-align: right;
	}

	.public-wrapper .conter {
		padding: 0 40rpx;
	}

	.public-wrapper .conter .item {
		padding: 20rpx 0;
		border-bottom: 1px solid #F1F1F1;
		font-size: 24rpx;
		line-height: 34rpx;
		color: #333333;
	}

	.public-wrapper .conter .item .turnover {
		color: #000000;
		font-weight: 400;
	}

	.public-wrapper .unconter {
		text-align: center;
		color: #999;
		padding: 25upx;
	}
</style>