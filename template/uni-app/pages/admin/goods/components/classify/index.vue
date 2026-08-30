<template>
    <base-drawer mode="bottom" :visible="visible" background-color="transparent" mask maskClosable @close="closeDrawer">
        <view class="classify rd-t-40rpx">
            <view class="title">
                修改分类
                <view class="close acea-row row-center-wrapper" @tap="closeDrawer">
                    <text class="iconfont icon-iconfontguanbi"></text>
                </view>
            </view>
            <checkbox-group @change="checkboxChange($event)" v-if="categoryList.length">
                <view class="list acea-row">
                    <view class="item">
                        <view class="tips">一级分类</view>
                        <scroll-view scroll-y="true" class="scroll-Y">
                            <view
                                class="itemn line1"
                                :class="{
                                    checked: index == currentOne,
                                    on: checkedIds.includes(item.id + '')
                                }"
                                v-for="(item, index) in categoryList"
                                :key="index"
                                @click="categoryTap(index)"
                            >
                                <!-- #ifndef MP -->
                                <checkbox
                                    :value="item.id.toString()"
                                    :checked="checkedIds.includes(item.id + '')"
                                    color="#ffffff"
                                    backgroundColor="#ffffff"
                                    activeBackgroundColor="#2A7EFB"
                                    activeBorderColor="#2A7EFB"
                                    style="transform: scale(0.9)"
                                />
                                <!-- #endif -->
                                <!-- #ifdef MP -->
                                <checkbox :value="item.id" :checked="checkedIds.includes(item.id + '')" style="transform: scale(0.9)" color="#ffffff" />
                                <!-- #endif -->
                                {{ item.title }}
                            </view>
                        </scroll-view>
                    </view>
                    <view class="item on" :class="!categoryList[currentOne].children.length ? 'on3' : ''" v-if="categoryList[currentOne]">
                        <view class="tips">二级分类</view>
                        <scroll-view scroll-y="true" class="scroll-Y">
                            <view
                                class="itemn line1"
                                :class="{
                                    checked: jIndex == currentTwo,
                                    on: checkedIds.includes(j.id + '')
                                }"
                                v-for="(j, jIndex) in categoryList[currentOne].children"
                                :key="jIndex"
                                @click="categoryTwoTap(jIndex)"
                            >
                                <!-- #ifndef MP -->
                                <checkbox
                                    :value="j.id.toString()"
                                    :checked="checkedIds.includes(j.id + '')"
                                    color="#ffffff"
                                    backgroundColor="#ffffff"
                                    activeBackgroundColor="#2A7EFB"
                                    activeBorderColor="#2A7EFB"
                                    style="transform: scale(0.9)"
                                />
                                <!-- #endif -->
                                <!-- #ifdef MP -->
                                <checkbox :value="j.id" :checked="checkedIds.includes(j.id + '')" style="transform: scale(0.9)" />
                                <!-- #endif -->
                                {{ j.title }}
                            </view>
                        </scroll-view>
                    </view>
                </view>
            </checkbox-group>
            <view class="empty-box" v-else>
                <emptyPage title="暂无分类～" src="/statics/images/empty-box.png"></emptyPage>
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
import baseDrawer from '@/components/tuiDrawer/tui-drawer.vue';

import { getProductCate, postManageSaveCate } from '@/api/admin';
export default {
    components: {
        emptyPage,
        baseDrawer
    },
    props: {
        visible: {
            type: Boolean,
            default: false
        },
        type: {
            type: Number,
            default: 0
        }
    },
    data: function () {
        return {
            categoryList: [],
            currentOne: 0,
            currentTwo: 0,
            checkedIds: [],
            ids: null //父级商品id
        };
    },
    mounted() {},
    methods: {
        checkboxChange(e, index, item) {
            this.checkedIds = e.detail.value;
        },
        categoryTwoTap(index) {
            this.currentTwo = index;
        },
        categoryTap(index) {
            this.currentOne = index;
            this.currentTwo = 0;
        },
        category(id, cateId) {
            this.ids = id;
            if (cateId) {
                this.checkedIds = cateId.split(',');
            } else {
                this.checkedIds = [];
            }
			if(!this.categoryList.length){
				getProductCate().then((res) => {
					this.categoryList = res.data;
				})
				.catch((err) => {
					this.$util.Tips({
						title: err
					});
				});
			}
            
        },
        reset() {
            this.checkedIds = [];
        },
        define() {
            if (!this.checkedIds.length) {
                this.$util.Tips({
                    title: '请选择分类'
                });
                return;
            }
            let data = {
                cate_id: this.checkedIds,
                ids: this.ids
            };
            if (this.type) {
                this.$emit('successChange', this.checkedIds);
            } else {
                postManageSaveCate(data).then((res) => {
					this.$util.Tips({
						title: res.msg
					});
					this.$emit('successChange');
				})
				.catch((err) => {
					this.$util.Tips({
						title: err
					});
				});
            }
        },
        closeDrawer() {
            this.$emit('closeDrawer');
        }
    }
};
</script>

<style lang="scss" scoped>
::v-deep checkbox .wx-checkbox-input.wx-checkbox-input-checked {
    border: 1px solid $primary-admin;
    background-color: $primary-admin;
    color: #fff;
}
::v-deep checkbox {
    margin-right: 13rpx;
}
::v-deep uni-checkbox .uni-checkbox-input {
    border-radius: 4rpx;
    width: 28rpx;
    height: 28rpx;
}
.classify {
    background-color: #fff;
    padding-bottom: 60rpx;
    .title {
        text-align: center;
        height: 108rpx;
        line-height: 108rpx;
        font-size: 32rpx;
        font-family: PingFang SC, PingFang SC;
        font-weight: 600;
        color: #333333;
        position: relative;
        padding: 0 30rpx;
        .close {
            width: 36rpx;
            height: 36rpx;
            line-height: 36rpx;
            background: #eeeeee;
            border-radius: 50%;
            position: absolute;
            right: 30rpx;
            top: 38rpx;
            .iconfont {
                font-weight: 300;
                font-size: 20rpx;
            }
        }
    }
    .list {
        height: 770rpx;
        .scroll-Y {
            height: 684rpx;
        }
        .item {
            width: 50%;
            padding-left: 32rpx;
            font-size: 26rpx;
            font-family: PingFang SC, PingFang SC;
            font-weight: 400;
            color: #666666;
            padding-top: 30rpx;

            .tips {
                color: #999;
                font-size: 24rpx;
                margin-bottom: 30rpx;
            }

            .itemn {
                margin-bottom: 58rpx;

                &.checked {
                    color: #000;
                }

                &.on {
                    color: $primary-admin;
                }
            }

            &.on {
                background-color: #fafafa;
            }
            &.on2 {
                background-color: #f5f5f5;
            }
            &.on3 {
                width: 66.66%;
            }
        }
    }
    .footer {
        box-sizing: border-box;
        padding: 0 20rpx;
        width: 100%;
        height: 112rpx;
        background-color: #fff;
        position: fixed;
        bottom: 0;
        z-index: 30;
        height: calc(112rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
        height: calc(112rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
        padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
        padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/
        left: 0;

        .bnt {
            width: 347rpx;
            height: 72rpx;
            border-radius: 50rpx;
            border: 1px solid $primary-admin;
            color: $primary-admin;
            font-size: 26rpx;
            font-family: PingFang SC, PingFang SC;
            font-weight: 500;
            &.on {
                background-color: $primary-admin;
                color: #fff;
            }
        }
    }
}
</style>
