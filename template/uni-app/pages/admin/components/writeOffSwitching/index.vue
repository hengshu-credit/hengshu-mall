<template>
	<!-- 核销订单下拉列表 -->
	<view>
		<view class="product-window"
			:class="(attr.cartAttr === true ? 'on' : '') + ' ' + (iSbnt?'join':'') + ' ' + (iScart?'joinCart':'')">
			<view class="textpic acea-row row-between-wrapper">
				<view class="iconfont icon-guanbi" @click="closeAttr"></view>
			</view>
			<view class="rollTop">
				<view class="scan">
					<view class="header" :style="{backgroundImage:'url('+imgHost+'/statics/images/banner.png'+')'}">
						请选择当前核销订单
					</view>
					<view class="box">
						<view class="content" v-for="(item,index) in list" :key="index"  @click="sure(item.id)">
							<view  class="content_box">
								<image :src="item.image" mode=""></image>
								<view class="content_box_title">
									<p class="textbox">订单号：{{ item.order_id }}</p>
									<p class="attribute mar">下单时间：{{ item.add_time }}</p>
									<view class="txt">
										<p class="attribute">订单实付：¥{{ item.pay_price }}</p>
										<p class="orange" v-if="item._status == 12">部分核销</p>
										<p class="attributes blue" v-if="item._status == 11">未核销</p>
										<slot name="bottom"></slot>
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {orderWriteoffInfo} from '@/api/admin'
	import {HTTP_REQUEST_URL} from '@/config/app';
	export default {
		props: {
			attr: {
				type: Object,
				default: () => {}
			},
			iSbnt: {
				type: Number,
				value: 0
			},
			iScart: {
				type: Number,
				value: 0
			},
		},
		data() {
			return {
				verify_code:'',
				list: [],
				imgHost:HTTP_REQUEST_URL,
			};
		},
		mounted() {},
		methods: {
			closeAttr: function() {
				this.$emit('myevent');
			},
			getList:function(type) {
				this.attr.type = type;
				// uni.showLoading({
				// 	title: '加载中'
				// });
				orderWriteoffInfo(type,{verify_code:this.attr.code,code_type:2}).then(res=>{
					// uni.hideLoading();
					this.list = res.data;
				}).catch(err=>{
					// uni.hideLoading();
					this.$util.Tips({
						title: err
					});
				})
			},
			sure:function(data) {
				this.$emit('dataId',data);
				this.$emit('myevent');
			}
		}
	}
</script>

<style scoped lang="scss">
	.vip-money {
		color: #282828;
		font-size: 28rpx;
		font-weight: 700;
		margin-left: 6rpx;
	}

	.vipImg {
		width: 68rpx;
		height: 27rpx;

		image {
			width: 100%;
			height: 100%;
		}
	}

	.product-window {
		position: fixed;
		bottom: 0;
		width: 100%;
		left: 0;
		background-color: #f5f5f5;
		z-index: 100;
		border-radius: 16rpx 16rpx 0 0;
		transform: translate3d(0, 100%, 0);
		transition: all .3s cubic-bezier(.25, .5, .5, .9);
		padding-bottom: 140rpx;
		padding-bottom: calc(140rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		padding-bottom: calc(140rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
	}

	.product-window.on {
		transform: translate3d(0, 0, 0);
	}

	.product-window.join {
		padding-bottom: 30rpx;
	}

	.product-window.joinCart {
		// padding-bottom: 30rpx;
		z-index: 10000;
	}

	.product-window .textpic {
		padding: 0 130rpx 0 30rpx;
		margin-top: 29rpx;
		position: relative;
	}

	.product-window .textpic .pictrue {
		width: 150rpx;
		height: 150rpx;
	}

	.product-window .textpic .pictrue image {
		width: 100%;
		height: 100%;
		border-radius: 10rpx;
	}

	.product-window .textpic .text {
		width: 410rpx;
		font-size: 32rpx;
		color: #202020;
	}

	.product-window .textpic .text .money {
		font-size: 24rpx;
		margin-top: 40rpx;
	}

	.product-window .textpic .text .money .num {
		font-size: 36rpx;
	}

	.product-window .textpic .text .money .stock {
		color: #999;
		margin-left: 6rpx;
	}

	.product-window .textpic .iconfont {
		position: absolute;
		right: 30rpx;
		top: -5rpx;
		font-size: 35rpx;
		color: #8a8a8a;
	}

	.product-window .rollTop {
		max-height: 700rpx;
		overflow: auto;
		margin-top: 36rpx;
		.scan{
			padding-bottom: 160upx;
			 .header {
				 width: 100%;
				 height: 220upx;
				 // background-image: url(../../static/images/banner.png);
				 background-repeat: no-repeat;   //不重复
				 background-size: 100% 100%;
				 color: #FFFFFF;
				 font-size: 32upx;
				 text-align: center;
				 line-height: 160upx;
				 margin: 0 auto;
			 
			 }
			 .box{
				 margin: -64upx auto 0 auto;
			 }
			 .content{
				 margin: 16upx auto 16upx auto;
				 width: 694upx;
				 // height: 428upx;
				 padding: 28upx 24upx 32upx;
				 background: #FFFFFF;
				 border-radius: 12upx;
				 .pad{padding: 20upx 20upx 22upx;}
				 .content_box{
					 height: 70px;
					 border-radius: 8upx;
					 padding-right: 22upx;
					 display: flex;
					 justify-content: flex-start;
					 align-items: center;
					 image{
						 width: 140upx;
						 height: 140upx;
						 border-radius: 8upx;
					 }
					 .content_box_title{
						 flex: 1;
						 margin-left: 18upx;
						 font-size: 20upx;
						 font-weight: 400;
						 .textbox{
							 white-space: nowrap;
							 text-overflow: ellipsis;
							 overflow: hidden;
							 word-break: break-all;
							 width: 466upx;
							 font-size: 30upx;
							 font-weight: bold;
							 line-height: 21px;
						 }
						 .mar{margin: 16upx 0upx;}
						 .attribute{
							 color: #999999;
							 // margin: 4upx 0upx 10upx;
						 }
						 .txt{
							 display: flex;
							 justify-content: space-between;
							 font-size: 24upx;
							.orange{color: #FF7E00;}
							.blue{color: #1890FF;}
						 }
					 }
				 }
				 .content_bottom{
					 display: flex;
					 justify-content: space-between;
					 font-size: 22upx;
					 padding: 0upx 20upx;
					 color: #666666;
					 .money{
						 font-size: 26upx;
						 color: #F5222D;
					 }
				 }
			 }
		}
	}

</style>
