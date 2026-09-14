<template>
  <view class="shop-follow-control"
    ><view v-if="showCount" class="follow-count">{{ count }} 人关注</view
    ><button
      class="shop-follow-button"
      :class="{ followed }"
      :loading="busy"
      :disabled="busy || !shopId"
      @tap.stop="toggle"
    >
      {{ followed ? followedText : followText }}
    </button></view
  >
</template>
<script>
import { getShopFollow, setShopFollow } from "@/api/storefront";
import { toLogin } from "@/libs/login";
export default {
  props: {
    shopId: { type: Number, default: 0 },
    followText: { type: String, default: "关注店铺" },
    followedText: { type: String, default: "已关注" },
    showCount: { type: Boolean, default: false },
  },
  data: () => ({ followed: false, count: 0, busy: false, sequence: 0 }),
  computed: {
    identity() {
      return (
        this.shopId +
        ":" +
        (this.$store.getters.isLogin ? this.$store.state.app.uid : 0)
      );
    },
  },
  watch: {
    identity: {
      handler() {
        this.refresh();
      },
      immediate: true,
    },
  },
  created() {
    this.changed = (event) => {
      if (event.uid && Number(event.uid) !== Number(this.$store.state.app.uid))
        return;
      if (Number(event.id) === this.shopId) {
        this.followed = event.followed;
        this.count = event.follower_count;
      }
    };
    uni.$on("merchant-follow-changed", this.changed);
  },
  beforeDestroy() {
    this.sequence++;
    uni.$off("merchant-follow-changed", this.changed);
  },
  methods: {
    async refresh() {
      const seq = ++this.sequence;
      this.followed = false;
      this.count = 0;
      if (!this.shopId) return;
      try {
        const res = await getShopFollow(this.shopId);
        if (seq === this.sequence) {
          this.followed = res.data.followed;
          this.count = res.data.follower_count;
        }
      } catch (error) {}
    },
    async toggle() {
      if (!this.$store.getters.isLogin) return toLogin();
      if (this.busy || !this.shopId) return;
      this.busy = true;
      const id = this.shopId,
        identity = this.identity,
        uid = this.$store.state.app.uid;
      try {
        const res = await setShopFollow(id, !this.followed);
        if (this.identity === identity) {
          this.followed = res.data.followed;
          this.count = res.data.follower_count;
        }
        uni.$emit("merchant-follow-changed", { id, uid, ...res.data });
      } catch (error) {
        uni.showToast({ title: error.msg || "操作失败，请重试", icon: "none" });
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style scoped>
.shop-follow-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}
.shop-follow-button {
  margin: 0;
  padding: 0 24rpx;
  height: 60rpx;
  line-height: 58rpx;
  min-width: 130rpx;
  max-width: 220rpx;
  border-radius: 36rpx;
  background: var(--view-theme);
  color: #fff;
  font-size: 24rpx;
  white-space: nowrap;
}
.shop-follow-button::after {
  border: 0;
}
.shop-follow-button.followed {
  background: #f5f5f5;
  color: #666;
}
.follow-count {
  font-size: 22rpx;
  color: #999;
}
</style>
