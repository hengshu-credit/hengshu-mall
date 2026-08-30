<template>
  <view>
    <view class="shoppingCart copy-data">
      <view class="nav acea-row row-between-wrapper">
        <view
          >订单号：<text class="num">{{ list.order_id }}</text></view
        >
        <!-- <navigator class="btn" :url="'/pages/admin/writeRecordList/index?id='+id" hover-class="none">
					核销记录<text class="iconfont icon-ic_rightarrow"></text>
				</navigator> -->
      </view>
      <view class="content">
        <view class="list">
          <view>
            <block v-for="(item, index) in list.cart_info" :key="index">
              <view
                class="item acea-row row-between-wrapper"
                :style="{ opacity: item.is_writeoff ? 0.5 : 1 }"
              >
                <div class="xuan" @click="dan(item.cart_id, index)">
                  <view
                    :class="
                      item.checked || item.is_writeoff
                        ? 'iconfont icon-a-ic_CompleteSelect'
                        : 'iconfont icon-ic_unselect'
                    "
                  ></view>
                </div>
                <view class="picTxt acea-row row-between-wrapper">
                  <view class="pictrue">
                    <image
                      :src="
                        item.cart_info.productInfo.attrInfo
                          ? item.cart_info.productInfo.attrInfo.image
                          : item.cart_info.productInfo.image
                      "
                      mode=""
                    ></image>
                  </view>
                  <view class="text">
                    <view class="title">
                      <view
                        class="line1"
                        :class="item.attrStatus ? '' : 'reColor'"
                      >
                        {{ item.cart_info.productInfo.store_name }}
                      </view>
                      <view v-if="item.is_writeoff == 1" class="txt"
                        >已核销</view
                      >
                      <view
                        v-if="
                          item.is_writeoff == 0 &&
                          lists.cart_info[index].surplus_num ==
                            lists.cart_info[index].cart_num
                        "
                        class="txt bluecol"
                        >未核销</view
                      >
                      <view
                        v-if="
                          item.is_writeoff == 0 &&
                          lists.cart_info[index].surplus_num !=
                            lists.cart_info[index].cart_num
                        "
                        class="txt orangcol"
                      >
                        已核销{{
                          parseInt(
                            lists.cart_info[index].cart_num -
                              lists.cart_info[index].surplus_num,
                          )
                        }}件</view
                      >
                    </view>
                    <view class="infor line1">
                      属性：{{ item.cart_info.productInfo.attrInfo.suk }}</view
                    >
                    <view class="money he row-middle">
                      <view
                        >￥{{
                          item.cart_info.productInfo.attrInfo
                            ? item.cart_info.productInfo.attrInfo.price
                            : item.cart_info.productInfo.price
                        }}</view
                      >
                      <view v-if="item.is_writeoff == 1" class="txt">
                        <view class="carnum acea-row row-center-wrapper">
                          <view class="reduce">
                            <text class="iconfont icon-ic_Reduce"></text>
                          </view>
                          <view class="nums">0</view>
                          <view class="plus">
                            <text class="iconfont icon-ic_increase"></text>
                          </view>
                        </view>
                      </view>
                      <view v-else class="txt">
                        <view class="carnum acea-row row-center-wrapper">
                          <view
                            v-if="item.surplus_num_input == 1"
                            class="reduce bggary"
                          >
                            <text class="iconfont icon-ic_Reduce"></text>
                          </view>
                          <view
                            v-else
                            class="reduce"
                            @click.stop="subCart(item, index)"
                          >
                            <text class="iconfont icon-ic_Reduce"></text>
                          </view>
                          <!-- <view class='nums'>{{parseInt(item.surplus_num)}}</view> -->
                          <input
                            v-model="item.surplus_num_input"
                            class="nums"
                            type="number"
                            @input="numInput(index, $event)"
                          />
                          <view
                            v-if="item.surplus_num_input == item.surplus_num"
                            class="plus bggary"
                          >
                            <text class="iconfont icon-ic_increase"></text>
                          </view>
                          <view
                            v-else
                            class="plus"
                            @click.stop="addCart(item, index)"
                          >
                            <text class="iconfont icon-ic_increase"></text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </block>
          </view>
        </view>
      </view>
      <view class="footer acea-row row-between-wrapper">
        <view>
          <view style="display: flex" @change="checkboxAllChange">
            <div class="xuan" @click="checkAll" v-model="checked">
              <view
                class="iconfont"
                :class="
                  checked ? 'icon-a-ic_CompleteSelect' : 'icon-ic_unselect'
                "
              ></view>
            </div>
            <text class="checkAll">全选</text>
          </view>
        </view>
        <view>
          <button class="money" type="primary" @click="verification">
            {{ checked ? "一键" : "确认" }}核销({{ numChecked }})
          </button>
        </view>
      </view>
    </view>
    <view v-if="box">
      <view class="box">
        <view class="small_box">
          <!-- <image src="../../../static/decorate.png" mode=""></image> -->
          <view class="content">
            <view class="font">核销成功</view>
            <view
              v-if="
                list.total_num == parseInt(list.writeoff_count) + writeOffNum
              "
              class="small_font"
              >当前订单已完成核销</view
            >
            <view v-else class="small_font">该订单仍有其他待核销商品</view>
          </view>
          <view class="acea-row btn-box">
            <view
              v-if="
                lets == 1 &&
                list.total_num == parseInt(list.writeoff_count) + writeOffNum
              "
              class="btn primary"
              @click="ok(1)"
              >知道了</view
            >
            <navigator
              v-if="
                lets > 1 &&
                list.total_num != parseInt(list.writeoff_count) + writeOffNum
              "
              :url="
                '/pages/admin/distribution/scanning/index?code=' + attr.code
              "
              hover-class="none"
              open-type="redirect"
              class="btn btn_no"
              >返回列表</navigator
            >
            <navigator
              v-if="
                (lets > 1 &&
                  list.total_num ==
                    parseInt(list.writeoff_count) + writeOffNum) ||
                (lets == 1 &&
                  list.total_num != parseInt(list.writeoff_count) + writeOffNum)
              "
              url="/pages/admin/distribution/index"
              hover-class="none"
              open-type="redirect"
              class="btn btn_no"
              >返回首页</navigator
            >
            <view
              v-if="
                list.total_num != parseInt(list.writeoff_count) + writeOffNum
              "
              class="btn on"
              @click="ok(0)"
              >继续核销</view
            >
            <navigator
              v-if="
                lets > 1 &&
                list.total_num == parseInt(list.writeoff_count) + writeOffNum
              "
              :url="
                '/pages/admin/distribution/scanning/index?code=' + attr.code
              "
              open-type="redirect"
              hover-class="none"
              class="btn"
              >核销其他订单</navigator
            >
          </view>
        </view>
      </view>
    </view>
    <writeOffSwitching
      ref="writeOff"
      :attr="attr"
      :isShow="1"
      :iSplus="1"
      :iScart="1"
      @dataId="onDataId"
      @myevent="onMyEvent"
      id="product-window"
    ></writeOffSwitching>
  </view>
