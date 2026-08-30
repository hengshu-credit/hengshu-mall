<template>
  <view class="user-list">
    <!-- #ifdef MP || APP-PLUS -->
    <view class="accountTitle">
      <view :style="{ height: getHeight.barTop + 'px' }"></view>
      <view
        class="sysTitle acea-row row-center-wrapper"
        :style="{ height: getHeight.barHeight + 'px' }"
      >
        <view>用户管理</view>
        <text class="iconfont icon-ic_leftarrow" @click="goarrow"></text>
      </view>
    </view>
    <view
      :style="{ height: getHeight.barTop + getHeight.barHeight + 'px' }"
    ></view>
    <!-- #endif -->
    <view class="searchCon acea-row row-between-wrapper">
      <view class="search acea-row row-middle" :class="administer ? 'on' : ''">
        <text class="iconfont icon-ic_search"></text>
        <input
          class="inputs"
          placeholder="请输入用户昵称/ID"
          placeholder-class="placeholder"
          confirm-type="search"
          name="search"
          v-model="keyword"
          @confirm="searchSubmit"
        />
      </view>
      <!-- <view @click="manageTap" v-if="administer">取消</view>
      <view class="edit acea-row row-center-wrapper" @click="manageTap" v-else>
        <text class="iconfont icon-ic_batch"></text>
      </view> -->
      <view
        class="edit acea-row row-center-wrapper"
        @click="filterTap"
        v-if="!administer"
      >
        <text class="iconfont icon-a-icon_filter1x"></text>
      </view>
    </view>
    <view class="list" v-if="userLists.length">
      <checkbox-group @change="checkboxChange">
        <view
          class="acea-row row-middle"
          v-for="(item, index) in userLists"
          :key="index"
        >
          <!-- #ifndef MP -->
          <checkbox
            class="checkbox"
            v-if="administer"
            :value="item.uid.toString()"
            :checked="item.checked"
            color="#ffffff"
            backgroundColor="#ffffff"
            activeBackgroundColor="#2A7EFB"
            activeBorderColor="#2A7EFB"
          />
          <!-- #endif -->
          <!-- #ifdef MP -->
          <checkbox
            class="checkbox"
            v-if="administer"
            :value="item.uid"
            :checked="item.checked"
            color="#ffffff"
          />
          <!-- #endif -->
          <view
            class="item acea-row row-center-wrapper"
            @click="goDetails(item)"
          >
            <view class="pictrue">
              <image :src="item.avatar"></image>
            </view>
            <view class="text">
              <view class="top acea-row row-middle">
                <view class="name line1">{{ item.nickname }}</view>
                <view
                  class="svip acea-row row-center-wrapper"
                  v-if="item.isMember == 1"
                  >SVIP</view
                >
                <view
                  class="vip acea-row row-center-wrapper"
                  v-if="item.level_status == 1 && item.level_grade"
                >
                  <text class="iconfont icon-huiyuandengji"></text>
                  V{{ item.level_grade }}
                </view>
              </view>
              <view class="phone">{{ item.phone }}</view>
              <view class="info acea-row row-middle">
                <view
                  >积分：<text>{{ item.integral }}</text></view
                >
                <view
                  >余额：<text>{{ item.now_money }}</text></view
                >
              </view>
            </view>
            <view
              v-if="!administer"
              class="iconfont icon-jilu"
              @click.stop="openDrawer(item)"
            ></view>
          </view>
        </view>
      </checkbox-group>
    </view>
    <block v-if="userLists.length == 0 && !loading">
      <emptyPage
        title="暂无用户信息～"
        src="/statics/images/empty-box.gif"
      ></emptyPage>
    </block>
    <Loading :loaded="loadend" :loading="loading"></Loading>
    <view class="footerH"></view>
    <view class="footer acea-row row-between-wrapper" v-if="administer">
      <checkbox-group @change="checkboxAllChange">
        <checkbox
          value="all"
          :checked="isAllSelect"
          color="#ffffff"
          backgroundColor="#ffffff"
          activeBackgroundColor="#2A7EFB"
          activeBorderColor="#2A7EFB"
        />
        <text class="checkAll">全选({{ getIds().length }})</text>
      </checkbox-group>
      <view class="acea-row row-middle">
        <view class="bnt acea-row row-center-wrapper">
          <picker
            @change="bindPickerChange"
            :range="groupArray"
            range-key="group_name"
          >
            <view>修改分组</view>
          </picker>
        </view>
        <view class="bnt acea-row row-center-wrapper" @click="editLabels"
          >添加标签</view
        >
        <view class="bnt acea-row row-center-wrapper" @click="sendCoupon"
          >发送优惠券</view
        >
      </view>
    </view>
    <base-drawer
      mode="bottom"
      :visible="visible"
      background-color="transparent"
      mask
      maskClosable
      @close="closeDrawer"
    >
      <view class="edit-list rd-t-40rpx">
        <view
          class="item"
          v-for="(item, index) in editList"
          :key="index"
          @tap="editInfo(index)"
        >
          <picker
            @change="bindLevelChange"
            :range="levelArray"
            range-key="name"
            v-if="index == 2"
          >
            <view class="uni-input">{{ item.name }}</view>
          </picker>
          <picker
            v-else-if="index == 5"
            @change="userUpdateGroup"
            :range="groupArray"
            range-key="group_name"
          >
            <view class="uni-input">{{ item.name }}</view>
          </picker>
          <text v-else>{{ item.name }}</text>
        </view>
      </view>
    </base-drawer>
    <view style="height: 110rpx"></view>
    <footer-page></footer-page>
    <edit-lable
      ref="lable"
      :visible="visibleLable"
      @closeDrawer="lableCloseDrawer"
    ></edit-lable>
    <edit-balance
      ref="balance"
      :visible="visibleBalance"
      :type="type"
      :uid="uid"
      @closeDrawer="balanceCloseDrawer"
      @successChange="successChange"
    ></edit-balance>
    <member
      ref="member"
      :visible="visibleMember"
      :userInfo="userInfo"
      @closeDrawer="memberCloseDrawer"
      @successChange="successChange"
    ></member>
    <coupon
      ref="coupon"
      :visible="visibleCoupon"
      :uid="uid"
      @closeDrawer="couponCloseDrawer"
    ></coupon>
    <user-filter
      ref="filter"
      :visible="visibleFilter"
      :groupArray="groupArray"
      :levelArray="levelArray"
      @closeDrawer="filterCloseDrawer"
      @successChange="filterChange"
    ></user-filter>
  </view>
