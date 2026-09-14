<template>
  <ranking-canvas v-if="p.canvas.enabled && !config.isHide" :config="config" :ranking="ranking" :rows="rows" :active-board-id="activeBoardId" :loading="loading" :error="error" @action="$emit('canvas-action',$event)" />
  <div v-else-if="visible" class="ranking-display" :style="panelStyle">
    <div v-if="showHeader" class="rp-header" :style="header.box">
      <img v-if="p.header.icon" class="rp-header-icon" :src="imageUrl(p.header.icon)" :style="header.icon" alt="" />
      <div v-if="p.header.showOverline" class="rp-overline" :style="header.overline">{{ p.header.overline }}</div>
      <div v-if="config.showTitle" class="rp-title" :style="header.title">{{ config.title || ranking.name || '精选排行榜' }}</div>
      <div v-if="config.showDescription && (p.header.description || ranking.description)" class="rp-description" :style="header.description">{{ p.header.description || ranking.description }}</div>
      <span v-if="config.showMore && ranking.page_url" class="rp-more" :style="header.more" @click.stop="$emit('more')">{{ p.header.moreText }} ›</span>
    </div>
    <div v-if="loading || error || !rows.length" class="rp-empty" :style="emptyStyle">{{ loading ? '榜单加载中…' : error || p.empty.text }}<span v-if="error" @click.stop="$emit('retry')"> 点击重试</span></div>
    <div v-for="(group, index) in groups" v-else :key="index" class="rp-group" :class="'rp-group-' + group.variant" :style="group.style">
      <div v-for="row in group.rows" :key="row.item.id" class="rp-card" :class="['rp-card-' + group.variant, 'rp-structure-' + cardLayout]" :data-rank="row.item.rank" :style="row.styles.card" @click.stop="open(row.item)">
        <ranking-badge v-if="badgePosition === 'corner'" class="rp-badge-overlay" :badge="row.rankStyle.badge" :rank="row.item.rank" />
        <div class="rp-card-main" :style="row.styles.main">
        <ranking-badge v-if="badgePosition === 'side'" :badge="row.rankStyle.badge" :rank="row.item.rank" style="align-self:center" />
        <div v-if="p.content.showImage" class="rp-media" :class="{'rp-media-grid': group.variant === 'grid'}">
          <img v-if="row.item.image" class="rp-image" :src="imageUrl(row.item.image)" :style="row.styles.image" alt="" />
          <img v-else-if="ranking.entity_type !== 'shop'" class="rp-image" :src="productPlaceholder" :style="row.styles.image" alt="商品占位" />
          <div v-else class="rp-image rp-image-placeholder" :style="row.styles.image">{{ ranking.entity_type === 'shop' ? '店' : '物' }}</div>
          <ranking-badge v-if="badgePosition === 'image'" class="rp-badge-overlay" :badge="row.rankStyle.badge" :rank="row.item.rank" />
        </div>
        <div class="rp-card-body" :style="row.styles.body">
          <template v-for="field in p.content.order">
            <div v-if="field === 'name' && p.content.showName" :key="field" class="rp-card-name" :style="row.styles.name">{{ row.item.name }}</div>
            <div v-if="field === 'price' && !purchaseSeparate && p.content.showPrice && ranking.entity_type !== 'shop' && row.item.price !== undefined" :key="field" class="rp-card-price" :style="row.styles.price">{{ p.content.pricePrefix }}{{ row.item.price }}</div>
            <div v-if="field === 'metrics'" :key="field" class="rp-card-evidence" :style="{gap: px(p.content.gap)}">
 <div v-if="p.content.showStars" class="rp-shop-rating" :style="{color:p.content.starColor,fontSize:px(p.content.metaSize)}"><span class="rp-stars" :style="row.styles.stars">★★★★★<span class="rp-stars-fill" :style="[row.styles.starFill,{width: row.starPercent + '%'}]">★★★★★</span></span><span>{{ row.item.rating_score == null ? '暂无评分' : Number(row.item.rating_score).toFixed(1) + '分' }}</span></div>
 <div v-if="row.highlight" class="rp-highlight" :style="row.styles.highlight">{{ row.highlight }}</div>
 <div v-if="p.content.showType && row.item.type_name" class="rp-shop-type" :style="row.styles.meta">{{ row.item.type_name }}</div>
 <div v-if="row.metrics.length" class="rp-card-metrics" :style="row.styles.meta"><span v-for="metric in row.metrics" :key="metric">{{ metric }}</span></div>
 <div v-if="p.content.showShopDescription && row.item.shop_description" class="rp-shop-description" :style="row.styles.meta">{{ row.item.shop_description }}</div>
</div>
            <span v-if="field === 'button' && !purchaseSeparate && p.content.showButton" :key="field" class="rp-card-button" :style="row.styles.button">{{ p.content.buttonText }}</span>
          </template>
          <template v-if="cardLayout === 'retail' && (p.content.showPrice || p.content.showButton)"><div class="rp-purchase" :style="row.styles.commerce"><span v-if="p.content.showPrice && ranking.entity_type !== 'shop' && row.item.price !== undefined" class="rp-card-price" :style="row.styles.price">{{ p.content.pricePrefix }}{{ row.item.price }}</span><span v-if="p.content.showButton" class="rp-card-button" :style="row.styles.button">{{ p.content.buttonText }}</span></div></template>
        </div>
        </div>
        <template v-if="cardLayout === 'commerce' && (p.content.showPrice || p.content.showButton)"><div class="rp-purchase" :style="row.styles.commerce"><span v-if="p.content.showPrice && ranking.entity_type !== 'shop' && row.item.price !== undefined" class="rp-card-price" :style="row.styles.price">{{ p.content.pricePrefix }}{{ row.item.price }}</span><span v-if="p.content.showButton" class="rp-card-button" :style="row.styles.button">{{ p.content.buttonText }}</span></div></template>
      </div>
    </div>
    <div v-if="p.footer.show && rows.length && !loading && !error" class="rp-footer" :style="footerStyle">{{ p.footer.text }}</div>
  </div>
</template>
<script>
import { rankingView } from '../../../../shared/rankingView';
import RankingBadge from './RankingBadge';
import RankingCanvas from './RankingCanvas';
import setting from '@/setting';
import productPlaceholder from '@/assets/images/product-diy.png';
export default { components: { RankingBadge, RankingCanvas }, data:()=>({productPlaceholder}), mixins: [rankingView('px', url => url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '') + url : url)] };
</script>
<style lang="scss">@import '../../../../shared/rankingPresentation.scss';</style>
