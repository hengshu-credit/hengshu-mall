<template><div v-if="config && config.appearance" :style="decorationThemeVariables">
  <c-set-up :configObj="config" configNme="setUp" />
  <div v-if="config.setUp.tabVal === 0" class="rank-settings">
    <el-alert v-if="detail" title="只显示当前商品名次最高的一条商品榜信息；同名次按营销榜单优先级选择。店铺榜不参与，未上榜时隐藏，点击进入对应完整榜单。" type="info" :closable="false" />
    <el-form label-position="top" size="small">
      <el-form-item v-if="!detail" label="榜单数据源"><el-select v-model="config.rankingId" filterable remote :remote-method="search" :loading="loading" placeholder="搜索营销中已配置的榜单" style="width:100%"><el-option v-for="item in list" :key="item.id" :value="item.id" :label="item.name + ' · ' + (item.entity_type === 'shop' ? '店铺榜' : '商品榜')" /></el-select><p class="hint">营销配置负责入榜规则；当前组件负责展示样式。</p><div v-if="error" class="error">{{ error }} <el-button type="text" @click="search('')">重试</el-button></div></el-form-item>
      <el-form-item v-if="!detail && !p.canvas.enabled" label="组件标题"><el-input v-model="config.title" maxlength="60" placeholder="留空使用榜单名称" /></el-form-item>
      <el-form-item v-if="!detail" label="展示条数"><el-input-number v-model="config.limit" :min="1" :max="100" :precision="0" /></el-form-item>
      <el-form-item v-if="!detail && !p.canvas.enabled" label="展示内容">
        <el-checkbox v-model="config.showTitle">榜单标题</el-checkbox><el-checkbox v-model="config.showDescription">榜单说明</el-checkbox><el-checkbox v-model="config.showMore">完整榜单入口</el-checkbox>
        <el-checkbox v-model="p.content.showImage">商品 / 店铺图片</el-checkbox><el-checkbox v-model="p.content.showName">名称</el-checkbox><el-checkbox v-if="!isShop" v-model="p.content.showPrice">价格</el-checkbox>
        <el-checkbox v-if="p.content.highlightMetric !== 'sales'" v-model="p.content.showSales">成交件数</el-checkbox><el-checkbox v-if="p.content.highlightMetric !== 'reviews'" v-model="p.content.showReviews">评价数</el-checkbox><el-checkbox v-if="p.content.highlightMetric !== 'rating'" v-model="p.content.showRating">好评率</el-checkbox><el-checkbox v-if="isShop" v-model="p.content.showProductCount">在售商品数</el-checkbox><el-checkbox v-if="p.content.highlightMetric !== 'score'" v-model="config.showScore">综合得分</el-checkbox><el-checkbox v-model="p.content.showButton">行动按钮</el-checkbox>
      </el-form-item>
    </el-form>
    <div v-if="!detail && p.canvas.enabled"><p class="hint">榜头按钮、商品信息、店铺统计和商品组内容均可独立显示或隐藏，支持更换指标、修改文案和样式。</p><el-button type="primary" size="small" @click="canvasOpen=true">配置展示内容与样式</el-button></div>
    <template v-if="!detail && !p.canvas.enabled"><h4>卡片内容顺序</h4><div v-for="(field, index) in visibleOrder" :key="field" class="field-order"><span>{{ orderNames[field] }}</span><el-button size="mini" :disabled="index === 0" @click="moveField(field, -1)">上移</el-button><el-button size="mini" :disabled="index === visibleOrder.length - 1" @click="moveField(field, 1)">下移</el-button></div><p class="hint">仅排序已开启的内容。店铺榜使用在售商品数等经营指标，价格仅用于商品榜。</p></template>
  </div>
  <div v-else-if="detail" class="rank-settings">
    <p class="hint">商品详情使用“TOP 榜单 + 榜名 + 名次”的单行样式；完整营销榜单的卡片和名次样式独立配置。</p>
    <ranking-fields :value="p.detail" :fields="compactDetailFields" />
    <c-common-style allow-theme :configObj="config" />
  </div>
  <div v-else class="rank-settings">
    <div class="preset-heading"><b>样式预设</b><el-button v-if="previous" type="text" @click="undoPreset">撤销本次预设</el-button></div>
    <button v-for="preset in presets" :key="preset.id" type="button" class="rank-preset" :class="['preset-' + preset.id, { selected: p.preset === preset.id }]" @click="applyPreset(preset.id)"><b>{{ preset.name }}</b><span>{{ preset.description }}</span></button>
    <p class="hint">应用预设仅替换当前组件样式，数据源与营销规则保留；每个属性都可继续调整。</p>
    <el-switch v-model="p.canvas.enabled" active-text="全元素模式" /><p v-if="p.canvas.enabled" class="hint">位置、背景、字体、标签及商品组统一在全元素编辑器中配置。相同素材、字体和画布宽度下按同一配置渲染。</p><el-button v-if="p.canvas.enabled" type="primary" size="small" @click="canvasOpen=true">打开全元素编辑器</el-button>
    <el-collapse v-if="p.canvas.enabled"><el-collapse-item title="组件外层边距、背景与圆角" name="outer"><c-common-style allow-theme :configObj="config" /></el-collapse-item></el-collapse>
    <el-collapse v-if="!p.canvas.enabled" v-model="sections">
      <el-collapse-item title="布局与间距" name="layout"><ranking-fields :value="p" :fields="applicableLayout" /></el-collapse-item>
      <el-collapse-item v-if="!detail" title="榜单底色与边框" name="panel"><ranking-fields :value="p.panel" :fields="surfaceFields" /></el-collapse-item>
      <el-collapse-item v-if="!detail && p.layout === 'list' && ['commerce','retail'].includes(p.cardLayout)" title="价格与按钮栏" name="commerce"><ranking-fields :value="p.commerce" :fields="commerceFields" :context="context" /><p class="hint">价格和按钮固定在此栏，通过开关控制显示；其他内容在图文区域排序。</p></el-collapse-item>
      <el-collapse-item v-if="!detail" title="成交亮点与店铺评分" name="evidence"><ranking-fields :value="p.content" :fields="evidenceFields" :context="context" /><p class="hint">星级使用1–5分真实评价的平均值，无有效评价时显示“暂无评分”。</p></el-collapse-item>
      <el-collapse-item v-if="!detail" title="榜头：文字、背景与边框" name="header"><ranking-fields :value="p.header" :fields="headerFields" :context="config" /><ranking-fields :value="p.header.surface" :fields="surfaceFields" /></el-collapse-item>
      <el-collapse-item v-if="!detail && p.content.showImage" title="商品 / 店铺图片" name="image"><ranking-fields :value="p.content" :fields="imageFields" :context="context" /></el-collapse-item>
      <el-collapse-item v-if="!detail" title="卡片文字与指标" name="text"><ranking-fields :value="p.content" :fields="textFields" :context="context" /></el-collapse-item>
      <el-collapse-item v-if="!detail && p.content.showButton" title="行动按钮" name="button"><ranking-fields :value="p.content" :fields="buttonFields" :context="context" /></el-collapse-item>
      <el-collapse-item v-if="detail" title="上榜信息与跳转箭头" name="detail"><ranking-fields :value="p.detail" :fields="detailFields" /></el-collapse-item>
      <el-collapse-item title="名次样式：TOP1 / TOP2 / TOP3 / 其他" name="ranks">
        <el-switch v-model="p.separateTop" active-text="前三名使用独立样式" /><p class="hint">{{ p.separateTop ? 'TOP1、TOP2、TOP3分别设置；普通名次用于TOP4及以后。' : '全部名次使用普通样式，自定义区间仍优先生效。' }}</p>
        <el-radio-group :value="activeTier" @input="tier = $event" size="mini"><el-radio-button v-for="item in tiers" :key="item.key" :label="item.key">{{ item.label }}</el-radio-button></el-radio-group>
        <ranking-rank-settings :key="activeTier" :value="p.ranks[activeTier]" :context="context" />
      </el-collapse-item>
      <el-collapse-item title="自定义名次区间（如 TOP4–10）" name="ranges">
        <p class="hint">区间样式优先于上述名次样式，区间不能重叠。只影响展示范围内的真实名次。</p>
        <div v-for="(range, index) in p.ranges" :key="index" class="range-card"><div class="range-heading">TOP <el-input-number v-model="range.from" size="mini" :min="1" :max="100" :precision="0" /> 至 <el-input-number v-model="range.to" size="mini" :min="range.from" :max="100" :precision="0" /><el-button type="text" @click="p.ranges.splice(index, 1)">删除</el-button></div><ranking-rank-settings :value="range.style" :context="context" /></div>
        <el-button size="small" :disabled="p.ranges.length >= 20" @click="addRange">添加名次区间</el-button>
      </el-collapse-item>
      <el-collapse-item v-if="!detail" title="底部说明与空状态" name="footer"><ranking-fields :value="p.footer" :fields="footerFields" /><ranking-fields :value="p.empty" :fields="emptyFields" /></el-collapse-item>
      <el-collapse-item title="组件整体背景、边距与边框" name="common"><c-common-style allow-theme :configObj="config" /></el-collapse-item>
    </el-collapse>
  </div>
    <ranking-canvas-editor v-if="canvasOpen" :config="config" :ranking="canvasRanking" :rows="canvasRows" @close="canvasOpen=false" />
