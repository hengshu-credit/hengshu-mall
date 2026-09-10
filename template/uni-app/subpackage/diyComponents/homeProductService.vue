<template>
  <view class="product-service" v-if="!isHide && hasRows">
    <commonWrapper :config="dataConfig">
      <view class="service-list">
        <!-- Activity -->
        <view
          class="item"
          v-if="checkList.includes(0) && (couponList.length || activities.length)"
        >
          <view class="label" :style="{ color: titleColor }">{{
            $t("活动")
          }}</view>
          <view class="content" @click="activityTap">
            <view class="tags-wrapper">
              <!-- Coupon -->
              <view
                class="tag-item"
                v-if="couponList.length"
                :style="tagStyle"
                @click.stop="activityTap"
              >
                <text class="iconfont icon-ic_sale"></text>
                {{ $t("优惠券")
                }}<text
                  class="iconfont icon-you2"
                  :style="{ color: activityColor }"
                ></text>
              </view>
              <!-- Activity -->
              <block v-for="(item, index) in activities" :key="index">
                <view
                  class="tag-item"
                  v-if="Number(item.type) === 1"
                  :style="tagStyle"
                  @click.stop="goActivity(item)"
                >
                  <text class="iconfont icon-miaosha1"></text>
                  {{ $t("限时秒杀")
                  }}<text
                    class="iconfont icon-you2"
                    :style="{ color: activityColor }"
                  ></text>
                </view>
                <view
                  class="tag-item"
                  v-if="Number(item.type) === 2"
                  :style="tagStyle"
                  @click.stop="goActivity(item)"
                >
                  <text class="iconfont icon-yaoqinghaoyou1"></text>
                  {{ $t("参与砍价")
                  }}<text
                    class="iconfont icon-you2"
                    :style="{ color: activityColor }"
                  ></text>
                </view>
                <view
                  class="tag-item"
                  v-if="Number(item.type) === 3"
                  :style="tagStyle"
                  @click.stop="goActivity(item)"
                >
                  <text class="iconfont icon-wodetuandui"></text>
                  {{ $t("拼团活动")
                  }}<text
                    class="iconfont icon-you2"
                    :style="{ color: activityColor }"
                  ></text>
                </view>
              </block>
            </view>
            <text
              class="iconfont icon-jiantou"
              :style="{ color: contentColor }"
            ></text>
          </view>
        </view>

        <!-- Selection -->
        <view
          class="item"
          v-if="
            checkList.includes(1) && attr.productAttr && attr.productAttr.length
          "
          @click="showSpecModal"
        >
          <view class="label" :style="{ color: titleColor }">{{
            $t("选择")
          }}</view>
          <view class="content">
            <view class="text line1" :style="{ color: contentColor }">
              {{ attrValue || attrTxt || $t('请选择规格') }}
            </view>
            <text
              class="iconfont icon-jiantou"
              :style="{ color: contentColor }"
            ></text>
          </view>
        </view>

        <!-- Parameters -->
        <view
          class="item"
          v-if="
            checkList.includes(2) &&
            productData.params_list &&
            productData.params_list.length
          "
          @click="openModal('specs')"
        >
          <view class="label" :style="{ color: titleColor }">{{
            $t("参数")
          }}</view>
          <view class="content">
            <view class="text line1" :style="{ color: contentColor }">
              {{ parameterText }}
            </view>
            <text
              class="iconfont icon-jiantou"
              :style="{ color: contentColor }"
            ></text>
          </view>
        </view>

        <!-- Service -->
        <view
          class="item"
          v-if="
            checkList.includes(3) &&
            productData.protection_list &&
            productData.protection_list.length
          "
          @click="openModal('protection')"
        >
          <view class="label" :style="{ color: titleColor }">{{
            $t("服务")
          }}</view>
          <view class="content">
            <view class="text line1" :style="{ color: contentColor }">
              {{ protectionText }}
            </view>
            <text
              class="iconfont icon-jiantou"
              :style="{ color: contentColor }"
            ></text>
          </view>
        </view>
      </view>
    </commonWrapper>
  </view>
</template>

