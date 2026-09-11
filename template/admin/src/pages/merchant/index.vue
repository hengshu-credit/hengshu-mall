<template>
  <div class="merchant-page">
    <el-card shadow="never" class="merchant-panel">
      <el-form class="merchant-filter" inline size="small" @submit.native.prevent>
        <el-form-item label="商户搜索"><el-input v-model="filters.keyword" clearable placeholder="商户名称／编号／主体" @keyup.enter.native="search" /></el-form-item>
        <el-form-item label="商户类型"><el-select v-model="filters.type_id" clearable placeholder="全部"><el-option v-for="item in types" :key="item.id" :value="item.id" :label="item.name" /></el-select></el-form-item>
        <el-form-item label="商户标签"><el-select v-model="filters.tag_ids" multiple clearable placeholder="全部"><el-option v-for="item in tags" :key="item.id" :value="item.id" :label="item.name" /></el-select></el-form-item>
        <el-form-item label="经营状态"><el-select v-model="filters.state" clearable placeholder="全部"><el-option v-for="(name, key) in stateNames" :key="key" :label="name" :value="key" /></el-select></el-form-item>
        <el-form-item label="审核状态"><el-select v-model="filters.audit_status" clearable placeholder="全部"><el-option v-for="(name, key) in auditNames" :key="key" :label="name" :value="key" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="merchant-panel">
      <div class="toolbar"><div><strong>商户列表</strong><span class="merchant-count">{{ count }} 家商户</span></div><el-button v-if="permissions.save" type="primary" size="small" @click="create">新增商户</el-button></div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb16" />
      <el-table class="merchant-table" v-loading="loading" :data="list" row-key="id" empty-text="暂无商户">
        <el-table-column label="商户名称" min-width="220">
          <template slot-scope="{ row }">
            <div class="merchant-name">
              <div class="merchant-avatar"><img v-if="row.logo" :src="row.logo" alt="商户Logo" /><i v-else class="el-icon-s-shop" aria-hidden="true" /></div>
              <div class="merchant-identity">
                <button type="button" class="merchant-name-link" :title="row.name" @click="open(row, false)">{{ row.name }}</button>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="商户ID" min-width="140" show-overflow-tooltip class-name="merchant-id-column" />
        <el-table-column prop="subject_name" label="主体名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="商户类型" width="100"><template slot-scope="{ row }"><span class="merchant-type-label" :title="row.type_name">{{ row.type_name }}</span></template></el-table-column>
        <el-table-column label="标签" min-width="110">
          <template slot-scope="{ row }">
            <el-tooltip v-if="row.tags.length" :content="row.tags.map(tag => tag.name).join('、')" placement="top" :disabled="row.tags.length < 2">
              <div class="merchant-tag-strip"><span class="merchant-tag-label">{{ row.tags[0].name }}</span><span v-if="row.tags.length > 1" class="merchant-tag-more">+{{ row.tags.length - 1 }}</span></div>
            </el-tooltip>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="联系人" width="135"><template slot-scope="{ row }">{{ row.contact_name || '—' }}<div class="muted">{{ row.contact_phone }}</div></template></el-table-column>
        <el-table-column label="商品数" width="80"><template slot-scope="{ row }"><button type="button" class="merchant-number-link" @click="products(row)">{{ row.product_count }}</button></template></el-table-column>
        <el-table-column label="审核状态" width="120"><template slot-scope="{ row }"><el-tag :type="row.audit_status === 'approved' ? 'success' : 'info'" size="small">{{ auditNames[row.audit_status] }}</el-tag><div v-if="row.pending_status" class="muted">修改：{{ auditNames[row.pending_status] }}</div></template></el-table-column>
        <el-table-column label="经营状态" width="105"><template slot-scope="{ row }"><span class="merchant-state" :class="'is-' + row.state">{{ stateNames[row.state] }}</span></template></el-table-column>
        <el-table-column label="操作" fixed="right" width="250"><template slot-scope="{ row }"><div class="merchant-row-actions"><el-button type="text" @click="open(row, false)">详情</el-button><el-button v-if="permissions.save" type="text" @click="open(row, true)">编辑</el-button><el-button v-if="permissions['product-assign'] && row.state !== 'closed'" type="text" @click="claim(row)">认领商品</el-button><el-dropdown trigger="click" @command="action(row, $event)"><el-button type="text">更多<i class="el-icon-arrow-down" /></el-button><el-dropdown-menu slot="dropdown"><el-dropdown-item v-if="permissions.history" command="history">历史记录</el-dropdown-item><el-dropdown-item v-if="permissions.status && row.state !== 'open'" command="open">开业／恢复</el-dropdown-item><el-dropdown-item v-if="permissions.status && row.state === 'open' && !row.is_platform" command="paused">暂停营业</el-dropdown-item><el-dropdown-item v-if="permissions.status && !row.is_platform && row.state !== 'closed'" command="closed">关闭商户</el-dropdown-item><el-dropdown-item v-if="permissions.export && permissions.files" command="export">导出资料包</el-dropdown-item></el-dropdown-menu></el-dropdown></div></template></el-table-column>
      </el-table>
      <el-pagination class="merchant-pagination" :current-page.sync="page" :page-size="20" :total="count" layout="total, prev, pager, next" @current-change="load" />
    </el-card>
    <merchant-product-assignment v-if="claimVisible" :visible.sync="claimVisible" mode="claim" :shop="claimShop" @success="load" />
    <el-drawer custom-class="merchant-drawer" :title="drawerTitle" :visible.sync="drawer" size="min(100%, 1080px)" :wrapper-closable="false" destroy-on-close>
      <div v-loading="detailLoading" class="drawer-body">
        <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" />
        <el-tabs v-if="!detailLoading && !detailError" v-model="tab">
          <el-tab-pane label="商户资料" name="profile">
            <el-alert v-if="record && record.pending" :title="`存在${auditNames[record.pending.status]}的资料修改；当前展示${showEffective ? '有效资料' : '待审资料'}`" type="warning" :closable="false" class="mb16"><el-button slot="default" type="text" @click="toggleEffective">{{ showEffective ? '查看待审资料' : '查看有效资料' }}</el-button></el-alert>
            <merchant-form v-if="editing && !showEffective && !isSubmitted" v-model="form" :types="types" :tags="tags" :documents="documents" :shop-id="editId" :readonly="!editing || showEffective || isSubmitted" :sensitive="!!permissions.sensitive" :can-files="!!permissions.files" />
            <merchant-detail v-else :value="form" :meta="detailMeta" :types="types" :tags="tags" :documents="documents" :can-files="!!permissions.files" />
          </el-tab-pane>
          <el-tab-pane v-if="editId && permissions.history" label="历史记录" name="history" lazy><merchant-history v-if="tab === 'history'" :shop-id="editId" :can-files="!!permissions.files" :key="historyKey" /></el-tab-pane>
        </el-tabs>
      </div>
      <div class="drawer-footer">
        <el-button @click="drawer = false">关闭</el-button>
        <template v-if="tab === 'profile' && !detailLoading && !detailError">
          <el-button v-if="permissions.save && !editing && !showEffective && !isSubmitted" @click="editing = true">编辑资料</el-button>
          <el-button v-if="permissions.save && editing && !showEffective && !isSubmitted" type="primary" :loading="saving" @click="save">保存资料</el-button>
          <el-button v-if="canSubmit" type="success" :loading="saving" @click="submit">提交审核</el-button>
          <el-button v-if="isSubmitted && permissions.withdraw" :loading="saving" @click="withdraw">撤回审核</el-button>
        </template>
      </div>
    </el-drawer>
  </div>
