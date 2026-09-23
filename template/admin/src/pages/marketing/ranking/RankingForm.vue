<template>
  <el-dialog :title="form.id ? '编辑排行榜 · ' + form.name : '创建排行榜'" :visible="true" width="1120px" top="4vh" :close-on-click-modal="false" append-to-body @close="$emit('close')">
    <div class="rank-builder">
      <div class="rank-editor">
        <el-tabs v-model="tab">
          <el-tab-pane label="1 基础设置" name="basic">
            <el-form label-width="100px" size="small">
              <el-form-item label="榜单名称" required><el-input v-model="form.name" maxlength="60" show-word-limit placeholder="例如：近30天家电畅销榜" /></el-form-item>
              <el-form-item label="榜单说明"><el-input v-model="form.description" type="textarea" :rows="2" maxlength="300" show-word-limit placeholder="向顾客说明榜单主题和选品标准" /></el-form-item>
              <el-form-item label="排行对象"><el-radio-group v-model="form.entity_type" :disabled="!!form.id" @change="changeEntity"><el-radio-button label="product">商品榜</el-radio-button><el-radio-button label="shop">店铺榜</el-radio-button></el-radio-group></el-form-item>
              <el-form-item label="榜单规模"><el-input-number v-model="form.top_n" :min="1" :max="100" :precision="0" /> <span class="hint">TOP N，候选不足时按实际数量展示</span></el-form-item>
              <el-form-item label="展示优先级"><el-input-number v-model="form.priority" :min="0" :max="999999" :precision="0" /><p class="hint">详情页优先展示名次最高的商品榜，同名次按本优先级降序选择，再按榜单ID升序。</p></el-form-item>
              <el-form-item label="开始时间"><el-date-picker type="datetime" value-format="timestamp" clearable :value="form.start_time ? form.start_time * 1000 : null" @input="setTime('start_time', $event)" placeholder="不填立即生效" /></el-form-item>
              <el-form-item label="结束时间"><el-date-picker :value="form.end_time ? form.end_time * 1000 : null" type="datetime" value-format="timestamp" clearable @input="setTime('end_time', $event)" placeholder="不填长期有效" /></el-form-item>
              <el-form-item label="启用榜单"><el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" /></el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="2 入榜条件" name="scope">
            <el-alert title="仅纳入当前可售商品和有效营业店铺。权重调整不能绕过筛选条件和排除名单。" type="info" :closable="false" />
            <el-alert v-if="fieldError" :title="fieldError" type="error" :closable="false" /><el-button v-if="fieldError" type="text" @click="loadFields">重新加载字段</el-button>
            <condition-group v-if="conditionFields.length" :group="form.condition_tree" :root="form.condition_tree" :fields="conditionFields" :entity="form.entity_type" />
            <p class="hint">各组独立设置且、或、均不满足，可继续嵌套。店铺榜的商品字段放入关联商品组，同组条件由同一件在售商品满足。访问客户条件使用当前登录身份，游客只有登录状态，其他客户字段为空。</p>
            <div class="section-title">排除名单</div><p class="hint">始终排除以下{{ entityLabel }}，不受条件关系影响。</p>
            <reference-selector v-model="form.exclude_ids" :type="form.entity_type" :label="entityLabel" />
          </el-tab-pane>
          <el-tab-pane label="3 排序与权重" name="score">
            <el-form label-width="95px" size="small">
              <el-form-item label="统计周期"><el-select v-model="form.window_days"><el-option v-for="item in periods" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
              <el-form-item label="好评率门槛"><el-input-number v-model="form.rating_min_reviews" :min="0" :max="1000" :precision="0" /> <span class="hint">低于该评价数按50%先验平滑；0为不平滑</span></el-form-item>
              <el-form-item label="排序方式"><el-radio-group v-model="form.sort_mode" @change="changeMode"><el-radio-button label="single">单指标</el-radio-button><el-radio-button label="composite">综合分</el-radio-button></el-radio-group></el-form-item>
            </el-form>
            <div v-for="(metric, i) in form.metrics" :key="i" class="metric-row">
              <el-select v-model="metric.field" size="small"><el-option v-for="key in availableMetrics" :key="key" :label="metricLabels[key]" :value="key" :disabled="form.metrics.some((m, j) => j !== i && m.field === key)" /></el-select>
              <el-select v-model="metric.direction" size="small"><el-option value="desc" label="越大越靠前" /><el-option value="asc" label="越小越靠前" /></el-select>
              <el-input-number v-model="metric.weight" size="small" :min="0.01" :max="100" :precision="2" :disabled="form.sort_mode === 'single'" /><span>%</span>
              <el-button v-if="form.sort_mode === 'composite'" type="text" @click="form.metrics.splice(i, 1)">移除</el-button>
            </div>
            <el-button v-if="form.sort_mode === 'composite'" size="small" :disabled="form.metrics.length >= Math.min(5, availableMetrics.length)" @click="addMetric">添加指标</el-button>
            <p :class="['hint', { danger: Math.abs(weightTotal - 100) > 0.001 }]">指标权重合计 {{ weightTotal }}%，须为100%。</p>
            <div class="formula">最终得分 = 基础分 × 对象系数 + 加减分</div>
            <p class="hint">指标按当前候选池归一化到0–100分，再按权重合成基础分。同分按基础分、对象ID升序稳定排列。相同非零指标得100分，全零得0分。</p>
            <div class="section-title">个别{{ entityLabel }}权重调整</div>
            <reference-selector :value="form.adjustments.map(item => item.id)" :type="form.entity_type" :label="entityLabel" @input="adjustIds" />
            <div v-for="item in form.adjustments" :key="item.id" class="adjustment">
              <strong>#{{ item.id }}</strong><label>系数 <el-input-number v-model="item.factor" size="mini" :min="0" :max="10" :precision="2" /></label>
              <label>加减分 <el-input-number v-model="item.bonus" size="mini" :min="-100" :max="100" :precision="2" /></label>
              <el-input v-model="item.reason" size="small" maxlength="100" placeholder="必填：本次调整原因" />
            </div>
            <el-alert title="成交件数按周期内已支付叶订单明细统计，扣除已退款件数；商品转店后按成交时店铺快照汇总。好评率=4星及以上已审核普通商品评价数/评价总数。" type="info" :closable="false" />
            <p class="hint">周期影响成交和评价指标；售价、库存、在售商品数使用当前值。无评价按0分，最低评价数可对小样本好评率进行50%先验平滑。</p>
          </el-tab-pane>
        </el-tabs>
      </div>
      <section class="rank-rule-result">
        <h3>规则试算</h3><p class="hint">此处仅核对入榜数据与得分。页面外观在装修中的排行榜组件配置。</p>
        <div class="preview-customer"><span>试算访问客户</span><reference-selector :value="previewUid?[previewUid]:[]" type="customer" label="客户" @input="setPreviewCustomer" /><el-button v-if="previewUid" type="text" @click="previewUid=0">切换游客</el-button><p class="hint">{{previewUid ? '按所选客户的分组、标签、等级和属性试算' : '当前按游客身份试算'}}</p></div>
        <el-button type="primary" plain size="small" :disabled="!conditionFields.length" :loading="previewLoading" @click="preview">试算当前配置</el-button>
        <p class="hint">{{ result ? '候选 ' + result.candidate_count + ' 项 · 入榜 ' + result.list.length + ' 项' : '试算后查看真实名次和得分' }}</p>
        <el-alert v-if="previewError" :title="previewError" type="error" :closable="false" />
        <p v-if="stale" class="stale">配置已修改，请重新试算。</p>
        <el-table :data="result ? result.list : []" size="mini" max-height="380" empty-text="暂无试算数据">
          <el-table-column label="名次" prop="rank" width="50" />
          <el-table-column label="对象 / 得分明细" min-width="160"><template slot-scope="{ row }"><b>{{ row.name }}</b><p>基础 {{ number(row.base_score) }} × {{ row.adjustment.factor }} {{ row.adjustment.bonus >= 0 ? '+' : '' }}{{ row.adjustment.bonus }} = {{ number(row.score) }}</p><div v-for="part in row.score_parts" :key="part.field" class="hint">{{ metricLabels[part.field] }} {{ number(part.raw) }} · 标准分 {{ number(part.normalized) }} × {{ part.weight }}%</div></template></el-table-column>
        </el-table>
      </section>
    </div>
    <div slot="footer" class="builder-footer"><span class="hint">营销仅保存榜单规则；展示布局与样式请在关联页面的排行榜组件中配置。</span><el-button @click="$emit('close')">取消</el-button><el-button type="primary" :disabled="!conditionFields.length" :loading="saving" @click="save">保存榜单</el-button></div>
  </el-dialog>