</div></template>
<script>
import {decorationThemeMixin} from '../../../../shared/themeColors';
import cSetUp from '@/components/mobileConfigRight/c_set_up';
import cCommonStyle from '@/components/mobileConfigRight/c_common_style';
import RankingFields from './RankingFields';
import RankingRankSettings from './RankingRankSettings';
import RankingCanvasEditor from './RankingCanvasEditor';
import { rankingComponent } from '../../../../shared/rankingComponent';
import { rankingPresets, presetPresentation } from '../../../../shared/rankingPresentation';
import * as controls from './rankingControls';
import { rankingList, rankingInfo, rankingPreview } from '@/api/ranking';
export default {mixins:[decorationThemeMixin],
  components: { cSetUp, cCommonStyle, RankingFields, RankingRankSettings, RankingCanvasEditor }, props: {num:[String,Number],detail:Boolean},
  data() { return { canvasOpen:false, canvasRows:[], canvasRanking:{}, list: [], loading: false, error: '', requestId: 0, previous: null, presets: rankingPresets, tier: 'top1', sections: ['layout'], orderNames: { name: '名称', price: '价格', metrics: '指标', button: '行动按钮' }, ...controls }; },
  computed: {
    config() { return this.$store.state.mobildConfig.defaultArray[this.num]; }, p() { return this.config.appearance; },
    compactDetailFields() { return this.detailFields.filter(field => !['showShopLabel','shopLabel'].includes(field.key)); },
    isShop() { const board = this.list.find(item => item.id === this.config.rankingId); return board ? board.entity_type === 'shop' : this.p.cardLayout === 'shop'; },
    context() { return { ...this.config, cardLayout: this.p.cardLayout, followTheme: this.p.followTheme, layout: this.p.layout, content: this.p.content, detail: this.detail, isShop: this.isShop }; },
    visibleOrder() { const c = this.p.content, fixed = this.p.layout==='list' && ['commerce','retail'].includes(this.p.cardLayout); return c.order.filter(key => ({ name: c.showName, price: c.showPrice && !this.isShop && !fixed, metrics: c.highlightMetric!=='none' || c.showStars || c.showSales || c.showReviews || c.showRating || this.config.showScore || (this.isShop && (c.showProductCount || c.showType || c.showShopDescription)), button: c.showButton && !fixed }[key])); },
    applicableLayout() { return this.detail ? this.layoutFields.filter(field => ['gap', 'padding', 'imageGap'].includes(field.key)) : this.layoutFields.map(field => field.key === 'badgePosition' && !this.p.content.showImage ? { ...field, options: field.options.filter(option => option.value !== 'image') } : field); },
    tiers() { return [...(this.p.separateTop ? [{key:'top1',label:'TOP1'},{key:'top2',label:'TOP2'},{key:'top3',label:'TOP3'}] : []),{key:'normal',label:'普通名次'}]; },
    activeTier() { return this.p.separateTop ? this.tier : 'normal'; },
  },
  watch: { canvasOpen(value){if(value)this.loadCanvasRows();}, num: { immediate: true, handler() { this.patch(); this.previous = null; if (!this.detail) this.search(''); } } },
  beforeDestroy() { this.requestId++; },
  methods: {
    async loadCanvasRows(){if(!this.config.rankingId)return;try{const rule=(await rankingInfo(this.config.rankingId)).data;this.canvasRanking=rule;this.canvasRows=(await rankingPreview(rule)).data.list;}catch(e){this.$message.error(e.msg||'预览数据读取失败');}},
    patch() { if (!this.config) return; const defaults = rankingComponent(this.detail ? (this.config.name === 'productRank' ? 'productRank' : 'marketingRankInfo') : 'marketingRanking', this.config, this.num); Object.keys(defaults).forEach(key => { if (this.config[key] === undefined || key === 'appearance' || (this.detail && key === 'limit')) this.$set(this.config, key, defaults[key]); }); },
    applyPreset(id) { this.previous = JSON.parse(JSON.stringify(this.p)); this.$set(this.config, 'appearance', presetPresentation(id)); },
    undoPreset() { if (this.previous) this.$set(this.config, 'appearance', this.previous); this.previous = null; },
    moveField(field, offset) { const visible = this.visibleOrder; const next = visible[visible.indexOf(field) + offset]; if (!next) return; const values = this.p.content.order.slice(), a = values.indexOf(field), b = values.indexOf(next); [values[a], values[b]] = [values[b], values[a]]; this.p.content.order = values; },
    addRange() { let from = 4; while (from <= 100 && this.p.ranges.some(range => from >= range.from && from <= range.to)) from++; if (from > 100) return this.$message.info('所有名次已被区间覆盖'); let to = Math.min(from + 6, 100); while (this.p.ranges.some(range => from <= range.to && to >= range.from)) to--; this.p.ranges.push({ from, to, style: JSON.parse(JSON.stringify(this.p.ranks.normal)) }); },
    async search(keyword) { const id = ++this.requestId; this.loading = true; this.error = ''; try { const res = await rankingList({ keyword, limit: 100 }); const list = res.data.list; const selected = this.config && this.config.rankingId; if (selected && !list.some(item => item.id === selected)) { try { list.unshift((await rankingInfo(selected)).data); } catch (_) { list.unshift({ id: selected, name: '已失效 #' + selected }); } } if (id === this.requestId) this.list = list; } catch (e) { if (id === this.requestId) this.error = e.msg || '榜单加载失败'; } finally { if (id === this.requestId) this.loading = false; } },
  },
};
</script>
<style scoped>.rank-settings{padding:15px}.hint{font-size:12px;color:#999;line-height:1.7}.error{color:#d55}.el-checkbox{margin-left:0;margin-right:12px}.preset-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.rank-preset{border:1px solid #ece8e1;border-radius:8px;background:#fff9ef;display:flex;flex-direction:column;gap:6px;width:100%;padding:12px;margin-bottom:8px;text-align:left;cursor:pointer;color:#845629}.rank-preset span{font-size:11px;opacity:.7}.preset-hot{color:#d95332;background:#fff2ed}.preset-review{color:#806548;background:#fffcf6}.rank-preset.selected{outline:2px solid #b88543;outline-offset:-2px}.field-order{display:flex;align-items:center;gap:6px;margin:6px 0}.field-order span{flex:1;font-size:12px}.range-card{border:1px solid #eee;padding:8px;margin-bottom:12px}.range-heading{display:flex;align-items:center;gap:4px;margin-bottom:14px;font-size:11px}.range-heading .el-input-number{width:80px}.rank-settings /deep/ .el-collapse-item__header{font-size:12px}.rank-settings /deep/ .el-radio-group{margin:8px 0 14px}</style>