</template>

<script>
import writeOffSwitching from "../../../components/writeOffSwitching/index.vue";
import { orderCartInfo, orderWriteoff } from "@/api/admin";
import { nextTick } from "process";
export default {
  components: {
    writeOffSwitching,
  },
  props: {
    idss: {
      type: Number,
      default: 0,
    },
    code: {
      type: String,
      default: "",
    },
    let: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      nums: [],
      newList: [],
      reduce_show: -1,
      plus_show: -1,
      ids: [], //选定需要核销的id
      lets: 0, //判断订单的数量
      listlet: 0, //判断订单商品的数量
      attr: {
        //切换组件传值
        cartAttr: false,
        id: [],
        code: "",
        type: 0,
      },
      id: 0, //订单ID
      list: [],
      lists: [],
      lengt: 0,
      box: false,
      checked: false,
      checkModel: [],
      isAllSelect: false,
      data: [
        {
          id: "1",
          value: "aaa",
        },
        {
          id: "2",
          value: "bbb",
        },
        {
          id: "3",
          value: "ccc",
        },
      ],
      writeOffNum: 0, //每次核销商品数量
      auth: 1,
      numChecked: 0,
    };
  },
  watch: {
    checkModel(val) {
      if (this.lengt == this.checkModel.length) {
        this.checked = true;
      } else {
        this.checked = false;
      }
    },
  },
  onLoad: function (options) {
    this.id = options.id;
    this.attr.code = options.code;
    this.lets = options.let;
    this.auth = options.auth;
    this.getList(this.id);
  },
  onShow: function () {},
  methods: {
    numInput(index, event) {
      let value = event.detail.value;
      // if (parseInt(event.detail.value) > (this.list.cart_info[index].surplus_num + this.nums[index].num)) {
      // 	this.$nextTick(() => {
      // 		this.list.cart_info[index].surplus_num_input = this.list.cart_info[index].surplus_num + this.nums[index].num
      // 	})
      // }
      if (value) {
        value = Number(value);
        this.$nextTick(() => {
          if (value > this.list.cart_info[index].surplus_num) {
            this.list.cart_info[index].surplus_num_input =
              this.list.cart_info[index].surplus_num;
          } else if (value < 1) {
            this.list.cart_info[index].surplus_num_input = 1;
          }
          let numChecked = 0;
          for (let i = 0; i < this.list.cart_info.length; i++) {
            if (!this.list.cart_info[i].is_writeoff) {
              if (this.list.cart_info[i].checked) {
                numChecked =
                  numChecked + Number(this.list.cart_info[i].surplus_num_input);
              }
            }
          }
          this.numChecked = numChecked;
        });
      }
    },
    //处理每一条数据的最大值
    num() {
      for (let index = 0; index < this.lists.cart_info.length; index++) {
        this.nums.push({
          num: 0,
        });
      }
    },
    subCart(item, index) {
      if (item.surplus_num_input == 1) {
        this.reduce_show = index;
      } else {
        this.nums[index].num--;
        item.surplus_num_input--;
      }
      let numChecked = 0;
      for (let i = 0; i < this.list.cart_info.length; i++) {
        if (!this.list.cart_info[i].is_writeoff) {
          if (this.list.cart_info[i].checked) {
            numChecked = numChecked + this.list.cart_info[i].surplus_num_input;
          }
        }
      }
      this.numChecked = numChecked;
    },
    addCart(item, index) {
      if (item.surplus_num_input == item.surplus_num) {
        this.plus_show = index;
      } else {
        item.surplus_num_input++;
        this.nums[index].num++;
      }
      let numChecked = 0;
      for (let i = 0; i < this.list.cart_info.length; i++) {
        if (!this.list.cart_info[i].is_writeoff) {
          if (this.list.cart_info[i].checked) {
            numChecked = numChecked + this.list.cart_info[i].surplus_num_input;
          }
        }
      }
      this.numChecked = numChecked;
    },
    checkAll() {
      var items = this.list.cart_info,
        data = [];
      if (this.checked) {
        this.checkModel = [];
        for (var i = 0, lenI = this.list.cart_info.length; i < lenI; ++i) {
          const item = items[i];
          this.$set(item, "checked", false);
        }
      } else {
        this.checkModel = [];
        for (var i = 0, lenI = this.list.cart_info.length; i < lenI; ++i) {
          const item = items[i];

          this.$set(item, "checked", true);
          if (item.is_writeoff == 1) {
            this.checkModel = this.checkModel.filter(
              (item) => item != item.cart_id,
            );
          } else {
            this.checkModel.push(item.cart_id);
          }
        }
        this.lengt = this.checkModel.length;
      }
      let numChecked = 0;
      for (let i = 0; i < this.list.cart_info.length; i++) {
        if (!this.list.cart_info[i].is_writeoff) {
          if (this.list.cart_info[i].checked) {
            numChecked =
              numChecked + Number(this.list.cart_info[i].surplus_num_input);
          }
        }
      }
      this.numChecked = numChecked;
    },
    dan(id, index) {
      if (this.list.cart_info[index].is_writeoff) {
        return;
      }
      if (this.checkModel.indexOf(id) == -1) {
        this.$set(this.list.cart_info[index], "checked", true);
        this.checkModel.push(id);
      } else {
        this.$set(this.list.cart_info[index], "checked", false);
        this.checkModel = this.checkModel.filter((item) => item != id);
      }
      // let checked = true;
      // for (let i = 0; i < this.cart_info.length; i++) {
      // 	if (!this.cart_info[i].is_writeoff) {
      // 		if (!this.cart_info[i].checked) {
      // 			checked = false;
      // 		}
      // 	}
      // }
      // this.checked = checked;
      let numChecked = 0;
      for (let i = 0; i < this.list.cart_info.length; i++) {
        if (!this.list.cart_info[i].is_writeoff) {
          if (this.list.cart_info[i].checked) {
            numChecked =
              numChecked + Number(this.list.cart_info[i].surplus_num_input);
          }
        }
      }
      this.numChecked = numChecked;
    },
    getList: function (id) {
      orderCartInfo({
        oid: id,
        auth: this.auth,
      }).then((res) => {
        for (let i = 0; i < res.data.cart_info.length; i++) {
          res.data.cart_info[i].surplus_num_input =
            res.data.cart_info[i].surplus_num;
        }
        this.list = res.data;
        this.lists = JSON.parse(JSON.stringify(res.data));
        this.listlet = res.data.cart_info.length;
        this.$set(this.attr, "id", this.list.id);
        this.checkAll();
        this.num();
      });
    },
    onDataId: function (id) {
      this.nums.forEach((item) => {
        item.num = 0;
      });
      this.id = id;
      this.getList(id);
    },
    switchs() {
      this.attr.cartAttr = true;
      this.$refs.writeOff.getList(2);
    },
    onMyEvent() {
      this.attr.cartAttr = false;
    },
    verification() {
      let that = this;
      let obj = {};
      // 将数组转化为对象
      for (let key in this.checkModel) {
        obj[key] = this.checkModel[key];
      }
      let newObj = Object.keys(obj).map((val) => ({
        cart_id: obj[val],
      }));
      //处理列表内对应的核销数的数值
      for (var i = 0; i < newObj.length; i++) {
        for (var j = 0; j < this.list.cart_info.length; j++) {
          if (newObj[i].cart_id == this.list.cart_info[j].cart_id) {
            newObj[i].cart_num = this.list.cart_info[j].surplus_num_input;
          }
        }
      }
      this.newList = newObj;
      if (that.checkModel.length == 0) {
        that.$util.Tips({
          title: "请选择商品",
        });
      } else {
        uni.showLoading({
          title: "加载中",
        });
        let num = 0;
        newObj.forEach((item) => {
          num = num + parseInt(item.cart_num);
        });
        this.writeOffNum = num;
        setTimeout(function () {
          orderWriteoff({
            auth: that.auth,
            oid: that.id,
            cart_ids: that.newList,
          })
            .then((res) => {
              uni.hideLoading();
              that.box = true;
            })
            .catch((err) => {
              that.$util.Tips({
                title: err,
              });
              uni.hideLoading();
            });
        }, 1000);
      }
    },
    // 所有订单核销完成
    ok(type) {
      this.box = false;
      this.nums.forEach((item) => {
        item.num = 0;
      });
      this.getList(this.id);
      if (type) {
        uni.redirectTo({
          url:
            "/pages/admin/orderDetail/index?id=" +
            this.list.order_id +
            "&types=3",
        });
      }
    },
  },
};
</script>

