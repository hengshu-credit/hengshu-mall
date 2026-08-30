<template>
	<base-drawer mode="bottom" :visible="visible" background-color="transparent" mask maskClosable @close="closeDrawer">
		<view class="coupon rd-t-40rpx">
			<view class="title">优惠券
			  <view class="close acea-row row-center-wrapper" @tap="closeDrawer">
				  <text class="iconfont icon-iconfontguanbi"></text>
			  </view>
			</view>
			<view class="search acea-row row-middle" v-if="num !=2">
				<text class="iconfont icon-ic_search"></text>
				<input class="inputs" placeholder='请输入优惠券名称' placeholder-class='placeholder' confirm-type='search' name="search"
					v-model="keyword" @confirm="searchSubmit"></input>
			</view>
			<view class="list" v-if="couponList.length">
				<scroll-view scroll-y="true" style="max-height: 800rpx;min-height: 500rpx;">
					<view class="item acea-row row-middle" v-for="(item,index) in couponList" :key="index">
						<view class="bg">
							<view class="price">¥<text class="num">{{item.coupon_price}}</text></view>
							<view class="reduction">满{{item.use_min_price}}可用</view>
						</view>
						<view class="text">
							<view class="name line1">{{item.coupon_title}}</view>
							<view class="type" v-if="item.type === 0">通用优惠券</view>
							<view class="type" v-if="item.type === 1">品类优惠券</view>
							<view class="type" v-if="item.type === 2">商品优惠券</view>
							<view class="time" v-if="item.coupon_time">有效期：{{item.coupon_time}}天</view>
							<view class="time" v-else>有效期：{{ item.start_use_time | dateFormat }}{{ item.start_use_time ? '-' : '' }}{{ item.end_use_time | dateFormat }}</view>
						</view>
						<view v-if="num !=2" class="bnt acea-row row-center-wrapper" @click="send(item)">发送</view>
					</view>
					<view class="tips">没有更多了～</view>
				</scroll-view>
			</view>
			<view class="empty-box" v-else>
				<emptyPage title="暂无优惠券～" src="/statics/images/noCoupon.png"></emptyPage>
			</view>
		</view>
	</base-drawer>
</template>

<script>
import emptyPage from '@/components/emptyPage.vue';
import {
	getUserCoupon,
	postUserUpdateOther
} from "@/api/admin";
export default {
	components: {
		emptyPage
	},
	filters: {
		dateFormat(time) {
			if (!time) return '';
			let date = new Date(time * 1000);
			let y = date.getFullYear();
			let m = date.getMonth() + 1;
			m = m < 10 ? ('0' + m) : m;
			let d = date.getDate();
			d = d < 10 ? ('0' + d) : d;
			return y + '/' + m + '/' + d;
		}
	},
	props:{
		visible: {
		    type: Boolean,
		    default: false,
		},
		uid: {
			type: Number,
			default: 0
		}
	},
	data(){
		return{
			keyword:'',
			couponList:[],
			num:0, //1用户批量，0单独用户，前两个是发送优惠券；点击获取优惠券时： 2是查看当前用户优惠券，否则获取优惠券
			ids:[]
		}
	},
	mounted: function() {},
	methods:{
		send(item){
			postUserUpdateOther(this.num ? this.ids:this.uid,{
				type:4,
				coupon_id:item.id
			}).then(res=>{
				this.$util.Tips({
					title: res.msg
				});
				this.$emit('closeDrawer',1);
			}).catch(err=>{
				this.$util.Tips({
					title: err
				});
			})
		},
		searchSubmit(){
			this.userCoupon();
		},
		userCoupon(num,ids){
			this.num = num;
			this.ids = ids;
			getUserCoupon({
				coupon_title:this.keyword,
				uid:this.num==2?this.uid:0
			}).then(res=>{
			   this.couponList = res.data
			}).catch(err=>{
				this.$util.Tips({
					title: err
				});
			})
		},
		closeDrawer() {
		  this.keyword = '';
		  this.$emit('closeDrawer');
		}
	}
}
</script>

<style lang="scss" scoped>
	.empty-box{
		padding: 0 20rpx;
		margin-bottom: 20rpx;
	}
	.coupon{
		background-color:#F5F5F5;
		padding-bottom: 1rpx;
		.title{
			text-align: center;
			height: 108rpx;
			line-height: 108rpx;
			font-size: 32rpx;
			font-family: PingFang SC, PingFang SC;
			font-weight: 600;
			color: #333333;
			position: relative;
			padding: 0 30rpx;
			.close{
				width: 36rpx;
				height: 36rpx;
				line-height: 36rpx;
				background: #EEEEEE;
				border-radius: 50%;
				position: absolute;
				right: 30rpx;
				top:38rpx;
				.iconfont {
					font-weight: 300;
					font-size: 20rpx;
				}
			}
		}
		.search{
			width: 710rpx;
			height: 72rpx;
			background: #FFFFFF;
			border-radius: 50rpx;
			padding: 0 34rpx;
			margin: 24rpx auto;
			
			&.on{
				width: 618rpx;
			}
			
			.iconfont{
				color: #999;
				font-size: 32rpx;
				margin-right: 16rpx;
			}
			.inputs{
				font-size: 28rpx;
				width: 100%;
				height: 100%;
				flex: 1;
			}
			.placeholder{
				color: #ccc;
			}
		}
		.list{
			padding: 0 20rpx;
			.item{
				background-color: #fff;
				border-radius: 30rpx;
				margin-bottom: 20rpx;
				.bg{
					background-image: url('../../../static/coupon.png');
					background-repeat: no-repeat;
					background-size: 100% 100%;
					width: 188rpx;
					height: 170rpx;
					font-size: 22rpx;
					font-family: PingFang SC, PingFang SC;
					font-weight: 400;
					color: #FFFFFF;
					text-align: center;
					padding: 32rpx 0;
					.price{
						font-size: 28rpx;
						font-weight: 600;
						.num{
							font-size: 52rpx;
							font-family:'Regular';
						}
					}
					.reduction{
						margin-top: 14rpx;
						color: rgba(255, 255, 255, 0.7);
					}
				}
				.text{
					margin-left: 20rpx;
					font-family: PingFang SC, PingFang SC;
					.name{
						font-size: 28rpx;
						font-weight: 600;
						color: #333333;
						width: 336rpx;
					}
					.type{
						font-size: 20rpx;
						font-weight: 400;
						color: #666666;
						margin-top: 8rpx;
					}
					.time{
						font-size: 20rpx;
						font-weight: 400;
						color: #999999;
						margin-top: 20rpx;
					}
				}
				.bnt{
					width: 112rpx;
					height: 52rpx;
					background: #E9F2FE;
					border-radius: 26rpx;
					font-size: 22rpx;
					font-family: PingFang SC, PingFang SC;
					font-weight: 500;
					color: #2A7EFB;
					margin-left: 34rpx;
				}
			}
			.tips{
				font-size: 26rpx;
				font-family: PingFang SC, PingFang SC;
				font-weight: 400;
				color: #CCCCCC;
				text-align: center;
				margin: 32rpx 0;
				margin-bottom: calc(32rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
				margin-bottom: calc(32rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
			}
		}
	}
</style>