<template>
	<!-- 底部导航 -->
	<view class="page-footer">
		<view class="foot-item" :class="item.pagePath == activeRouter?'active':''"
		v-for="(item,index) in footerList" :key="index" @click="goRouter(item, index)">
			<block v-if="item.pagePath == activeRouter">
				<image :src="item.selectedIconPath"></image>
				<view class="txt">{{item.text}}</view>
			</block>
			<block v-else>
				<image :src="item.iconPath"></image>
				<view class="txt">{{item.text}}</view>
			</block>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'FooterPage',
		props: {},
		created() {
			let routes = getCurrentPages(); //获取当前打开过的页面路由数组
			let curRoute = routes[routes.length - 1].route //获取当前页面路由
			this.activeRouter = '/' + curRoute
		},
		mounted() {},
		data() {
			return {
				activeRouter:'',
				footerList:[
					{
						pagePath: "/pages/admin/manage/index",
						iconPath: require("../../static/footer1-1.png"),
						selectedIconPath: require("../../static/footer1-2.png"),
						text: "工作台"
					},
					{
						pagePath: "/pages/admin/goods/index",
						iconPath: require("../../static/footer2-1.png"),
						selectedIconPath: require("../../static/footer2-2.png"),
						text: "商品"
					},
					{
						pagePath: "/pages/admin/orderList/index",
						iconPath: require("../../static/footer3-1.png"),
						selectedIconPath: require("../../static/footer3-2.png"),
						text: "订单"
					},
					{
						pagePath: "/pages/admin/user/list",
						iconPath: require("../../static/footer4-1.png"),
						selectedIconPath: require("../../static/footer4-2.png"),
						text: "用户"
					}
				]
			}
		},
		methods: {
			goRouter(item) {
				var pages = getCurrentPages();
				var page = (pages[pages.length - 1]).$page.fullPath;
				if (item.pagePath == page) return

				uni.redirectTo({
				  url: item.pagePath,
				  animationType: 'none' // 关闭默认的滑动效果
				});
			}
		}
	}
</script>

<style scoped lang="scss">
	.page-footer {
		position: fixed;
		bottom: 0;
		left:0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-around;
		width: 100%;
		height: calc(100rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		height: calc(100rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
		box-sizing: border-box;
		border-top: solid 1rpx #F3F3F3;
		background-color: #fff;
		// box-shadow: 0px 0px 17rpx 1rpx rgba(206, 206, 206, 0.32);
		padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
		padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/

		.foot-item {
			display: flex;
			width: max-content;
			align-items: center;
			justify-content: center;
			flex-direction: column;
			position: relative;
			padding: 0 20rpx;
			&.active {
				color: $primary-admin
			}
		}

		.foot-item image {
			height: 40rpx;
			width: 40rpx;
			text-align: center;
			margin: 0 auto;
		}

		.foot-item .txt {
			font-size: 20rpx;
			margin-top: 6rpx;
		}
	}
</style>
