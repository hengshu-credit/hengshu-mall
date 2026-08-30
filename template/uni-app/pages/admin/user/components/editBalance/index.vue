<template>
	<base-drawer mode="bottom" :visible="visible" background-color="transparent" mask maskClosable @close="closeDrawer">
		<view class="edit-balance rd-t-40rpx">
			<view class="title">修改{{type? '积分' : '余额'}}
			  <view class="close acea-row row-center-wrapper" @tap="closeDrawer">
				  <text class="iconfont icon-iconfontguanbi"></text>
			  </view>
			</view>
			<view class="list">
				<view class="item acea-row row-between-wrapper">
					<view>修改{{type? '积分' : '余额'}}</view>
					<view class="acea-row row-middle">
						<view class="itemn acea-row row-middle" :class="current == index?'on':''" v-for="(item, index) in navList" :key="index" @click="navTap(index)">
							<text class="iconfont" :class="current == index?'icon-ic_Selected':'icon-ic_unselect'"></text>
							<text>{{item}}</text>
						</view>
					</view>
				</view>
				<view class="item acea-row row-between-wrapper">
					<view>{{type? '积分' : '余额'}}</view>
					<view class="acea-row row-middle">
						<input type="number" v-model="numeral" :placeholder="type? '请填写积分' : '请填写余额'" placeholder-class="placeholder"/>
						<text class="iconfont icon-ic_edit"></text>
					</view>
				</view>
			</view>
			<view class="footer acea-row row-between-wrapper">
				<view class="bnt acea-row row-center-wrapper" @click="closeDrawer">取消</view>
				<view class="bnt on acea-row row-center-wrapper" @click="define">确定</view>
			</view>
		</view>
	</base-drawer>	
</template>

<script>
import {
	postUserUpdateOther
} from "@/api/admin";
export default {
	props:{
		visible: {
		    type: Boolean,
		    default: false,
		},
		type: {
		    type: Number,
		    default: 0,
		},
		uid: {
			type: Number,
			default: 0
		}
	},
	watch: {
		type: {
			handler(newValue, oldValue) {
				if(newValue){
					this.navList = ['增加积分','减少积分']
				}else{
					this.navList = ['增加余额','减少余额']
				}
			},
			immediate: true
		}
	},
	data(){
		return{
			navList:[],
			current:0,
			numeral:0
		}
	},
	mounted: function() {},
	methods:{
		navTap(index){
			this.current = index
		},
		define(){
			if(this.numeral<=0){
				let title = '';
				if(this.type){
					title = '请填写你要增加或减少的余额'
				}else{
					title = '请填写你要增加或减少的积分'
				}
				this.$util.Tips({
					title: title
				});
				return
			}
			postUserUpdateOther(this.uid,{
				status:this.current + 1,
				number:this.numeral,
				type:this.type
			}).then(res=>{
				this.$util.Tips({
					title: res.msg
				});
				this.numeral = 0;
				this.$emit('successChange');
			}).catch(err=>{
				this.$util.Tips({
					title: err
				});
			})
		},
		closeDrawer() {
		  this.numeral = 0;
		  this.$emit('closeDrawer');
		}
	}
}
</script>

<style lang="scss" scoped>
	.edit-balance{
		background-color: #fff;
		padding-bottom: 60rpx;
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
		.list{
			padding: 0 30rpx;
			.item{
				font-size: 28rpx;
				font-family: PingFang SC, PingFang SC;
				font-weight: 400;
				color: #333333;
				height: 72rpx;
				margin-bottom: 32rpx;
				box-sizing: border-box;
				.icon-ic_edit{
					color: #999999;
				}
				.itemn{
					margin-left: 50rpx;
					color: #999999;
					.iconfont {
						margin-top: 4rpx;
						color: #CCCCCC;
						margin-right: 14rpx;
					}
					&.on {
						color: #333333;
						.iconfont {
							color: #2A7EFB;
						}
					}
				}
				input {
					text-align: right;
					font-size: 36rpx;
					font-family: Regular;
					color: #FF7E00;
				}
				::v-deep.uni-input-input{
					padding-right: 10rpx;
				}
				.placeholder{
					font-size: 28rpx;
					padding-right: 10rpx;
					padding: 6rpx 10rpx 0 0;
				}
			}
		}
		.footer{
			padding: 0 20rpx;
			margin-top: 166rpx;
			.bnt{
				width: 346rpx;
				height: 72rpx;
				border: 2rpx solid #2A7EFB;
				border-radius: 100rpx;
				font-size: 26rpx;
				font-family: PingFang SC, PingFang SC;
				font-weight: 500;
				color: #2A7EFB;
				&.on{
					background: #2A7EFB;
					color: #fff;
				}
			}
		}
	}
</style>