<style scoped lang="scss">
.shoppingCart {
  padding: 24rpx 20rpx;
}
.shoppingCart .list .item .xuan .iconfont {
  font-size: 40rpx;
  color: #cccccc;
}
.he {
  display: flex;
  justify-content: space-between;

  .txt {
    font-size: 22upx;
  }
}

.box {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.3);

  .small_box {
    position: fixed;
    top: 50%;
    right: 75rpx;
    left: 75rpx;
    padding: 40rpx;
    border-radius: 32rpx;
    background: #ffffff;
    transform: translateY(-50%);

    image {
      width: 100%;
      height: 228upx;
    }

    .content {
      // height: 200upx;
      text-align: center;

      .font {
        font-weight: 500;
        font-size: 32rpx;
        line-height: 52rpx;
        color: #333333;
      }

      .small_font {
        margin-top: 24rpx;
        font-size: 30rpx;
        line-height: 42rpx;
        color: #666666;
      }
    }

    .btn-box {
      margin-top: 40rpx;
    }

    .btn {
      flex: 1;
      height: 72rpx;
      border: 1rpx solid $primary-admin;
      border-radius: 36rpx;
      margin-left: 32rpx;
      transform: rotateZ(360deg);
      text-align: center;
      font-weight: 500;
      font-size: 26rpx;
      line-height: 70rpx;
      color: $primary-admin;

      &:first-child {
        margin-left: 0;
      }

      &.on {
        background: $primary-admin;
        color: #ffffff;
      }

      &.primary {
        background: $primary-admin;
        color: #ffffff;
      }
    }

    .btn_no {
      // flex: 1;
      // color: #999999;
      // margin-top: 28upx;
      // text-align: center;
      // font-size: 30upx;
    }
  }
}

