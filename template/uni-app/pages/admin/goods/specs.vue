<template>
  <view class="specs">
    <checkbox-group @change="checkboxChange">
      <view
        class="list acea-row"
        :class="administer ? 'on' : ''"
        v-for="(item, index) in attrsList"
        :key="index"
      >
        <!-- #ifndef MP -->
        <checkbox
          class="checkbox"
          v-if="administer"
          :value="item.id.toString()"
          :checked="item.checked"
        />
        <!-- #endif -->
        <!-- #ifdef MP -->
        <checkbox
          class="checkbox"
          v-if="administer"
          :value="item.id"
          :checked="item.checked"
        />
        <!-- #endif -->
        <view class="listCon">
          <!-- <view class="item acea-row row-middle">
						<view class="name">商品图</view>
						<view class="pictrue">
							<image :src="item.image" mode="aspectFill"></image>
						</view>
					</view> -->
          <view class="item acea-row row-middle">
            <view class="name">规格名称</view>
            <view class="info">{{ item.suk }}</view>
          </view>
          <view class="item acea-row row-middle">
            <view class="name">售价</view>
            <input
              type="digit"
              :disabled="administer"
              min="0"
              v-model="item.price"
              placeholder="请填写售价"
              placeholder-class="placeholder"
            />
          </view>
          <view class="item acea-row row-middle">
            <view class="name">成本价</view>
            <input
              type="digit"
              :disabled="administer"
              v-model="item.cost"
              placeholder="请填写成本价"
              placeholder-class="placeholder"
            />
          </view>
          <view class="item acea-row row-middle">
            <view class="name">原价</view>
            <input
              type="digit"
              :disabled="administer"
              v-model="item.ot_price"
              placeholder="请填写原价"
              placeholder-class="placeholder"
            />
          </view>
          <view class="item acea-row row-middle">
            <view class="name">库存</view>
            <input
              type="number"
              :disabled="administer"
              v-model="item.stock"
              placeholder="请填写库存"
              placeholder-class="placeholder"
            />
          </view>
        </view>
      </view>
    </checkbox-group>
    <view class="footer on acea-row row-between-wrapper" v-if="administer">
      <checkbox-group @change="checkboxAllChange">
        <checkbox value="all" :checked="isAllSelect" />
        <text class="checkAll">全选</text>
      </checkbox-group>
      <view class="acea-row row-middle">
        <view class="bnt acea-row row-center-wrapper" @click="manageTap"
          >取消</view
        >
        <view class="bnt on acea-row row-center-wrapper" @click="batchEdit"
          >批量修改</view
        >
      </view>
    </view>
    <view class="footer acea-row row-between-wrapper" v-else>
      <view class="bnt acea-row row-center-wrapper" @click="manageTap"
        >批量操作</view
      >
      <view class="bnt on acea-row row-center-wrapper" @click="define"
        >保存</view
      >
    </view>
    <edit-price
      :visible="visiblePrice"
      :goodsInfo="goodsInfo"
      @closeDrawer="priceCloseDrawer"
      @successChange="successChange"
    ></edit-price>
  </view>
</template>