<script>
import commonWrapper from "./commonWrapper.vue";
import { serviceSelection, serviceSummary, serviceActivities } from '../../../shared/productService';

export default {
  name: "homeProductService",
  components: {
    commonWrapper,
  },
  props: {
    dataConfig: {
      type: Object,
      default: () => ({}),
    },
    productData: {
      type: Object,
      default: () => ({}),
    },
    couponList: {
      type: Array,
      default: () => [],
    },
    activity: {
      type: Array,
      default: () => [],
    },
    attr: {
      type: Object,
      default: () => ({}),
    },
    attrTxt: {
      type: String,
      default: "",
    },
    attrValue: {
      type: String,
      default: "",
    },
  },
  computed: {
    activities() { return this.activity.filter(item => item && serviceActivities[Number(item.type)]); },
    parameterText() { return serviceSummary(this.productData.params_list, 'name'); },
    protectionText() { return serviceSummary(this.productData.protection_list, 'title'); },
    hasRows() {
      return this.checkList.includes(0) && (this.couponList.length || this.activities.length) ||
        this.checkList.includes(1) && (this.attr.productAttr || []).length ||
        this.checkList.includes(2) && !!this.parameterText || this.checkList.includes(3) && !!this.protectionText;
    },
    isHide() {
      return this.dataConfig.isHide;
    },
    checkList() {
      return serviceSelection(this.dataConfig);
    },
    titleColor() {
      return this.dataConfig.titleColor
        ? this.dataConfig.titleColor.color[0].item
        : "#999999";
    },
    contentColor() {
      return this.dataConfig.contentColor
        ? this.dataConfig.contentColor.color[0].item
        : "#333333";
    },
    isCustomTone() {
      return (
        this.dataConfig.toneConfig && this.dataConfig.toneConfig.tabVal === 1
      );
    },
    tagStyle() {
      if (this.isCustomTone) {
        const color = this.dataConfig.activityColor
          ? this.dataConfig.activityColor.color[0].item
          : "var(--view-theme)";
        const bg = this.dataConfig.activityBgColor
          ? this.dataConfig.activityBgColor.color[0].item
          : "var(--view-minorColorT)";
        return {
          color: color,
          background: bg,
        };
      }
      return {
        color: "var(--view-theme)",
        background: "var(--view-minorColorT)",
      };
    },
    activityColor() {
      if (this.isCustomTone) {
        return this.dataConfig.activityColor
          ? this.dataConfig.activityColor.color[0].item
          : "var(--view-theme)";
      }
      return "var(--view-theme)";
    },
  },
  methods: {
    activityTap() {
      if (this.couponList.length) {
        this.$emit("showCoupon");
      } else if (this.activities.length) {
        this.goActivity(this.activities[0]);
      }
    },
    goActivity(item) {
      this.$emit("goActivity", { ...item, type: String(item.type) });
    },
    showSpecModal() {
      this.$emit("showSpecModal");
    },
    openModal(type) {
      this.$emit("openModal", type);
    },
  },
};
</script>

<style lang="scss" scoped>
.product-service {
  .service-list {
    .item {
      display: flex;
      align-items: center;
      padding: 24rpx 0rpx;
      position: relative;

      .label {
        width: 80rpx;
        font-size: 28rpx;
        margin-right: 20rpx;
        flex-shrink: 0;
        line-height: 40rpx;
      }

      .content {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        overflow: hidden;

        .text {
          flex: 1;
          min-width: 0;
          font-size: 28rpx;
          line-height: 40rpx;
          color: #333;
        }

        .tags-wrapper {
          display: flex;
          flex-wrap: wrap;

          .tag-item {
            font-size: 20rpx;
            padding: 4rpx 10rpx;
            border-radius: 20rpx;
            margin-right: 10rpx;
            display: flex;
            align-items: center;
            .iconfont {
              &:first-child {
                font-size: 24rpx;
                margin-right: 5rpx;
              }
              font-size: 18rpx;
              line-height: 22rpx;
            }
          }
        }

        .iconfont {
          font-size: 24rpx;
          flex-shrink: 0;
        }
      }
    }
  }
}
</style>
