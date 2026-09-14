<template>
  <div v-if="!config.isHide">
    <div
      v-for="row in items"
      :key="row.item.id"
      class="rp-detail-strip rank-info"
      :data-rank="row.item.rank"
      :style="row.style"
      @click="$emit('open', row.item)"
    >
      <span class="rp-detail-top" :style="badgeStyle">TOP 榜单</span>
      <div class="rp-detail-body" :style="row.body">
        <span class="rp-detail-name" :style="row.title">{{ row.item.name }}</span
        ><span class="rp-detail-position" :style="row.position">·{{ row.label }}</span>
      </div>
      <span v-if="p.detail.showArrow" class="rp-detail-arrow iconfont iconyou" :style="arrowStyle"></span>
    </div>
  </div>
</template>
<script>
import { rankingDetailView } from '../../../../shared/rankingDetailView';
export default { mixins: [rankingDetailView('px')] };
</script>
<style scoped>
.rp-detail-strip {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #333;
}
.rp-detail-top {
  flex-shrink: 0;
  border-radius: 3px;
  background: #252525;
  color: #f8d887;
  padding: 3px 7px;
  font-size: 10px;
  line-height: 16px;
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
