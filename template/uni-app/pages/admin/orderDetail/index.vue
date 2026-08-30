<template>
  <view>
    <!-- #ifdef MP || APP-PLUS -->
<!--    <NavBar
      titleText="订单详情"
      :iconColor="iconColor"
      :textColor="iconColor"
      :isScrolling="isScrolling"
      showBack
    ></NavBar> -->
    <!-- #endif -->
    <view class="headerBg">
      <view :style="{ height: `${getHeight.barTop}px` }"></view>
      <view :style="{ height: `${getHeight.barHeight}px` }"></view>
      <view class="inner"></view>
    </view>
    <view class="order-details pos-order-details">
      <view class="header">
        <view class="state">{{ title }}</view>
        <view
          v-if="
            orderInfo.status == 0 &&
            orderInfo.paid == 0 &&
            orderInfo.pay_type != 'offline'
          "
          class="data acea-row row-middle"
        >
          需付款：¥{{ orderInfo.pay_price }}
          <countDown
            :isDay="false"
            tipText="支付剩余："
            dayText=" "
            hourText="时"
            minuteText="分"
            secondText=" "
            dotColor="#FFFFFF"
            colors="#FFFFFF"
            :datatime="orderInfo.stop_time"
            :isSecond="false"
          >
          </countDown>
        </view>
        <view v-if="orderInfo._status._type == 1" class="data"
          >用户已付款，需要您尽快发货哦～</view
        >
        <view v-if="orderInfo._status._type == 2" class="data"
          >商家已发货，等待用户收货</view
        >
        <view v-if="orderInfo._status._type == 5" class="data"
          >需用户出示二维码或数字即可核销</view
        >
      </view>
      <view
        class="remarks acea-row row-middle"
        @click="modify('1')"
        v-if="goname != 'looks'"
      >
        <text class="iconfont icon-ic_notes"></text>
        <view class="p-20 flex-1 fs-28 flex-y-center">{{
          orderInfo.remark || "订单未备注，点击添加备注信息"
        }}</view>
      </view>
      <view class="address" v-if="orderInfo.shipping_type == 1">
        <view class="flex-between-center">
          <view class="name">
            <text class="iconfont icon-ic_location4"></text>
            {{ orderInfo.real_name }}
            <text class="phone">{{ orderInfo.user_phone }}</text>
          </view>
          <text
            class="copy-btn"
            @click="
              copyNum(
                orderInfo.real_name +
                  ' ' +
                  orderInfo.user_phone +
                  ' ' +
                  orderInfo.user_address,
              )
            "
            >复制</text
          >
        </view>

        <view>地址：{{ orderInfo.user_address }}</view>
        <view class="line">
          <image src="/static/images/line.jpg" />
        </view>
      </view>
      <view class="acea-row row-middle user-box">
        <image :src="userInfo.avatar" class="image"></image>
        <view class="text">
          <view class="acea-row row-middle name">
            {{ userInfo.nickname }}
            <view v-if="userInfo.isMember" class="svip">SVIP</view>
            <view v-if="userInfo.level_grade" class="grade acea-row row-middle"
              ><text class="iconfont icon-huiyuandengji"></text>V{{
                userInfo.level_grade
              }}</view
            >
          </view>
          <view v-if="userInfo.phone" class=""
            >{{ userInfo.phone }}（ID:{{ userInfo.uid }}）</view
          >
          <view v-else class="">ID:{{ userInfo.uid }}</view>
        </view>
      </view>
      <!-- 拆单时 -->
      <view
        v-for="(j, indexw) in orderInfo.split"
        :key="indexw"
        v-if="orderInfo.split && orderInfo.split.length"
      >
        <view class="splitTitle acea-row row-between-wrapper">
          <view>订单包裹{{ indexw + 1 }}</view>
          <view class="title">{{ j._status._title }}</view>
        </view>
        <view class="pos-order-goods">
          <navigator
            :url="`/pages/admin/orderDetail/index?id=${j.order_id}`"
            hover-class="none"
            class="goods acea-row row-between-wrapper"
            v-for="(item, index) in j.cartInfo"
            :key="index"
          >
            <view class="picTxt acea-row row-between-wrapper">
              <view class="pictrue">
                <image
                  :src="
                    item.productInfo.attrInfo
                      ? item.productInfo.attrInfo.image
                      : item.productInfo.image
                  "
                />
              </view>
              <view class="text acea-row row-between row-column">
                <view class="info line2">
                  {{ item.productInfo.store_name }}
                </view>
                <view class="attr">{{ item.productInfo.attrInfo.suk }}</view>
              </view>
            </view>
            <view class="money">
              <view class="x-money"
                >￥{{
                  item.productInfo.attrInfo
                    ? item.productInfo.attrInfo.price
                    : item.productInfo.price
                }}</view
              >
              <view class="num">x {{ item.cart_num }}</view>
              <!-- <view class="y-money">￥{{ item.productInfo.ot_price }}</view> -->
            </view>
          </navigator>
        </view>
      </view>
      <!-- 结束 -->
      <!-- 未拆单时，正常单 -->
      <view
        class="pos-order-goods split"
        v-if="orderInfo.cartInfo && orderInfo.cartInfo.length"
      >
        <view
          class="title acea-row row-between-wrapper"
          v-if="
            (orderInfo.status == 0 &&
              orderInfo.paid == 1 &&
              orderInfo.shipping_type == 2) ||
            orderInfo.status == 5 ||
            (orderInfo.status == 2 && orderInfo.shipping_type == 2)
          "
        >
          <text>共{{ totalNmu }}件商品</text>
          <!-- <navigator class="bnt" :url="'/pages/admin/delivery/index?id='+orderInfo.order_id+'&listId='+orderInfo.id+'&totalNum='+orderInfo.total_num+'&orderStatus='+orderInfo.status+'&comeType=2'">去发货</navigator> -->
          <!-- <navigator class="btn" :url="'/pages/admin/writeRecordList/index?id='+orderInfo.id" hover-class="none">
						核销记录<text class="iconfont icon-ic_rightarrow"></text>
					</navigator> -->
        </view>
        <navigator
          :url="`/pages/goods_details/index?id=${item.product_id}`"
          hover-class="none"
          class="goods acea-row"
          v-for="(item, index) in orderInfo.cartInfo"
          :key="index"
        >
          <view class="picTxt acea-row">
            <view class="pictrue">
              <image
                :src="
                  item.productInfo.attrInfo
                    ? item.productInfo.attrInfo.image
                    : item.productInfo.image
                "
              />
            </view>
            <view class="text">
              <view class="info line1">{{ item.productInfo.store_name }}</view>
              <view class="attr line1">{{
                item.productInfo.attrInfo.suk
              }}</view>
            </view>
          </view>
          <view class="money">
            <!-- <view class="x-money">￥{{ item.productInfo.attrInfo?item.productInfo.attrInfo.price:item.productInfo.price }}</view> -->
            <BaseMoney
              :money="
                item.productInfo.attrInfo
                  ? item.productInfo.attrInfo.price
                  : item.productInfo.price
              "
              symbolSize="20"
              integerSize="32"
              decimalSize="20"
            ></BaseMoney>
            <view class="num">共{{ item.cart_num }}件</view>
            <view class="acea-row row-right">
              <view
                class="writeOff"
                v-if="item.refund_num && orderInfo.refund_type != 6"
                >{{ item.refund_num }}件退款中</view
              >
              <view
                class="writeOff"
                v-if="
                  orderInfo._status._type == 2 &&
                  orderInfo.delivery_type == 'send'
                "
              >
                <text v-if="item.refund_num">，</text>
                <text class="on" v-if="item.is_writeoff">已核销</text>
                <text
                  v-if="!item.is_writeoff && item.surplus_num < item.cart_num"
                  >已核销{{
                    parseInt(item.cart_num) - parseInt(item.surplus_num)
                  }}件</text
                >
                <text
                  v-if="!item.is_writeoff && item.surplus_num == item.cart_num"
                  >未核销</text
                >
              </view>
            </view>
          </view>
        </navigator>
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
        <view class="mark acea-row" v-if="orderInfo.mark">
          <view class="name">留言</view>
          <view class="value line1">{{ orderInfo.mark }}</view>
        </view>
      </view>
      <view
        class="wrapper"
        v-if="
          orderInfo.delivery_type == 'fictitious' && orderInfo.product_type != 1
        "
      >
        <view
          class="item acea-row row-between"
          v-if="orderInfo.fictitious_content"
        >
          <view>虚拟备注：</view>
          <view class="conter">{{ orderInfo.fictitious_content }}</view>
        </view>
      </view>
      <view
        class="wrapper"
        v-if="orderInfo.virtual_info && orderInfo.product_type == 1"
      >
        <view class="item acea-row row-between">
          <view>卡密发货</view>
          <view class="conter">{{ orderInfo.virtual_info }}</view>
        </view>
      </view>
      <customForm :customForm="orderInfo.custom_form"></customForm>
      <view class="wrapper">
        <view class="item acea-row row-between">
          <view>订单编号</view>
          <view class="conter acea-row row-middle row-right"
            >{{ orderInfo.order_id }}
            <text class="copy-btn" @click="copyNum(orderInfo.order_id)"
              >复制</text
            >
          </view>
        </view>
        <view class="item acea-row row-between">
          <view>下单时间</view>
          <view class="conter">{{ orderInfo._add_time }}</view>
        </view>
        <view class="item acea-row row-between">
          <view>支付状态</view>
          <view class="conter">
            {{ orderInfo.paid == 1 ? "已支付" : "未支付" }}
          </view>
        </view>
        <view class="item acea-row row-between">
          <view>支付方式</view>
          <view class="conter">{{ payType }}</view>
        </view>
        <!-- <view class="item acea-row row-between" v-if="orderInfo.mark">
					<view v-if="statusType == -3">退款留言：</view>
					<view v-else>买家留言：</view>
					<view class="conter">{{ orderInfo.mark }}</view>
				</view> -->
        <view
          class="item acea-row row-between"
          v-if="orderInfo.refund_goods_explain"
        >
          <view>退货留言</view>
          <view class="conter">{{ orderInfo.refund_goods_explain }}</view>
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.refund_img && orderInfo.refund_img.length"
        >
          <view>退款凭证</view>
          <view class="conter">
            <view
              class="pictrue"
              v-for="(item, index) in orderInfo.refund_img"
              :key="index"
            >
              <image
                :src="item"
                mode="aspectFill"
                @click="getpreviewImage(index, 1)"
              ></image>
            </view>
          </view>
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.refund_goods_img && orderInfo.refund_goods_img.length"
        >
          <view>退货凭证</view>
          <view class="conter">
            <view
              class="pictrue"
              v-for="(item, index) in orderInfo.refund_goods_img"
              :key="index"
            >
              <image
                :src="item"
                mode="aspectFill"
                @click="getpreviewImage(index, 0)"
              ></image>
            </view>
          </view>
        </view>
      </view>
      <view
        class="wrapper"
        v-if="
          orderInfo.delivery_type != 'fictitious' &&
          orderInfo._status._type === 2 &&
          (!orderInfo.split || !orderInfo.split.length)
        "
      >
        <view class="item acea-row row-between">
          <view>配送方式</view>
          <view class="conter" v-if="orderInfo.delivery_type === 'express'">
            快递
          </view>
          <view class="conter" v-if="orderInfo.delivery_type === 'send'"
            >送货</view
          >
        </view>
        <view class="item acea-row row-between">
          <view v-if="orderInfo.delivery_type === 'express'">快递公司</view>
          <view v-if="orderInfo.delivery_type === 'send'">送货人</view>
          <view class="conter">{{ orderInfo.delivery_name }}</view>
        </view>
        <view class="item acea-row row-between">
          <view v-if="orderInfo.delivery_type === 'express'">快递单号</view>
          <view v-if="orderInfo.delivery_type === 'send'">送货人电话</view>
          <view class="conter">
            {{ orderInfo.delivery_id }}
            <span class="copy-btn" @click="copyNum(orderInfo.delivery_id)"
              >复制</span
            >
          </view>
        </view>
      </view>
      <view class="wrapper">
        <view class="item acea-row row-between">
          <view>商品总价</view>
          <view class="conter" v-if="statusType == -3">
            ￥{{ orderInfo.total_price }}</view
          >
          <view class="conter" v-else>
            ￥{{
              (
                parseFloat(orderInfo.total_price) +
                parseFloat(orderInfo.vip_true_price)
              ).toFixed(2)
            }}</view
          >
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.pay_postage > 0"
        >
          <view>配送运费</view>
          <view class="conter">￥{{ orderInfo.pay_postage }}</view>
        </view>
        <view
          v-if="orderInfo.vip_true_price > 0"
          class="item acea-row row-between"
        >
          <view>会员商品优惠</view>
          <view class="conter"
            >-￥{{ parseFloat(orderInfo.vip_true_price).toFixed(2) }}</view
          >
        </view>
        <view class="item acea-row row-between" v-if="orderInfo.coupon_id">
          <view>优惠券抵扣</view>
          <view class="conter">-￥{{ orderInfo.coupon_price }}</view>
        </view>
        <view
          class="item acea-row row-between"
          v-if="orderInfo.use_integral > 0"
        >
          <view>积分抵扣</view>
          <view class="conter"
            >-￥{{ parseFloat(orderInfo.deduction_price).toFixed(2) }}</view
          >
        </view>
        <view class="item acea-row row-between" v-if="orderInfo.yue_price > 0">
          <view>余额抵扣</view>
          <view class="conter"
            >-￥{{ parseFloat(orderInfo.yue_price).toFixed(2) }}</view
          >
        </view>
        <!-- 采购优惠 channel_price -->
        <view
          class="item acea-row row-between"
          v-if="Number(orderInfo.channel_price) > 0"
        >
          <text class="fs-28">采购优惠</text>
          <text class="fs-28">-¥{{ orderInfo.channel_price }}</text>
        </view>
        <view
          class="item acea-row row-between"
          v-for="(item, index) in orderInfo.promotions_detail"
          :key="index"
          v-if="parseFloat(item.promotions_price)"
        >
          <view>{{ item.title }}</view>
          <view class="conter"
            >-￥{{ parseFloat(item.promotions_price).toFixed(2) }}</view
          >
        </view>
        <view class="actualPay acea-row row-right">
          实付款
          <BaseMoney
            :money="orderInfo.pay_price"
            symbolSize="24"
            integerSize="40"
            decimalSize="24"
            color="#FF7E00"
          ></BaseMoney>
        </view>
      </view>
      <view class="height-add"></view>
      <view
        class="footer acea-row row-right row-middle"
        v-if="goname != 'looks'"
      >
        <view class="more"></view>
        <view class="bnt cancel" @click="modify('0')" v-if="types == 0">
          一键改价
        </view>
        <!-- types == -1 -->
        <view class="bnt cancel" @click="modify('1')">订单备注</view>
        <view
          class="bnt cancel"
          @click="modify('2', 1)"
          v-if="
            (!orderInfo.refund || !orderInfo.refund.length) &&
            (orderInfo.refund_type == 0 ||
              orderInfo.refund_type == 1 ||
              orderInfo.refund_type == 5) &&
            orderInfo.paid &&
            parseFloat(orderInfo.pay_price) >= 0
          "
        >
          立即退款
        </view>
        <view
          class="bnt cancel"
          @click="modify('2', 0)"
          v-if="orderInfo.refund_type == 2"
        >
          同意退货
        </view>

        <view
          class="bnt delivery"
          v-if="
            orderInfo.status == 0 &&
            orderInfo.paid === 0 &&
            orderInfo.is_cancel === 0
          "
          @click="confirmShow = true"
        >
          确认付款
        </view>
        <view
          class="bnt delivery"
          v-if="
            types == 1 &&
            orderInfo.shipping_type === 1 &&
            (orderInfo.pinkStatus === null || orderInfo.pinkStatus === 2)
          "
          @click="goDelivery(orderInfo)"
          >发送货</view
        >
        <view
          class="bnt delivery"
          v-if="
            orderInfo.delivery_type == 'express' && orderInfo._status._type == 2
          "
          @click="goLogistics(orderInfo)"
          >查看物流
        </view>
        <view
          v-if="
            orderInfo.shipping_type == 2 &&
            (orderInfo.status == 0 || orderInfo.status == 5) &&
            orderInfo.paid == 1 &&
            orderInfo.refund_status === 0
          "
          class="bnt delivery"
          @click="verify"
          >立即核销</view
        >
      </view>
      <PriceChange
        :change="change"
        :orderInfo="orderInfo"
        :isRefund="isRefund"
        v-on:statusChange="statusChange($event)"
        v-on:closechange="changeclose($event)"
        v-on:savePrice="savePrice"
        :status="status"
      ></PriceChange>
    </view>
    <view v-if="confirmShow" class="mask"></view>
    <view v-if="confirmShow" class="confirm-popup">
      <view class="title">确认付款</view>
      <view class="info">确认该订单用户已付款</view>
      <view class="acea-row btn-box">
        <view class="btn" @click="confirmShow = false">取消</view>
        <view class="btn primary" @click="offlinePay">确认</view>
      </view>
    </view>
    <home></home>
  </view>