</template>
<script>
import ReferenceSelector from './ReferenceSelector';
import ConditionGroup from './ConditionGroup';
import { conditionTree } from './conditionTree';
import { defaults, fields, metrics, metricLabels, referenceTypes } from './form';
import { rankingSave, rankingPreview, rankingOptions } from '@/api/ranking';
export default {
  components: { ReferenceSelector, ConditionGroup }, props: { initial: { type: Object, default: defaults } },
  data() { return { form: {...JSON.parse(JSON.stringify(this.initial)),condition_tree:conditionTree(this.initial)},conditionFields:[],fieldError:'',previewUid:0, tab: 'basic', saving: false, previewLoading: false, previewError: '', result: null, lastPreview: '', requestId: 0, metricLabels,
    periods: [{ value: 7, label: '滚动近7天' }, { value: 30, label: '滚动近30天' }, { value: 90, label: '滚动近90天' }, { value: 0, label: '全部历史' }] }; },
  computed: { fieldLabels() { return fields(this.form.entity_type); }, availableMetrics() { return metrics(this.form.entity_type); }, entityLabel() { return this.form.entity_type === 'shop' ? '店铺' : '商品'; }, weightTotal() { return Math.round(this.form.metrics.reduce((sum, m) => sum + Number(m.weight || 0), 0) * 100) / 100; }, stale() { return this.result && this.lastPreview !== JSON.stringify({...this.form,preview_uid:this.previewUid}); } },
  created(){this.loadFields();},
  beforeDestroy() { this.requestId++; },
  methods: {
    async loadFields(){this.fieldError='';try{this.conditionFields=(await rankingOptions({type:'condition_fields'})).data.list;}catch(e){this.fieldError=e.msg||'条件字段读取失败';}},
    setPreviewCustomer(ids){if(ids.length>1)return this.$message.warning('每次选择一位客户进行试算');this.previewUid=ids[0]||0;},
    number(value) { return Number(value).toFixed(2).replace(/\.00$/, ''); }, setTime(key, value) { this.form[key] = value ? Math.floor(Number(value) / 1000) : 0; },
    isReference(field) { return Object.prototype.hasOwnProperty.call(referenceTypes, field); }, referenceType(field) { return referenceTypes[field] || this.form.entity_type; },
    operators(field) { return this.isReference(field) ? [{ value: 'in', label: '属于' }, { value: 'not_in', label: '不属于' }] : field === 'name' ? [{ value: 'contains', label: '包含' }] : [{ value: 'gte', label: '大于等于' }, { value: 'lte', label: '小于等于' }]; },
    resetCondition(item) { item.op = this.operators(item.field)[0].value; item.value = this.isReference(item.field) ? [] : item.field === 'name' ? '' : 0; },
    changeEntity() { this.form.conditions = []; this.form.condition_tree=conditionTree(defaults()); this.form.exclude_ids = []; this.form.adjustments = []; this.form.metrics = defaults().metrics; this.form.sort_mode = 'single'; this.result = null; },
    changeMode() { if (this.form.sort_mode === 'single') this.form.metrics = [{ ...(this.form.metrics[0] || defaults().metrics[0]), weight: 100 }]; },
    addMetric() { const field = this.availableMetrics.find(key => !this.form.metrics.some(m => m.field === key)); if (field) this.form.metrics.push({ field, direction: 'desc', weight: 1 }); },
    adjustIds(ids) { this.form.adjustments = ids.map(id => this.form.adjustments.find(item => item.id === id) || { id, factor: 1, bonus: 0, reason: '' }); },
    async preview() { const id = ++this.requestId; const snapshot = JSON.stringify({...this.form,preview_uid:this.previewUid}); this.previewLoading = true; this.previewError = ''; try { const res = await rankingPreview(JSON.parse(snapshot)); if (id !== this.requestId) return; this.result = res.data; this.lastPreview = snapshot; } catch (e) { if (id === this.requestId) this.previewError = e.msg || '试算失败，请重试'; } finally { if (id === this.requestId) this.previewLoading = false; } },
    async save() { if (this.saving) return; this.saving = true; try { const res = await rankingSave(this.form.id || 0, this.form); this.$message.success('排行榜已保存'); this.$emit('saved', res.data.id); } catch (e) { this.$message.error(e.msg || '保存失败'); } finally { this.saving = false; } },
  },
};
</script>
<style scoped>
.rank-builder{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;min-height:530px}.rank-editor{min-width:0;max-height:66vh;overflow:auto;padding-right:10px}.rank-rule-result{min-width:0;border-left:1px solid #edf0f5;padding-left:20px}.rank-rule-result h3{font-size:16px;margin:5px 0 12px}.preview-top{padding:22px;background:linear-gradient(130deg,#332b25,#6d5036);color:#fff4df}.eyebrow{font-size:11px;letter-spacing:2px;color:#e4ba78}.preview-top h3{font-size:22px;margin:12px 0}.preview-top p{font-size:12px;line-height:1.7;opacity:.8;margin:0;word-break:break-word}.preview-body{padding:16px;max-height:46vh;overflow:auto}.hint{font-size:12px;color:#88909c;line-height:1.7;margin:7px 0}.section-line{margin:18px 0}.condition-row{padding:12px;background:#f7f8fa;border:1px solid #edf0f3;border-radius:6px;margin-bottom:12px}.condition-heading{display:flex;gap:8px;margin-bottom:10px}.condition-heading>.el-select:first-child{flex:1}.section-title{font-weight:600;margin:24px 0 10px}.metric-row{display:flex;gap:7px;align-items:center;margin-bottom:12px}.metric-row>.el-select{width:145px}.metric-row>.el-input-number{width:116px}.formula{padding:14px;background:#f5f7fa;border-radius:6px;color:#404c60}.adjustment{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:14px 0}.adjustment label{font-size:12px}.adjustment .el-input-number{width:115px}.danger{color:#e45555}.stale{font-size:12px;color:#b67925}.preview-row{display:flex;align-items:flex-start;gap:10px;border-top:1px solid #ece5d8;padding:13px 0}.rank-number{color:#bc8339;font-size:20px;min-width:22px}.preview-row img{width:42px;height:42px;object-fit:cover;border-radius:6px}.preview-detail{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px;font-size:12px}.preview-detail strong{color:#303640;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.preview-detail span,.preview-detail small{color:#8a7a68}.builder-footer{display:flex;align-items:center;gap:12px}.builder-footer>.hint{margin-right:auto;text-align:left}
</style>
