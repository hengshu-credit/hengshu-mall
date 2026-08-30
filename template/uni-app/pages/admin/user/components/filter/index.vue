<template>
	<base-drawer mode="right" :visible="visible" background-color="transparent" mask maskClosable @close="closeDrawer">
		<view class="edit-lable">
			<!-- #ifdef MP -->
			<view class="accountTitle">
				<view :style="{height:getHeight.barTop+'px'}"></view>
				<view class="sysTitle acea-row row-center-wrapper" :style="{height:getHeight.barHeight+'px'}">
					<view>筛选</view>
				</view>
			</view>
			<view :style="{height:(getHeight.barTop+getHeight.barHeight)+'px'}"></view>
			<view class="list" 
			:style="'height: calc(100% - '+(getHeight.barTop+getHeight.barHeight*2+150)+'rpx - constant(safe-area-inset-bottom));height: calc(100% - '+(getHeight.barTop+getHeight.barHeight*2+150)+'rpx - env(safe-area-inset-bottom))'">
			<!-- #endif -->
			<!-- #ifndef MP -->
			<view class="header">筛选</view>
			<view class="list">
			<!-- #endif -->
			  <scroll-view scroll-y="true" style="height: 100%">
				<view class="item">
					<view class="title">分组</view>
					<view class="listn acea-row row-middle">
						<view class="name acea-row row-center-wrapper" :class="{on:groupIds == item.id}" v-for="(item,groupIndex) in groupArray" :key="groupIndex" @click="selectGroup(item)">
							<text class="line1">{{item.group_name}}</text>
						</view>
					</view>
				</view>
				<view class="item">
					<view class="title">等级</view>
					<view class="listn acea-row row-middle">
						<view class="name acea-row row-center-wrapper" :class="{on:levelIds == item.id}" v-for="(item,levelIndex) in levelArray" :key="levelIndex" @click="selectLevel(item)">
							<text class="line1">{{item.name}}</text>
						</view>
					</view>
				</view>
				<view class="item">
					<view class="title">标签</view>
					<view v-for="(item, index) in labelList" :key="index">
						<view class="titlen" v-if="item.label && item.label.length">{{item.name}}</view>
						<view class="listn acea-row row-middle" v-if="item.label && item.label.length">
							<view class="name acea-row row-center-wrapper" :class="{on:labelIds.includes(j.id)}" v-for="(j, indexn) in item.label" :key="indexn" @click="selectLabel(j)">
							  <text class="line1">{{j.label_name}}</text>
							</view>
						</view>
					</view>
				</view>
			  </scroll-view>
			</view>
			<view class="footer acea-row row-between-wrapper">
				<view class="bnt acea-row row-center-wrapper" @tap="reset">重置</view>
				<view class="bnt on acea-row row-center-wrapper" @tap="define">确定</view>
			</view>
		</view>
	</base-drawer>
</template>

<script>
	import {
		getUserLabel
	} from "@/api/admin";
	export default {
		props:{
			visible: {
			    type: Boolean,
			    default: false,
			},
			groupArray: {
			    type: Array,
			    default: [],
			},
			levelArray: {
			    type: Array,
			    default: [],
			},
		},
		data: function() {
			return {
				// #ifdef MP
				getHeight: this.$util.getWXStatusHeight(),
				// #endif
				labelList:[],
				labelIds:[],
				groupIds:0,
				levelIds:0
			}
		},
		mounted() {
		},
		methods:{
			reset(){
				this.labelIds=[];
				this.groupIds=0;
				this.levelIds=0;
			},
			define(){
				let data = {
					labelIds: this.labelIds.join(','),
					groupIds: this.groupIds,
					levelIds: this.levelIds
				};
				this.$emit('successChange',data);
			},
			selectGroup(item){
				this.groupIds = item.id;
			},
			selectLevel(item){
				this.levelIds = item.id;
			},
			selectLabel(item){
				if(this.labelIds.includes(item.id)){
					this.labelIds = this.labelIds.filter(function (ele){return ele != item.id;});
				}else{
					this.labelIds.push(item.id);
				}
			},
			productLabel(){
				getUserLabel(0).then(res=>{
					this.labelList = res.data
				}).catch(err=>{
					this.$util.Tips({
						title: err
					});
				})
			},
			closeDrawer() {
			  this.$emit('closeDrawer');
			}
		}
	}
</script>

<style lang="scss" scoped>
	.accountTitle{
		position: fixed;
		left:0;
		top:0;
		width: 100%;
		z-index: 99;
		padding-bottom: 6rpx;
		.sysTitle{
			width: 100%;
			position: relative;
			font-weight: 600;
			color: #333333;
			font-size: 34rpx;
			font-family: PingFang SC, PingFang SC;
		}
	}
	.edit-lable{
		background-color: #fff;
		width: 670rpx;
		border-radius: 40rpx 0 0 40rpx;
		height: 100%;
		padding: 20rpx 34rpx 0 32rpx;
		.header{
			text-align: center;
			height: 96rpx;
			line-height: 96rpx;
			font-size: 34rpx;
			font-family: PingFang SC, PingFang SC;
			font-weight: 600;
			color: #333333;
			position: relative;
		}
		.list{
			overflow: auto;
			height: calc(100% - 208rpx );
			height: calc(100% - (208rpx + constant(safe-area-inset-bottom)));
			height: calc(100% - (208rpx + env(safe-area-inset-bottom)));
			.item{
				margin-top: 48rpx;
				&~.item{
					.titlen{
						margin-top: 48rpx;
					}
				}
				.title{
					font-size: 28rpx;
					font-family: PingFang SC, PingFang SC;
					font-weight: 600;
					color: #333333;
				}
				.titlen{
					font-size: 24rpx;
					font-family: PingFang SC, PingFang SC;
					font-weight: 400;
					color: #666666;
					margin-top: 24rpx;
				}
				.listn{
					.name{
						width: 184rpx;
						height: 56rpx;
						background-color: #F5F5F5;
						border-radius: 50rpx;
						border:1rpx solid #F5F5F5;
						font-size: 24rpx;
						font-family: PingFang SC, PingFang SC;
						font-weight: 400;
						color: #333333;
						margin-right: 26rpx;
						margin-top: 24rpx;
						padding: 0 8rpx;
						&.on {
							background-color:#E9F2FE;
							border-color:#2A7EFB;
							color: #2A7EFB;
						}
						&:nth-of-type(3n){
							margin-right: 0;
						}
					}
				}
			}
		}
		.footer{
			width: 100%;
			height: 112rpx;
			position: fixed;
			bottom: 0;
			left:0;
			padding: 0 32rpx;
			background-color: #fff;
			border-radius: 0 0 0 40rpx;
			height: calc(112rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
			height: calc(112rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
			padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
			padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/
			.bnt{
				width: 296rpx;
				height: 72rpx;
				border: 1px solid #2A7EFB;
				border-radius: 200rpx;
				font-size: 26rpx;
				font-family: PingFang SC, PingFang SC;
				font-weight: 600;
				color: #2A7EFB;
				&.on{
					background: #2A7EFB;
					border-color: #2A7EFB;
					color: #fff;
				}
			}
		}
	}
</style>