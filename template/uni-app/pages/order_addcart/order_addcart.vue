<template>
  <view :style="colorStyle">
  <view :style="cartStyles.page">
    <view v-if="cartDecoration.show_title && !cartDecoration.title_component.isHide" class="cart-page-title" :style="{paddingTop: statusBarHeight + 'px', background: cartDecoration.title_background_color}">
      <page-title :dataConfig="cartDecoration.title_component" :managing="!footerswitch" @action="$event === 'cartManage' && manage()" />
    </view>
    <view class="shoppingCart copy-data decorated-cart" v-if="canShow">
      <view v-if="cartDecoration.show_service && !cartDecoration.service_hidden" :style="cartStyles.service.outer">
      <view class="labelNav acea-row row-around row-middle" :style="cartStyles.service.inner">
        <view class="item" v-for="(label, index) in cartDecoration.service_labels" :key="index">
          <text class="iconfont icon-xuanzhong"></text>
          {{ $t(label) }}
        </view>
      </view>
      </view>
      <view v-if="cartDecoration.show_list && !cartDecoration.list_hidden && (cartList.valid.length || cartList.invalid.length)" class="nav acea-row row-between-wrapper">
        <view>
          {{ $t(`购物数量`) }}
          <text class="num font-num">{{ cartCount }}</text>
        </view>
        <view class="cart-list-manage" role="button" @click="manage">{{ $t(footerswitch ? '管理' : '取消') }}</view>
      </view>
      <view
        v-if="
          (cartList.valid.length > 0 || cartList.invalid.length > 0) && canShow
        "
      >
        <view v-show="cartDecoration.show_list && !cartDecoration.list_hidden" class="list" :style="cartStyles.list.outer">
          <checkbox-group @change="checkboxChange">
            <block v-for="(item, index) in cartList.valid" :key="index">
              <view class="item acea-row row-between-wrapper" :style="cartStyles.list.inner">
                <!-- #ifndef MP -->
                <checkbox
                  :value="item.id.toString()"
                  :checked="item.checked"
                  :disabled="!item.attrStatus && footerswitch"
                />
                <!-- <checkbox :value="(item.id).toString()" :checked="item.checked" :disabled="item.attrStatus?false:true" /> -->
                <!-- #endif -->
                <!-- #ifdef MP -->
                <checkbox
                  :value="item.id"
                  :checked="item.checked"
                  :disabled="!item.attrStatus && footerswitch"
                />
                <!-- #endif -->
                <navigator
                  :url="'/pages/goods_details/index?id=' + item.product_id"
                  hover-class="none"
                  class="picTxt acea-row row-between-wrapper"
                >
                  <view class="pictrue">
                    <image
                      v-if="item.productInfo.attrInfo"
                      :src="item.productInfo.attrInfo.image"
                    ></image>
                    <image v-else :src="item.productInfo.image"></image>
                  </view>
                  <view class="text">
                    <view
                      class="line2"
                      :class="item.attrStatus ? '' : 'reColor'"
                    >
                      {{ item.productInfo.store_name }}
                    </view>
                    <view class="infor line1" v-if="item.productInfo.attrInfo"
                      >{{ $t(`属性`) }}：{{
                        item.productInfo.attrInfo.suk
                      }}</view
                    >
                    <view class="money" v-if="item.attrStatus" :style="cartStyles.price"
                      >{{ $t(`￥`) }}{{ item.truePrice }}</view
                    >
                    <view
                      class="reElection acea-row row-between-wrapper"
                      v-else
                    >
                      <view class="title">{{ $t(`请重新选择商品规格`) }}</view>
                      <view
                        class="reBnt cart-color acea-row row-center-wrapper"
                        @click.stop="reElection(item)"
                        >{{ $t(`重选`) }}</view
                      >
                    </view>
                  </view>
                  <view
                    class="carnum acea-row row-center-wrapper"
                    v-if="item.attrStatus"
                  >
                    <view class="reduce" @click.stop="subCart(index)">-</view>
                    <!-- <view class='num'>{{item.cart_num}}</view> -->
                    <view class="num">
                      <input
                        type="number"
                        v-model="item.cart_num"
                        @click.stop
                        @input="iptCartNum(index)"
                        @blur="blurInput(index)"
                      />
                    </view>
                    <view
                      class="plus"
                      :class="item.numAdd && !disabledChangeNumber ? 'on' : ''"
                      @click.stop="addCart(index)"
                      >+</view
                    >
                  </view>
                </navigator>
              </view>
            </block>
          </checkbox-group>
        </view>
        <view class="invalidGoods" v-if="cartList.invalid.length > 0">
          <view class="goodsNav acea-row row-between-wrapper">
            <view @click="goodsOpen">
              <text
                class="iconfont"
                :class="
                  goodsHidden == true ? 'icon-xiangxia' : 'icon-xiangshang'
                "
              ></text>
              {{ $t(`失效商品`) }}
            </view>
            <view class="del" @click="unsetCart">
              <text class="iconfont icon-shanchu1"></text>
              {{ $t(`清空`) }}
            </view>
          </view>
          <view class="goodsList" :hidden="goodsHidden">
            <block v-for="(item, index) in cartList.invalid" :key="index">
              <view class="item acea-row row-between-wrapper">
                <view class="invalid">{{ $t(`失效`) }}</view>
                <view class="pictrue">
                  <image
                    v-if="item.productInfo.attrInfo"
                    :src="item.productInfo.attrInfo.image"
                  ></image>
                  <image v-else :src="item.productInfo.image"></image>
                </view>
                <view class="text acea-row row-column-between">
                  <view class="line1 name">{{
                    item.productInfo.store_name
                  }}</view>
                  <view class="infor line1" v-if="item.productInfo.attrInfo"
                    >{{ $t(`属性`) }}：{{ item.productInfo.attrInfo.suk }}</view
                  >
                  <view class="acea-row row-between-wrapper">
                    <!-- <view>￥{{item.truePrice}}</view> -->
                    <view class="end">{{ $t(`该商品已失效`) }}</view>
                  </view>
                </view>
              </view>
            </block>
          </view>
        </view>
        <!-- <view class='loadingicon acea-row row-center-wrapper' v-if="cartList.valid.length&&!loadend">
					<text class='loading iconfont icon-jiazai' :hidden='loading==false'></text>{{loadTitle}}
				</view> -->
        <view
          class="loadingicon acea-row row-center-wrapper"
          v-if="cartList.invalid.length && loadend"
        >
          <text
            class="loading iconfont icon-jiazai"
            :hidden="loadingInvalid == false"
          ></text>
          {{ loadTitleInvalid }}
        </view>
      </view>
      <view
        class="noCart"
        v-if="
          cartList.valid.length == 0 && cartList.invalid.length == 0 && canShow
        "
      >
        <view class="emptyBox">
          <image :src="imgHost + '/statics/images/no-thing.png'"></image>
          <view class="tips">{{ $t(cartDecoration.empty_text) }}</view>
        </view>
        <recommend
          v-if="cartDecoration.show_recommend && hostProduct.length"
          :hostProduct="hostProduct"
        ></recommend>
      </view>
      <view :style="[medHeight]"></view>
      <view class="cart-checkout-dock" v-if="cartDecoration.show_checkout && !cartDecoration.checkout_hidden && cartList.valid.length > 0 && canShow" :style="[cartStyles.checkout.outer, componentStyle]">
      <view
        class="footer acea-row row-between-wrapper"
        :style="cartStyles.checkout.inner"
      >
        <view>
          <checkbox-group @change="checkboxAllChange">
            <checkbox value="all" :checked="!!isAllSelect" />
            <text class="checkAll"
              >{{ $t(`全选`) }}({{ selectValue.length }})</text
            >
          </checkbox-group>
        </view>
        <view class="money acea-row row-middle" v-if="footerswitch == true">
          <view><text :style="cartStyles.price">{{ $t(`￥`) }}{{ selectCountPrice }}</text><view v-if="Number(fullReductionPrice) > 0" class="full-reduction-saving">满减 -￥{{ fullReductionPrice }}</view><view v-if="reductionLoading" class="full-reduction-saving">优惠计算中</view><view v-if="reductionError" class="full-reduction-saving" @tap="refreshReductionQuote">优惠计算失败，点此重试</view></view>
          <form @submit="subOrder">
            <button class="placeOrder" :disabled="reductionLoading || !!reductionError || disabledChangeNumber" :style="cartStyles.button" formType="submit">
              {{ $t(cartDecoration.checkout_text) }}
            </button>
          </form>
        </view>
        <view class="button acea-row row-middle" v-else>
          <form @submit="subCollect">
            <button class="bnt" formType="submit">{{ $t(`收藏`) }}</button>
          </form>
          <form @submit="subDel">
            <button class="bnt cart-color" formType="submit">
              {{ $t(`删除`) }}
            </button>
          </form>
        </view>
      </view>
      </view>
    </view>
    <productWindow
      :attr="attr"
      :isShow="1"
      :iSplus="1"
      :iScart="1"
      @myevent="onMyEvent"
      @ChangeAttr="ChangeAttr"
      @ChangeCartNum="ChangeCartNum"
      @attrVal="attrVal"
      @iptCartNum="iptCartNum"
      @goCat="reGoCat"
      id="product-window"
    ></productWindow>
    <!-- #ifdef MP -->
    <!-- <authorize :isAuto="isAuto" :isShowAuth="isShowAuth" @authColse="authColse"></authorize> -->
    <!-- #endif -->
    <!-- <view class="uni-p-b-96"></view> -->
    <pageFooter @newDataStatus="newDataStatus" @heightChange="navigationHeight = $event" @configuration="configuredNavigation = !!$event.mainNavigation"></pageFooter>
  </view>
  </view>
