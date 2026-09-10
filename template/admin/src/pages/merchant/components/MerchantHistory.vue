<template>
  <div>
    <el-form inline size="small" @submit.native.prevent>
      <el-form-item label="记录类型"><el-select v-model="filters.event_type" clearable placeholder="全部"><el-option v-for="(name, key) in eventNames" :key="key" :label="name" :value="key" /></el-select></el-form-item>
      <el-form-item label="操作人"><el-input v-model="filters.actor_name" clearable /></el-form-item>
      <el-form-item><el-button type="primary" @click="page = 1; load()">查询</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-table v-loading="loading" :data="list" empty-text="暂无历史记录" row-key="id">
      <el-table-column type="expand"><template slot-scope="{ row }">
        <div class="history-detail">
          <p v-if="row.opinion"><strong>审核意见：</strong>{{ row.opinion }}</p>
          <el-table v-if="row.changes.length" :data="row.changes" size="small" border>
            <el-table-column prop="label" label="修改字段" width="160" />
            <el-table-column label="修改前"><template slot-scope="cell">{{ display(cell.row.before_label === undefined ? cell.row.before : cell.row.before_label) }}</template></el-table-column>
            <el-table-column label="修改后"><template slot-scope="cell">{{ display(cell.row.after_label === undefined ? cell.row.after : cell.row.after_label) }}</template></el-table-column>
          </el-table>
          <pre v-if="row.dictionary">{{ JSON.stringify(row.dictionary, null, 2) }}</pre>
          <div v-if="row.documents.length"><span>关联原文件：</span><el-button v-for="doc in row.documents" :key="doc.id" type="text" :disabled="!canFiles" @click="download(doc)">{{ doc.name }}</el-button></div>
        </div>
      </template></el-table-column>
      <el-table-column label="操作时间" width="175"><template slot-scope="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
      <el-table-column label="类型" width="110"><template slot-scope="{ row }">{{ eventNames[row.event_type] || row.event_type }}</template></el-table-column>
      <el-table-column prop="actor_name" label="操作人" width="120" />
      <el-table-column label="阶段" width="105"><template slot-scope="{ row }">{{ row.stage === 'effective' ? '已生效' : auditNames[row.stage] || row.stage }}</template></el-table-column>
      <el-table-column prop="summary" label="摘要" min-width="200" />
    </el-table>
    <el-pagination class="pagination" :current-page.sync="page" :page-size="20" :total="count" layout="total, prev, pager, next" @current-change="load" />
  </div>
</template>
<script>
import { merchantGet, merchantFile, saveBlob } from '@/api/merchant';
import { eventNames, auditNames, formatTime } from '../fields';
export default {
  name: 'MerchantHistory', props: { shopId: { type: Number, required: true }, canFiles: Boolean },
  data() { return { eventNames, auditNames, filters: { event_type: '', actor_name: '' }, page: 1, count: 0, list: [], loading: false, error: '', sequence: 0 }; },
  watch: { shopId: { immediate: true, handler() { this.page = 1; this.load(); } } },
  methods: {
    formatTime, display(value) { return value === null || value === undefined || value === '' ? '—' : Array.isArray(value) ? value.join('、') || '—' : String(value); },
    async load() { const sequence = ++this.sequence; this.loading = true; this.error = ''; try { const { data } = await merchantGet(`shop/history/${this.shopId}`, { ...this.filters, page: this.page, limit: 20 }); if (sequence === this.sequence) { this.list = data.list; this.count = data.count; } } catch (e) { if (sequence === this.sequence) this.error = e.msg || e.message || '历史读取失败'; } finally { if (sequence === this.sequence) this.loading = false; } },
    async download(doc) { try { saveBlob(await merchantFile(`document/${doc.id}`), doc.name); } catch (e) { this.$message.error(e.msg || e.message || '下载失败'); } },
  },
};
</script>
<style scoped>.history-detail { padding: 12px 30px; }.history-detail p { margin: 0 0 12px; }.history-detail pre { white-space: pre-wrap; }.pagination { text-align: right; margin-top: 18px; }</style>
