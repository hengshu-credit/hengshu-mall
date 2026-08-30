<template>
  <view class="user-details">
    <!-- #ifdef MP || APP-PLUS -->
    <view class="accountTitle">
      <view :style="{ height: getHeight.barTop + 'px' }"></view>
      <view
        class="sysTitle acea-row row-center-wrapper"
        :style="{ height: getHeight.barHeight + 'px' }"
      >
        <view>用户详情</view>
        <text class="iconfont icon-ic_leftarrow" @click="goarrow"></text>
      </view>
    </view>
    <view
      :style="{ height: getHeight.barTop + getHeight.barHeight + 'px' }"
    ></view>
    <!-- #endif -->
    <view class="header">
      <view class="picTxt acea-row row-middle">
        <view class="pictrue">
          <image :src="infoData.avatar"></image>
        </view>
        <view class="text">
          <view class="name acea-row row-middle">
            <view class="nameCon line1">{{ infoData.nickname }}</view>
            <view
              class="svip acea-row row-center-wrapper"
              v-if="infoData.isMember == 1"
              >SVIP</view
            >
            <view
              class="vip acea-row row-center-wrapper"
              v-if="infoData.level_status == 1"
            >
              <text class="iconfont icon-huiyuandengji"></text>
              V{{ infoData.level_grade }}
            </view>
          </view>
          <view v-if="infoData.phone"
            >{{ infoData.phone }}（ID：{{ uid }}）</view
          >
          <view v-else>ID：{{ uid }}</view>
        </view>
      </view>
      <view class="bottom acea-row row-middle">
        <view class="item"
          >消费金额<text class="num">{{
            infoData.order_total_price
          }}</text></view
        >
        <view class="item"
          >消费笔数<text class="num">{{
            infoData.order_total_count
          }}</text></view
        >
      </view>
    </view>
    <view class="list">
      <view class="title acea-row row-between-wrapper">
        <view class="name">用户信息</view>
        <view class="tip" @click="openTap"
          >{{ isShow ? "展开" : "收起"
          }}<text
            class="iconfont"
            :class="isShow ? 'icon-ic_downarrow' : 'icon-ic_uparrow'"
          ></text
        ></view>
      </view>
      <view class="item acea-row row-between-wrapper">
        <view>分组</view>
        <view>
          <picker
            @change="bindPickerChange"
            :value="groupIndex"
            :range="groupArray"
            range-key="group_name"
          >
            <view class="acea-row row-middle">
              <view v-if="groupArray.length">
                <text class="not" v-if="groupIndex == -1">无</text>
                <text v-else>{{ groupArray[groupIndex].group_name }}</text>
              </view>
              <text class="iconfont icon-ic_rightarrow"></text>
            </view>
          </picker>
        </view>
      </view>
      <view class="item acea-row row-between-wrapper">
        <view>等级</view>
        <view>
          <picker
            @change="bindLevelChange"
            :value="levelIndex"
            :range="levelArray"
            range-key="name"
          >
            <view class="acea-row row-middle">
              <view v-if="levelArray.length">
                <text class="not" v-if="levelIndex == -1">无</text>
                <text v-else>{{ levelArray[levelIndex].name }}</text>
              </view>
              <text class="iconfont icon-ic_rightarrow"></text>
            </view>
          </picker>
        </view>
      </view>
      <view class="item">
        <view class="acea-row row-between-wrapper">
          <view>标签</view>
          <view class="add" @click="editLabels"
            ><text class="iconfont icon-ic_increase"></text>添加标签</view
          >
        </view>
        <view
          class="labelList acea-row row-middle"
          v-if="infoData.label_id && infoData.label_id.length"
        >
          <view
            class="label"
            v-for="(item, index) in infoData.label_id"
            :key="index"
            >{{ item.label_name }}</view
          >
        </view>
      </view>
      <view class="listn" v-if="!isShow">
        <view
          class="item acea-row row-between-wrapper"
          v-if="infoData.real_name"
        >
          <view>姓名</view>
          <view class="info">{{ infoData.real_name }}</view>
        </view>
        <view
          class="item acea-row row-between-wrapper"
          v-if="infoData.birthday"
        >
          <view>出生年月</view>
          <view class="info">{{ infoData.birthday }}</view>
        </view>
        <view class="item acea-row row-between-wrapper" v-if="infoData.card_id">
          <view>身份证号</view>
          <view class="info">{{ infoData.card_id }}</view>
        </view>
        <view class="item acea-row row-between" v-if="infoData.addres">
          <view>地址</view>
          <view class="info">{{ infoData.addres }}</view>
        </view>
        <view
          class="item acea-row row-between-wrapper"
          v-if="infoData._add_time"
        >
          <view>注册时间</view>
          <view class="info">{{ infoData._add_time }}</view>
        </view>
      </view>
    </view>
    <view class="property">
      <view class="title">资产信息</view>
      <view class="info acea-row">
        <view class="item" @click="balanceTap(1)">
          <view>积分</view>
          <view class="bottom acea-row row-between-wrapper">
            <view class="num">{{ infoData.integral }}</view>
            <view class="iconfont icon-ic_edit"></view>
          </view>
        </view>
        <view class="item" @click="balanceTap(0)">
          <view>余额</view>
          <view class="bottom acea-row row-between-wrapper">
            <view class="num">{{ infoData.now_money }}</view>
            <view class="iconfont icon-ic_edit"></view>
          </view>
        </view>
      </view>
      <view class="info acea-row">
        <view class="item">
          <view class="acea-row row-between-wrapper">
            <view>优惠券</view>
            <view
              class="iconfont icon-ic_rightarrow"
              @click="couponSeeTap"
            ></view>
          </view>
          <view class="bottom acea-row row-between-wrapper">
            <view class="num">{{ infoData.coupon_num }}张</view>
            <view class="give" @click="couponTap">赠送</view>
          </view>
        </view>
        <view class="item" @click="memberTap">
          <view>会员</view>
          <view class="bottom acea-row row-between-wrapper">
            <view class="num" v-if="infoData.svip_over_day">{{
              "剩余" + infoData.svip_over_day + "天"
            }}</view>
            <view class="num" v-else>已过期/暂未开通</view>
            <view class="iconfont icon-ic_edit"></view>
          </view>
        </view>
      </view>
    </view>
    <edit-lable
      ref="lable"
      :visible="visibleLable"
      @closeDrawer="lableCloseDrawer"
    ></edit-lable>
    <edit-balance
      ref="balance"
      :visible="visibleBalance"
      :type="type"
      :uid="parseInt(uid)"
      @closeDrawer="balanceCloseDrawer"
      @successChange="successChange"
    ></edit-balance>
    <member
      ref="member"
      :visible="visibleMember"
      :userInfo="infoData"
      @closeDrawer="memberCloseDrawer"
      @successChange="successChange"
    ></member>
    <coupon
      ref="coupon"
      :visible="visibleCoupon"
      :uid="parseInt(uid)"
      @closeDrawer="couponCloseDrawer"
    ></coupon>
  </view>
