<template>
  <view v-if="!config.isHide"
    ><view
      v-for="row in items"
      :key="row.item.id"
      class="rp-detail-strip rank-info"
      :data-rank="row.item.rank"
      :style="row.style"
      @tap.stop="$emit('open', row.item)"
      ><text class="rp-detail-top" :style="badgeStyle">TOP 榜单</text
      ><view class="rp-detail-body" :style="row.body"
        ><text class="rp-detail-name" :style="row.title">{{
          row.item.name
        }}</text
        ><text class="rp-detail-position" :style="row.position"
          >·{{ row.label }}</text
        ></view
      ><view
        v-if="p.detail.showArrow"
        class="rp-detail-arrow iconfont icon-you2"
        :style="arrowStyle"
        ></view
      ></view
    ></view
  >
</template>
<script>
import { rankingDetailView } from "../../../shared/rankingDetailView";
export default { mixins: [rankingDetailView("rpx")] };
</script>
<style scoped>
.rp-detail-strip {
  display: flex;
  align-items: center;
  color: #333;
}
.rp-detail-top {
  flex-shrink: 0;
  border-radius: 6rpx;
  background: #252525;
  color: #f8d887;
  padding: 6rpx 14rpx;
  font-size: 20rpx;
  line-height: 32rpx;
  white-space: nowrap;
}
.rp-detail-body {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}
.rp-detail-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rp-detail-position {
  display: inline;
  flex-shrink: 0;
  white-space: nowrap;
}
.rp-detail-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;

}

</style>