.shoppingCart .content {
  padding: 32rpx 24rpx;
  margin-top: 20rpx;
  border-radius: 24rpx;
  background: #ffffff;

  .item {
    margin-top: 48rpx;

    &:first-child {
      margin-top: 0;
    }
  }
}

.shoppingCart .list .item .xuan .icon-a-ic_CompleteSelect {
  color: $primary-admin;
}

.shoppingCart .list .item .picTxt {
  position: relative;
  flex: 1;
  min-width: 0;
  padding-left: 16rpx;
}

.shoppingCart .list .item .picTxt .pictrue {
  width: 136rpx;
  height: 136rpx;
}

.shoppingCart .list .item .picTxt .pictrue image {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}

.shoppingCart .list .item .picTxt .text {
  flex: 1;
  min-width: 0;
  padding-left: 20rpx;
  font-size: 28upx;
  color: #282828;
}

.shoppingCart .list .item .picTxt .text .reColor {
  color: #333333;
  width: 60%;
}

.shoppingCart .list .item .picTxt .text .title {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
  line-height: 40rpx;
  color: #333333;

  .bluecol {
    color: $primary-admin;
  }

  .orangcol {
    color: #ff7e00;
  }

  .graycol {
    color: #cccccc;
  }
}

.shoppingCart .list .item .picTxt .text .title .top {
  width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28upx;
  font-weight: 400;
}