</template>

<script>
import editLable from "./components/userLable/index.vue";
import editBalance from "./components/editBalance/index.vue";
import member from "./components/member/index.vue";
import coupon from "./components/coupon/index.vue";
import {
  getUserInfo,
  getGroupList,
  getLevelList,
  postUserUpdateOther,
} from "@/api/admin";
export default {
  components: {
    editLable,
    editBalance,
    member,
    coupon,
  },
  data() {
    return {
      getHeight: this.$util.getWXStatusHeight(),
      uid: 0,
      infoData: {},
      groupArray: [],
      levelArray: [],
      groupIndex: -1,
      levelIndex: -1,
      visibleLable: false,
      visibleBalance: false,
      type: 0,
      visibleMember: false,
      visibleCoupon: false,
      isShow: false,
    };
  },
  onLoad(options) {
    this.uid = options.uid;
    this.userInfo(1);
  },
  methods: {
    openTap() {
      this.isShow = !this.isShow;
    },
    couponTap() {
      this.$refs.coupon.userCoupon(0);
      this.visibleCoupon = true;
    },
    couponSeeTap() {
      this.$refs.coupon.userCoupon(2);
      this.visibleCoupon = true;
    },
    couponCloseDrawer(e) {
      this.visibleCoupon = false;
      if (e) {
        this.userInfo();
      }
    },
    memberTap() {
      this.visibleMember = true;
    },
    memberCloseDrawer() {
      this.visibleMember = false;
    },
    balanceTap(type) {
      this.type = type;
      this.visibleBalance = true;
    },
    successChange() {
      this.visibleBalance = false;
      this.visibleMember = false;
      this.userInfo();
    },
    balanceCloseDrawer() {
      this.visibleBalance = false;
    },
    lableCloseDrawer(e) {
      this.visibleLable = false;
      if (e) {
        this.userInfo();
      }
    },
    editLabels() {
      this.visibleLable = true;
      this.$refs.lable.productLabel(
        JSON.parse(JSON.stringify(this.infoData)),
        0,
        []
      );
    },
    bindPickerChange(e) {
      this.groupIndex = e.detail.value;
      this.userUpdate(5);
    },
    bindLevelChange(e) {
      this.levelIndex = e.detail.value;
      this.userUpdate(1);
    },
    userUpdate(num) {
      let data = {};
      if (num == 5) {
        data = {
          type: 5,
          group_id: this.groupArray[this.groupIndex].id,
        };
      } else {
        data = {
          type: 2,
          level: this.levelArray[this.levelIndex].id,
        };
      }
      postUserUpdateOther(this.uid, data)
        .then((res) => {
          this.$util.Tips({
            title: res.msg,
          });
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    levelList() {
      getLevelList()
        .then((res) => {
          let id = this.infoData.level;
          res.data.list.forEach((item, index) => {
            if (item.id == id) {
              this.levelIndex = index;
            }
          });
          this.levelArray = res.data.list;
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    groupList() {
      getGroupList()
        .then((res) => {
          let id = this.infoData.group_id;
          res.data.forEach((item, index) => {
            if (item.id == id) {
              this.groupIndex = index;
            }
          });
          this.groupArray = res.data;
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    goarrow() {
      uni.navigateBack();
    },
    userInfo(num) {
      getUserInfo(this.uid)
        .then((res) => {
          this.infoData = res.data;
          if (num) {
            this.groupList();
            this.levelList();
          }
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.accountTitle {
  background: linear-gradient(
    270deg,
    $gradient-primary-admin 0%,
    $primary-admin 100%
  );
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  z-index: 99;
  .sysTitle {
    width: 100%;
    position: relative;
    font-weight: 500;
    color: #fff;
    font-size: 30rpx;
    .iconfont {
      position: absolute;
      font-size: 39rpx;
      left: 11rpx;
      width: 60rpx;
      font-weight: 600;
    }
  }
}
.user-details {
  padding-bottom: 1rpx;
  padding-bottom: calc(
    1rpx + constant(safe-area-inset-bottom)
  ); ///兼容 IOS<11.2/
  padding-bottom: calc(1rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
  .header {
    background: linear-gradient(
      270deg,
      $gradient-primary-admin 0%,
      $primary-admin 100%
    );
    height: 346rpx;
    padding: 20rpx 30rpx 0 30rpx;
    position: relative;
    .picTxt {
      .pictrue {
        width: 112rpx;
        height: 112rpx;
        image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
      }
      .text {
        margin-left: 32rpx;
        font-size: 24rpx;
        font-family: PingFang SC, PingFang SC;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.5);
        .name {
          margin-bottom: 12rpx;
          .nameCon {
            font-size: 32rpx;
            color: #fff;
            max-width: 300rpx;
          }
          .svip {
            width: 56rpx;
            height: 26rpx;
            background: linear-gradient(270deg, #484643 0%, #1f1b17 100%);
            border-radius: 14rpx;
            font-size: 18rpx;
            font-weight: 600;
            color: #fddaa4;
            margin-left: 12rpx;
          }
          .vip {
            width: 68rpx;
            height: 26rpx;
            background: #fef0d9;
            margin-left: 12rpx;
            border-radius: 50rpx;
            font-size: 18rpx;
            font-weight: 500;
            color: #dfa541;
            .iconfont {
              font-size: 20rpx;
              margin-right: 4rpx;
            }
          }
        }
      }
    }
    .bottom {
      font-size: 26rpx;
      font-family: PingFang SC, PingFang SC;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 40rpx;
      .item {
        margin-right: 44rpx;
        .num {
          margin-left: 8rpx;
          color: #ffffff;
        }
      }
    }
    &::after {
      position: absolute;
      content: "";
      width: 50%;
      height: 88rpx;
      background: linear-gradient(180deg, $primary-admin 0%, #f5f5f5 100%);
      left: 0;
      bottom: 0;
    }
    &::before {
      position: absolute;
      content: "";
      width: 50%;
      height: 88rpx;
      background: linear-gradient(
        180deg,
        $gradient-primary-admin 0%,
        #f5f5f5 100%
      );
      right: 0;
      bottom: 0;
    }
  }
  .list {
    width: 710rpx;
    background-color: #fff;
    border-radius: 24rpx;
    margin: -96rpx auto 0 auto;
    position: relative;
    font-family: PingFang SC, PingFang SC;
    color: #333333;
    padding: 32rpx 24rpx 40rpx 24rpx;
    .title {
      margin-bottom: 40rpx;
      .name {
        font-size: 30rpx;
        font-weight: 600;
      }
      .tip {
        font-size: 26rpx;
        font-weight: 400;
        color: #999999;
        .iconfont {
          font-size: 22rpx;
          margin-left: 4rpx;
        }
      }
    }
    .listn {
      margin-top: 52rpx;
    }
    .item {
      font-weight: 400;
      & ~ .item {
        margin-top: 52rpx;
      }
      .not {
        color: #999;
      }
      .iconfont {
        font-size: 26rpx;
        color: #999;
        margin-left: 6rpx;
      }
      .info {
        color: #999999;
        width: 465rpx;
        text-align: right;
      }
      .add {
        font-size: 24rpx;
        color: $primary-admin;
        .iconfont {
          margin-right: 8rpx;
          color: $primary-admin;
        }
      }
      .labelList {
        margin-top: 12rpx;
        .label {
          border: 1px solid $primary-admin;
          border-radius: 20rpx;
          font-size: 20rpx;
          color: $primary-admin;
          padding: 4rpx 16rpx;
          margin-right: 16rpx;
          margin-top: 16rpx;
        }
      }
    }
  }
  .property {
    width: 710rpx;
    background-color: #fff;
    border-radius: 24rpx;
    margin: 20rpx auto;
    font-family: PingFang SC, PingFang SC;
    .title {
      font-size: 30rpx;
      font-family: PingFang SC, PingFang SC;
      font-weight: 600;
      color: #333333;
      padding: 32rpx 24rpx 2rpx 24rpx;
      margin-bottom: 32rpx;
    }
    .info {
      margin: 0 26rpx;
      .item {
        width: 50%;
        font-size: 28rpx;
        font-weight: 400;
        color: #999999;
        padding: 10rpx 40rpx 40rpx 18rpx;
        & ~ .item {
          border-left: 1px solid #eeeeee;
          padding-left: 40rpx;
          padding-right: 14rpx;
        }
        .bottom {
          margin-top: 20rpx;
          .num {
            font-size: 30rpx;
            font-weight: 600;
            color: #333333;
          }
          .give {
            font-size: 24rpx;
            font-weight: 400;
            color: $primary-admin;
            padding-left: 40rpx;
          }
        }
        .icon-ic_rightarrow {
          font-size: 26rpx;
          padding: 6rpx 0 6rpx 40rpx;
        }
      }
      & ~ .info {
        border-top: 1px solid #eeeeee;
        .item {
          padding-top: 40rpx;
        }
      }
    }
  }
}
</style>