</template>
<script>
import PriceChange from "../components/PriceChange/index.vue";
import customForm from "../components/customForm";
import countDown from "@/components/countDown/index.vue";
// #ifdef MP || APP-PLUS
import NavBar from "@/components/NavBar.vue";
// #endif
import {
  getAdminOrderDetail,
  getAdminRefundDetail,
  setAdminOrderPrice,
  setAdminRefundRemark,
  setAdminOrderRemark,
  setOfflinePay,
  setOrderRefund,
  orderRefundAgree,
  getUserInfo,
  orderVerific,
} from "@/api/admin";
// import {
// 	erpConfig
// } from "@/api/esp.js";
import { isMoney } from "@/utils/validate.js";

export default {
  name: "AdminOrder",
  components: {
    PriceChange,
    customForm,
    countDown,
    // #ifdef MP || APP-PLUS
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
      totalNmu: 0,
      order: false,
      change: false,
      order_id: "",
      orderInfo: {
        _status: {},
      },
      status: "",
      title: "",
      payType: "",
      types: "",
      statusType: "",
      clickNum: 1,
      goname: "",
      isRefund: 0, //1是仅退款;0是同意退货退款
      iconColor: "#FFFFFF",
      isScrolling: false,
      getHeight: this.$util.getWXStatusHeight(),
      confirmShow: false,
      userInfo: {},
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
  computed: {
    identity() {
      return this.$store.state.app.identity;
    },
  },
  onLoad: function (option) {
    let self = this;
    this.order_id = option.id;
    this.goname = option.goname;
    this.statusType = option.types;
  },
  onShow() {
    this.getIndex();
    // this.getErpConfig();
  },
  onPageScroll(e) {
    // #ifdef MP || APP-PLUS
    if (e.scrollTop > 50) {
      this.iconColor = "#333333";
      this.isScrolling = true;
    } else {
      this.iconColor = "#FFFFFF";
      this.isScrolling = false;
    }
    // #endif
  },
  methods: {
    verify() {
      uni.showModal({
        title: '操作提示',
        content: '是否确认核销该订单？',
        success: (res) => {
          if (res.confirm) {
            orderVerific(this.orderInfo.verify_code, 1, 1)
              .then((res) => {
                this.$util.Tips({
                  title: res.msg
                });
                this.getIndex();
              })
              .catch((res) => {
                return this.$util.Tips({
                  title: res
                });
              });
          }
        }
      });
    },
    statusChange(e) {
      this.status = e;
    },
    goLogistics(orderInfo) {
      uni.navigateTo({
        url: "/pages/admin/logistics/index?orderId=" + orderInfo.order_id,
      });
    },
    goDelivery(orderInfo) {
      uni.navigateTo({
        url:
          "/pages/admin/delivery/index?id=" +
          orderInfo.order_id +
          "&listId=" +
          orderInfo.id +
          "&totalNum=" +
          orderInfo.total_num +
          "&orderStatus=" +
          orderInfo.status +
          "&comeType=2&productType=" +
          orderInfo.product_type,
      });
    },
    getpreviewImage: function (index, num) {
      uni.previewImage({
        urls: num ? this.orderInfo.refund_img : this.orderInfo.refund_goods_img,
        current: num
          ? this.orderInfo.refund_img[index]
          : this.orderInfo.refund_goods_img[index],
      });
    },
    more: function () {
      this.order = !this.order;
    },
    modify(status, type) {
      this.change = true;
      this.status = status;
      if (status == 2) {
      	this.isRefund = type
      }
    },
    changeclose: function (msg) {
      this.change = msg;
    },
    getIndex: function () {
      let that = this;
      let obj = "";
      if (that.statusType == -3) {
        obj = getAdminRefundDetail(that.order_id);
      } else {
        obj = getAdminOrderDetail(that.order_id);
      }
      obj
        .then((res) => {
          let num = 0;
          that.types = res.data._status._type;
          that.title = res.data._status._title;
          that.payType = res.data._status._payType;
          that.giveData.give_coupon = res.data.give_coupon;
          that.giveData.give_integral = res.data.give_integral;
          let cartObj = [],
            giftObj = [];
          res.data.cartInfo.forEach((item, index) => {
            num += item.cart_num;
            if (item.is_gift == 1) {
              giftObj.push(item);
            } else {
              cartObj.push(item);
            }
          });
          this.totalNmu = num;
          res.data.cartInfo = cartObj;
          that.$set(that, "giveCartInfo", giftObj);
          that.orderInfo = res.data;
          that.getUserInfo();
        })
        .catch((err) => {
          return that.$util.Tips({
            title: err.msg,
          });
        });
    },
    objOrderRefund(data) {
      let that = this;
      setOrderRefund(data).then(
        (res) => {
          that.change = false;
          that.$util.Tips({
            title: res.msg,
          });
          that.getIndex();
        },
        (err) => {
          that.change = false;
          that.$util.Tips({
            title: err,
          });
        },
      );
    },
    async savePrice(opt) {
      let that = this,
        data = {},
        price = opt.price,
        refund_price = opt.refund_price,
        refund_status = that.orderInfo.refund_status,
        remark = opt.remark;
      data.order_id = that.orderInfo.order_id;
      if (that.status == 0) {
        if (!isMoney(price)) {
          return that.$util.Tips({
            title: "请输入正确的金额",
          });
        }
        data.price = price;
        setAdminOrderPrice(data)
          .then((res) => {
            that.change = false;
            that.$util.Tips({
              title: "改价成功",
              icon: "success",
            });
            that.order_id = res.data.order_id;
            that.getIndex();
          })
          .catch((err) => {
            that.change = false;
            that.$util.Tips({
              title: "改价失败",
              icon: "none",
            });
          });
      } else if (that.status == 2) {
        if (this.isRefund) {
          if (!isMoney(refund_price)) {
            return that.$util.Tips({
              title: "请输入正确的金额",
            });
          }
          data.price = refund_price;
          data.type = opt.type;
          this.objOrderRefund(data);
        } else {
          if (opt.type == 1) {
            orderRefundAgree(this.orderInfo.id)
              .then((res) => {
                that.change = false;
                that.$util.Tips({
                  title: res.msg,
                });
                that.getIndex();
              })
              .catch((err) => {
                that.change = false;
                that.$util.Tips({
                  title: err,
                });
              });
          }
        }
      } else if (that.status == 8) {
        data.type = opt.type;
        data.refuse_reason = opt.refuse_reason;
        this.objOrderRefund(data);
      } else {
        if (!remark) {
          return this.$util.Tips({
            title: "请输入备注",
          });
        }
        data.remark = remark;
        let obj = "";
        if (that.statusType == -3) {
          obj = setAdminRefundRemark(data);
        } else {
          obj = setAdminOrderRemark(data);
        }
        obj.then(
          (res) => {
            that.change = false;
            this.$util.Tips({
              title: res.msg,
              icon: "success",
            });
            this.orderInfo.remark = remark;
            // that.getIndex();
          },
          (err) => {
            that.change = false;
            that.$util.Tips({
              title: err,
            });
          },
        );
      }
    },
    offlinePay: function () {
      setOfflinePay({
        order_id: this.orderInfo.order_id,
      }).then(
        (res) => {
          this.confirmShow = false;
          this.$util.Tips({
            title: res.msg,
            icon: "success",
          });
          this.getIndex();
        },
        (err) => {
          this.$util.Tips({
            title: err,
          });
        },
      );
    },
    copyNum(id) {
      uni.setClipboardData({
        data: id,
      });
    },
    getUserInfo() {
      getUserInfo(this.orderInfo.uid).then((res) => {
        this.userInfo = res.data;
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.headerBg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-image:
    linear-gradient(360deg, #f5f5f5 0%, rgba(245, 245, 245, 0) 100%),
    linear-gradient(270deg, $gradient-primary-admin 0%, $primary-admin 100%);
  background-position:
    left bottom,
    left top;
  background-repeat: no-repeat;
  background-size:
    100% 120rpx,
    100% 100%;

  .inner {
    height: 356rpx;
  }
}

.order-details {
  position: absolute;
  width: 100%;
  padding: 0 20rpx;
}

.height-add {
  height: calc(120rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
  height: calc(120rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
}

.giveGoods {
  .item {
    padding: 14rpx 30rpx 14rpx 0;
    margin-left: 30rpx;
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

.splitTitle {
  width: 100%;
  height: 80rpx;
  background-color: #fff;
  margin-top: 17rpx;
  border-bottom: 1px solid #e5e5e5;
  padding: 0 30rpx;
}

.splitTitle .title {
  color: #2291f8;
}

/*商户管理订单详情*/

.pos-order-details .remarks {
  padding-left: 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.pos-order-details .remarks .iconfont {
  font-size: 32rpx;
  color: #000000;
}

.pos-order-details .remarks input {
  flex: 1;
  height: 100rpx;
  padding-left: 20rpx;
  font-size: 28rpx;
}

.pos-order-details .remarks input::placeholder {
  color: #cccccc;
}

.pos-order-details .address {
  margin-top: 0;
}

.pos-order-details .footer .more {
  font-size: 27upx;
  color: #aaa;
  width: 100upx;
  height: 64upx;
  text-align: center;
  line-height: 64upx;
  margin-right: 25upx;
  position: relative;
}

.pos-order-details .footer .delivery {
  border-color: $primary-admin !important;
  background: $primary-admin;
  color: #ffffff !important;
}

.pos-order-details .footer .more .order .arrow {
  width: 0;
  height: 0;
  border-left: 11upx solid transparent;
  border-right: 11upx solid transparent;
  border-top: 20upx solid #e5e5e5;
  position: absolute;
  left: 15upx;
  bottom: -18upx;
}

.pos-order-details .footer .more .order .arrow:before {
  content: "";
  width: 0;
  height: 0;
  border-left: 9upx solid transparent;
  border-right: 9upx solid transparent;
  border-top: 19upx solid #fff;
  position: absolute;
  left: -10upx;
  bottom: 0;
}

.pos-order-details .footer .more .order {
  width: 200upx;
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 10upx;
  position: absolute;
  top: -200upx;
  z-index: 9;
}

.pos-order-details .footer .more .order .item {
  height: 77upx;
  line-height: 77upx;
}

.pos-order-details .footer .more .order .item ~ .item {
  border-top: 1px solid #f5f5f5;
}

.pos-order-details .footer .more .moreName {
  width: 100%;
  height: 100%;
}

/*订单详情*/
.order-details .header {
  padding: 48rpx 0 30rpx 12rpx;
}
.order-details .header .state {
  font-weight: 500;
  font-size: 36rpx;
  line-height: 50rpx;
  color: #ffffff;
}

.order-details .header .data {
  margin-top: 8rpx;
  font-size: 26rpx;
  line-height: 36rpx;
  color: #ffffff;
}

.order-details .header.on .data {
  margin-left: 0;
}

.order-details .header .data .time {
  margin-left: 20rpx;
}

.order-details .header .data .state {
  font-size: 30upx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 7upx;
}

.order-details .address {
  position: relative;
  padding: 32rpx 32rpx 40rpx;
  border-radius: 24rpx;
  margin-top: 20rpx;
  background: #ffffff;
  overflow: hidden;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #999999;
}

.order-details .address .name {
  margin-bottom: 12rpx;
  font-weight: 500;
  font-size: 30rpx;
  line-height: 42rpx;
  color: #333333;
}

.order-details .address .name .iconfont {
  margin-right: 8rpx;
  font-size: 32rpx;
}

.order-details .address .name .phone {
  margin-left: 40upx;
}

.order-details .line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
}

.order-details .line image {
  width: 100%;
  height: 100%;
  display: block;
}

.order-details .wrapper {
  padding: 32rpx 24rpx;
  border-radius: 24rpx;
  margin-top: 20rpx;
  background: #ffffff;
}

.order-details .wrapper .item {
  font-size: 28rpx;
  line-height: 40rpx;
  color: #333333;
}

.order-details .wrapper .item ~ .item {
  margin-top: 24rpx;
}

.order-details .wrapper .item .conter {
  // color: #868686;
  // width: 468rpx;
  // display: flex;
  // flex-wrap: nowrap;
  // justify-content: flex-end;
  // text-align: right;

  .pictrue {
    width: 80rpx;
    height: 80rpx;
    margin-left: 6rpx;

    image {
      width: 100%;
      height: 100%;
      border-radius: 6rpx;
    }
  }
}

.copy {
  height: 36rpx;
  padding: 0 12rpx;
  border: 0;
  border-radius: 18rpx;
  margin-left: 8rpx;
  background: #f5f5f5;
  font-size: 22rpx;
  line-height: 36rpx;
  color: #333333;
}
.copy-btn {
  width: 72rpx;
  height: 36rpx;
  text-align: center;
  line-height: 36rpx;
  border-radius: 18rpx;
  margin-left: 8rpx;
  background: #f5f5f5;
  font-size: 20rpx;
  color: #333333;
}

.order-details .wrapper .actualPay {
  margin-top: 26rpx;
  align-items: baseline;
}

.order-details .wrapper .actualPay .money {
  font-weight: bold;
  font-size: 30upx;
  color: #e93323;
}

.order-details .footer {
  width: 100%;
  height: 100upx;
  position: fixed;
  bottom: 0;
  left: 0;
  background-color: #fff;
  padding: 0 30upx;
  border-top: 1px solid #eee;
  height: calc(100rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
  height: calc(100rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
  padding-bottom: constant(safe-area-inset-bottom);
}

.order-details .footer .wait {
  color: #2a7efb;
  margin-right: 30rpx;
}

.order-details .footer .bnt {
  width: 144rpx;
  height: 56rpx;
  border: 1rpx solid #cccccc;
  line-height: 54rpx;
  text-align: center;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #333333;
  transform: rotateZ(360deg);

  &.on {
    color: #c5c8ce !important;
    background: #f7f7f7 !important;
    border: 1px solid #dcdee2 !important;
  }
}

.order-details .footer .bnt.cancel {
  // color: #333333;
  // border: 1px solid #CCCCCC;
}

.order-details .footer .bnt.default {
  color: #444;
  border: 1px solid #444;
}

.order-details .footer .bnt ~ .bnt {
  margin-left: 16rpx;
}

.pos-order-goods {
  padding: 32rpx 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
}

.pos-order-goods.split {
  margin-top: 20rpx;
}

.pos-order-goods .title {
  height: 40rpx;
  margin-bottom: 32rpx;
  font-size: 28rpx;
  color: #333333;
}

.pos-order-goods .title .btn {
  font-size: 26rpx;
  color: #999999;
}

.pos-order-goods .title .btn .iconfont {
  font-size: 24rpx;
}

.pos-order-goods.split .goods {
}

.pos-order-goods .goods ~ .goods {
  margin-top: 32rpx;
}

.pos-order-goods .goods .picTxt {
  flex: 1;
  min-width: 0;
}

.pos-order-goods .goods .picTxt .pictrue {
  width: 136rpx;
  height: 136rpx;
}

.pos-order-goods .goods .picTxt .pictrue image {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}

.pos-order-goods .goods .picTxt .text {
  flex: 1;
  min-width: 0;
  padding-left: 20rpx;
}

.pos-order-goods .goods .picTxt .text .info {
  font-size: 28rpx;
  line-height: 40rpx;
  color: #333333;
}

.pos-order-goods .goods .picTxt .text .info .label {
  color: #ff4c3c;
}

.pos-order-goods .goods .picTxt .text .attr {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #999999;
}

.pos-order-goods .goods .money {
  width: 144rpx;
  text-align: right;
}

.pos-order-goods .goods .money .writeOff {
  font-size: 24upx;
  margin-top: 17upx;
  color: #1890ff;
}

.pos-order-goods .goods .money .writeOff .on {
  color: #ff7e00;
}

.pos-order-goods .goods .money .x-money {
  color: #282828;
}

.pos-order-goods .goods .money .num {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #999999;
}

.pos-order-goods .goods .money .y-money {
  color: #999;
  text-decoration: line-through;
}

.public-total {
  font-size: 28upx;
  color: #282828;
  border-top: 1px solid #eee;
  height: 92upx;
  line-height: 92upx;
  text-align: right;
  padding: 0 30upx;
  background-color: #fff;
}

.public-total .money {
  color: #ff4c3c;
}

.pos-order-goods .mark {
  margin-top: 32rpx;
  font-size: 28rpx;
  line-height: 40rpx;
  color: #333333;

  .name {
    width: 136rpx;
  }

  .value {
    flex: 1;
  }
}

.mask {
  z-index: 21;
}

.confirm-popup {
  position: fixed;
  top: 50%;
  right: 75rpx;
  left: 75rpx;
  z-index: 21;
  transform: translateY(-50%);
  border-radius: 32rpx;
  background: #ffffff;
  text-align: center;

  .title {
    padding: 40rpx 32rpx 0;
    font-weight: 500;
    font-size: 32rpx;
    line-height: 52rpx;
    color: #333333;
  }

  .info {
    padding: 24rpx 40rpx 0;
    font-size: 30rpx;
    line-height: 42rpx;
    color: #666666;
  }

  .btn-box {
    padding: 40rpx;
  }

  .btn {
    flex: 1;
    height: 72rpx;
    border: 1rpx solid $primary-admin;
    border-radius: 36rpx;
    margin-left: 32rpx;
    font-weight: 500;
    font-size: 26rpx;
    line-height: 70rpx;
    color: $primary-admin;
    transform: rotateZ(360deg);

    &.primary {
      background: $primary-admin;
      color: #ffffff;
    }
  }
}

.user-box {
  padding: 24rpx;
  border-radius: 24rpx;
  margin-top: 20rpx;
  background: #ffffff;

  .image {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
  }

  .text {
    flex: 1;
    padding-left: 20rpx;
    font-size: 24rpx;
    line-height: 34rpx;
    color: #999999;
  }

  .name {
    margin-bottom: 4rpx;
    font-weight: 500;
    font-size: 28rpx;
    line-height: 40rpx;
    color: #333333;
  }

  .svip {
    width: 56rpx;
    height: 26rpx;
    border-radius: 14rpx;
    margin-left: 12rpx;
    background: linear-gradient(90deg, #484643 0%, #1f1b17 100%);
    text-align: center;
    font-weight: 600;
    font-size: 18rpx;
    line-height: 26rpx;
    color: #fddaa4;
  }

  .grade {
    height: 26rpx;
    padding: 0 10rpx;
    border: 1rpx solid #facc7d;
    border-radius: 14rpx;
    margin-left: 10rpx;
    background: #fef0d9;
    font-weight: 500;
    font-size: 18rpx;
    line-height: 24rpx;
    color: #dfa541;
    transform: rotateZ(360deg);

    .iconfont {
      margin-right: 6rpx;
      font-size: 18rpx;
    }
  }
}
</style>