</template>
<script>
import { merchantGet, merchantWrite, operationKey, merchantFile, saveBlob } from '@/api/merchant';
import MerchantForm from './components/MerchantForm';
import MerchantHistory from './components/MerchantHistory';
import MerchantDetail from './components/MerchantDetail';
import MerchantProductAssignment from './components/MerchantProductAssignment';
import { stateNames, auditNames, emptyMerchant } from './fields';
const filters = () => ({ keyword: '', type_id: '', tag_ids: [], state: '', audit_status: '' });
export default {
  name: 'MerchantList', components: { MerchantForm, MerchantHistory, MerchantDetail, MerchantProductAssignment },
  data() { return { claimVisible: false, claimShop: {}, stateNames, auditNames, filters: filters(), permissions: {}, types: [], tags: [], list: [], page: 1, count: 0, loading: false, error: '', drawer: false, editing: false, editId: 0, form: emptyMerchant(), documents: [], record: null, tab: 'profile', detailLoading: false, detailError: '', saving: false, sequence: 0, detailSequence: 0, historyKey: 0, showEffective: false, saveKey: '', saveFingerprint: '' }; },
  computed: {
    detailMeta() { return this.record ? { ...this.record, audit_status: this.record.pending && !this.showEffective ? this.record.pending.status : this.record.audit_status } : {}; },
    drawerTitle() { return !this.editId ? '新增商户' : this.editing ? '编辑商户' : '商户详情'; },
    isSubmitted() { return !!(this.record && this.record.pending && this.record.pending.status === 'submitted'); },
    canSubmit() { return this.permissions.submit && this.editId && this.record && !this.isSubmitted && !this.editing && (this.record.audit_status !== 'approved' || this.record.pending); },
  },
  created() { this.initialize(); },
  methods: {
    claim(row) { this.claimShop = row; this.claimVisible = true; },
    async initialize() { try { const { data } = await merchantGet('config'); this.permissions = data.permissions; this.types = data.types; this.tags = data.tags; await this.load(); } catch (e) { this.error = e.msg || e.message || '商户配置读取失败'; } },
    async load() { const seq = ++this.sequence; this.loading = true; this.error = ''; try { const { data } = await merchantGet('shop/list', { ...this.filters, page: this.page, limit: 20 }); if (seq === this.sequence) { this.list = data.list; this.count = data.count; } } catch (e) { if (seq === this.sequence) this.error = e.msg || e.message || '列表读取失败'; } finally { if (seq === this.sequence) this.loading = false; } },
    search() { this.page = 1; this.load(); }, reset() { this.filters = filters(); this.search(); },
    create() { this.detailSequence++; this.editId = 0; this.form = emptyMerchant(this.types); this.record = null; this.documents = []; this.editing = true; this.tab = 'profile'; this.showEffective = false; this.detailError = ''; this.detailLoading = false; this.saveFingerprint = ''; this.drawer = true; },
    async open(row, editing, tab = 'profile') { this.editId = Number(row.id); this.drawer = true; this.editing = editing; this.tab = tab; this.showEffective = false; await this.loadDetail(); },
    async loadDetail() { const seq = ++this.detailSequence; this.detailLoading = true; this.detailError = ''; try { const { data } = await merchantGet(`shop/info/${this.editId}`); if (seq === this.detailSequence) { this.record = data; this.documents = data.documents; this.form = JSON.parse(JSON.stringify(data.pending ? data.pending.profile : data.profile)); this.saveFingerprint = ''; this.historyKey++; } } catch (e) { if (seq === this.detailSequence) this.detailError = e.msg || e.message || '资料读取失败'; } finally { if (seq === this.detailSequence) this.detailLoading = false; } },
    toggleEffective() { this.showEffective = !this.showEffective; this.form = JSON.parse(JSON.stringify(this.showEffective ? this.record.profile : this.record.pending.profile)); this.editing = false; },
    async save() { if (this.saving) return; this.saving = true; const version = this.record ? this.record.version : 0; const fingerprint = JSON.stringify([this.editId, version, this.form]); if (fingerprint !== this.saveFingerprint) { this.saveKey = operationKey(); this.saveFingerprint = fingerprint; } try { const { data } = await merchantWrite(`shop/save/${this.editId}`, { profile: this.form, version, request_key: this.saveKey }); this.editId = Number(data.id); this.editing = false; this.$message.success(data.changed === false ? '资料没有变化' : '资料已保存'); await this.loadDetail(); await this.load(); } catch (e) { this.$message.error(e.msg || e.message || '保存失败'); } finally { this.saving = false; } },
    async submit() { this.saving = true; try { await merchantWrite(`shop/submit/${this.editId}`, { version: this.record.version }); this.$message.success('已提交审核'); await this.loadDetail(); await this.load(); } catch (e) { this.$message.error(e.msg || e.message || '提交失败'); } finally { this.saving = false; } },
    async withdraw() { this.saving = true; try { await merchantWrite(`application/withdraw/${this.record.pending.id}`, { version: this.record.pending.version }); this.$message.success('已撤回，可以继续修改'); await this.loadDetail(); await this.load(); } catch (e) { this.$message.error(e.msg || e.message || '撤回失败'); } finally { this.saving = false; } },
    products(row) { this.$router.push({ name: 'product_productList', query: { seller_shop_id: row.id } }); },
    async action(row, command) { if (command === 'history') return this.open(row, false, 'history'); try { if (command === 'export') { saveBlob(await merchantFile(`shop/export/${row.id}`), `${row.name}-资料包.zip`); return; } await this.$confirm(`确定将“${row.name}”调整为${stateNames[command]}？`, '经营状态', { type: 'warning' }); await merchantWrite(`shop/status/${row.id}`, { state: command, version: row.version }); this.$message.success('经营状态已更新'); await this.load(); } catch (e) { if (e !== 'cancel' && e !== 'close') this.$message.error(e.msg || e.message || '操作失败'); } },
  },
};
</script>
<style lang="scss" src="./merchant.scss"></style>
<style scoped>
.mb16 { margin-bottom: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.toolbar strong { font-size: 16px; color: #344054; font-weight: 600; }
.merchant-count { display: inline-block; margin-left: 12px; font-size: 12px; color: #8b96a7; }
.muted { font-size: 12px; color: #98a2b2; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.merchant-name { display: flex; align-items: center; flex-wrap: nowrap; gap: 12px; width: 100%; min-width: 0; }
.merchant-avatar { display: flex; align-items: center; justify-content: center; flex: 0 0 36px; width: 36px; height: 36px; background: #eff4ff; color: #7596dd; font-size: 20px; border-radius: 7px; }
.merchant-avatar img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.merchant-identity { min-width: 0; flex: 1; overflow: hidden; }
.merchant-name-link { display: block; width: 100%; min-width: 0; padding: 0; border: 0; background: none; color: #344054; font: inherit; font-weight: 600; line-height: 22px; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.merchant-name-link:hover { color: #3375ec; }
.merchant-name-link:focus-visible,.merchant-number-link:focus-visible { outline: 2px solid #8db2ff; outline-offset: 2px; }
.merchant-type-label { display: inline-block; max-width: 100%; padding: 1px 7px; background: #f3f5f9; color: #68768d; border-radius: 4px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
.merchant-tag-strip { display: flex; align-items: center; gap: 5px; min-width: 0; white-space: nowrap; }
.merchant-tag-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: #71819b; font-size: 12px; }
.merchant-tag-more { flex: 0 0 auto; color: #8d9ab0; background: #f3f5f9; padding: 0 5px; border-radius: 3px; font-size: 11px; }
.merchant-number-link { display: inline-flex; border: 0; background: none; padding: 0; color: #4078e8; font: inherit; font-weight: 500; cursor: pointer; }
.merchant-state { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: #99a2b0; font-size: 12px; }
.merchant-state:before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.merchant-state.is-open { color: #23a56d; }.merchant-state.is-preparing,.merchant-state.is-paused { color: #b98c3b; }
</style>
