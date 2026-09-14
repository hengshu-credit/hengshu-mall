<template>
  <view v-if="shown" class="rc-node" :class="{'rc-selected':!bordersOnly && editing && selectedId===node.id}" :style="css" :data-node-id="bordersOnly ? null : node.id" @tap.stop="click">
    <template v-if="!bordersOnly">
    <image v-if="node.kind==='image' && value" :src="imageUrl(value)" class="rc-image" :style="{objectFit:s.fit}" :mode="s.fit==='contain'?'aspectFit':s.fit==='fill'?'scaleToFill':'aspectFill'" />
    <text v-else-if="node.kind==='text'||node.kind==='button'" class="rc-text" :style="textStyle">{{text}}</text>
    <text v-else-if="node.kind==='stars'" class="rc-stars" :style="{color:s.starEmptyColor}">★★★★★<text class="rc-stars-fill" :style="{color:s.color,width:starsWidth}">★★★★★</text></text>
    <view v-else-if="node.kind==='tabs'" class="rc-tabs"><button v-for="(tab,index) in tabItems" :key="index" type="button" :style="tabStyle(tab,index)" @tap.stop="selectTab(tab,index)">{{tab.label}}<text v-if="tabActive(tab,index)" :style="indicator()"></text></button></view>
    <view v-else-if="node.kind==='products' && node.productNodes.length" :style="productsStyle()"><view v-for="product in products" :key="product.id" :style="productFrame()" @tap.stop="productOpen(product)"><view :style="productStage()"><ranking-canvas-node v-for="part in node.productNodes" :key="part.id" :node="part" :context="productContext(product)" :editing="editing" :selected-id="selectedId" @select="$emit('select',$event)" @action="$emit('action',$event)" /></view></view></view>
    <view v-else-if="node.kind==='products'" :style="productsStyle()"><view v-for="product in products" :key="product.id" class="rc-product" @tap.stop="productOpen(product)"><view class="rc-product-photo" :style="{height:s.imageHeight+'px',borderRadius:s.productRadius+'px'}"><image :src="imageUrl(product.image)" :style="{objectFit:s.fit}" :mode="s.fit==='contain'?'aspectFit':s.fit==='fill'?'scaleToFill':'aspectFill'" /><text v-if="node.productCaption" class="rc-product-caption" :style="{fontSize:s.productTextSize+'px',color:s.productTextColor,backgroundColor:s.productCaptionBackground}">{{caption(product)}}</text></view><view v-if="node.showProductName" class="rc-product-name" :style="{fontSize:s.productTextSize+'px',color:s.productTextColor}">{{product.name}}</view><view v-if="node.showProductPrice" class="rc-product-price" :style="{fontSize:s.priceSize+'px',color:s.priceColor}">¥{{product.price}}</view></view></view>
    <ranking-canvas-node v-for="child in node.children" :key="child.id" :node="child" :context="context" :editing="editing" :selected-id="selectedId" @select="$emit('select',$event)" @action="$emit('action',$event)" />
    <text v-if="editing && !value && ['text','image'].includes(node.kind)" class="rc-empty-node">{{node.label}}</text>
    </template>
    <template v-else>
      <view :style="borderClipCss">
        <view v-if="node.kind==='products' && node.productNodes.length" :style="productsStyle()"><view v-for="product in products" :key="product.id" :style="productFrame()"><view :style="productStage()"><ranking-canvas-node v-for="part in node.productNodes" :key="part.id" :node="part" :context="productContext(product)" :editing="editing" borders-only /></view></view></view>
        <ranking-canvas-node v-for="child in node.children" :key="child.id" :node="child" :context="context" :editing="editing" borders-only />
      </view>
      <view v-if="s.borderWidth>0" class="rc-border" :data-border-id="node.id" :style="borderCss" />
    </template>
  </view>
</template>
<script>
import { rankingCanvasNodeView } from '../../../shared/rankingCanvasView';
import { HTTP_REQUEST_URL } from '@/config/app';
export default {name:'RankingCanvasNode',mixins:[rankingCanvasNodeView(url=>url&&url.startsWith('/')?HTTP_REQUEST_URL+url:url)]};
</script>
<style lang="scss">@import '../../../shared/rankingCanvas.scss';</style>
