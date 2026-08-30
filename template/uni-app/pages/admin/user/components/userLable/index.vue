<template>
	<base-drawer mode="right" :visible="visible" background-color="transparent" mask maskClosable @close="closeDrawer">
		<view class="edit-lable">
			<!-- #ifdef MP -->
			<view class="accountTitle">
				<view :style="{height:getHeight.barTop+'px'}"></view>
				<view class="sysTitle acea-row row-center-wrapper" :style="{height:getHeight.barHeight+'px'}">
					<view>添加标签</view>
				</view>
			</view>
			<view :style="{height:(getHeight.barTop+getHeight.barHeight)+'px'}"></view>
			<view class="list" v-if="isStore" 
			:style="'height: calc(100% - '+(getHeight.barTop+getHeight.barHeight*2+150)+'rpx - constant(safe-area-inset-bottom));height: calc(100% - '+(getHeight.barTop+getHeight.barHeight*2+150)+'rpx - env(safe-area-inset-bottom))'">
			<!-- #endif -->
			<!-- #ifndef MP -->
			<view class="header">添加标签</view>
			<view class="list" v-if="isStore">
			<!-- #endif -->
			  <scroll-view scroll-y="true" style="height: 100%">
				<view class="item" v-for="(item, index) in labelList" :key="index">
					<view class="title" v-if="item.label && item.label.length">{{item.name}}</view>
					<view class="listn acea-row row-middle" v-if="item.label && item.label.length">
						<view class="name acea-row row-center-wrapper" :class="{on:j.disabled}" v-for="(j, indexn) in item.label" :key="indexn" @click="selectLabel(j)">
						  <text class="line1">{{j.label_name}}</text>
						</view>
					</view>
				</view>
			  </scroll-view>
			</view>
			<view class="empty-box" v-else>
				<emptyPage title="暂无标签～" src="/statics/images/empty-box.png"></emptyPage>
			</view>
			<view class="footer acea-row row-between-wrapper">
				<view class="bnt acea-row row-center-wrapper" @tap="reset">重置</view>
				<view class="bnt on acea-row row-center-wrapper" @tap="define">确定</view>
			</view>
		</view>
	</base-drawer>
</template>

<script>
import emptyPage from '@/components/emptyPage.vue';
import {
	getUserLabel,
	postUserUpdateOther
} from "@/api/admin";
import { handleError } from "vue";
export default {
	components: {
		emptyPage
	},
	props:{
		visible: {
		    type: Boolean,
		    default: false,
		},
	},
	data: function() {
	  return {
		  // #ifdef MP
		  getHeight: this.$util.getWXStatusHeight(),
		  // #endif
		  labelList:[],
		  goodsInfo:{}, //列表中已存在id（固定不变）
		  dataLabel: [], //已存在选中id(随着选中可以变化)
		  isStore:false, //判断是否存在标签
		  num:0, // 判断是否为批量
		  ids:[] //批量时的id集合
	  };
	},
	mounted() {
	},
	methods:{
		define(){
			let labelIds = []
			this.dataLabel.forEach(item=>{
				labelIds.push(item.id)
			})
			postUserUpdateOther(this.num?this.ids:this.goodsInfo.uid,{
				type:6,
				label_id:labelIds
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
		reset(){
			this.productLabel(this.goodsInfo,this.num,this.ids);
		},
		inArray: function (search, array) {
		  for (let i in array) {
		    if (array[i].id == search) {
		      return true;
		    }
		  }
		  return false;
		},
		productLabel(data,num,ids){
			this.dataLabel = data.label_id || [];
			this.goodsInfo = JSON.parse(JSON.stringify(data));
			this.num = num;
			this.ids = ids;
			getUserLabel(0).then(res=>{
				res.data.map(el => {
				  if (el.label && el.label.length) {
				    this.isStore = true;
				    el.label.map(label => {
				      if (this.inArray(label.id, this.dataLabel)) {
				        label.disabled = true;
				      } else {
				        label.disabled = false;
				      }
				    })
				  }
				})
				this.labelList = res.data
			}).catch(err=>{
				this.$util.Tips({
					title: err
				});
			})
		},
		selectLabel(label) {
		  if (label.disabled) {
		    let index = this.dataLabel.indexOf(this.dataLabel.filter(d => d.id == label.id)[0]);
		    this.dataLabel.splice(index, 1);
		    label.disabled = false
		  } else {
		    this.dataLabel.push({
				id:label.id,
				label_name:label.label_name
			});
		    label.disabled = true
		  }
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
				.title{
					font-size: 28rpx;
					font-family: PingFang SC, PingFang SC;
					font-weight: 600;
					color: #333333;
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