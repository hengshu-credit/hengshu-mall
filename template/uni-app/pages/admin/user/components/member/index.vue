<template>
  <base-drawer
    mode="bottom"
    :visible="visible"
    background-color="transparent"
    mask
    maskClosable
    @close="closeDrawer"
  >
    <view class="edit-balance rd-t-40rpx">
      <view class="title"
        >赠送会员
        <view class="close acea-row row-center-wrapper" @tap="closeDrawer">
          <text class="iconfont icon-iconfontguanbi"></text>
        </view>
      </view>
      <view class="list">
        <view class="item acea-row row-between-wrapper">
          <view>会员到期日</view>
          <view class="time">{{
            userInfo.svip_overdue_time || "已过期/暂未开通"
          }}</view>
        </view>
        <view class="item acea-row row-between-wrapper">
          <view>剩余天数</view>
          <view class="time">{{ userInfo.svip_over_day }}</view>
        </view>
        <view class="item acea-row row-between-wrapper">
          <view>调整时长(天)</view>
          <view class="acea-row row-middle">
            <input
              type="numeric"
              v-model="numeral"
              placeholder="请输入时长"
              placeholder-class="placeholder"
            />
            <text class="iconfont icon-ic_edit"></text>
          </view>
        </view>
      </view>
      <view class="footer acea-row row-between-wrapper">
        <view class="bnt acea-row row-center-wrapper" @click="closeDrawer"
          >取消</view
        >
        <view class="bnt on acea-row row-center-wrapper" @click="define"
          >确定</view
        >
      </view>
    </view>
  </base-drawer>
</template>

<script>
import { postUserUpdateOther } from "@/api/admin";
export default {
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    userInfo: {
      type: Object,
      default: () => {},
    },
  },
  data() {
    return {
      numeral: 0,
    };
  },
  mounted: function () {},
  methods: {
    define() {
      if (this.numeral <= 0) {
        this.$util.Tips({
          title: "请填写有效时长",
        });
        return;
      }
      postUserUpdateOther(this.userInfo.uid, {
        type: 3,
        days: this.numeral,
      })
        .then((res) => {
          this.$util.Tips({
            title: res.msg,
          });
          this.numeral = 0;
          this.$emit("successChange");
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    closeDrawer() {
      this.numeral = 0;
      this.$emit("closeDrawer");
    },
  },
};
</script>

<style lang="scss" scoped>
.edit-balance {
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
    padding: 0 30rpx;
    .item {
      font-size: 28rpx;
      font-family: PingFang SC, PingFang SC;
      font-weight: 400;
      color: #333333;
      height: 72rpx;
      margin-bottom: 32rpx;
      box-sizing: border-box;
      .icon-ic_edit {
        color: #999999;
      }
      .time {
        color: #999999;
      }
      .itemn {
        margin-left: 50rpx;
        color: #999999;
        .iconfont {
          margin-top: 4rpx;
          color: #cccccc;
          margin-right: 14rpx;
        }
        &.on {
          color: #333333;
          .iconfont {
            color: #2a7efb;
          }
        }
      }
      input {
        text-align: right;
        font-size: 36rpx;
        font-family: Regular;
        color: #ff7e00;
      }
      ::v-deep.uni-input-input {
        padding-right: 10rpx;
      }
      .placeholder {
        font-size: 28rpx;
        padding-right: 10rpx;
        padding: 6rpx 10rpx 0 0;
      }
    }
  }
  .footer {
    padding: 0 20rpx;
    margin-top: 90rpx;
    .bnt {
      width: 346rpx;
      height: 72rpx;
      border: 2rpx solid #2a7efb;
      border-radius: 100rpx;
      font-size: 26rpx;
      font-family: PingFang SC, PingFang SC;
      font-weight: 500;
      color: #2a7efb;
      &.on {
        background: #2a7efb;
        color: #fff;
      }
    }
  }
}
</style>
