<template>
	<!-- 自定义组件 -->
	<view class='wrapper card' v-if="customForm && customForm.length && isShow">
		<view class='item acea-row row-between' v-for="(item,index) in customForm" :key="index" v-if="(item.value && ['uploadPicture','dateranges'].indexOf(item.name) == -1) || (item.value.length && ['uploadPicture','dateranges'].indexOf(item.name) != -1)">
			<view class="title">{{item.titleConfig.value}}：</view>
			<view v-if="item.name == 'uploadPicture'" class='conter'>
				<view class='pictrue' v-for="(img,indexn) in item.value" :key="indexn">
					<image :src='img' mode="aspectFill" @click='getCustomForm(index,indexn)'></image>
				</view>
			</view>
			<view v-else-if="item.name == 'dateranges'" class="conter">
			   <text v-if="item.value.length">{{item.value[0]+'/'+item.value[1]}}</text>
			</view>
			<view v-else class='conter'>{{item.value}}</view>
		</view>
		<slot name="bottom"></slot>
	</view>
</template>

<script>
	export default {
		name: 'customForm',
		props: {
			customForm:{
				type: Array,
				default: () => []
			}
		},
		data() {
			return {
				isShow:0
			};
		},
		watch: {
			customForm (value) {
				if(value && value.length){
					value.forEach((item)=>{
						if(item.value){
							return this.isShow = 1
						}
					})
				}
			}
		},
		created() {},
		mounted() {},
		methods: {
			getCustomForm: function(index,indexn) {
				uni.previewImage({
					urls: this.customForm[index].value,
					current: this.customForm[index].value[indexn]
				});
			},
		}
	};
</script>

<style lang="scss">
	.wrapper{
		    background-color: #fff;
		    margin-top: 6px;
		    padding: 15px;
	}
	.wrapper .item {
		font-size: 28rpx;
		color: #282828;
	}
	
	.wrapper .item .title{
		width: 200rpx;
	}
	
	.wrapper .item~.item {
		margin-top: 20rpx;
		white-space: normal;
		word-break: break-all;
		word-wrap: break-word;
	}
	
	.wrapper .item .conter {
		color: #868686;
		width: 460rpx;
		display: flex;
		flex-wrap: nowrap;
		justify-content: flex-end;
		text-align: right;
		.pictrue{
			width: 80rpx;
			height: 80rpx;
			margin-left: 6rpx;
			image{
				width: 100%;
				height: 100%;
				border-radius: 6rpx;
			}
		}
	}
</style>
