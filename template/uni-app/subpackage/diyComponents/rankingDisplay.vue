<template>
  <ranking-canvas v-if="p.canvas.enabled && !config.isHide" :config="config" :ranking="ranking" :rows="rows" :active-board-id="activeBoardId" :loading="loading" :error="error" @action="$emit('canvas-action',$event)" />
  <view v-else-if="visible" class="ranking-display marketing-ranking" :style="panelStyle">
    <view v-if="showHeader" class="rp-header" :style="header.box">
      <image v-if="p.header.icon" class="rp-header-icon" :src="imageUrl(p.header.icon)" :style="header.icon" mode="aspectFit" />
      <view v-if="p.header.showOverline" class="rp-overline" :style="header.overline">{{ p.header.overline }}</view>
      <view v-if="config.showTitle" class="rp-title" :style="header.title">{{ config.title || ranking.name || '精选排行榜' }}</view>
      <view v-if="config.showDescription && (p.header.description || ranking.description)" class="rp-description" :style="header.description">{{ p.header.description || ranking.description }}</view>
      <text v-if="config.showMore && ranking.page_url" class="rp-more" :style="header.more" @click.stop="$emit('more')">{{ p.header.moreText }} ›</text>
    </view>
    <view v-if="loading || error || !rows.length" class="rp-empty" :style="emptyStyle">{{ loading ? '榜单加载中…' : error || p.empty.text }}<text v-if="error" @click.stop="$emit('retry')"> 点击重试</text></view>
    <view v-for="(group, index) in groups" v-else :key="index" class="rp-group" :class="'rp-group-' + group.variant" :style="group.style">
      <view v-for="row in group.rows" :key="row.item.id" class="rp-card ranking-row" :class="['rp-card-' + group.variant, 'rp-structure-' + cardLayout]" :data-rank="row.item.rank" :style="row.styles.card" @click.stop="open(row.item)">
        <ranking-badge v-if="badgePosition === 'corner'" class="rp-badge-overlay" :badge="row.rankStyle.badge" :rank="row.item.rank" />
        <view class="rp-card-main" :style="row.styles.main">
        <ranking-badge v-if="badgePosition === 'side'" :badge="row.rankStyle.badge" :rank="row.item.rank" style="align-self:center" />
        <view v-if="p.content.showImage" class="rp-media" :class="{'rp-media-grid': group.variant === 'grid'}">
          <image v-if="row.item.image" class="rp-image" :src="imageUrl(row.item.image)" :style="row.styles.image" :mode="p.content.imageFit === 'cover' ? 'aspectFill' : 'aspectFit'" />
          <view v-else class="rp-image rp-image-placeholder" :style="row.styles.image">{{ ranking.entity_type === 'shop' ? '店' : '物' }}</view>
          <ranking-badge v-if="badgePosition === 'image'" class="rp-badge-overlay" :badge="row.rankStyle.badge" :rank="row.item.rank" />
        </view>
        <view class="rp-card-body" :style="row.styles.body">
          <template v-for="field in p.content.order">
            <view v-if="field === 'name' && p.content.showName" :key="field" class="rp-card-name" :style="row.styles.name">{{ row.item.name }}</view>
            <view v-if="field === 'price' && !purchaseSeparate && p.content.showPrice && ranking.entity_type !== 'shop' && row.item.price !== undefined" :key="field" class="rp-card-price" :style="row.styles.price">{{ p.content.pricePrefix }}{{ row.item.price }}</view>
            <view v-if="field === 'metrics'" :key="field" class="rp-card-evidence" :style="{gap: px(p.content.gap)}">
 <view v-if="p.content.showStars" class="rp-shop-rating" :style="{color:p.content.starColor,fontSize:px(p.content.metaSize)}"><text class="rp-stars" :style="row.styles.stars">★★★★★<text class="rp-stars-fill" :style="[row.styles.starFill,{width: row.starPercent + '%'}]">★★★★★</text></text><text>{{ row.item.rating_score == null ? '暂无评分' : Number(row.item.rating_score).toFixed(1) + '分' }}</text></view>
 <view v-if="row.highlight" class="rp-highlight" :style="row.styles.highlight">{{ row.highlight }}</view>
 <view v-if="p.content.showType && row.item.type_name" class="rp-shop-type" :style="row.styles.meta">{{ row.item.type_name }}</view>
 <view v-if="row.metrics.length" class="rp-card-metrics" :style="row.styles.meta"><text v-for="metric in row.metrics" :key="metric">{{ metric }}</text></view>
 <view v-if="p.content.showShopDescription && row.item.shop_description" class="rp-shop-description" :style="row.styles.meta">{{ row.item.shop_description }}</view>
</view>
            <text v-if="field === 'button' && !purchaseSeparate && p.content.showButton" :key="field" class="rp-card-button" :style="row.styles.button">{{ p.content.buttonText }}</text>
          </template>
          <template v-if="cardLayout === 'retail' && (p.content.showPrice || p.content.showButton)"><view class="rp-purchase" :style="row.styles.commerce"><text v-if="p.content.showPrice && ranking.entity_type !== 'shop' && row.item.price !== undefined" class="rp-card-price" :style="row.styles.price">{{ p.content.pricePrefix }}{{ row.item.price }}</text><text v-if="p.content.showButton" class="rp-card-button" :style="row.styles.button">{{ p.content.buttonText }}</text></view></template>
        </view>
        </view>
        <template v-if="cardLayout === 'commerce' && (p.content.showPrice || p.content.showButton)"><view class="rp-purchase" :style="row.styles.commerce"><text v-if="p.content.showPrice && ranking.entity_type !== 'shop' && row.item.price !== undefined" class="rp-card-price" :style="row.styles.price">{{ p.content.pricePrefix }}{{ row.item.price }}</text><text v-if="p.content.showButton" class="rp-card-button" :style="row.styles.button">{{ p.content.buttonText }}</text></view></template>
      </view>
    </view>
    <view v-if="p.footer.show && rows.length && !loading && !error" class="rp-footer" :style="footerStyle">{{ p.footer.text }}</view>
  </view>
</template>
<script>
import { rankingView } from '../../../shared/rankingView';
import RankingBadge from './rankingBadge';
import RankingCanvas from './rankingCanvas';
import { HTTP_REQUEST_URL } from '@/config/app';
export default { components: { RankingBadge, RankingCanvas }, mixins: [rankingView('rpx', url => url && url.startsWith('/') ? HTTP_REQUEST_URL + url : url)] };
</script>
<style lang="scss">@import '../../../shared/rankingPresentation.scss';</style>
