<template>
  <view>
    <!-- #ifdef MP || APP -->
    <NavBar
      titleText="订单详情"
      :iconColor="iconColor"
      :textColor="iconColor"
      :isScrolling="isScrolling"
      showBack
    ></NavBar>
    <!-- #endif -->
    <view class="headerBg"></view>
    <view class="order-details pos-order-details">
      <view class="address">
        <view v-if="orderInfo.store" class="box acea-row row-middle">
          <view class="left">
            <view class="text">{{ orderInfo.store.name }}</view>
            <view
              class="acea-row row-between-wrapper"
              @click="
                showMaoLocation(
                  system_store.latitude,
                  system_store.longitude,
                  system_store.name,
                  system_store.detailed_address,
                )
              "
            >
              <span class="txt">{{ orderInfo.store.detailed_address }}</span>
              <span class="iconfont icon-xiangyou"></span>
            </view>
          </view>
          <view>
            <view
              class="iconfont icon-tonghua marrt"
              @click="makePhone(system_store.phone)"
            ></view>
          </view>
        </view>
        <view class="box acea-row row-middle">
          <view class="text-box">
            <view class="text"
              ><text class="iconfont icon-ic_receiving"></text
              >{{ orderInfo.nickname }} {{ orderInfo.user_phone }}</view
            >
            <view class="acea-row row-between-wrapper">
              地址：{{ orderInfo.user_address }}
            </view>
          </view>
          <view class="btn" @click.stop="makePhone(orderInfo.user_phone)">
            <text class="iconfont icon-ic_phone"></text>
          </view>
          <view
            class="btn"
            @click.stop="
              showMaoLocation(
                orderInfo.latitude,
                orderInfo.longitude,
                orderInfo.nickname,
                orderInfo.user_address,
              )
            "
          >
            <text class="iconfont icon-ic_location"></text>
          </view>
        </view>
        <view class="line">
          <image src="/static/images/line.jpg" />
        </view>
      </view>
      <view class="goods-section">
        <view class="">订单号：{{ orderInfo.order_id }}</view>
        <view
          class="goods acea-row"
          v-for="(item, index) in orderInfo.cartInfo"
          :key="index"
        >
          <view class="picTxt acea-row">
            <image :src="item.productInfo.image" class="pictrue"></image>
            <view class="text">
              <view class="info line1">
                {{ item.productInfo.store_name }}
              </view>
              <view class="attr line1">{{
                item.productInfo.attrInfo.suk
              }}</view>
              <view class="label">7天无理由退换货·放心购</view>
            </view>
          </view>
          <view class="money">
            <baseMoney
              :money="item.productInfo.attrInfo.price"
              symbolSize="20"
              integerSize="32"
              decimalSize="20"
            ></baseMoney>
            <view class="num">共{{ item.cart_num }}件</view>
          </view>
        </view>
        <view class="giveGoods">
          <view
            class="item acea-row row-between-wrapper"
            v-for="(item, index) in giveCartInfo"
            :key="index"
          >
            <view class="picTxt acea-row row-middle">
              <view class="pictrue">
                <image
                  :src="item.productInfo.attrInfo.image"
                  v-if="item.productInfo.attrInfo"
                ></image>
                <image :src="item.productInfo.image" v-else></image>
              </view>
              <view class="texts">
                <view class="name line1"
                  >[赠品]{{ item.productInfo.store_name }}</view
                >
                <view class="limit line1" v-if="item.productInfo.attrInfo">{{
                  item.productInfo.attrInfo.suk
                }}</view>
              </view>
            </view>
            <view class="num">x{{ item.cart_num }}</view>
          </view>
          <view
            class="item acea-row row-between-wrapper"
            v-for="(item, index) in giveData.give_coupon"
            :key="index"
            v-if="giveData.give_coupon.length"
          >
            <view class="picTxt acea-row row-middle">
              <view class="pictrue acea-row row-center-wrapper">
                <text class="iconfont icon-pc-youhuiquan"></text>
              </view>
              <view class="texts">
                <view class="line1">[赠品]{{ item.coupon_title }}</view>
              </view>
            </view>
          </view>
          <view
            class="item acea-row row-between-wrapper"
            v-if="giveData.give_integral > 0"
          >
            <view class="picTxt acea-row row-middle">
              <view class="pictrue acea-row row-center-wrapper">
                <text class="iconfont icon-pc-jifen"></text>
              </view>
              <view class="texts">
                <view class="line1"
                  >[赠品]{{ giveData.give_integral }}积分</view
                >
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="detail-section">
        <view class="item acea-row row-between">
          <view>订单编号</view>
          <view class="conter acea-row row-middle row-right">
            {{ orderInfo.order_id }}
            <span class="copy copy-data" @click="copyNum(orderInfo.order_id)"
              >复制</span
            >
          </view>
        </view>
        <view class="item acea-row row-between">
          <view>支付方式</view>
          <view class="conter">{{ payType }}</view>
        </view>
        <view class="item acea-row row-between">
          <view>支付时间</view>
          <view class="conter">{{ orderInfo._pay_time }}</view>
        </view>
        <view class="item acea-row row-between">
          <view>下单时间</view>
          <view class="conter">{{ orderInfo._add_time }}</view>
        </view>
        <view class="item acea-row row-between" v-if="orderInfo._status">
          <view>配送方式</view>
          <view class="conter">{{ orderInfo._status._deliveryType }}</view>
        </view>
        <view class="item acea-row row-between">
          <view>买家留言</view>
          <view class="conter">{{ orderInfo.mark }}</view>
        </view>
      </view>
      <customForm :customForm="orderInfo.custom_form"></customForm>
      <view class="wrapper topnone">
        <view class="item acea-row row-between">
          <view>商品总价：</view>
          <view class="conter"
            >￥{{
              (
                parseFloat(orderInfo.total_price) +
                parseFloat(orderInfo.vip_true_price)
              ).toFixed(2)
            }}</view
          >
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.coupon_price > 0"
        >
          <view>优惠券抵扣：</view>
          <view class="conter">-￥{{ orderInfo.coupon_price }}</view>
        </view>
        <view
          v-if="orderInfo.pay_postage > 0"
          class="item acea-row row-between"
        >
          <view>运费：</view>
          <view class="conter">￥{{ orderInfo.pay_postage }}</view>
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.deduction_price > 0"
        >
          <view>积分抵扣金额：</view>
          <view class="conter">-￥{{ orderInfo.deduction_price }}</view>
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.vip_true_price > 0"
        >
          <view>会员商品优惠：</view>
          <view class="conter">-￥{{ orderInfo.vip_true_price }}</view>
        </view>
        <view
          class="item acea-row row-between"
          v-for="(item, index) in orderInfo.promotions_detail"
          :key="index"
          v-if="parseFloat(item.promotions_price)"
        >
          <view>{{ item.title }}：</view>
          <view class="conter"
            >-￥{{ parseFloat(item.promotions_price).toFixed(2) }}</view
          >
        </view>
        <view class="actualPay acea-row row-right">
          实付款：
          <!-- <span class="money">￥{{ orderInfo.pay_price }}</span> -->
          <baseMoney
            :money="orderInfo.pay_price"
            symbolSize="24"
            integerSize="40"
            decimalSize="24"
            color="#FF7E00"
          ></baseMoney>
        </view>
      </view>
      <view class="height-add"></view>
    </view>
  </view>