</template>

<script>
// #ifdef APP-PLUS
let sysHeight = uni.getWindowInfo().statusBarHeight + "px";
// #endif
// #ifndef APP-PLUS
let sysHeight = 0;
// #endif
import {
  getCartList,
  getFullReductionQuote,
  getCartCounts,
  changeCartNum,
  cartDel,
  getResetCart,
} from "@/api/order.js";
import { getProductHot, collectAll, getProductDetail } from "@/api/store.js";
import { toLogin } from "@/libs/login.js";
import { mapGetters } from "vuex";
import recommend from "@/components/recommend";
import productWindow from "@/components/productWindow";
// #ifdef MP
import authorize from "@/components/Authorize";
// #endif
import pageFooter from "@/components/pageFooter/index.vue";
import PageTitle from '@/subpackage/diyComponents/pageTitle.vue';
import colors from "@/mixins/color";
import { HTTP_REQUEST_URL, DEBOUNCETIME } from "@/config/app";
import { Throttle } from "@/utils/validate.js";
import { getThemeInfo } from '@/api/api.js';
import { normalizeCartPage, cartPageStyles } from '../../../shared/cartPageConfig';

export default {
  components: {
    PageTitle,
    pageFooter,
    recommend,
    productWindow,
    // #ifdef MP
    authorize,
    // #endif
  },
  mixins: [colors],
  data() {
    return {
      imgHost: HTTP_REQUEST_URL,
      is_diy: uni.getStorageSync("is_diy"),
      canShow: false,
      cartCount: 0,
      goodsHidden: true,
      footerswitch: true,
      hostProduct: [],
      cartList: {
        valid: [],
        invalid: [],
      },
      isAllSelect: false, //全选
      selectValue: [], //选中的数据
      selectCountPrice: 0.0,
      fullReductionPrice: '0.00',
      reductionLoading: false,
      reductionError: '',
      reductionRequestId: 0,
      isAuto: false, //没有授权的不会自动授权
      isShowAuth: false, //是否隐藏授权
      hotScroll: false,
      hotPage: 1,
      hotLimit: 10,
      loading: false,
      loadend: false,
      loadTitle: this.$t(`我也是有底线的`), //提示语
      page: 1,
      limit: 20,
      loadingInvalid: false,
      loadendInvalid: false,
      loadTitleInvalid: this.$t(`加载更多`), //提示语
      pageInvalid: 1,
      limitInvalid: 20,
      attr: {
        cartAttr: false,
        productAttr: [],
        productSelect: {},
      },
      productValue: [], //系统属性
      storeInfo: {},
      attrValue: "", //已选属性
      attrTxt: this.$t(`请选择`), //属性页面提示
      cartId: 0,
      product_id: 0,
      sysHeight: sysHeight,
      newData: {},
      activeRouter: "",
      is_diy_set: false,
      adding: false,
      disabledChangeNumber: false,
      isFooter: false,
      btmNum: 0,
      pdHeight: 0, //自定义底部导航上下边距和
      navigationHeight: 0,
      configuredNavigation: false,
      cartDecoration: normalizeCartPage(),
      checkoutHeight: 0,
      statusBarHeight: 0,
    };
  },
  computed: {
    ...mapGetters(["isLogin"]),
    cartStyles() { return cartPageStyles(this.cartDecoration, 'rpx', url => url && url.startsWith('/') ? HTTP_REQUEST_URL + url : url); },
    componentStyle() {
      return { bottom: this.navigationHeight + 'px' };
    },
    medHeight() {
      return { height: this.checkoutHeight + 'px' };
    },
  },
  watch: {
    cartDecoration: { deep:true, handler(){this.$nextTick(this.measureCartCheckout);} },
    canShow(){this.$nextTick(this.measureCartCheckout);},
    'cartList.valid.length'(){this.$nextTick(this.measureCartCheckout);},
    footerswitch(){this.$nextTick(this.measureCartCheckout);},
  },
  onLoad(options) {
    // #ifndef H5
    this.statusBarHeight = (uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()).statusBarHeight || 0;
    // #endif
    uni.hideTabBar();
    let that = this;
    let routes = getCurrentPages(); // 获取当前打开过的页面路由数组
    let curRoute = routes[routes.length - 1].route; //获取当前页面路由
    this.activeRouter = "/" + curRoute;
  },
  onShow() {
    this.loadCartDecoration();
    // #ifndef MP
    if (!this.isLogin) toLogin();
    // #endif

    this._cartActive = true;
    this._cartPageId = (this._cartPageId || 0) + 1;
    this.canShow = false;
    if (this.isLogin == true) {
      this.hotPage = 1;
      this.hostProduct = [];
      this.hotScroll = false;
      this.loadend = false;
      this.page = 1;
      this.cartList.valid = [];
      this.loadendInvalid = false;
      this.loadingInvalid = false;
      this.pageInvalid = 1;
      this.cartList.invalid = [];
      // this.getCartNum();
      this.goodsHidden = true;
      this.footerswitch = true;
      this.hostProduct = [];
      this.hotScroll = false;
      this.hotPage = 1;
      this.hotLimit = 10;
      (this.cartList = {
        valid: [],
        invalid: [],
      }),
        (this.isAllSelect = false); //全选
      this.selectValue = []; //选中的数据
      this.selectCountPrice = 0.0;
      this.cartCount = 0;
      this.isShowAuth = false;
      this._hotLoading = false;
      this.getCartList(1);
      this.getInvalidList();
      this.getHostProduct();
    } else {
      // #ifdef MP
      this.hotPage = 1;
      this.hostProduct = [];
      this.hotScroll = false;
      this.getHostProduct();
      this.loading = false;
      this.canShow = true;
      // #endif
    }
  },
  onHide() { this.stopCartLoading(); },
  onUnload() { this.stopCartLoading(); },
  beforeDestroy() { this.stopCartLoading(); },
  methods: {
    async loadCartDecoration() {
      const requestId=this._cartDecorationRequest=(this._cartDecorationRequest||0)+1;
      try {
        const res=await getThemeInfo('cart',{theme_id:uni.getStorageSync('previewThemeId')||0});
        if(this._isDestroyed||requestId!==this._cartDecorationRequest)return;
        this.cartDecoration=normalizeCartPage(res.data);
        // #ifdef H5
        if (typeof document !== 'undefined') document.title = this.cartDecoration.page_title;
        // #endif
        // #ifdef APP-PLUS
        plus.navigator.setStatusBarStyle(this.cartDecoration.title_text_color === '#FFFFFF' ? 'light' : 'dark');
        // #endif
      }catch(error){ /* Keep the current decoration when offline. */ }
    },
    measureCartCheckout() {
      uni.createSelectorQuery().in(this).select('.cart-checkout-dock').boundingClientRect(rect=>{if(!this._isDestroyed)this.checkoutHeight=rect?rect.height:0;}).exec();
    },
    stopCartLoading() {
      this.reductionRequestId++;
      this.reductionLoading = false;
      this._cartActive = false;
      this._cartPageId = (this._cartPageId || 0) + 1;
      this._cartRequestId = (this._cartRequestId || 0) + 1;
      if (this.loading) uni.hideLoading();
      this.loading = false;
      this.loadingInvalid = false;
      this._hotLoading = false;
    },
    // 授权关闭
    authColse: function (e) {
      this.isShowAuth = e;
    },
    newDataStatus(val, num, btmNum) {
      this.isFooter = val ? true : false;
      this.pdHeight = num;
      this.btmNum = btmNum;
    },
    // 修改购物车
    reGoCat: function () {
      let that = this,
        productSelect = that.productValue[this.attrValue];
      //如果有属性,没有选择,提示用户选择
      if (that.attr.productAttr.length && productSelect === undefined)
        return that.$util.Tips({
          title: that.$t(`产品库存不足，请选择其它`),
        });

      let q = {
        id: that.cartId,
        product_id: that.product_id,
        num: that.attr.productSelect.cart_num,
        unique:
          that.attr.productSelect !== undefined
            ? that.attr.productSelect.unique
            : "",
      };
      getResetCart(q)
        .then(function (res) {
          that.attr.cartAttr = false;
          that.$util.Tips({
            title: that.$t(`添加购物车成功`),
            success: () => {
              that.loadend = false;
              that.page = 1;
              that.cartList.valid = [];
              that.getCartList();
              that.getCartNum();
            },
          });
        })
        .catch((res) => {
          return that.$util.Tips({
            title: res.msg,
          });
        });
    },
    onMyEvent: function () {
      this.$set(this.attr, "cartAttr", false);
    },
    reElection: function (item) {
      this.getGoodsDetails(item);
    },
    /**
     * 获取产品详情
     *
     */
    getGoodsDetails: function (item) {
      uni.showLoading({
        title: this.$t(`加载中`),
        mask: true,
      });
      let that = this;
      that.cartId = item.id;
      that.product_id = item.product_id;
      getProductDetail(item.product_id)
        .then((res) => {
          uni.hideLoading();
          that.attr.cartAttr = true;
          let storeInfo = res.data.storeInfo;
          that.$set(that, "storeInfo", storeInfo);
          that.$set(that.attr, "productAttr", res.data.productAttr);
          that.$set(that, "productValue", res.data.productValue);
          that.DefaultSelect();
        })
        .catch((err) => {
          uni.hideLoading();
        });
    },
    /**
     * 属性变动赋值
     *
     */
    ChangeAttr: function (res) {
      let productSelect = this.productValue[res];
      if (productSelect && productSelect.stock > 0) {
        this.$set(this.attr.productSelect, "image", productSelect.image);
        this.$set(this.attr.productSelect, "price", productSelect.price);
        this.$set(this.attr.productSelect, "stock", productSelect.stock);
        this.$set(this.attr.productSelect, "unique", productSelect.unique);
        this.$set(this.attr.productSelect, "cart_num", 1);
        this.$set(this, "attrValue", res);
        this.$set(this, "attrTxt", this.$t(`已选择`));
      } else {
        this.$set(this.attr.productSelect, "image", this.storeInfo.image);
        this.$set(this.attr.productSelect, "price", this.storeInfo.price);
        this.$set(this.attr.productSelect, "stock", 0);
        this.$set(this.attr.productSelect, "unique", "");
        this.$set(this.attr.productSelect, "cart_num", 0);
        this.$set(this, "attrValue", "");
        this.$set(this, "attrTxt", this.$t(`请选择`));
      }
    },
    /**
     * 默认选中属性
     *
     */
    DefaultSelect: function () {
      let productAttr = this.attr.productAttr;
      let value = [];
      for (var key in this.productValue) {
        if (this.productValue[key].stock > 0) {
          value = this.attr.productAttr.length ? key.split(",") : [];
          break;
        }
      }
      for (let i = 0; i < productAttr.length; i++) {
        this.$set(productAttr[i], "index", value[i]);
      }
      //sort();排序函数:数字-英文-汉字；
      let productSelect = this.productValue[value.sort().join(",")];
      if (productSelect && productAttr.length) {
        this.$set(
          this.attr.productSelect,
          "store_name",
          this.storeInfo.store_name
        );
        this.$set(this.attr.productSelect, "image", productSelect.image);
        this.$set(this.attr.productSelect, "price", productSelect.price);
        this.$set(this.attr.productSelect, "stock", productSelect.stock);
        this.$set(this.attr.productSelect, "unique", productSelect.unique);
        this.$set(this.attr.productSelect, "cart_num", 1);
        this.$set(this, "attrValue", value.sort().join(","));
        this.$set(this, "attrTxt", this.$t(`已选择`));
      } else if (!productSelect && productAttr.length) {
        this.$set(
          this.attr.productSelect,
          "store_name",
          this.storeInfo.store_name
        );
        this.$set(this.attr.productSelect, "image", this.storeInfo.image);
        this.$set(this.attr.productSelect, "price", this.storeInfo.price);
        this.$set(this.attr.productSelect, "stock", 0);
        this.$set(this.attr.productSelect, "unique", "");
        this.$set(this.attr.productSelect, "cart_num", 0);
        this.$set(this, "attrValue", "");
        this.$set(this, "attrTxt", this.$t(`请选择`));
      } else if (!productSelect && !productAttr.length) {
        this.$set(
          this.attr.productSelect,
          "store_name",
          this.storeInfo.store_name
        );
        this.$set(this.attr.productSelect, "image", this.storeInfo.image);
        this.$set(this.attr.productSelect, "price", this.storeInfo.price);
        this.$set(this.attr.productSelect, "stock", this.storeInfo.stock);
        this.$set(
          this.attr.productSelect,
          "unique",
          this.storeInfo.unique || ""
        );
        this.$set(this.attr.productSelect, "cart_num", 1);
        this.$set(this, "attrValue", "");
        this.$set(this, "attrTxt", this.$t(`请选择`));
      }
    },
    attrVal(val) {
      this.$set(
        this.attr.productAttr[val.indexw],
        "index",
        this.attr.productAttr[val.indexw].attr_values[val.indexn]
      );
    },
    /**
     * 购物车数量加和数量减
     *
     */
    ChangeCartNum: function (changeValue) {
      //changeValue:是否 加|减
      //获取当前变动属性
      let productSelect = this.productValue[this.attrValue];
      //如果没有属性,赋值给商品默认库存
      if (productSelect === undefined && !this.attr.productAttr.length)
        productSelect = this.attr.productSelect;
      //无属性值即库存为0；不存在加减；
      if (productSelect === undefined) return;
      let stock = productSelect.stock || 0;
      let num = this.attr.productSelect;
      if (changeValue) {
        num.cart_num++;
        if (num.cart_num > stock) {
          this.$set(this.attr.productSelect, "cart_num", stock ? stock : 1);
          this.$set(this, "cart_num", stock ? stock : 1);
        }
      } else {
        num.cart_num--;
        if (num.cart_num < 1) {
          this.$set(this.attr.productSelect, "cart_num", 1);
          this.$set(this, "cart_num", 1);
        }
      }
    },
    /**
     * 购物车手动填写
     *
     */
    iptCartNum: function (e) {
      this.$set(this.attr.productSelect, "cart_num", e);
    },
    subDel: function (event) {
      let that = this,
        selectValue = that.selectValue;
      if (selectValue.length > 0)
        cartDel(selectValue).then((res) => {
          that.loadend = false;
          that.page = 1;
          that.cartList.valid = [];
          that.getCartList();
          that.getCartNum();
        });
      else
        return that.$util.Tips({
          title: that.$t(`请选择产品`),
        });
    },
    getSelectValueProductId: function () {
      let that = this;
      let validList = that.cartList.valid;
      let selectValue = that.selectValue;
      let productId = [];
      if (selectValue.length > 0) {
        for (let index in validList) {
          if (that.inArray(validList[index].id, selectValue)) {
            productId.push(validList[index].product_id);
          }
        }
      }
      return productId;
    },
    subCollect: function (event) {
      let that = this,
        selectValue = that.selectValue;
      if (selectValue.length > 0) {
        let selectValueProductId = that.getSelectValueProductId();
        collectAll(that.getSelectValueProductId().join(","))
          .then((res) => {
            return that.$util.Tips({
              title: res.msg,
              icon: "success",
            });
          })
          .catch((err) => {
            return that.$util.Tips({
              title: err,
            });
          });
      } else {
        return that.$util.Tips({
          title: that.$t(`请选择产品`),
        });
      }
    },
    subOrder(event) {
      if (this.reductionLoading || this.reductionError || this.disabledChangeNumber) return this.$util.Tips({ title: '请等待优惠计算完成，或重试后结算' });
      let that = this,
        selectValue = that.selectValue;
      if (selectValue.length > 0) {
        uni.navigateTo({
          url:
            "/pages/goods/order_confirm/index?cartId=" + selectValue.join(","),
        });
      } else {
        return that.$util.Tips({
          title: that.$t(`请选择产品`),
        });
      }
    },
    checkboxAllChange: function (event) {
      let value = event.detail.value;
      if (value.length > 0) {
        this.setAllSelectValue(1);
      } else {
        this.setAllSelectValue(0);
      }
    },
    setAllSelectValue: function (status) {
      let that = this;
      let selectValue = [];
      let valid = that.cartList.valid;
      if (valid.length > 0) {
        let newValid = valid.map((item) => {
          if (status) {
            if (that.footerswitch) {
              if (item.attrStatus) {
                item.checked = true;
                selectValue.push(item.id);
              } else {
                item.checked = false;
              }
            } else {
              item.checked = true;
              selectValue.push(item.id);
            }
            that.isAllSelect = true;
          } else {
            item.checked = false;
            that.isAllSelect = false;
          }
          return item;
        });
        that.$set(that.cartList, "valid", newValid);
        that.selectValue = selectValue;
        that.switchSelect();
      }
    },
    checkboxChange: function (event) {
      let that = this;
      let value = event.detail.value;
      let valid = that.cartList.valid;
      let arr1 = [];
      let arr2 = [];
      let arr3 = [];
      let newValid = valid.map((item) => {
        if (that.inArray(item.id, value)) {
          if (that.footerswitch) {
            if (item.attrStatus) {
              item.checked = true;
              arr1.push(item);
            } else {
              item.checked = false;
            }
          } else {
            item.checked = true;
            arr1.push(item);
          }
        } else {
          item.checked = false;
          arr2.push(item);
        }
        return item;
      });
      if (that.footerswitch) {
        arr3 = arr2.filter((item) => !item.attrStatus);
      }
      // for (let index in valid) {
      // 	if (that.inArray(valid[index].id, value)){
      // 		if(valid[index].attrStatus){
      // 			valid[index].checked = true;
      // 		}else{
      // 			valid[index].checked = false;
      // 		}
      // 	} else {
      // 		valid[index].checked = false;
      // 	}
      // }
      that.$set(that.cartList, "valid", newValid);
      // let newArr = that.cartList.valid.filter(item => item.attrStatus);
      that.isAllSelect = newValid.length === arr1.length + arr3.length;
      that.selectValue = value;
      that.switchSelect();
    },
    inArray: function (search, array) {
      for (let i in array) {
        if (array[i] == search) {
          return true;
        }
      }
      return false;
    },
    switchSelect: function () {
      let that = this;
      let validList = that.cartList.valid;
      let selectValue = that.selectValue;
      let selectCountPrice = 0.0;
      if (selectValue.length < 1) {
        that.selectCountPrice = selectCountPrice;
      } else {
        for (let index in validList) {
          if (that.inArray(validList[index].id, selectValue)) {
            selectCountPrice = that.$util.$h.Add(
              selectCountPrice,
              that.$util.$h.Mul(
                validList[index].cart_num,
                validList[index].truePrice
              )
            );
          }
        }
        that.selectCountPrice = selectCountPrice;
      }
      this.refreshReductionQuote();
    },
    async refreshReductionQuote() {
      const requestId = ++this.reductionRequestId;
      this.fullReductionPrice = '0.00'; this.reductionError = '';
      if (!this.selectValue.length) { this.selectCountPrice = '0.00'; this.reductionLoading = false; return; }
      this.reductionLoading = true;
      try {
        const { data } = await getFullReductionQuote(this.selectValue.map(String));
        if (requestId !== this.reductionRequestId) return;
        this.selectCountPrice = data.pay_price;
        this.fullReductionPrice = data.full_reduction_price;
      } catch (error) { if (requestId === this.reductionRequestId) this.reductionError = typeof error === 'string' ? error : (error.msg || '优惠计算失败'); }
      finally { if (requestId === this.reductionRequestId) this.reductionLoading = false; }
    },
    /**
     * 购物车手动填写
     *
     */
    iptCartNum: function (index) {
      let item = this.cartList.valid[index];
      if (item.cart_num) {
        this.setCartNum(item.id, item.cart_num);
      }
      if (!item.cart_num) {
        item.cart_num = 1;
      }
      this.switchSelect();
    },
    blurInput: function (index) {
      let item = this.cartList.valid[index];
      if (!item.cart_num) {
        item.cart_num = 1;
        this.$set(this.cartList, "valid", this.cartList.valid);
      }
    },
    subCart: function (index) {
      let that = this;
      if (this.disabledChangeNumber) return;
      let status = false;
      let item = that.cartList.valid[index];
      let cart_num = 0;
      cart_num = Number(item.cart_num) - 1;
      if (cart_num < 1 || cart_num < item.min_qty) {
        status = true;
        // 弹出确认框
        uni.showModal({
          title: "提示",
          content: "确定删除吗？",
          success: (res) => {
            if (res.confirm) {
              this.cartCount = this.cartCount - item.cart_num;
              cartDel([item.id]).then((res) => {
                that.loadend = false;
                that.cartList.valid.splice(index, 1);
                this.$store.commit("indexData/setCartNum", that.cartCount);
              });
              // 删除选中中的数据
              this.selectValue = this.selectValue.filter((i) => i != item.id);
              this.switchSelect();
            }
          },
        });
      }

      if (false == status) {
        item.cart_num = cart_num;
        if (item.cart_num <= 1) {
          item.cart_num = 1;
          item.numSub = true;
        } else {
          item.numSub = false;
          item.numAdd = false;
        }
        that.setCartNum(
          item.id,
          item.cart_num,
          function (data) {
            that.cartList.valid[index] = item;
            that.getCartNum();
            that.switchSelect();
          },
          () => {
            item.cart_num = Number(item.cart_num) + 1;
          }
        );
      }
    },
    addCart: function (index) {
      let that = this;
      if (this.adding) return;
      if (this.disabledChangeNumber) return;
      let item = that.cartList.valid[index];
      item.cart_num = Number(item.cart_num) + 1;
      let productInfo = item.productInfo;
      if (
        productInfo.hasOwnProperty("attrInfo") &&
        item.cart_num >= item.productInfo.attrInfo.stock
      ) {
        item.cart_num = item.productInfo.attrInfo.stock;
        item.numAdd = true;
        item.numSub = false;
      } else {
        item.numAdd = false;
        item.numSub = false;
      }
      Throttle(
        that.setCartNum(
          item.id,
          item.cart_num,
          (data) => {
            that.cartList.valid[index] = item;
            that.getCartNum();
            that.switchSelect();
          },
          () => {
            item.cart_num = Number(item.cart_num) - 1;
          }
        ),
        3000
      );
    },
    setCartNum(cartId, cartNum, successCallback, errorCallback) {
      let that = this;
      if (this.disabledChangeNumber) return;
      this.disabledChangeNumber = true;
      changeCartNum(cartId, cartNum)
        .then((res) => {
          successCallback && successCallback(res.data);
          if (!successCallback) this.switchSelect();
        })
        .catch((err) => {
          errorCallback && errorCallback();
          return that.$util.Tips({
            title: err,
          });
        })
        .finally((e) => {
          setTimeout((e) => {
            this.disabledChangeNumber = false;
          }, DEBOUNCETIME);
        });
    },
    getCartNum: function () {
      let that = this;
      getCartCounts().then((res) => {
        that.cartCount = res.data.count;
        this.adding = false;
        this.$store.commit(
          "indexData/setCartNum",
          res.data.count > 99 ? ".." : res.data.count
        );
        if (res.data.count > 0) {
          wx.setTabBarBadge({
            index: 2,
            text: res.data.count + "",
          });
        } else {
          wx.hideTabBarRedDot({
            index: 2,
          });
        }
      });
    },
    getCartData(data) {
      return getCartList(data).then((res) => res.data);
    },
    async getCartList(init) {
      if (this._cartActive === false) return;
      const requestId = this._cartRequestId = (this._cartRequestId || 0) + 1;
      const pageId = this._cartPageId || 0;
      const isCurrent = () => !this._isDestroyed && requestId === this._cartRequestId && pageId === (this._cartPageId || 0);
      const data = { page: this.page, limit: this.limit, status: 1 };
      this.loading = true;
      uni.showLoading({ title: this.$t('加载中'), mask: true });
      // Start the first page with counts. Box its rejection so an empty cart
      // can finish immediately without leaving an unhandled speculative read.
      const firstPage = this.getCartData(data).then(value => ({ value }), error => ({ error }));
      let failed = false;
      try {
        const counts = await getCartCounts();
        if (!isCurrent()) return;
        this.cartCount = counts.data.count;
        if (init) {
          this.adding = false;
          this.$store.commit('indexData/setCartNum', counts.data.count > 99 ? '..' : counts.data.count);
          if (counts.data.count > 0) {
            wx.setTabBarBadge({ index: 2, text: counts.data.count + '' });
          } else {
            wx.hideTabBarRedDot({ index: 2 });
          }
        }
        const pageCount = Math.ceil(counts.data.ids.length / data.limit);
        const pages = new Array(pageCount);
        let nextPage = 0;
        const loadPage = async () => {
          while (nextPage < pageCount && !failed && isCurrent()) {
            const index = nextPage++;
            if (index === 0) {
              const result = await firstPage;
              if ('error' in result) throw result.error;
              pages[index] = result.value;
            } else {
              pages[index] = await this.getCartData({ ...data, page: data.page + index });
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(3, pageCount) }, loadPage));
        if (!isCurrent()) return;
        // Keep server page order even when later pages arrive first. Publish
        // once so selection and checkout totals always cover the complete cart.
        const validList = this.cartList.valid.concat(...pages.map(page => page.valid));
        const selectValue = [];
        validList.forEach(item => {
          item.numSub = item.cart_num == 1;
          const product = item.productInfo;
          item.numAdd = (product.hasOwnProperty('attrInfo') && item.cart_num == product.attrInfo.stock) || item.cart_num == product.stock;
          item.checked = !!item.attrStatus;
          if (item.attrStatus) selectValue.push(item.id);
        });
        this.$set(this.cartList, 'valid', validList);
        this.selectValue = selectValue;
        const selectable = validList.filter(item => item.attrStatus);
        this.isAllSelect = selectable.length == selectValue.length && selectable.length;
        this.switchSelect();
        this.canShow = true;
      } catch (error) {
        failed = true;
        if (isCurrent()) {
          this.canShow = true;
          this.$util.Tips({ title: error });
        }
      } finally {
        if (isCurrent()) {
          this.loading = false;
          uni.hideLoading();
        }
      }
    },
    getInvalidList: function () {
      let that = this;
      if (this.loadendInvalid) return false;
      if (this.loadingInvalid) return false;
      const pageId = this._cartPageId || 0;
      this.loadingInvalid = true;
      let data = {
        page: that.pageInvalid,
        limit: that.limitInvalid,
        status: 0,
      };
      getCartList(data)
        .then((res) => {
          if (this._isDestroyed || pageId !== (this._cartPageId || 0)) return;
          let cartList = res.data,
            invalid = cartList.invalid,
            loadendInvalid = invalid.length < that.limitInvalid;
          let invalidList = that.$util.SplitArray(
            invalid,
            that.cartList.invalid
          );
          that.$set(that.cartList, "invalid", invalidList);
          that.loadendInvalid = loadendInvalid;
          that.loadTitleInvalid = loadendInvalid
            ? that.$t(`我也是有底线的`)
            : that.$t(`加载更多`);
          that.pageInvalid = that.pageInvalid + 1;
          that.loadingInvalid = false;
        })
        .catch((res) => {
          if (this._isDestroyed || pageId !== (this._cartPageId || 0)) return;
          that.loadingInvalid = false;
          that.loadTitleInvalid = that.$t(`加载更多`);
        });
    },
    getHostProduct: function () {
      let that = this;
      if (that.hotScroll || this._hotLoading) return;
      const pageId = this._cartPageId || 0;
      this._hotLoading = true;
      getProductHot(that.hotPage, that.hotLimit).then((res) => {
        if (this._isDestroyed || pageId !== (this._cartPageId || 0)) return;
        that.hotPage++;
        that.hotScroll = res.data.length < that.hotLimit;
        that.hostProduct = that.hostProduct.concat(res.data);
      }).catch(() => {}).finally(() => {
        if (pageId === (this._cartPageId || 0)) this._hotLoading = false;
      });
    },
    goodsOpen: function () {
      let that = this;
      that.goodsHidden = !that.goodsHidden;
    },
    goRouter(item) {
      var pages = getCurrentPages();
      var page = pages[pages.length - 1].$page.fullPath;
      if (item.link == page) return;
      uni.switchTab({
        url: item.link,
        fail(err) {
          uni.redirectTo({
            url: item.link,
          });
        },
      });
    },
    manage: function () {
      let that = this;
      that.footerswitch = !that.footerswitch;
      let arr1 = [];
      let arr2 = [];
      let newValid = that.cartList.valid.map((item) => {
        if (that.footerswitch) {
          if (item.attrStatus) {
            if (item.checked) {
              arr1.push(item.id);
            }
          } else {
            item.checked = false;
            arr2.push(item);
          }
        } else {
          if (item.checked) {
            arr1.push(item.id);
          }
        }
        return item;
      });
      that.cartList.valid = newValid;
      if (that.footerswitch) {
        that.isAllSelect = newValid.length === arr1.length + arr2.length;
      } else {
        that.isAllSelect = newValid.length === arr1.length;
      }
      that.selectValue = arr1;
      that.switchSelect();
    },
    unsetCart: function () {
      let that = this,
        ids = [];
      for (let i = 0, len = that.cartList.invalid.length; i < len; i++) {
        ids.push(that.cartList.invalid[i].id);
      }
      cartDel(ids)
        .then((res) => {
          that.$util.Tips({
            title: that.$t(`清除成功`),
          });
          that.$set(that.cartList, "invalid", []);
          that.getCartNum();
        })
        .catch((res) => {});
    },
  },
  onReachBottom() {
    let that = this;
    if (that.loadend) {
      that.getInvalidList();
    }
    if (that.cartList.valid.length == 0 && that.cartList.invalid.length == 0) {
      that.getHostProduct();
    }
  },
  // 滚动监听
  onPageScroll(e) {
    // 传入scrollTop值并触发所有easy-loadimage组件下的滚动监听事件
    uni.$emit("scroll");
  },
};
</script>

