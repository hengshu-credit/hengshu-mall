<template>
  <view class="goods-list">
    <!-- #ifdef MP || APP-PLUS -->
    <view class="accountTitle">
      <view :style="{ height: getHeight.barTop + 'px' }"></view>
      <view
        class="sysTitle acea-row row-center-wrapper"
        :style="{ height: getHeight.barHeight + 'px' }"
      >
        <view>商品管理</view>
        <text class="iconfont icon-ic_leftarrow" @click="goarrow"></text>
      </view>
    </view>
    <view
      :style="{ height: getHeight.barTop + getHeight.barHeight + 'px' }"
    ></view>
    <!-- #endif -->
    <view class="searchCon acea-row row-between-wrapper">
      <view class="search acea-row row-middle">
        <text class="iconfont icon-ic_search"></text>
        <input
          class="inputs"
          placeholder="请输入商品名称/ID"
          placeholder-class="placeholder"
          confirm-type="search"
          name="search"
          v-model="keyword"
          @confirm="searchSubmit"
        />
      </view>
      <view @click="manageTap" v-if="administer">取消</view>
      <view class="edit acea-row row-center-wrapper" @click="manageTap" v-else>
        <text class="iconfont icon-ic_batch"></text>
      </view>
    </view>
    <view class="nav acea-row row-middle">
      <view
        class="item"
        :class="current == index ? 'on' : ''"
        v-for="(item, index) in navList"
        :key="index"
        @click="navTap(item, index)"
      >
        {{ item.name }}
        <image src="../static/adorn.png" v-if="current == index" />
      </view>
    </view>
    <view class="list" v-if="goodsList.length">
      <checkbox-group @change="checkboxChange">
        <view
          class="acea-row row-middle"
          v-for="(item, index) in goodsList"
          :key="index"
        >
          <!-- #ifndef MP -->
          <checkbox
            class="checkbox"
            v-if="administer"
            :value="item.id.toString()"
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
            :value="item.id"
            :checked="item.checked"
            color="#ffffff"
          />
          <!-- #endif -->
          <view class="item">
            <view class="top acea-row row-center-wrapper" @tap="goDetail(item)">
              <view class="pictrue">
                <image :src="item.image"></image>
              </view>
              <view class="text">
                <view class="name line1">{{ item.store_name }}</view>
                <view class="info">
                  <text>销量: {{ item.sales }}</text>
                  <text>库存: {{ item.stock }}</text>
                </view>
                <baseMoney
                  :money="item.price"
                  symbolSize="20"
                  integerSize="32"
                  decimalSize="20"
                  color="#FF7E00"
                ></baseMoney>
              </view>
            </view>
            <view class="bottom acea-row row-right" v-if="!administer">
              <view
                class="bnt acea-row row-center-wrapper"
                :class="item.is_show ? '' : 'up'"
                @click="setShow(item, 0)"
                >{{ item.is_show ? "下架" : "上架" }}</view
              >
              <view
                class="bnt on acea-row row-center-wrapper"
                @tap="openDrawer(item)"
                >编辑</view
              >
            </view>
          </view>
        </view>
      </checkbox-group>
    </view>
    <view class="empty-box" v-if="goodsList.length == 0 && !loading">
      <emptyPage
        title="暂无商品～"
        src="/statics/images/empty-box.gif"
      ></emptyPage>
    </view>
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
        <view class="bnt acea-row row-center-wrapper" @click="editLabels"
          >添加标签</view
        >
        <view class="bnt acea-row row-center-wrapper" @click="editClass"
          >修改分类</view
        >
        <view
          class="bnt acea-row row-center-wrapper"
          v-if="type == 1"
          @click="setShow('', 1, 0)"
          >下架</view
        >
        <view
          class="bnt acea-row row-center-wrapper"
          v-else-if="type == 2"
          @click="setShow('', 1, 1)"
          >上架</view
        >
      </view>
    </view>
    <footer-page></footer-page>
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
          :class="{ disabled: index === 0 && goodsInfo.virtual_type != 0 }"
          v-for="(item, index) in editList"
          :key="index"
          @tap="editInfo(index)"
          >{{ item.name }}</view
        >
      </view>
    </base-drawer>
    <edit-price
      :visible="visiblePrice"
      :goodsInfo="goodsInfo"
      @closeDrawer="priceCloseDrawer"
      @successChange="successChange"
    ></edit-price>
    <edit-lable
      ref="lable"
      :visible="visibleLable"
      @closeDrawer="lableCloseDrawer"
      @successChange="successChange"
    ></edit-lable>
    <classify
      ref="classify"
      :visible="visibleClass"
      @closeDrawer="classCloseDrawer"
      @successChange="successChange"
    ></classify>
  </view>
</template>