</template>
<script>
import customForm from "../../components/customForm";
// #ifdef MP || APP
import NavBar from "@/components/NavBar.vue";
// #endif
import { OrderDetail } from "@/api/admin";
import { isMoney } from "@/utils/validate.js";

export default {
  name: "orderDetail",
  components: {
    customForm,
    // #ifdef MP || APP
    NavBar,
    // #endif
  },
  props: {},
  data: function () {
    return {
      giveData: {
        give_integral: 0,
        give_coupon: [],
      },
      giveCartInfo: [],
      order: false,
      change: false,
      order_id: "",
      orderInfo: "",
      status: "",
      title: "",
      payType: "",
      types: "",
      clickNum: 1,
      goname: "",
      system_store: "",
      sum: 0,
      // #ifdef MP || APP
      iconColor: "#FFFFFF",
      isScrolling: false,
      // #endif
    };
  },
  watch: {
    "$route.params.oid": function (newVal) {
      let that = this;
      if (newVal != undefined) {
        that.order_id = newVal;
        that.getIndex();
      }
    },
  },
  onLoad: function (option) {
    let self = this;
    this.order_id = option.id;
    this.goname = option.goname;
    this.getIndex();
  },
  onPageScroll(e) {
    // #ifdef MP
    if (e.scrollTop > 50) {
      this.isScrolling = true;
      this.iconColor = "#333333";
    } else if (e.scrollTop < 50) {
      this.isScrolling = false;
      this.iconColor = "#FFFFFF";
    }
    // #endif
  },
  methods: {
    more: function () {
      this.order = !this.order;
    },
    modify: function (status) {
      this.change = true;
      this.status = status;
    },
    changeclose: function (msg) {
      this.change = msg;
    },
    getIndex: function () {
      let that = this;
      OrderDetail(that.order_id).then(
        (res) => {
          that.sum = (
            parseFloat(res.data.total_price) +
            parseFloat(res.data.vip_true_price)
          ).toFixed(2);
          that.types = res.data._status._type;
          that.title = res.data._status._title;
          that.payType = res.data._status._payType;
          this.system_store = res.data.store;
          that.giveData.give_coupon = res.data.give_coupon;
          that.giveData.give_integral = res.data.give_integral;
          let cartObj = [],
            giftObj = [];
          res.data.cartInfo.forEach((item, index) => {
            if (item.is_gift == 1) {
              giftObj.push(item);
            } else {
              cartObj.push(item);
            }
          });
          res.data.cartInfo = cartObj;
          that.$set(that, "giveCartInfo", giftObj);
          let arr = [];
          for (let i = 0; i < res.data.user_address.length; i++) {
            if (res.data.user_address[i] != " ") {
              arr.push(res.data.user_address[i]);
            }
          }
          res.data.user_address = arr.join("");
          that.orderInfo = res.data;
        },
        (err) => {
          // that.$util.Tips({
          // 	title: err
          // }, {
          // 	tab: 3,
          // 	url: 1
          // });
        },
      );
    },
    //打开地图
    showMaoLocation: function (latitude, longitude, name, detailed_address) {
      if (!latitude || !longitude)
        return this.$util.Tips({
          title: "缺少经纬度信息无法查看地图！",
        });
      uni.openLocation({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        scale: 8,
        name: name,
        address: detailed_address,
        success: function () {},
      });
    },
    //拨打电话
    makePhone: function (phone) {
      uni.makePhoneCall({
        phoneNumber: phone,
      });
    },
    copyNum(id) {
      uni.setClipboardData({
        data: id,
      });
    },
    // #ifdef H5
    webCopy(item, index) {
      let items = item;
      let indexs = index;
      let self = this;

      if (self.clickNum == 1) {
        self.clickNum += 1;
        self.webCopy(items, indexs);
      }
    },
    // #endif
  },
};
</script>

