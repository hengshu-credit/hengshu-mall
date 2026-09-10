<template>
  <div>
    <el-card shadow="never"><el-form inline size="small" @submit.native.prevent>
      <el-form-item label="审核状态"><el-select v-model="filters.status" clearable placeholder="全部"><el-option v-for="(name, key) in auditNames" :key="key" :value="key" :label="name" /></el-select></el-form-item>
      <el-form-item label="申请内容"><el-select v-model="filters.kind" clearable placeholder="全部"><el-option value="onboarding" label="商户入驻" /><el-option value="profile_change" label="资料修改" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" @click="page = 1; load()">查询</el-button></el-form-item>
      <el-form-item><el-popover placement="bottom" width="360" trigger="click"><p>商城入驻页面</p><code>/pages/merchant/application</code><p style="color:#909399">可在商城装修中配置此页面链接。</p><el-button slot="reference">入驻入口</el-button></el-popover></el-form-item>
    </el-form></el-card>
    <el-card shadow="never" class="mt16">
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <el-table v-loading="loading" :data="rows" row-key="id" empty-text="暂无入驻或资料申请">
        <el-table-column prop="id" label="申请编号" width="90" />
        <el-table-column prop="name" label="申请商户" min-width="180" />
        <el-table-column prop="subject_name" label="主体名称" min-width="180" />
        <el-table-column prop="type_name" label="商户类型" width="110" />
        <el-table-column prop="contact_name" label="联系人" width="100" />
        <el-table-column label="内容" width="100"><template slot-scope="{ row }">{{ row.kind === 'profile_change' ? '资料修改' : '商户入驻' }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template slot-scope="{ row }"><el-tag :type="row.status === 'approved' ? 'success' : 'info'" size="small">{{ auditNames[row.status] }}</el-tag></template></el-table-column>
        <el-table-column label="提交／更新时间" width="170"><template slot-scope="{ row }">{{ formatTime(row.updated_at) }}</template></el-table-column>
        <el-table-column prop="reviewer_name" label="审核人" width="100" />
        <el-table-column label="操作" width="90" fixed="right"><template slot-scope="{ row }"><el-button type="text" @click="open(row)">{{ row.status === 'submitted' && permissions.audit ? '审核' : '详情' }}</el-button></template></el-table-column>
      </el-table>
      <el-pagination class="pagination" :current-page.sync="page" :page-size="20" :total="count" layout="total, prev, pager, next" @current-change="load" />
    </el-card>
    <el-drawer title="申请资料" :visible.sync="drawer" size="min(100%, 1080px)" :wrapper-closable="false" destroy-on-close>
      <div v-loading="detailLoading" class="drawer-body">
        <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" />
        <template v-if="application && !detailLoading && !detailError">
          <el-alert v-if="application.affected_shops.length" type="warning" :closable="false" :title="'本次主体资料关联：' + application.affected_shops.map(item => item.name).join('、')" />
          <el-alert v-if="application.opinion" :title="'上次审核意见：' + application.opinion" type="info" :closable="false" />
          <merchant-form :value="application.profile" :types="types" :tags="tags" :documents="application.documents" readonly :sensitive="!!permissions.sensitive" :can-files="!!permissions.files" />
          <template v-if="application.status === 'submitted' && permissions.audit"><h3>审核意见</h3><el-input v-model="opinion" type="textarea" :rows="3" maxlength="2000" placeholder="驳回或要求补充时请填写具体原因" /></template>
          <div v-if="application.history && application.history.list.length" class="review-history"><h3>历史记录</h3><div v-for="event in application.history.list" :key="event.id" class="history-row"><span>{{ formatTime(event.created_at) }} · {{ event.actor_name }}</span><p>{{ event.summary }}<template v-if="event.opinion">：{{ event.opinion }}</template></p></div></div>
        </template>
      </div>
      <div class="drawer-footer"><el-button @click="drawer = false">关闭</el-button><template v-if="application && application.status === 'submitted' && permissions.audit && !detailError"><el-button :loading="saving" @click="review('supplement')">要求补充</el-button><el-button type="danger" :loading="saving" @click="review('rejected')">驳回</el-button><el-button type="primary" :loading="saving" @click="review('approved')">审核通过</el-button></template></div>
    </el-drawer>
  </div>
</template>
<script>
import { merchantGet, merchantWrite, operationKey } from '@/api/merchant';
import MerchantForm from './components/MerchantForm';
import { auditNames, formatTime } from './fields';
export default {
  name: 'MerchantApplications', components: { MerchantForm },
  data() { return { auditNames, filters: { status: 'submitted', kind: '' }, page: 1, count: 0, rows: [], permissions: {}, types: [], tags: [], loading: false, error: '', drawer: false, detailLoading: false, detailError: '', application: null, opinion: '', saving: false, sequence: 0, detailSequence: 0, reviewKey: '', reviewFingerprint: '' }; },
  created() { this.initialize(); },
  methods: {
    formatTime,
    async initialize() { try { const { data } = await merchantGet('config'); this.permissions = data.permissions; this.types = data.types; this.tags = data.tags; await this.load(); } catch (e) { this.error = e.msg || e.message || '读取失败'; } },
    async load() { const seq = ++this.sequence; this.loading = true; this.error = ''; try { const { data } = await merchantGet('application/list', { ...this.filters, page: this.page, limit: 20 }); if (seq === this.sequence) { this.rows = data.list; this.count = data.count; } } catch (e) { if (seq === this.sequence) this.error = e.msg || e.message || '读取失败'; } finally { if (seq === this.sequence) this.loading = false; } },
    async open(row) { const seq = ++this.detailSequence; this.drawer = true; this.detailLoading = true; this.detailError = ''; this.opinion = ''; this.reviewFingerprint = ''; try { const { data } = await merchantGet(`application/info/${row.id}`); if (seq === this.detailSequence) this.application = data; } catch (e) { if (seq === this.detailSequence) this.detailError = e.msg || e.message || '资料读取失败'; } finally { if (seq === this.detailSequence) this.detailLoading = false; } },
    async review(decision) { if (this.saving) return; if (decision !== 'approved' && !this.opinion.trim()) return this.$message.error('请填写审核意见'); const data = { version: Number(this.application.version), decision, opinion: this.opinion }; const fingerprint = JSON.stringify([this.application.id, data]); if (fingerprint !== this.reviewFingerprint) { this.reviewFingerprint = fingerprint; this.reviewKey = operationKey(); } this.saving = true; try { await merchantWrite(`application/review/${this.application.id}`, { ...data, request_key: this.reviewKey }); this.$message.success('审核结果已保存'); this.drawer = false; await this.load(); } catch (e) { this.$message.error(e.msg || e.message || '审核失败'); } finally { this.saving = false; } },
  },
};
</script>
<style scoped>.mt16 { margin-top: 16px; }.pagination { text-align: right; margin-top: 18px; }.drawer-body { padding: 0 24px 110px; height: calc(100vh - 90px); overflow-y: auto; }.drawer-footer { position: absolute; bottom: 0; left: 0; right: 0; background: #fff; padding: 16px 24px; border-top: 1px solid #ebeef5; text-align: right; }.history-row { border-left: 2px solid #dce6f2; padding: 4px 14px; margin: 14px 0; }.history-row span { color: #909399; font-size: 12px; }.history-row p { margin: 6px 0; }</style>