<script>
import Loading from "@/components/Loading/index";
import emptyPage from "@/components/emptyPage.vue";
import baseDrawer from "@/components/tuiDrawer/tui-drawer.vue";
import footerPage from "../components/footerPage/index.vue";
import editPrice from "./components/editPrice/index.vue";
import editLable from "./components/label/index.vue";
import classify from "./components/classify/index.vue";
import { goShopDetail } from "@/libs/order.js";
import { adminProductList, productSetShow } from "@/api/admin";
export default {
  components: {
    editPrice,
    editLable,
    classify,
    footerPage,
    emptyPage,
    Loading,
    baseDrawer,
  },
  data() {
    return {
      getHeight: this.$util.getWXStatusHeight(),
      navList: [
        {
          name: "全部",
          type: "",
        },
        {
          name: "出售中",
          type: 1,
        },
        {
          name: "仓库中",
          type: 2,
        },
        {
          name: "已售罄",
          type: 4,
        },
        {
          name: "库存警告",
          type: 5,
        },
      ],
      editList: [
        {
          name: "修改价格/库存",
        },
        {
          name: "商品分类",
        },
        {
          name: "商品标签",
        },
      ],
      current: 0,
      administer: 0,
      isAllSelect: false,
      goodsList: [],
      goodsInfo: {},
      visible: false,
      visiblePrice: false, //价格库存是否显示
      visibleLable: false, //标签是否显示
      loadTitle: "加载更多",
      loading: false,
      loadend: false,
      limit: 20,
      page: 1,
      keyword: "", //搜索字段
      type: "", //商品状态
      visibleClass: false,
    };
  },
  onShow() {},
  onLoad(option) {
    this.type = option.type || "";
    this.keyword = option.keyword || "";
    for (let i = 0; i < this.navList.length; i++) {
      if (this.navList[i].type == this.type) {
        this.current = i;
        break;
      }
    }
    this.productList();
  },
  methods: {
    // 去详情页
    goDetail(item) {
      if (!item.is_show) {
        this.$util.Tips({
          title: "商品未上架",
        });
        return;
      }
      goShopDetail(item, this.$store.state.app.uid).catch((res) => {
        uni.navigateTo({
          url: `/pages/goods_details/index?id=${item.id}`,
        });
      });
    },
    goarrow() {
      uni.navigateBack();
    },
    editClass() {
      if (!this.getIds().length) {
        this.$util.Tips({
          title: "请选择商品",
        });
        return;
      }
      this.$refs.classify.category(this.getIds(), "");
      let that = this;
      setTimeout(function () {
        that.visibleClass = true;
      }, 200);
    },
    classCloseDrawer() {
      this.visibleClass = false;
    },
    successChange() {
      this.visibleClass = false;
      this.visibleLable = false;
      this.visiblePrice = false;
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
      this.$refs.lable.productLabel({}, 1, this.getIds());
    },
    //批量获取id集合
    getIds() {
      let ids = [];
      this.goodsList.forEach((item) => {
        if (item.checked) {
          ids.push(item.id);
        }
      });
      ids.slice(0, 100);
      return ids;
    },
    setShow(item, num, type) {
      let data = {};
      if (num) {
        if (!this.getIds().length) {
          this.$util.Tips({
            title: "请选择商品",
          });
          return;
        }
        data = {
          id: this.getIds(),
          is_show: type,
        };
      } else {
        data = {
          id: item.id,
          is_show: item.is_show ? 0 : 1,
        };
      }
      productSetShow(data).then((res) => {
          this.$util.Tips({
            title: res.msg,
          });
          let i = this.goodsList.findIndex(val=> val.id == item.id);
		  this.goodsList.splice(i ,1);
		// item.is_show = item.is_show ? 0 : 1
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    init() {
      this.goodsList = [];
      this.page = 1;
      this.loadend = false;
      this.loading = false;
      this.productList();
    },
    searchSubmit() {
      this.init();
    },
    productList() {
      let that = this;
      if (this.loading) return;
      if (this.loadend) return;
      that.loading = true;
      that.loadTitle = "";
      adminProductList({
        page: that.page,
        limit: that.limit,
        store_name: that.keyword,
        type: that.type,
      })
        .then((res) => {
          let goodsList = res.data.list;
          goodsList.forEach((item) => {
            item.checked = false;
          });
          this.isAllSelect = false;
          let loadend = goodsList.length < that.limit;
          that.goodsList = that.$util.SplitArray(goodsList, that.goodsList);
          that.$set(that, "goodsList", that.goodsList);
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
      switch (index) {
        case 0:
          if (this.goodsInfo.virtual_type != 0) {
            this.$util.Tips({ title: '仅普通商品可在此处修改价格/库存' });
            return;
          }
          this.visible = false;
          if (this.goodsInfo.spec_type) {
            uni.navigateTo({
              url: "/pages/admin/goods/specs?id=" + this.goodsInfo.id,
            });
          } else {
            this.visiblePrice = true;
          }
          break;
        case 1:
          this.visible = false;
          this.visibleClass = true;
          break;
        case 2:
          this.visibleLable = true;
          this.visible = false;
          break;
      }
    },
    lableCloseDrawer() {
      this.visibleLable = false;
    },
    priceCloseDrawer() {
      this.visiblePrice = false;
    },
    openDrawer(item) {
      this.visible = true;
      this.goodsInfo = JSON.parse(JSON.stringify(item));
      this.$refs.lable.productLabel(this.goodsInfo, 0, []);
      this.$refs.classify.category(item.id, item.cate_id);
    },
    closeDrawer() {
      this.visible = false;
    },
    manageTap() {
      this.administer = !this.administer;
    },
    navTap(item, index) {
      this.current = index;
      if (this.type != item.type) {
        this.type = item.type;
        this.init();
      }
    },
    checkboxChange(event) {
      let idList = event.detail.value;
      this.goodsList.forEach((item) => {
        if (idList.indexOf(item.id + "") !== -1) {
          item.checked = true;
        } else {
          item.checked = false;
        }
      });
      if (idList.length == this.goodsList.length) {
        this.isAllSelect = true;
      } else {
        this.isAllSelect = false;
      }
    },
    forGoods(val) {
      let that = this;
      if (!that.goodsList.length) return;
      that.goodsList.forEach((item) => {
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
        if (this.goodsList.length > 100) {
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
    this.productList();
  },
};
</script>

<style lang="scss" scoped>
::v-deep checkbox .wx-checkbox-input.wx-checkbox-input-checked {
  border: 1px solid $primary-admin !important;
  background-color: $primary-admin !important;
}
::v-deep uni-checkbox .uni-checkbox-input {
  margin-top: -4rpx;
}
::v-deep checkbox:not([disabled]) .uni-checkbox-input:hover {
  border-color: #d1d1d1 !important;
}
.empty-box {
  padding: 0 20rpx;
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
.goods-list {
  padding-top: 20rpx;
  .searchCon {
    padding: 0 20rpx;
    .search {
      width: 618rpx;
      height: 72rpx;
      background: #ffffff;
      border-radius: 50rpx;
      padding: 0 34rpx;

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
  .nav {
    padding: 20rpx 20rpx 18rpx 34rpx;
    position: sticky;
    top: 0;
    left: 0;
    width: 100%;
    background-color: #f5f5f5;
    z-index: 9;
    .item {
      font-weight: 400;
      font-size: 26rpx;
      color: #333333;
      padding: 10rpx 0;
      position: relative;
      & ~ .item {
        margin-left: 72rpx;
      }
      &.on {
        font-weight: 500;
        color: $primary-admin;
        font-size: 30rpx;
        font-family: PingFang SC, PingFang SC;
      }
      image {
        width: 14rpx;
        height: 14rpx;
        display: block;
        position: absolute;
        bottom: 0;
        right: -4rpx;
      }
    }
  }
  .list {
    padding-bottom: 20rpx;
    padding: 0 20rpx 20rpx 20rpx;
    ::v-deep uni-checkbox .uni-checkbox-input {
      background-color: #f5f5f5;
      margin: 0 20rpx 20rpx 0;
    }
    ::v-deep wx-checkbox .wx-checkbox-input {
      background-color: #f5f5f5;
      margin: 0 20rpx 20rpx 0;
    }
    .item {
      width: 100%;
      background-color: #fff;
      padding: 24rpx;
      box-sizing: border-box;
      margin-bottom: 20rpx;
      border-radius: 24rpx;
      flex: 1;
      overflow: hidden;
      .top {
        .checkbox {
          margin-right: 10rpx;
        }
        .pictrue {
          width: 136rpx;
          height: 136rpx;
          margin-right: 20rpx;
          image {
            width: 100%;
            height: 100%;
            border-radius: 16rpx;
          }
        }
        .text {
          flex: 1;
          overflow: hidden;
          .name {
            font-size: 28rpx;
            font-weight: 400;
            color: #333333;
          }
          .info {
            font-size: 24rpx;
            font-weight: 400;
            color: #666666;
            margin: 10rpx 0 18rpx 0;
            text {
              margin-right: 40rpx;
            }
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
            border-color: $primary-admin;
            background-color: $primary-admin;
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
    height: 110rpx;
    height: calc(110rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
    height: calc(110rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
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

    .bnt {
      width: 160rpx;
      height: 64rpx;
      border-radius: 50rpx;
      border: 1rpx solid $primary-admin;
      color: $primary-admin;
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
      &.disabled {
        color: #cccccc;
      }
    }
  }
}
</style>
