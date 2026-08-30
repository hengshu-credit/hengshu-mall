<template>
	<view>
		<!-- <NavBar titleText="添加商品" textSize="34rpx" iconColor="#333333" textColor="#333333" isScrolling showBack></NavBar> -->
		<view class="p-20">
			<view class="w-full bg--w111-fff rd-16rpx pt-32 pr-30 pb-32 pl-30">
				<view class="fs-30 fw-500 lh-42rpx">商品信息</view>
				<view class="mt-30 flex-between-center">
					<text class="fs-30 lh-42rpx">商品名称</text>
					<text class="text-24 text--w111-666">{{setFormData.store_name.length}}/40</text>
				</view>
				<view class="w-full bg--w111-f5f5f5 rd-12rpx p-20 mt-12">
					<textarea v-model="setFormData.store_name"
					:maxlength="40"
					placeholder="请填写商品名称" placeholder-class="text--w111-ccc"
					class="fs-30" auto-height />
				</view>
				<view class="mt-40">
					<text class="fs-30 lh-42rpx">商品图片</text>
				</view>
				<view class="fs-22 text--w111-999 mt-12">建议：图片尺寸为750*750px，最多上传9张</view>
				<view class="grid-column-4 grid-gap-8rpx mt-20">
					<view class="relative h-156" v-for="(item,index) in setFormData.slider_image" :key="index">
						<image :src="item" mode="aspectFill" class="w-full h-156 rd-12rpx"></image>
						<view class="abs-rt w-32 h-32 of0b21 flex-center fs-24" @click="DelPic(index)">
							<text class="iconfont icon-iconfontguanbi text--w111-fff fs-20"></text>
						</view>
					</view>
					<view class="h-156 flex-col flex-center upload bg--w111-f5f5f5 text--w111-999 rd-12rpx"
						@click="uploadPicture(9)" v-if="setFormData.slider_image.length < 9">
						<text class="iconfont icon-paizhao fs-40"></text>
						<text class="fs-24 lh-34rpx pt-8">上传图片</text>
					</view>
				</view>
			</view>
			<view class="w-full bg--w111-fff rd-16rpx mt-22 px-30">
				<view class="h-106 flex-between-center bb-e" @click="selectCate">
					<text class="fs-30 lh-42rpx">商品分类</text>
					<view class="flex-y-center">
						<text class="fs-30 text--w111-333 pr-12" v-if="setFormData.cate_id.length">已选择</text>
						<text class="fs-30 text--w111-999 pr-12" v-else>请选择分类</text>
						<text class="iconfont icon-ic_rightarrow fs-36 text--w111-999"></text>
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e">
					<text class="fs-30 lh-42rpx">单位</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="text" maxlength="1" v-model="setFormData.unit_name"  placeholder="请填写商品单位" placeholder-class="text--w111-999 fs-30" class="fs-32 fs-30" />
					</view>
				</view>
			</view>
			<view class="w-full bg--w111-fff rd-16rpx mt-22 pt-32 pr-30 pl-30">
				<view class="fs-30 fw-500 lh-42rpx">规格设置</view>
				<view class="h-106 flex-between-center bb-e">
					<text class="fs-30 lh-42rpx">售价</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="digit" v-model="setFormData.attr.price" placeholder="请输入售价" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e">
					<text class="fs-30 lh-42rpx">成本价</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="digit" v-model="setFormData.attr.cost" placeholder="请输入成本价" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e">
					<text class="fs-30 lh-42rpx">划线价</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="digit" v-model="setFormData.attr.ot_price"  placeholder="请输入划线价" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e">
					<text class="fs-30 lh-42rpx">库存</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="number" v-model="setFormData.attr.stock" placeholder="请输入库存" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e" v-show="isMore">
					<text class="fs-30 lh-42rpx">商品编码</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="number" v-model="setFormData.attr.bar_code" placeholder="请输入规格编码" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e" v-show="isMore">
					<text class="fs-30 lh-42rpx">条形码</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="number" v-model="setFormData.attr.bar_code_number" placeholder="请输入条形码" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e" v-show="isMore">
					<text class="fs-30 lh-42rpx">重量</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="number" v-model="setFormData.attr.weight" placeholder="请输入重量" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-between-center bb-e" v-show="isMore">
					<text class="fs-30 lh-42rpx">体积</text>
					<view class="flex-1 flex justify-end text-right">
						<input type="number" v-model="setFormData.attr.volume" placeholder="请输入体积" placeholder-class=" text--w111-999" class="fs-32" />
					</view>
				</view>
				<view class="h-106 flex-center text--w111-666" @tap="toggleMore">
					<text class="fs-26">{{isMore ? '收起' : '展开'}}</text>
					<text class="iconfont fs-26" :class="isMore ? 'icon-xiangshang2' : 'icon-xiala3'"></text>
				</view>
			</view>
			<view class="w-full bg--w111-fff rd-16rpx mt-22 pt-32 pr-30 pl-30 pb-32">
				<view class="fs-30 lh-42rpx">商品详情</view>
				<view class="fs-22 text--w111-999 mt-12">建议：图片尺寸为750*750px，最多上传10张</view>
				<view class="grid-column-4 grid-gap-8rpx mt-20">
					<view class="relative h-156" v-for="(item,index) in contentPicture" :key="index">
						<image :src="item" mode="aspectFill" class="w-full h-156 rd-12rpx"></image>
						<view class="abs-rt w-32 h-32 of0b21 flex-center fs-24" @click="DelPic(index,'content')">
							<text class="iconfont icon-iconfontguanbi text--w111-fff fs-20"></text>
						</view>
					</view>
					<view class="h-156 flex-col flex-center upload bg--w111-f5f5f5 text--w111-999 rd-12rpx"
						@click="uploadContentPicture(10)" v-if="contentPicture.length < 10">
						<text class="iconfont icon-paizhao fs-40"></text>
						<text class="fs-24 lh-34rpx pt-8">上传图片</text>
					</view>
				</view>
			</view>
			<view class="w-full bg--w111-fff rd-16rpx mt-22 pt-32 pr-30 pl-30">
				<view class="fs-30 lh-42rpx fw-500">其他设置</view>
				<view class="h-106 flex-between-center">
					<view class="fs-30 lh-42rpx">配送方式</view>
					<view class="flex-y-center">
						<checkbox-group class="flex-y-center" @change="deliveryWayChange">
							<label class="ml-48" v-for="(val, i) in deliveryFreeList" :key="val.value">
								<view>
									<checkbox :value="val.value" :checked="setFormData.logistics.includes(val.value)" style="transform:scale(0.8)" />
									<text class="relative top-2">{{ val.name }}</text>
								</view>
							</label>
						</checkbox-group>
					</view>
				</view>
				<view class="h-106 flex-between-center" v-show="setFormData.logistics.includes('1')">
					<view class="fs-30 lh-42rpx">运费设置</view>
					<radio-group class="flex-y-center" @change="feightChange">
						<label class="flex-y-center fs-30">
							<view>
								<radio value="2" :checked="setFormData.freight == 2" />
							</view>
							<view>固定邮费</view>
						</label>
						<label class="flex-y-center fs-30 ml-48">
							<view>
								<radio value="3" :checked="setFormData.freight == 3" />
							</view>
							<view>运费模板</view>
						</label>
					</radio-group>
				</view>
				<view v-show="setFormData.logistics.includes('1')">
					<view class="h-106 flex-between-center" v-if="setFormData.freight == 2">
						<text class="fs-30 lh-42rpx">固定邮费</text>
						<view class="flex-1 flex justify-end text-right">
							<input type="digit" v-model="setFormData.postage" placeholder="请输入金额" placeholder-class=" text--w111-999" class="fs-32" />
						</view>
					</view>
					<view class="h-106 flex-between-center"
						v-if="setFormData.freight == 3">
						<text class="fs-30 lh-42rpx">运费模板</text>
						<view class="flex-y-center">
							<picker @change="bindPickerChange" :value="tempIndex" :range="templateList" range-key="name">
								<view class="fs-30">{{templateList[tempIndex].name || '请选择'}}
								<text class="iconfont icon-ic_rightarrow"></text>
								</view>
							</picker>
						</view>
					</view>
				</view>
			</view>
			<view class="pb-safe">
				<view class="h-200"></view>
			</view>
			<view class="fixed-lb w-full pb-safe bg--w111-fff z-10">
			    <view class="footer-box flex-center">
			        <view class="w-690 h-88 flex-center bg-mer text--w111-fff fs-28 rd-44rpx" @tap="confirmSave">提交</view>
			    </view>
			</view>
		</view>
		<classify
		  ref="classify"
		  :type="1"
		  :visible="visibleClass"
		  @closeDrawer="()=>{visibleClass = false}"
		  @successChange="successChange"
		></classify>
		<canvas canvas-id="canvas" v-if="canvasStatus"
			:style="{width: canvasWidth + 'px', height: canvasHeight + 'px',position: 'absolute',left:'-100000px',top:'-100000px'}"></canvas>
	</view>