<style lang="scss" scoped>
.headerBg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 506rpx;
  background:
    linear-gradient(360deg, #f5f5f5 0%, rgba(245, 245, 245, 0) 100%),
    linear-gradient(-90deg, $gradient-primary-admin 0%, $primary-admin 100%);
  background-position:
    left bottom,
    left top;
  background-repeat: no-repeat;
  background-size:
    100% 120rpx,
    100% 100%;
}

.order-details {
  position: relative;
  padding: 32rpx 20rpx;

  .address {
    position: relative;
    padding: 32rpx 24rpx 28rpx 32rpx;
    border-radius: 24rpx;
    background: #ffffff;
    overflow: hidden;

    .text-box {
      flex: 1;
      font-size: 24rpx;
      line-height: 34rpx;
      color: #999999;
    }

    .text {
      margin-bottom: 12rpx;
      font-weight: 500;
      font-size: 30rpx;
      line-height: 42rpx;
      color: #333333;

      .iconfont {
        font-size: 32rpx;
        margin-right: 20rpx;
      }
    }

    .btn {
      width: 56rpx;
      height: 56rpx;
      border-radius: 50%;
      margin-left: 24rpx;
      background: rgba(42, 126, 251, 0.1);
      text-align: center;
      line-height: 56rpx;

      .iconfont {
        font-size: 28rpx;
        color: #2a7efb;
      }
    }

    .line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
    }
  }

  .goods-section {
    padding: 32rpx 24rpx;
    border-radius: 24rpx;
    margin-top: 20rpx;
    background: #ffffff;

    .goods {
      margin-top: 32rpx;

      &:first-child {
        margin-top: 0;
      }
    }

    .picTxt {
      flex: 1;
      min-width: 0;
    }

    .pictrue {
      width: 136rpx;
      height: 136rpx;
      border-radius: 16rpx;
    }

    .text {
      flex: 1;
      min-width: 0;
      padding: 0 20rpx;
    }

    .info {
      font-size: 28rpx;
      line-height: 40rpx;
      color: #333333;
    }

    .attr {
      margin-top: 8rpx;
      font-size: 24rpx;
      line-height: 34rpx;
      color: #999999;
    }

    .label {
      display: inline-flex;
      align-items: center;
      height: 26rpx;
      padding: 0 6rpx;
      border: 1rpx solid #ff7e00;
      border-radius: 4rpx;
      margin-top: 12rpx;
      font-size: 18rpx;
      line-height: 26rpx;
      color: #ff7e00;
    }

    .money {
      text-align: right;
    }

    .num {
      margin-top: 10rpx;
      font-size: 24rpx;
      line-height: 34rpx;
      color: #999999;
    }
  }

  .detail-section {
    padding: 32rpx 24rpx;
    border-radius: 24rpx;
    margin-top: 20rpx;
    background: #ffffff;

    .item {
      margin-top: 24rpx;
      font-size: 28rpx;
      line-height: 40rpx;
      color: #333333;

      &:first-child {
        margin-top: 0;
      }
    }
  }
}

