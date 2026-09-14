<template>
  <div v-if="shown" class="rc-node" :class="{'rc-selected':!bordersOnly && editing && selectedId===node.id}" :style="css" :data-node-id="bordersOnly ? null : node.id" @click.stop="click">
    <template v-if="!bordersOnly">
    <img v-if="node.kind==='image' && value" :src="imageUrl(value)" class="rc-image" :style="{objectFit:s.fit}" alt="" />
    <span v-else-if="node.kind==='text'||node.kind==='button'" class="rc-text" :style="textStyle">{{text}}</span>
    <span v-else-if="node.kind==='stars'" class="rc-stars" :style="{color:s.starEmptyColor}">★★★★★<span class="rc-stars-fill" :style="{color:s.color,width:starsWidth}">★★★★★</span></span>
    <div v-else-if="node.kind==='tabs'" class="rc-tabs"><button v-for="(tab,index) in tabItems" :key="index" type="button" :style="tabStyle(tab,index)" @click.stop="selectTab(tab,index)">{{tab.label}}<span v-if="tabActive(tab,index)" :style="indicator()"></span></button></div>
    <div v-else-if="node.kind==='products' && node.productNodes.length" :style="productsStyle()"><div v-for="product in products" :key="product.id" :style="productFrame()" @click.stop="productOpen(product)"><div :style="productStage()"><ranking-canvas-node v-for="part in node.productNodes" :key="part.id" :node="part" :context="productContext(product)" :editing="editing" :selected-id="selectedId" @select="$emit('select',$event)" @action="$emit('action',$event)" /></div></div></div>
    <div v-else-if="node.kind==='products'" :style="productsStyle()"><div v-for="product in products" :key="product.id" class="rc-product" @click.stop="productOpen(product)"><div class="rc-product-photo" :style="{height:s.imageHeight+'px',borderRadius:s.productRadius+'px'}"><img :src="imageUrl(product.image)" :style="{objectFit:s.fit}" alt="" /><span v-if="node.productCaption" class="rc-product-caption" :style="{fontSize:s.productTextSize+'px',color:s.productTextColor,backgroundColor:s.productCaptionBackground}">{{caption(product)}}</span></div><div v-if="node.showProductName" class="rc-product-name" :style="{fontSize:s.productTextSize+'px',color:s.productTextColor}">{{product.name}}</div><div v-if="node.showProductPrice" class="rc-product-price" :style="{fontSize:s.priceSize+'px',color:s.priceColor}">¥{{product.price}}</div></div></div>
    <ranking-canvas-node v-for="child in node.children" :key="child.id" :node="child" :context="context" :editing="editing" :selected-id="selectedId" @select="$emit('select',$event)" @action="$emit('action',$event)" />
    <span v-if="editing && !value && ['text','image'].includes(node.kind)" class="rc-empty-node">{{node.label}}</span>
    </template>
    <template v-else>
      <div :style="borderClipCss">
        <div v-if="node.kind==='products' && node.productNodes.length" :style="productsStyle()"><div v-for="product in products" :key="product.id" :style="productFrame()"><div :style="productStage()"><ranking-canvas-node v-for="part in node.productNodes" :key="part.id" :node="part" :context="productContext(product)" :editing="editing" borders-only /></div></div></div>
        <ranking-canvas-node v-for="child in node.children" :key="child.id" :node="child" :context="context" :editing="editing" borders-only />
      </div>
      <div v-if="s.borderWidth>0" class="rc-border" :data-border-id="node.id" :style="borderCss" />
    </template>
  </div>
</template>
<script>
import { rankingCanvasNodeView } from '../../../../shared/rankingCanvasView';
import setting from '@/setting';
export default {name:'RankingCanvasNode',mixins:[rankingCanvasNodeView(url=>url&&url.startsWith('/')?setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/,'')+url:url)]};
</script>