</template>

<script>
import Loading from "@/components/Loading/index";
import emptyPage from "@/components/emptyPage.vue";
import footerPage from "../components/footerPage/index.vue";
import editLable from "./components/userLable/index.vue";
import editBalance from "./components/editBalance/index.vue";
import member from "./components/member/index.vue";
import coupon from "./components/coupon/index.vue";
import userFilter from "./components/filter/index.vue";
import {
  getUserList,
  getGroupList,
  postUserUpdateOther,
  getLevelList,
} from "@/api/admin";
export default {
  components: {
    editLable,
    editBalance,
    member,
    coupon,
    userFilter,
    footerPage,
    emptyPage,
    Loading,
  },
  data() {
    return {
      getHeight: this.$util.getWXStatusHeight(),
      editList: [
        {
          name: "修改余额",
        },
        {
          name: "修改积分",
        },
        {
          name: "修改等级",
        },
        {
          name: "赠送会员",
        },
        {
          name: "赠送优惠券",
        },
        {
          name: "修改分组",
        },
      ],
      administer: 0,
      isAllSelect: false,
      userLists: [],
      visible: false,
      visibleLable: false, //标签是否显示
      loadTitle: "加载更多",
      loading: false,
      loadend: false,
      limit: 20,
      page: 1,
      keyword: "", //搜索字段
      visibleBalance: false,
      type: 0,
      visibleMember: false,
      visibleCoupon: false,
      uid: 0,
      groupArray: [],
      userInfo: {},
      levelArray: [],
      visibleFilter: false,
      filterData: {
        labelIds: "",
        groupIds: 0,
        levelIds: 0,
      },
    };
  },
  onShow() {},
  onLoad() {
    this.userList();
    this.groupList();
  },
  methods: {
    goarrow() {
      uni.navigateBack();
    },
    filterChange(data) {
      this.visibleFilter = false;
      this.filterData = data;
      this.init();
    },
    filterCloseDrawer() {
      this.visibleFilter = false;
    },
    filterTap() {
      this.visibleFilter = true;
      this.$refs.filter.productLabel();
      this.levelList();
      // this.groupList();
    },
    sendCoupon() {
      if (!this.getIds().length) {
        this.$util.Tips({
          title: "请选择商品",
        });
        return;
      }
      this.visibleCoupon = true;
      this.$refs.coupon.userCoupon(1, this.getIds());
    },
    levelList() {
      getLevelList()
        .then((res) => {
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
          this.groupArray = res.data;
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    userUpdate(data) {
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
    userUpdateGroup(e) {
      this.userUpdate({
        type: 5,
        group_id: this.groupArray[e.detail.value].id,
      });
      this.visible = false;
      this.init();
    },
    bindLevelChange(e) {
      this.userUpdate({
        type: 2,
        level: this.levelArray[e.detail.value].id,
      });
      this.init();
    },
    bindPickerChange(e) {
      if (!this.getIds().length) {
        this.$util.Tips({
          title: "请选择用户",
        });
        return;
      }
      this.userUpdate({
        type: 4,
        uid: this.getIds(),
        group_id: this.groupArray[e.detail.value].id,
      });
    },
    goDetails(item) {
      uni.navigateTo({
        url: "/pages/admin/user/index?uid=" + item.uid,
      });
    },
    couponCloseDrawer() {
      this.visibleCoupon = false;
    },
    memberCloseDrawer() {
      this.visibleMember = false;
    },
    balanceCloseDrawer() {
      this.visibleBalance = false;
    },
    successChange() {
      this.visibleMember = false;
      this.visibleBalance = false;
      this.init();
    },
    //批量编辑标签
    editLabels() {
      if (!this.getIds().length) {
        this.$util.Tips({
          title: "请选择商品",
        });
        return;
      }
      this.visibleLable = true;
      this.visible = false;
      this.$refs.lable.productLabel({}, 1, this.getIds());
    },
    //批量获取id集合
    getIds() {
      let ids = [];
      this.userLists.forEach((item) => {
        if (item.checked) {
          ids.push(item.uid);
        }
      });
      ids.slice(0, 100);
      return ids;
    },
    init() {
      this.userLists = [];
      this.page = 1;
      this.loadend = false;
      this.loading = false;
      this.userList();
    },
    searchSubmit() {
      this.init();
    },
    userList() {
      let that = this;
      if (this.loading) return;
      if (this.loadend) return;
      that.loading = true;
      that.loadTitle = "";
      getUserList({
        page: that.page,
        limit: that.limit,
        nickname: that.keyword,
        group_id: that.filterData.groupIds,
        level: that.filterData.levelIds,
        label_id: that.filterData.labelIds,
      })
        .then((res) => {
          let userLists = res.data.list;
          userLists.forEach((item) => {
            item.checked = false;
          });
          this.isAllSelect = false;
          let loadend = userLists.length < that.limit;
          that.userLists = that.$util.SplitArray(userLists, that.userLists);
          that.$set(that, "userLists", that.userLists);
          that.loadend = loadend;
          that.loadTitle = loadend ? "没有更多内容啦~" : "加载更多";
          that.page = that.page + 1;
          that.loading = false;
        })
        .catch((err) => {
          that.loading = false;
          that.loadTitle = "加载更多";
        });
    },
    editInfo(index) {
      this.type = index;
      switch (index) {
        case 0:
          this.visible = false;
          this.visibleBalance = true;
          break;
        case 1:
          this.visible = false;
          this.visibleBalance = true;
          break;
        case 2:
          this.visible = false;
          break;
        case 3:
          this.visible = false;
          this.visibleMember = true;
          break;
        case 4:
          this.visible = false;
          this.visibleCoupon = true;
          break;
      }
    },
    lableCloseDrawer() {
      this.visibleLable = false;
    },
    openDrawer(item) {
      this.visible = true;
      this.uid = item.uid;
      this.userInfo = item;
      this.levelList();
      this.$refs.coupon.userCoupon(0);
    },
    closeDrawer() {
      this.visible = false;
    },
    manageTap() {
      this.administer = !this.administer;
    },
    checkboxChange(event) {
      let idList = event.detail.value;
      this.userLists.forEach((item) => {
        if (idList.indexOf(item.uid + "") !== -1) {
          item.checked = true;
        } else {
          item.checked = false;
        }
      });
      if (idList.length == this.userLists.length) {
        this.isAllSelect = true;
      } else {
        this.isAllSelect = false;
      }
    },
    forGoods(val) {
      let that = this;
      if (!that.userLists.length) return;
      that.userLists.forEach((item) => {
        if (val) {
          item.checked = true;
        } else {
          item.checked = false;
        }
      });
    },
    checkboxAllChange(event) {
      let value = event.detail.value;
      if (value.length) {
        if (this.userLists.length > 100) {
          this.$util.Tips({
            title: "每次最多只提交100条数据",
          });
        }
        this.isAllSelect = true;
        this.forGoods(1);
      } else {
        this.isAllSelect = false;
        this.forGoods(0);
      }
    },
  },
  onReachBottom() {
    this.userList();
  },
};
</script>

<style lang="scss" scoped>
::v-deep checkbox .wx-checkbox-input.wx-checkbox-input-checked {
  border: 1px solid $primary-admin !important;
  background-color: $primary-admin !important;
}
::v-deep checkbox:not([disabled]) .uni-checkbox-input:hover {
  border-color: #d1d1d1 !important;
}
::v-deep.empty-page {
  margin-top: 20rpx;
}
.accountTitle {
  background: #f5f5f5;
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  z-index: 99;
  padding-bottom: 6rpx;
  .sysTitle {
    width: 100%;
    position: relative;
    font-weight: 500;
    color: #333333;
    font-size: 30rpx;
    .iconfont {
      position: absolute;
      font-size: 42rpx;
      left: 20rpx;
      width: 60rpx;
      font-weight: 500;
    }
  }
}
.user-list {
  padding: 20rpx 20rpx 0 20rpx;
  .searchCon {
    .search {
      width: 620rpx;
      height: 72rpx;
      background: #ffffff;
      border-radius: 50rpx;
      padding: 0 34rpx;

      &.on {
        width: 618rpx;
      }

      .iconfont {
        color: #999;
        font-size: 32rpx;
        margin-right: 16rpx;
      }
      .inputs {
        font-size: 28rpx;
        width: 100%;
        height: 100%;
        flex: 1;
      }
      .placeholder {
        color: #ccc;
      }
    }
    .edit {
      width: 72rpx;
      height: 72rpx;
      background: #ffffff;
      border-radius: 50%;
      .iconfont {
        color: #666;
        font-size: 36rpx;
      }
    }
  }
  .list {
    padding-bottom: 20rpx;
    margin-top: 32rpx;
    ::v-deep uni-checkbox .uni-checkbox-input {
      margin: 0 20rpx 20rpx 0;
    }
    ::v-deep wx-checkbox .wx-checkbox-input {
      margin: 0 20rpx 20rpx 0;
    }
    .item {
      width: 100%;
      background-color: #fff;
      padding: 30rpx 24rpx;
      box-sizing: border-box;
      margin-bottom: 20rpx;
      border-radius: 24rpx;
      position: relative;
      flex: 1;
      .icon-ic_more {
        position: absolute;
        right: 20rpx;
        top: 30rpx;
        color: #999;
        font-size: 40rpx;
      }
      .pictrue {
        width: 96rpx;
        height: 96rpx;
        margin-right: 24rpx;
        image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
      }
      .text {
        flex: 1;
        overflow: hidden;
        .top {
          .name {
            max-width: 230rpx;
            font-size: 28rpx;
            font-weight: 600;
            color: #333333;
            font-family: PingFang SC, PingFang SC;
          }
          .svip {
            width: 56rpx;
            height: 26rpx;
            background: linear-gradient(270deg, #484643 0%, #1f1b17 100%);
            border-radius: 100rpx;
            font-size: 18rpx;
            font-family: PingFang SC, PingFang SC;
            font-weight: 600;
            color: #fddaa4;
            margin-left: 10rpx;
          }
          .vip {
            width: 64rpx;
            // height: 26rpx;
            background: #fef0d9;
            border: 1px solid #facc7d;
            border-radius: 50rpx;
            font-size: 18rpx;
            font-family: PingFang SC, PingFang SC;
            font-weight: 500;
            color: #dfa541;
            margin-left: 10rpx;
            .iconfont {
              font-size: 20rpx;
              margin-right: 4rpx;
            }
          }
        }
        .phone {
          font-size: 24rpx;
          font-family: PingFang SC, PingFang SC;
          font-weight: 400;
          color: #999999;
          margin-top: 4rpx;
        }
        .info {
          font-size: 24rpx;
          font-weight: 400;
          color: #999999;
          margin-top: 4rpx;
          text {
            color: #333333;
            margin-right: 28rpx;
          }
        }
      }
      .bottom {
        margin-top: 26rpx;
        .bnt {
          width: 144rpx;
          height: 56rpx;
          border: 1px solid #ccc;
          font-size: 24rpx;
          font-family: PingFang SC, PingFang SC;
          font-weight: 400;
          color: #333333;
          border-radius: 50rpx;
          & ~ .bnt {
            margin-left: 16rpx;
          }
          &.on {
            border-color: #2a7efb;
            background-color: #2a7efb;
            color: #fff;
          }
          &.up {
            border-color: #ff7e00;
            color: #ff7e00;
          }
        }
      }
    }
  }
  .footerH {
    height: calc(constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
    height: calc(env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
  }
  .footer {
    box-sizing: border-box;
    padding: 0 32rpx;
    width: 100%;
    height: 96rpx;
    background-color: #fff;
    position: fixed;
    bottom: 0;
    z-index: 30;
    height: calc(96rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
    height: calc(96rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
    padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
    padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/
    width: 100%;
    left: 0;

    ::v-deep uni-checkbox .uni-checkbox-input {
      margin-bottom: 6rpx;
    }

    .bnt {
      width: 160rpx;
      height: 64rpx;
      border-radius: 50rpx;
      border: 1rpx solid #2a7efb;
      color: #2a7efb;
      font-size: 24rpx;
      font-family: PingFang SC, PingFang SC;
      font-weight: 500;
      & ~ .bnt {
        margin-left: 16rpx;
      }
    }
  }
  .edit-list {
    background-color: #fff;
    padding: 45rpx 34rpx;
    .item {
      font-family: PingFang SC, PingFang SC;
      font-weight: 400;
      color: #333333;
      font-size: 32rpx;
      text-align: center;
      height: 106rpx;
      line-height: 106rpx;
    }
  }
}
</style>