</template>

<script>
import NavBar from "@/components/NavBar.vue";
import classify from "./components/classify/index.vue";
import { getTemplateOption, productCreate } from "@/api/admin.js"
export default {
	name: "addGoods",
	components: { NavBar, classify },
	data(){
		return {
			canvasWidth: "",
			canvasHeight: "",
			canvasStatus: false,
			setFormData: {
				image: '', //主图
				attr: {
					price: "",
					cost: "",
					ot_price: "",
					stock: "",
					bar_code: "",
					bar_code_number: "",
					weight: "",
					volume: "",
					is_default_select: 0,
					is_show : 1,
					pic: ""
				},
				slider_image: [],
				store_name: '',
				cate_id: '',
				unit_name: '',
				spec_type: 0,
				logistics: ['1','2'],
				freight: 2,
				temp_id: 0,
				content: "",
				is_show: 0,
				postage: 0
			},
			deliveryFreeList: [
				{value: '1',name: '快递'},
				{value: '2',name: '到店'},
			],
			contentPicture: [],
			isMore: false,
			visibleClass: false,
			templateList: [],
			tempIndex: 0
		}
	},
	onLoad(){
		this.getTemlate();
	},
	methods: {
		uploadPicture(){
			let that = this;
			this.canvasStatus = true
			that.$util.uploadImageChange({ count: 9, url: 'upload/image' }, function(res) {
				that.setFormData.slider_image.push(res.data.url);
				if(that.setFormData.slider_image.length >= 9) that.setFormData.slider_image.length = 9;
				that.setFormData.image = that.setFormData.slider_image[0];
				that.setFormData.attr.pic = that.setFormData.slider_image[0];
			}, (res) => {
				this.canvasStatus = false
			}, (res) => {
				this.canvasWidth = res.w
				this.canvasHeight = res.h
			});
		},
		uploadContentPicture(){
			let that = this;
			this.canvasStatus = true
			that.$util.uploadImageChange({ count: 9, url: 'upload/image' }, function(res) {
				that.contentPicture.push(res.data.url);
			}, (res) => {
				this.canvasStatus = false
			}, (res) => {
				this.canvasWidth = res.w
				this.canvasHeight = res.h
			});
		},
		/**
		 * 将图片链接数组转换为富文本 HTML
		 * @param {string[]} urls 图片链接数组
		 * @param {object} opts 可选项
		 * @param {string} opts.wrapTag 包裹标签，默认 'p'
		 * @param {string} opts.className img 的 class，默认 ''
		 * @param {string} opts.style 内联样式，例如 'max-width:100%;height:auto;'
		 * @param {string} opts.alt 默认的 alt 文本
		 * @returns {string} 富文本 HTML 字符串
		 */
		buildEditorImageHtml(
		  urls = [],
		  { wrapTag = 'p', className = '', style = 'max-width:100%;height:auto;', alt = '图片' } = {}
		) {
		  const clean = (v) => String(v).replace(/[`'"]/g, '').trim(); // 去除反引号/引号/空格
		  const isUrl = (u) => /^https?:\/\/.+/i.test(u);              // 简单校验 http/https

		  return urls
		    .filter(Boolean)
		    .map(clean)
		    .filter(isUrl)
		    .map((url) => {
		      const cls = className ? ` class="${className}"` : '';
		      const sty = style ? ` style="${style}"` : '';
		      return `<${wrapTag}><img src="${url}" alt="${alt}"${cls}${sty} /></${wrapTag}>`;
		    })
		    .join('');
		},
		DelPic(index, type) {
			if(type){
				this.contentPicture.splice(index,1);
			}else{
				this.setFormData.slider_image.splice(index, 1);
			}
		},
		selectCate(){
			this.$refs.classify.category('', this.setFormData.cate_id.toString());
			setTimeout(()=> {
			  this.visibleClass = true;
			}, 200);
		},
		successChange(val) {
			this.setFormData.cate_id = val;
			this.visibleClass = false;
		},
		toggleMore(){
			this.isMore = !this.isMore;
		},
		// 送货方式选择
		deliveryWayChange(obj) {
			this.setFormData.logistics = obj.detail.value;
		},
		feightChange(val){
			this.setFormData.freight = val.detail.value;
		},
		getTemlate(){
			getTemplateOption().then(res=>{
				this.templateList = res.data;
			})
		},
		bindPickerChange(e){
			this.tempIndex = e.detail.value;
			this.setFormData.temp_id = this.templateList[this.tempIndex].id;
		},
		confirmSave(){
			if(!this.setFormData.store_name) return this.$util.Tips({title: '请输入商品名称'});
			if(!this.setFormData.image) return this.$util.Tips({title: '请上传商品图片'});
			if(!this.setFormData.cate_id) return this.$util.Tips({title: '请选择商品分类'});
			if(!this.setFormData.unit_name) return this.$util.Tips({title: '请填写商品单位'});
			if(!this.setFormData.attr.price) return this.$util.Tips({title: '请填写商品售价'});
			if(!this.setFormData.attr.cost) return this.$util.Tips({title: '请填写商品成本价'});
			if(!this.setFormData.attr.ot_price) return this.$util.Tips({title: '请填写商品划线价'});
			if(!this.setFormData.attr.stock) return this.$util.Tips({title: '请填写商品库存'});
			if(!this.setFormData.logistics.length) return this.$util.Tips({title: '请选择配送方式'});
			if(this.setFormData.freight == 3 && this.setFormData.temp_id == 0) return this.$util.Tips({title: '请选择运费模版'});
			const html = this.buildEditorImageHtml(this.contentPicture);
			this.$set(this.setFormData,'content',html);
			productCreate(this.setFormData).then(res=>{
				uni.showToast({
					title: "提交成功",
					icon: 'none'
				})
				uni.redirectTo({
					url:'/pages/admin/goods/index'
				})
			}).catch(err=>{
				uni.showToast({
					title: err,
					icon: 'none'
				})
			})
		}
	}
}
</script>

<style lang="scss">
::v-deep uni-radio .uni-radio-input.uni-radio-input-checked,
::v-deep radio .wx-radio-input.wx-radio-input-checked {
 border: 1px solid $primary-admin!important;
 background-color: $primary-admin!important;
}
::v-deep checkbox .uni-checkbox-input.uni-checkbox-input-checked,
::v-deep checkbox .wx-checkbox-input.wx-checkbox-input-checked {
  border: 1px solid $primary-admin!important;
  background-color: $primary-admin!important;
  color: #fff!important;
}
::v-deep uni-checkbox .uni-checkbox-input, wx-checkbox .wx-checkbox-input{
	border-radius: unset !important;
}
.grid-gap-8rpx {
	grid-gap: 8rpx;
	gap: 8rpx;
}
.of0b21{
	background-color: rgba(0,0,0,0.5);
	border-radius: 0 12rpx 0 12rpx;
}
.bb-e{
	border-bottom: 1rpx solid #eee;
}
.icon-a-ic_CompleteSelect{
	color: $primary-admin;
}
.bg-mer{
	background-color: $primary-admin;
}
.h-156{
	height: 156rpx;
}
.pt-8{
	padding-top: 8rpx;
}
.px-30{
	padding: 0 30rpx;
}
.footer-box {
    height: 126rpx;
    .w-690 {
        width: 690rpx;
    }
}
.ml-48{
	margin-left: 48rpx;
}
.top-2{
	top: 2rpx;
}

</style>