.shoppingCart .list .item .picTxt .text .infor {
  font-size: 22rpx;
  line-height: 30rpx;
  color: #999999;
  margin-top: 12rpx;
}

.shoppingCart .list .item .picTxt .text .money {
  font-size: 36rpx;
  line-height: 36rpx;
  color: #333333;
  margin-top: 18rpx;
  font-family: Regular;
}

.shoppingCart .list .item .picTxt .carnum {
  height: 36rpx;
  // position: absolute;
  // bottom: 7upx;
  // right: 0;
}

.shoppingCart .list .item .picTxt .carnum view {
  // border: 1upx solid #a4a4a4;
  width: 32rpx;
  text-align: center;
  height: 100%;
  line-height: 36rpx;
  font-size: 24rpx;
  color: #333333;
}

.shoppingCart .list .item .picTxt .carnum .reduce {
  border-right: 0;
  border-radius: 30upx 0 0 30upx;
  padding-right: 8rpx;
}

.shoppingCart .list .item .picTxt .carnum .reduce.on {
  border-color: #e3e3e3;
  color: #dedede;
}

.shoppingCart .list .item .picTxt .carnum .plus {
  border-left: 0;
  border-radius: 0 30upx 30upx 0;
  padding-left: 8rpx;
}

.shoppingCart .list .item .picTxt .carnum .iconfont {
  font-size: 24rpx;
}

.shoppingCart .list .item .picTxt .carnum .bggary .iconfont {
  color: #cccccc;
}

.shoppingCart .list .item .picTxt .carnum .num {
  color: #282828;
}

.shoppingCart .list .item .picTxt .carnum .num0 {
  color: #a4a4a4;
}

.shoppingCart .list .item .picTxt .carnum .nums {
  width: 72rpx;
  border-radius: 4rpx;
  background: #f5f5f5;
  text-align: center;
  font-family: SemiBold;
  font-size: 24rpx;
  color: #333333;
}

.shoppingCart .footer {
  // z-index: 999;
  width: 100%;
  background: #ffffff;
  position: fixed;
  padding: 0 20rpx 0 32rpx;
  box-sizing: border-box;
  bottom: 0;
  left: 0;
  height: 96rpx;
  height: calc(96rpx + constant(safe-area-inset-bottom)); ///兼容 IOS<11.2/
  height: calc(96rpx + env(safe-area-inset-bottom)); ///兼容 IOS>11.2/
  padding-bottom: constant(safe-area-inset-bottom); ///兼容 IOS<11.2/
  padding-bottom: env(safe-area-inset-bottom); ///兼容 IOS>11.2/
}

.shoppingCart .footer.on {
  // #ifndef H5
  bottom: 0upx;
  // #endif
}

.shoppingCart .footer .iconfont {
  font-size: 40rpx;
  color: #cccccc;
}

.shoppingCart .footer .icon-a-ic_CompleteSelect {
  color: $primary-admin;
}

.shoppingCart .footer .checkAll {
  font-size: 28upx;
  color: #282828;
  margin-left: 16upx;
}
.shoppingCart .footer .money {
  font-size: 24rpx;
  height: 64rpx;
  padding: 0 32rpx;
  background: $primary-admin;
  border-radius: 32rpx;
  font-weight: 400;
  color: #ffffff;
  line-height: 64rpx;
}

.shoppingCart .footer .placeOrder {
  color: #fff;
  font-size: 30upx;
  width: 226upx;
  height: 70upx;
  border-radius: 50upx;
  text-align: center;
  line-height: 70upx;
  margin-left: 22upx;
}

.shoppingCart .footer .button .bnt {
  font-size: 28upx;
  color: #999;
  border-radius: 50upx;
  border: 1px solid #999;
  width: 160upx;
  height: 60upx;
  text-align: center;
  line-height: 60upx;
}

.shoppingCart .footer .button form ~ form {
  margin-left: 17upx;
}
</style>
