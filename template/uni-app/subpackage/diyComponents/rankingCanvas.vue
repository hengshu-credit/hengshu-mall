<template><view :id="frameId" class="ranking-canvas" :data-fonts-ready="fontsReady ? 'true' : 'false'" :style="rootStyle"><view v-for="frame in frameList" :key="frame.key" :style="frameBox(frame)" :data-section="frame.section"><view :style="frameStage(frame)"><view class="rc-content-layer"><ranking-canvas-node v-for="node in frame.nodes" :key="node.id" :node="node" :context="nodeContext(frame)" :editing="false" @action="$emit('action',$event)" /></view><view class="rc-border-layer" aria-hidden="true"><ranking-canvas-node v-for="node in frame.nodes" :key="node.id" :node="node" :context="nodeContext(frame)" :editing="editing" borders-only /></view></view></view></view></template>
<script>
import RankingCanvasNode from './rankingCanvasNode';
import { rankingCanvasView } from '../../../shared/rankingCanvasView';
import { HTTP_REQUEST_URL } from '@/config/app';
const imageUrl=url=>url&&url.startsWith('/')?HTTP_REQUEST_URL+url:url;
export default {components:{RankingCanvasNode},mixins:[rankingCanvasView(imageUrl)],data(){return{frameId:'rank_canvas_'+Math.random().toString(36).slice(2)};},mounted(){this.$nextTick(this.measure);if(uni.onWindowResize)uni.onWindowResize(this.measure);this.loadFont();},beforeDestroy(){clearTimeout(this.measureTimer);this.measureDisposed=true;if(uni.offWindowResize)uni.offWindowResize(this.measure);},watch:{fontResourceKey(){this.loadFont();}},methods:{measure(){
      if(this.measureDisposed)return;
      clearTimeout(this.measureTimer);
      const accept=rect=>{if(this.measureDisposed)return;if(rect&&rect.width){this.measuredWidth=rect.width;this.measureRetries=0;}else if((this.measureRetries||0)<20){this.measureRetries=(this.measureRetries||0)+1;this.measureTimer=setTimeout(()=>this.measure(),100);}};
      uni.createSelectorQuery().in(this).select('#'+this.frameId).boundingClientRect(rect=>{if(rect&&rect.width)return accept(rect);uni.createSelectorQuery().select('#'+this.frameId).boundingClientRect(accept).exec();}).exec();
    },async loadFont(){const version=++this.fontLoadVersion;this.fontsReady=false;this.fontError='';try{if(uni.loadFontFace)await Promise.all(this.fontResources.map(font=>new Promise((resolve,reject)=>uni.loadFontFace({family:font.alias,source:'url('+JSON.stringify(imageUrl(font.url))+')',global:true,success:resolve,fail:reject}))));}catch(_){this.fontError='字体加载失败';}finally{if(version===this.fontLoadVersion){this.fontsReady=true;this.measure();}}}}};
</script>
<style lang="scss">@import '../../../shared/rankingCanvas.scss';</style>
