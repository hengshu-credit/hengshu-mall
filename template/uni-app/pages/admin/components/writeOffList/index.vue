<template>
	<view>
		<view class='shoppingCart copy-data'>
			<view class="content">
				<view class='list'>
					<view>
						<block v-for="(item,index) in cart_info" :key="index">
							<view class='item acea-row row-between-wrapper' :style="{ opacity: item.is_writeoff == 1 ? 0.5 : 1 }">
								<div class="xuan" @click="dan(item.cart_id,index)">
									<view :class="(item.checked && !item.is_writeoff)?'iconfont icon-a-ic_CompleteSelect':'iconfont icon-ic_unselect'"></view>
								</div>
								<view class='picTxt acea-row row-between-wrapper'>
									<view class='pictrue'>
										<image :src="item.cart_info.productInfo.attrInfo?item.cart_info.productInfo.attrInfo.image:item.cart_info.productInfo.image" mode=""></image>
									</view>
									<view class='text'>
										<view class="title">
											<view class='line1'>
												{{ item.cart_info.productInfo.store_name }}
											</view>
											<view v-if="item.is_writeoff == 1" class="txt">已核销</view>
											<view v-if="item.is_writeoff == 0 && item.surplus_num == item.cart_num" class="txt bluecol">未核销</view>
											<view v-if="item.is_writeoff == 0 && item.surplus_num != item.cart_num" class="txt orangcol">
												已核销{{item.cart_num - item.surplus_num}}件</view>
										</view>
										<view class='infor line1'>
											属性：{{ item.cart_info.productInfo.attrInfo.suk }}</view>
										<view class='money he row-middle'>
											<view>￥{{ item.cart_info.productInfo.attrInfo?item.cart_info.productInfo.attrInfo.price:item.cart_info.productInfo.price }}</view>
											<view v-if="item.is_writeoff == 1" class="txt">
												<view class='carnum acea-row row-center-wrapper'>
													<view class="reduce">
														<text class="iconfont icon-ic_Reduce"></text>
													</view>
													<view class='nums'>0</view>
													<view class="plus">
														<text class="iconfont icon-ic_increase"></text>
													</view>
												</view>
											</view>
											<view v-else class="txt">
												<view class='carnum acea-row row-center-wrapper'>
													<view v-if="item.surplus_num_input == 1" class="reduce bggary">
														<text class="iconfont icon-ic_Reduce"></text>
													</view>
													<view v-else class="reduce" @click.stop='subCart(item,index)'>
														<text class="iconfont icon-ic_Reduce"></text>
													</view>
													<view class='nums'>{{item.surplus_num_input}}</view>
													<view v-if="item.surplus_num == item.surplus_num_input" class="plus bggary">
														<text class="iconfont icon-ic_increase"></text>
													</view>
													<view v-else class="plus" @click.stop='addCart(item,index)'>
														<text class="iconfont icon-ic_increase"></text>
													</view>
												</view>
											</view>
										</view>
									</view>
								</view>
							</view>
						</block>
					</view>
				</view>
			</view>
			<view class='footer acea-row row-between-wrapper'>
				<view>
					<view class="flex">
						<div class="xuan" @click="checkAll" v-model="checked">
							<view class="iconfont" :class="checked?'icon-a-ic_CompleteSelect':'icon-ic_unselect'"></view>
						</div>
						<text class='checkAll'>全选</text>
					</view>
				</view>
				<view>
					<button class='money' type="primary" @click="verification">{{checked?'一键':'确认'}}核销({{numChecked}})</button>
				</view>
			</view>
		</view>
		<view v-if="box">
			<view class="box">
				<view class="small_box">
					<view class="content">
						<view class="font">核销成功</view>
						<view v-if="list.total_num == parseInt(list.writeoff_count)+writeOffNum" class="small_font">当前订单已完成核销</view>
						<view v-else class="small_font">该订单仍有其他待核销商品</view>
					</view>
					<view class="acea-row btn-box">
						<view v-if="lets == 1 && list.total_num == parseInt(list.writeoff_count)+writeOffNum" class="btn" @click="ok(1)">知道了</view>
						<navigator v-if="lets > 1 && list.total_num != parseInt(list.writeoff_count)+writeOffNum" :url='"/pages/admin/distribution/scanning/index?code="+attr.code' hover-class='none'
							open-type="redirect" class="btn">返回列表</navigator>
						<navigator v-if="(lets > 1 && list.total_num == parseInt(list.writeoff_count)+writeOffNum)||(lets==1&&list.total_num != parseInt(list.writeoff_count)+writeOffNum)"
							url="/pages/admin/distribution/index" hover-class='none' open-type="redirect" class="btn">返回首页</navigator>
						<view v-if="list.total_num != parseInt(list.writeoff_count)+writeOffNum" class="btn on" @click="ok(0)">继续核销</view>
						<navigator v-if="lets > 1 && list.total_num == parseInt(list.writeoff_count)+writeOffNum" :url='"/pages/admin/distribution/scanning/index?code="+attr.code' open-type="redirect"
							hover-class='none' class="btn">核销其他订单</navigator>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		orderCartInfo,
		orderWriteoff
	} from '@/api/admin'
	import {
		emit
	} from 'process';
	export default {
		props: {
			list: {
				type: Object,
				default () {
					return {}
				}
			},
			auth: {
				type: [String, Number],
				default: 1
			},
			oid: {
				type: Number,
				default: 0
			},
		},
		data() {
			return {
				nums: [],
				newList: [],
				reduce_show: -1,
				plus_show: -1,
				ids: [], //选定需要核销的id
				lets: 0, //判断订单的数量
				listlet: 0, //判断订单商品的数量
				attr: { //切换组件传值
					cartAttr: false,
					id: [],
					code: '',
					type: 0
				},
				// id: 0, //订单ID
				// list: [],
				lists: {},
				lengt: 0,
				box: false,
				checked: false,
				checkModel: [],
				isAllSelect: false,
				data: [{
					id: '1',
					value: 'aaa'
				}, {
					id: '2',
					value: 'bbb'
				}, {
					id: '3',
					value: 'ccc'
				}],
				writeOffNum: 0, //每次核销商品数量
				cart_info: [],
				numChecked: 0,
			};
		},
		watch: {
			checkModel() {
				// if (this.lengt == this.checkModel.length) {
				// 	this.checked = true;
				// } else {
				// 	this.checked = false;
				// }
			},
		},
		mounted() {
			this.cart_info = this.list.cart_info;
			// this.lists = JSON.parse(JSON.stringify(this.list))
			// this.listlet = this.list.cart_info.length
			// this.$set(this.attr, 'id', this.list.id);
			this.checkAll()
			// this.num()
		},
		methods: {
			//处理每一条数据的最大值
			num() {
				for (let index = 0; index < this.lists.cart_info.length; index++) {
					this.nums.push({
						num: 0
					});
				}
			},
			subCart(item, index) {
				// if (item.surplus_num == 1) {
				// 	this.reduce_show = index;
				// } else {
				// 	this.nums[index].num--
				// 	item.surplus_num--
				// }
				this.list.cart_info[index].surplus_num_input--;
			},
			addCart(item, index) {
				// if (item.surplus_num == item.surplus_num + this.nums[index].num) {
				// 	this.plus_show = index;
				// } else {
				// 	item.surplus_num++
				// 	this.nums[index].num++
				// }
				this.list.cart_info[index].surplus_num_input++;
			},
			checkAll() {
				var items = this.cart_info,
					data = [];
				this.checkModel = [];
				this.checked = !this.checked;
				for (let i = 0; i < this.cart_info.length; i++) {
					this.cart_info[i].checked = this.checked;
					if (this.cart_info[i].checked) {
						this.checkModel.push(this.cart_info[i].cart_id);
					}
				}
				let numChecked = 0;
				for (let i = 0; i < this.cart_info.length; i++) {
					if (!this.cart_info[i].is_writeoff) {
						if (this.cart_info[i].checked) {
							numChecked = numChecked + this.cart_info[i].surplus_num_input;
						}
					}
				}
				this.numChecked = numChecked;
				// if (this.checked) {
				// 	for (var i = 0, lenI = this.list.cart_info.length; i < lenI; ++i) {
				// 		const item = items[i]
				// 		this.$set(item, 'checked', false)
				// 	}
				// } else {
				// 	for (var i = 0, lenI = this.list.cart_info.length; i < lenI; ++i) {
				// 		const item = items[i]

				// 		this.$set(item, 'checked', true)
				// 		if (item.is_writeoff == 1) {
				// 			this.checkModel = this.checkModel.filter(item => item != item.cart_id)
				// 		} else {
				// 			this.checkModel.push(item.cart_id)
				// 		}
				// 	}
				// 	this.lengt = this.checkModel.length
				// }
			},
			dan(id, index) {
				// if (this.checkModel.indexOf(id) == -1) {
				// 	this.$set(this.list.cart_info[index], 'checked', true)
				// 	this.checkModel.push(id)
				// } else {
				// 	this.$set(this.list.cart_info[index], 'checked', false)
				// 	this.checkModel = this.checkModel.filter(item => item != id)
				// }
				this.cart_info[index].checked = !this.cart_info[index].checked;
				this.checkModel = [];
				for (let i = 0; i < this.cart_info.length; i++) {
					if (this.cart_info[i].checked) {
						this.checkModel.push(this.cart_info[i].cart_id);
					}
				}
				let checked = true;
				for (let i = 0; i < this.cart_info.length; i++) {
					if (!this.cart_info[i].is_writeoff) {
						if (!this.cart_info[i].checked) {
							checked = false;
						}
					}
				}
				this.checked = checked;
				let numChecked = 0;
				for (let i = 0; i < this.cart_info.length; i++) {
					if (!this.cart_info[i].is_writeoff) {
						if (this.cart_info[i].checked) {
							numChecked = numChecked + this.cart_info[i].surplus_num_input;
						}
					}
				}
				this.numChecked = numChecked;
			},
			getList: function(id) {
				orderCartInfo({
					oid: id,
					auth: 2,
				}).then(res => {
					this.list = res.data
					this.lists = JSON.parse(JSON.stringify(res.data))
					this.listlet = res.data.cart_info.length
					this.$set(this.attr, 'id', this.list.id);
					this.checkAll()
					this.num()
				})
			},
			onDataId: function(id) {
				this.nums.forEach((item) => {
					item.num = 0
				})
				this.id = id;
				this.getList(id)
			},
			switchs() {
				this.attr.cartAttr = true;
				this.$refs.writeOff.getList(2)
			},
			onMyEvent() {
				this.attr.cartAttr = false;
			},
			verification() {
				let that = this
				let newObj = [];
				for (let i = 0; i < this.cart_info.length; i++) {
					if (this.cart_info[i].checked && !this.cart_info[i].is_writeoff) {
						newObj.push({
							cart_id: this.cart_info[i].cart_id,
							cart_num: this.cart_info[i].surplus_num_input,
						});
					}
				}
				// return
				// let obj = {};
				// 将数组转化为对象
				// for (let key in this.checkModel) {
				// 	obj[key] = this.checkModel[key];
				// };
				// let newObj = Object.keys(obj).map(val => ({
				// 	cart_id: obj[val],
				// }));
				//处理列表内对应的核销数的数值
				// for (var i = 0; i < newObj.length; i++) {
				// 	for (var j = 0; j < this.list.cart_info.length; j++) {
				// 		if (newObj[i].cart_id == this.list.cart_info[j].cart_id) {
				// 			newObj[i].cart_num = this.list.cart_info[j].surplus_num;
				// 		}
				// 	}
				// }
				this.newList = newObj
				if (that.checkModel.length == 0) {
					that.$util.Tips({
						title: '请选择商品'
					});
				} else {
					uni.showLoading({
						title: '加载中',
					});
					let num = 0;
					newObj.forEach((item) => {
						num = num + parseInt(item.cart_num)
					})
					this.writeOffNum = num;
					setTimeout(function() {
						orderWriteoff({
							auth: that.auth,
							oid: that.oid,
							cart_ids: that.newList
						}).then(res => {
							uni.hideLoading();
							// that.box = true
							let isAll = 1;
							for (let i = 0; i < that.list.cart_info.length; i++) {
								if (that.list.cart_info[i].checked) {
									if (that.list.cart_info[i].surplus_num != that.list.cart_info[i].surplus_num_input) {
										isAll = 0
										break;
									}
								}
							}
							that.$emit('success', isAll);
						}).catch(err => {
							that.$util.Tips({
								title: err
							});
							uni.hideLoading();
						})
					}, 1000);
				}
			},
			// 所有订单核销完成
			ok(type) {
				this.box = false
				this.nums.forEach((item) => {
					item.num = 0
				})
				this.getList(this.id)
				if (type) {
					uni.redirectTo({
						url: '/pages/admin/distribution/index'
					})
				}
			}
		}
	}
