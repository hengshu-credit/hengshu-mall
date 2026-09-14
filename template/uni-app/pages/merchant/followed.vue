<template>
  <view class="followed-page" :style="colorStyle"
    ><view v-if="!isLogin" class="state"
      ><view>登录后查看已关注店铺</view
      ><button @tap="login">去登录</button></view
    ><template v-else
      ><view v-for="shop in shops" :key="shop.id" class="followed-card"
        ><view class="shop-main" @tap="openShop(shop)"
          ><image v-if="shop.logo" :src="shop.logo" mode="aspectFill" /><view
            v-else
            class="avatar"
            >{{ shop.name.slice(0, 1) }}</view
          ><view class="shop-info"
            ><view class="name line1">{{ shop.name }}</view
            ><view class="description line2">{{
              shop.available
                ? shop.description || "进入店铺逛逛"
                : "店铺暂未营业"
            }}</view></view
          ><text
            v-if="shop.available"
            class="iconfont icon-ic_rightarrow" /></view
        ><view class="followed-actions"
          ><text>已关注</text
          ><button :disabled="busyId === shop.id" @tap="unfollow(shop)">
            {{ busyId === shop.id ? "处理中…" : "取消关注" }}
          </button></view
        ></view
      ><view class="state" @tap="load(false)">{{
        loading
          ? "加载中…"
          : error
          ? error + "，点击重试"
          : !shops.length
          ? "你还没有关注店铺"
          : shops.length < count
          ? "加载更多"
          : "已展示全部关注店铺"
      }}</view></template
    ></view
  >
</template>
<script>
import colors from "@/mixins/color";
import { getFollowedShops, setShopFollow } from "@/api/storefront";
import { toLogin } from "@/libs/login";
import { shopUrl } from "../../../shared/merchantDecoration";
export default {
  mixins: [colors],
  data: () => ({
    shops: [],
    count: 0,
    page: 0,
    loading: false,
    error: "",
    busyId: 0,
    sequence: 0,
  }),
  computed: {
    isLogin() {
      return this.$store.getters.isLogin;
    },
  },
  onShow() {
    this.load(true);
  },
  onUnload() {
    this.sequence++;
  },
  onReachBottom() {
    this.load(false);
  },
  onPullDownRefresh() {
    this.load(true).finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    login() {
      toLogin();
    },
    async load(reset) {
      if (!this.isLogin) {
        this.shops = [];
        return;
      }
      if (
        !reset &&
        (this.loading || this.shops.length >= this.count) &&
        !this.error
      )
        return;
      const seq = ++this.sequence;
      this.loading = true;
      this.error = "";
      if (reset) {
        this.shops = [];
        this.page = 0;
      }
      try {
        const res = await getFollowedShops({ page: this.page + 1, limit: 20 });
        if (seq === this.sequence) {
          this.shops = this.shops.concat(res.data.list);
          this.count = res.data.count;
          this.page++;
        }
      } catch (error) {
        if (seq === this.sequence) this.error = error.msg || "读取失败";
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
    openShop(shop) {
      if (shop.available)
        uni.navigateTo({
          url: shopUrl(shop.id, uni.getStorageSync("previewThemeId")),
        });
    },
    async unfollow(shop) {
      if (this.busyId) return;
      this.busyId = shop.id;
      try {
        const res = await setShopFollow(shop.id, false);
        uni.$emit("merchant-follow-changed", { id: shop.id, ...res.data });
        await this.load(true);
      } catch (error) {
        uni.showToast({ title: error.msg || "取消关注失败", icon: "none" });
      } finally {
        this.busyId = 0;
      }
    },
  },
};
</script>
<style scoped>
.followed-page {
  padding: 24rpx;
  min-height: 100vh;
  background: #f5f5f5;
}
.followed-card {
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.shop-main {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.shop-main image,
.avatar {
  height: 96rpx;
  width: 96rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
}
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--view-minorColorT);
  color: var(--view-theme);
  font-size: 38rpx;
}
.shop-info {
  min-width: 0;
  flex: 1;
}
.name {
  font-size: 30rpx;
}
.description {
  color: #999;
  font-size: 24rpx;
  margin-top: 12rpx;
}
.followed-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #eee;
  color: #999;
  font-size: 24rpx;
}
.followed-actions button {
  margin: 0;
  font-size: 24rpx;
  line-height: 52rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 0 22rpx;
}
.state {
  padding: 90rpx 24rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.state button {
  margin-top: 30rpx;
  color: #fff;
  background: var(--view-theme);
  font-size: 28rpx;
}
</style>