.mt28 {
  margin-top: 28rpx;
}

.height-add {
  height: 120upx;
}

.giveGoods {
  .item {
    padding: 14rpx 0;
    border-top: 1px solid #eee;

    .picTxt {
      .pictrue {
        width: 76rpx;
        height: 76rpx;
        border-radius: 6rpx;
        background-color: #f5f5f5;
        color: $primary-admin;

        .iconfont {
          font-size: 34rpx;
        }

        image {
          width: 100%;
          height: 100%;
          border-radius: 6rpx;
        }

        margin-right: 16rpx;
      }

      .texts {
        width: 360rpx;
        color: #999999;
        font-size: 20rpx;

        .name {
          color: #333;
        }

        .limit {
          font-size: 20rpx;
          margin-top: 4rpx;
        }
      }
    }

    .num {
      color: #999999;
      font-size: 20rpx;
    }
  }
}

.order-details .line {
  width: 100%;
  height: 3upx;
}

.order-details .line image {
  width: 100%;
  height: 100%;
  display: block;
}

.order-details .wrapper {
  background: #ffffff;
}

.order-details .topnone {
  padding: 32rpx 24rpx;
  border-radius: 24rpx;
  margin-top: 20rpx;
}

.order-details .wrapper .title {
  height: 100upx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1upx solid #eeeeee;
  margin-bottom: 34upx;
}

.order-details .wrapper .title .font {
  font-size: 32upx;
  font-weight: 600;
  color: #282828;
}

.order-details .wrapper .title .mapbtn {
  width: 176upx;
  height: 56upx;
  border: 1upx solid #1890ff;
  border-radius: 28upx;
  text-align: center;
  line-height: 50upx;
  color: #1890ff;
  font-size: 26upx;
}

.order-details .wrapper .item {
  font-size: 28upx;
  color: #282828;
}

.order-details .wrapper .item ~ .item {
  margin-top: 26rpx;
}

.order-details .wrapper .item .conter {
  color: #868686;
  /* width: 500upx; */
  text-align: right;
}

.order-details .wrapper .item .conter .copy {
  font-size: 20rpx;
  color: #333;
  border-radius: 3rpx;
  border: 1px solid #666;
  padding: 0rpx 15rpx;
  margin-left: 10rpx;
  height: 40rpx;
  line-height: 38upx;
}

.order-details .wrapper .actualPay {
  // border-top: 1upx solid #eee;
  margin-top: 26rpx;
  // padding-top: 30upx;
}

.order-details .wrapper .actualPay .money {
  font-weight: bold;
  font-size: 30upx;
  color: #ff7e00;
}

.copy-data {
  width: 68rpx;
  height: 36rpx;
  border-radius: 18rpx;
  margin-left: 8rpx;
  background: #f5f5f5;
  text-align: center;
  font-size: 22rpx;
  line-height: 36rpx;
  color: #333333;
}
</style>