</script>

<style scoped lang="scss">
	.shoppingCart {
		padding: 24rpx 20rpx;
	}
	.shoppingCart .content {
		padding: 32rpx 24rpx;
		margin-top: 20rpx;
		border-radius: 24rpx;
		background: #FFFFFF;
	
		.list_top {
			background-color: #FFFFFF;
			font-size: 28upx;
			color: #333333;
			height: 90upx;
			line-height: 90upx;
			padding-left: 24upx;
			border-bottom: 2upx solid #EEEEEE;
	
			.bluefont {
				color: $primary-admin;
				display: inline-block;
				margin: 0upx 10upx;
			}
	
			.garyfont {
				color: #999999;
			}
		}
	}
	.shoppingCart .list .item .xuan .iconfont {
		font-size: 40rpx;
		color: #CCCCCC;
	}

	.shoppingCart .list .item .xuan .icon-a-ic_CompleteSelect {
		color: $primary-admin;
	}

	.shoppingCart .list .item .picTxt {
		// width: 627upx;
		position: relative;
		flex: 1;
		min-width: 0;
		padding-left: 16rpx;
	}

	.shoppingCart .list .item .picTxt .pictrue {
		width: 136rpx;
		height: 136rpx;
	}

	.shoppingCart .list .item .picTxt .pictrue image {
		width: 100%;
		height: 100%;
		border-radius: 16rpx;
	}

	.shoppingCart .list .item .picTxt .text {
		flex: 1;
		min-width: 0;
		padding-left: 20rpx;
		font-size: 28upx;
		color: #282828;
	}

	.shoppingCart .list .item .picTxt .text .reColor {
		color: #999;
		width: 60%;
	}

	.shoppingCart .list .item .picTxt .text .title {
		display: flex;
		justify-content: space-between;
		font-size: 28rpx;
		line-height: 40rpx;
		color: #333333;

		.bluecol {
			color: $primary-admin;
		}

		.orangcol {
			color: #FF7E00;
		}

		.graycol {
			color: #CCCCCC;
		}
	}

	.shoppingCart .list .item .picTxt .text .title .line1 {
		flex: 1;
	}

	.shoppingCart .list .item .picTxt .text .title .top {
		width: 70%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 28upx;
		font-weight: 400;
	}

	.shoppingCart .list .item .picTxt .text .reElection {
		margin-top: 20upx;
	}

	.shoppingCart .list .item .picTxt .text .reElection .title {
		font-size: 24upx;
	}

	.shoppingCart .list .item .picTxt .text .reElection .reBnt {
		width: 120upx;
		height: 46upx;
		border-radius: 23upx;
		font-size: 26upx;
	}

	.shoppingCart .list .item .picTxt .text .infor {
		font-size: 22rpx;
		line-height: 30rpx;
		color: #999999;
		margin-top: 12rpx;
	}

	.shoppingCart .list .item .picTxt .text .money {
		font-size: 36rpx;
		line-height: 36rpx;
		color: #333333;
		margin-top: 18rpx;
		font-family: Regular;
	}

	.shoppingCart .list .item .picTxt .carnum {
		height: 36rpx;
		// position: absolute;
		// bottom: 7upx;
		// right: 0;
	}

	.shoppingCart .list .item .picTxt .carnum view {
		// border: 1upx solid #a4a4a4;
		width: 32rpx;
		text-align: center;
		height: 100%;
		line-height: 36rpx;
		font-size: 24rpx;
		color: #333333;
	}

	.shoppingCart .list .item .picTxt .carnum .reduce {
		border-right: 0;
		border-radius: 30upx 0 0 30upx;
	}

	.shoppingCart .list .item .picTxt .carnum .reduce.on {
		border-color: #e3e3e3;
		color: #dedede;
	}

	.shoppingCart .list .item .picTxt .carnum .plus {
		border-left: 0;
		border-radius: 0 30upx 30upx 0;
	}

	.shoppingCart .list .item .picTxt .carnum .num {
		color: #282828;
	}

	.shoppingCart .list .item .picTxt .carnum .num0 {
		color: #a4a4a4;
	}

	.shoppingCart .list .item .picTxt .carnum .nums {
		width: 72rpx;
		border-radius: 4rpx;
		background: #F5F5F5;
	}
	.shoppingCart .footer {
		// z-index: 999;
		width: 100%;
		background: #FFFFFF;
		position: fixed;
		padding: 0 20rpx 0 32rpx;
		box-sizing: border-box;
		bottom: 0;
		left: 0;
		height: 96rpx;
		height: calc(96rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
		height: calc(96rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
		padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
		padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/
	}

	.shoppingCart .footer.on {
		// #ifndef H5
		bottom: 0upx;
		// #endif
	}

	.shoppingCart .footer .iconfont {
		font-size: 40rpx;
		color: #CCCCCC;
	}

	.shoppingCart .footer .icon-a-ic_CompleteSelect {
		color: $primary-admin;
	}

	.shoppingCart .footer .checkAll {
		font-size: 28upx;
		color: #282828;
		margin-left: 16upx;
	}
	.shoppingCart .footer .money {
		font-size: 24rpx;
		height: 64rpx;
		padding: 0 32rpx;
		background: #2A7EFB;
		border-radius: 32rpx;
		font-weight: 400;
		color: #FFFFFF;
		line-height: 64rpx;
	}

	.shoppingCart .footer .placeOrder {
		color: #fff;
		font-size: 30upx;
		width: 226upx;
		height: 70upx;
		border-radius: 50upx;
		text-align: center;
		line-height: 70upx;
		margin-left: 22upx;
	}

	.shoppingCart .footer .button .bnt {
		font-size: 28upx;
		color: #999;
		border-radius: 50upx;
		border: 1px solid #999;
		width: 160upx;
		height: 60upx;
		text-align: center;
		line-height: 60upx;
	}

	.shoppingCart .footer .button form~form {
		margin-left: 17upx;
	}
	.writeoff {
		opacity: 0.6;
	}
	
	.he {
		display: flex;
		justify-content: space-between;
	
		.txt {
			font-size: 22upx;
	
		}
	}
	
	.box {
		position: fixed;
		top: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		z-index: 10;
		background-color: #78797a;
	
		.small_box {
			position: fixed;
			top: 50%;
			right: 75rpx;
			left: 75rpx;
			padding: 40rpx;
			border-radius: 32rpx;
			background: #FFFFFF;
			transform: translateY(-50%);
	
			image {
				width: 100%;
				height: 228upx;
			}
	
			.content {
				// height: 200upx;
				text-align: center;
	
				.font {
					font-weight: 500;
					font-size: 32rpx;
					line-height: 52rpx;
					color: #333333;
				}
	
				.small_font {
					margin-top: 24rpx;
					font-size: 30rpx;
					line-height: 42rpx;
					color: #666666;
				}
			}
	
			.btn-box {
				margin-top: 40rpx;
			}
	
			.btn {
				flex: 1;
				height: 72rpx;
				border: 1rpx solid $primary-admin;
				border-radius: 36rpx;
				margin-left: 32rpx;
				transform: rotateZ(360deg);
				text-align: center;
				font-weight: 500;
				font-size: 26rpx;
				line-height: 70rpx;
				color: #2A7EFB;
	
				&:first-child {
					margin-left: 0;
				}
	
				&.on {
					background: $primary-admin;
					color: #FFFFFF;
				}
			}
		}
	}
	.uni-p-b-96 {
		height: 96upx;
	}
</style>