<style scoped lang="scss">
.full-reduction-saving { font-size: 20rpx; line-height: 28rpx; color: #e93323; text-align: right; }
.shoppingCart {
  /* #ifdef H5 */
  // padding-bottom: 0;
  // padding-bottom: constant(safe-area-inset-bottom);
  // padding-bottom: env(safe-area-inset-bottom);
  /* #endif */
}

.shoppingCart .labelNav {
  height: 76rpx;
  padding: 0 30rpx;
  font-size: 22rpx;
  color: #8c8c8c;
  position: fixed;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: #f5f5f5;
  z-index: 5;
  top: 0;
}

.shoppingCart .labelNav .item .iconfont {
  font-size: 25rpx;
  margin-right: 10rpx;
}

.shoppingCart .nav {
  width: 100%;
  height: 80rpx;
  background-color: #fff;
  padding: 0 30rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #282828;
  position: fixed;
  left: 0;
  z-index: 5;
  top: 76rpx;
}

.shoppingCart .nav .num {
  margin-left: 12rpx;
}

.shoppingCart .nav .administrate {
  font-size: 26rpx;
  color: #282828;
  width: 110rpx;
  height: 46rpx;
  border-radius: 6rpx;
  border: 1px solid #a4a4a4;
}

.shoppingCart .noCart {
  margin-top: 171rpx;
  background-color: #fff;
  padding-top: 0.1rpx;
}

.shoppingCart .noCart .pictrue {
  width: 414rpx;
  height: 336rpx;
  margin: 78rpx auto 56rpx auto;
}

.shoppingCart .noCart .pictrue image {
  width: 100%;
  height: 100%;
}

.shoppingCart .list {
  margin-top: 171rpx;
}

.shoppingCart .list .item {
  padding: 25rpx 30rpx;
  background-color: #fff;
  margin-bottom: 15rpx;
}

.shoppingCart .list .item .picTxt {
  width: 627rpx;
  position: relative;
}

.shoppingCart .list .item .picTxt .pictrue {
  width: 160rpx;
  height: 160rpx;
}

.shoppingCart .list .item .picTxt .pictrue image {
  width: 100%;
  height: 100%;
  border-radius: 6rpx;
}

.shoppingCart .list .item .picTxt .text {
  width: 444rpx;
  font-size: 28rpx;
  color: #282828;
}

.shoppingCart .list .item .picTxt .text .reColor {
  color: #999;
}

.shoppingCart .list .item .picTxt .text .reElection {
  margin-top: 20rpx;
}

.shoppingCart .list .item .picTxt .text .reElection .title {
  font-size: 24rpx;
}

.shoppingCart .list .item .picTxt .text .reElection .reBnt {
  // width: 120rpx;
  padding: 0 10rpx;
  // height: 46rpx;
  margin-top: 6rpx;
  border-radius: 23rpx;
  font-size: 26rpx;
}

.shoppingCart .list .item .picTxt .text .infor {
  font-size: 24rpx;
  color: #868686;
  margin-top: 16rpx;
}

.shoppingCart .list .item .picTxt .text .money {
  font-size: 32rpx;
  color: var(--view-theme);
  margin-top: 28rpx;
}

.shoppingCart .list .item .picTxt .carnum {
  height: 47rpx;
  position: absolute;
  bottom: 0rpx;
  right: 0;
}

.shoppingCart .list .item .picTxt .carnum view {
  border: 1rpx solid #a4a4a4;
  width: 66rpx;
  text-align: center;
  height: 100%;
  line-height: 40rpx;
  font-size: 28rpx;
  color: #a4a4a4;
}

.shoppingCart .list .item .picTxt .carnum .reduce {
  border-right: 0;
  border-radius: 3rpx 0 0 3rpx;
}

.shoppingCart .list .item .picTxt .carnum .reduce.on {
  border-color: #e3e3e3;
  color: #dedede;
}

.shoppingCart .list .item .picTxt .carnum .plus {
  border-left: 0;
  border-radius: 0 3rpx 3rpx 0;
}

.shoppingCart .list .item .picTxt .carnum .plus.on {
  border-color: #e3e3e3;
  color: #dedede;
}

.shoppingCart .list .item .picTxt .carnum .num {
  color: #282828;
}

.shoppingCart .invalidGoods {
  background-color: #fff;
}

.shoppingCart .invalidGoods .goodsNav {
  width: 100%;
  height: 66rpx;
  padding: 0 30rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #282828;
}

.shoppingCart .invalidGoods .goodsNav .iconfont {
  color: #424242;
  font-size: 28rpx;
  margin-right: 17rpx;
}

.shoppingCart .invalidGoods .goodsNav .del {
  font-size: 26rpx;
  color: #999;
}

.shoppingCart .invalidGoods .goodsNav .del .icon-shanchu1 {
  color: #999;
  font-size: 33rpx;
  vertical-align: -2rpx;
  margin-right: 8rpx;
}

.shoppingCart .invalidGoods .goodsList .item {
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f5f5f5;
}

.shoppingCart .invalidGoods .goodsList .item .invalid {
  font-size: 22rpx;
  color: #fff;
  width: 70rpx;
  height: 36rpx;
  background-color: #aaa;
  border-radius: 3rpx;
  text-align: center;
  line-height: 36rpx;
}

.shoppingCart .invalidGoods .goodsList .item .pictrue {
  width: 140rpx;
  height: 140rpx;
}

.shoppingCart .invalidGoods .goodsList .item .pictrue image {
  width: 100%;
  height: 100%;
  border-radius: 6rpx;
}

.shoppingCart .invalidGoods .goodsList .item .text {
  width: 433rpx;
  font-size: 28rpx;
  color: #999;
  height: 140rpx;
}

.shoppingCart .invalidGoods .goodsList .item .text .name {
  width: 100%;
}

.shoppingCart .invalidGoods .goodsList .item .text .infor {
  font-size: 24rpx;
}

.shoppingCart .invalidGoods .goodsList .item .text .end {
  font-size: 26rpx;
  color: #bbb;
}

.shoppingCart .footer {
  z-index: 999;
  width: 100%;
  height: 96rpx;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  position: fixed;
  padding: 0 30rpx;
  box-sizing: border-box;
  border-top: 1rpx solid #eee;
  bottom: 98rpx;
  bottom: calc(98rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
  bottom: calc(98rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
}

.shoppingCart .footer.on {
  // #ifndef H5
  bottom: 0rpx;
  // #endif
}

.shoppingCart .footer .checkAll {
  font-size: 28rpx;
  color: #282828;
  margin-left: 16rpx;
}

// .shoppingCart .footer checkbox .wx-checkbox-input{background-color:#fafafa;}
.shoppingCart .footer .money {
  font-size: 30rpx;
}

.shoppingCart .footer .placeOrder {
  color: #fff;
  font-size: 30rpx;
  width: 226rpx;
  height: 70rpx;
  border-radius: 50rpx;
  text-align: center;
  line-height: 70rpx;
  margin-left: 22rpx;
}

.shoppingCart .footer .button .bnt {
  font-size: 28rpx;
  color: #999;
  border-radius: 50rpx;
  border: 1px solid #999;
  width: 160rpx;
  height: 60rpx;
  text-align: center;
  line-height: 60rpx;
}

.shoppingCart .footer .button form ~ form {
  margin-left: 17rpx;
}

.uni-p-b-96 {
  height: 96rpx;
}

.uni-p-b-98 {
  height: 100rpx;
  /* 兼容 IOS<11.2 */
  height: calc(100rpx + constant(safe-area-inset-bottom));
  /* 兼容 IOS>11.2 */
  height: calc(100rpx + env(safe-area-inset-bottom));
}

.emptyBox {
  text-align: center;
  padding: 80rpx 0;

  .tips {
    color: #aaa;
    font-size: 26rpx;
  }

  image {
    width: 414rpx;
    height: 304rpx;
  }
}
</style>

<style scoped lang="scss">
.decorated-cart.shoppingCart {
  .labelNav { position:relative;top:auto;height:auto;min-height:76rpx;padding:0;gap:8rpx; }
  .nav { position:relative;top:auto;margin-bottom:16rpx; }
  .nav,.noCart { background-color:transparent; }
  .list,.noCart { margin-top:0; }
  .list .item .picTxt { flex:1;min-width:0;width:auto;margin-left:16rpx; }
  .list .item .picTxt .text { flex:1;min-width:0;width:auto;padding-left:16rpx; }
  .list .item .picTxt .pictrue { flex-shrink:0; }
  .cart-checkout-dock { position:fixed;bottom:0;left:0;right:0;z-index:277;padding-bottom:env(safe-area-inset-bottom); }
  .cart-checkout-dock .footer { position:relative;bottom:auto;height:auto;min-height:96rpx;width:auto;backdrop-filter:none;border:0;gap:12rpx; }
  .footer .money { margin-left:auto; }
  .footer .checkAll { margin-left:8rpx; }
  .footer .placeOrder { width:auto;min-width:180rpx;margin-left:16rpx;padding:0 20rpx; }
}
/* #ifdef H5 */
.decorated-cart .cart-checkout-dock { bottom:var(--store-nav-offset,0px)!important; }
/* #endif */
</style>

<style scoped>
.cart-page-title{position:sticky;top:0;z-index:300}
</style>