<script>
import editPrice from "./components/editPrice/index.vue";
import { getManageProductAttr, postUpdateAttrs } from "@/api/admin";
export default {
  components: {
    editPrice,
  },
  data() {
    return {
      attrsList: [],
      id: 0,
      administer: false,
      isAllSelect: false,
      visiblePrice: false,
      goodsInfo: {
        id: 0,
        spec_type: 1,
        attr_value: {},
      },
    };
  },
  onShow() {},
  onLoad(option) {
    this.id = option.id;
    this.getAttrsList();
  },
  methods: {
    //批量获取id集合
    getIds() {
      let ids = [];
      this.attrsList.forEach((item) => {
        if (item.checked) {
          ids.push(item.id);
        }
      });
      return ids;
    },
    batchEdit() {
      if (!this.getIds().length) {
        this.$util.Tips({
          title: "请选择商品规格",
        });
        return;
      }
      this.goodsInfo.id = this.id;
      this.goodsInfo.attr_value = {
        cost: "",
        price: "",
        ot_price: "",
        stock: "",
      };
      this.visiblePrice = true;
    },
    define() {
      let data = {
        attr_value: [],
      };
      this.attrsList.forEach((item) => {
        data.attr_value.push({
          cost: item.cost,
          price: item.price,
          ot_price: item.ot_price,
          stock: item.stock,
          unique: item.unique,
        });
      });
      postUpdateAttrs(this.id, data)
        .then((res) => {
          this.$util.Tips(
            {
              title: res.msg,
            },
            () => {
              uni.redirectTo({
                url: "/pages/admin/goods/index",
              });
            },
          );
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    getAttrsList() {
      getManageProductAttr(this.id)
        .then((res) => {
          let data = res.data;
          data.forEach((item) => {
            item.checked = false;
          });
          this.attrsList = data;
        })
        .catch((err) => {
          this.$util.Tips({
            title: err,
          });
        });
    },
    checkboxChange(event) {
      let idList = event.detail.value;
      this.attrsList.forEach((item) => {
        if (idList.indexOf(item.id + "") !== -1) {
          item.checked = true;
        } else {
          item.checked = false;
        }
      });
      if (idList.length == this.attrsList.length) {
        this.isAllSelect = true;
      } else {
        this.isAllSelect = false;
      }
    },
    forGoods(val) {
      let that = this;
      if (!that.attrsList.length) return;
      that.attrsList.forEach((item) => {
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
        this.isAllSelect = true;
        this.forGoods(1);
      } else {
        this.isAllSelect = false;
        this.forGoods(0);
      }
    },
    manageTap() {
      this.administer = !this.administer;
    },
    priceCloseDrawer() {
      this.visiblePrice = false;
    },
    successChange(e) {
      this.visiblePrice = false;
      let data = e;
      this.attrsList.forEach((item) => {
        if (item.checked) {
          if (data.cost) {
            item.cost = data.cost;
          }
          if (data.price) {
            item.price = data.price;
          }
          if (data.ot_price) {
            item.ot_price = data.ot_price;
          }
          if (data.stock) {
            item.stock = data.stock;
          }
        }
      });
      this.manageTap();
      this.attrsList = this.attrsList.map((item) => {
        return {
          ...item,
          checked: false,
        };
      });
    },
  },
};
</script>

<style lang="scss" scoped>
::v-deep checkbox .uni-checkbox-input.uni-checkbox-input-checked {
  border: 1px solid $primary-admin !important;
  background-color: $primary-admin !important;
}
::v-deep checkbox .wx-checkbox-input.wx-checkbox-input-checked {
  border: 1px solid $primary-admin !important;
  background-color: $primary-admin !important;
}
.specs {
  padding: 24rpx 20rpx 112rpx 20rpx;
  padding-bottom: calc(
    112rpx + constant(safe-area-inset-bottom)
  ); ///兼容 IOS<11.2/
  padding-bottom: calc(112rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
  .list {
    background-color: #fff;
    border-radius: 24rpx;
    padding: 0 24rpx;
    margin-bottom: 20rpx;
    .listCon {
      flex: 1;
    }
    &.on {
      input {
        color: #999999 !important;
      }
    }
    .checkbox {
      margin: 32rpx 12rpx 0 0;
    }
    .item {
      min-height: 102rpx;
      font-size: 28rpx;
      font-family:
        PingFang SC,
        PingFang SC;
      font-weight: 400;

      & ~ .item {
        border-top: 1px solid #f1f1f1;
      }
      .name {
        color: #333333;
        width: 115rpx;
        margin-right: 39rpx;
      }
      .info {
        color: #999999;
        flex: 1;
      }
      input {
        font-size: 36rpx;
        font-family: "Regular";
        color: #333333;
      }
      // #ifdef MP
      input {
        font-size: 30rpx;
      }
      // #endif
      .placeholder {
        font-size: 28rpx;
      }
      .pictrue {
        width: 100rpx;
        height: 100rpx;
        image {
          width: 100%;
          height: 100%;
          border-radius: 16rpx;
        }
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
    width: 100%;
    left: 0;
    &.on {
      height: 96rpx;
      height: calc(96rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
      height: calc(96rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
      .bnt {
        width: 160rpx;
        height: 64rpx;
        font-size: 24rpx;
        &.on {
          background-color: $primary-admin;
          color: #fff;
          margin-left: 16rpx;
        }
      }
    }
    .bnt {
      width: 346rpx;
      height: 72rpx;
      border-radius: 200rpx;
      border: 1px solid $primary-admin;
      color: $primary-admin;
      font-size: 26rpx;
      font-family:
        PingFang SC,
        PingFang SC;
      font-weight: 500;
      &.on {
        background-color: $primary-admin;
        color: #fff;
      }
    }
  }
}
</style>
