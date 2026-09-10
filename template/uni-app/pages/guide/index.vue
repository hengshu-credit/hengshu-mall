<template>
	<view class="main">
		<guide v-if="guidePages" :advData="advData" :time="advData.time"></guide>
		<!-- #ifdef APP-PLUS -->
		<view v-else class="startup-loading">{{$t(`正在加载`)}}</view>
		<!-- #endif -->
	</view>
</template>

<script>
import guide from '@/components/guide/index.vue';
import { getOpenAdv } from '@/api/api.js';
export default {
	components: {
		guide
	},
	data() {
		return {
			guidePages: false,
			advData: {},
			indexUrl: '/pages/index/index'
		};
	},
	onLoad(options) {
		if (options.spid) {
			this.indexUrl = this.indexUrl + '?spid=' + options.spid;
		}
	},
	onShow() {
		this._leaving = false;
		this.loadExecution();
	},
	methods: {
		loadExecution() {
			const loadId = this._loadId = (this._loadId || 0) + 1;
			clearTimeout(this._advTimer);
			const tagDate = uni.getStorageSync('guideDate') || '',
				nowDate = new Date().toLocaleDateString();
			if (tagDate === nowDate) {
				this.enterHome();
				return;
			}
			const requestOptions = {};
			// #ifdef APP-PLUS
			// 可选广告不能阻塞启动；同时限制网络请求和页面等待，忽略迟到响应。
			requestOptions.timeout = 1200;
			this._advTimer = setTimeout(() => this.enterHome(), requestOptions.timeout);
			// #endif
			getOpenAdv(undefined, requestOptions)
				.then((res) => {
					if (loadId !== this._loadId || this._leaving) return;
					clearTimeout(this._advTimer);
					const data = res.data || {};
					const hasMedia = data.type === 'video'
						? !!data.video_link
						: data.type === 'pic' && Array.isArray(data.value) && data.value.length > 0;
					if (!Number(data.status) || !hasMedia) {
						this.enterHome();
					} else {
						// 播放内容和时长仍由后台“开屏广告”配置控制。
						this.advData = data;
						uni.setStorageSync('guideDate', new Date().toLocaleDateString());
						this.guidePages = true;
					}
				})
				.catch(() => {
					if (loadId === this._loadId) this.enterHome();
				});
		},
		enterHome() {
			if (this._leaving) return;
			this._leaving = true;
			this.cancelLoading();
			uni.switchTab({ url: this.indexUrl });
		},
		cancelLoading() {
			this._loadId = (this._loadId || 0) + 1;
			clearTimeout(this._advTimer);
		}
	},
	onHide() {
		this.cancelLoading();
		this.guidePages = false;
	},
	onUnload() {
		this.cancelLoading();
	}
};
</script>

<style>
page,
.main {
	width: 100%;
	height: 100%;
}
.startup-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	color: #999;
	font-size: 28rpx;
	background: #fff;
}
</style>
