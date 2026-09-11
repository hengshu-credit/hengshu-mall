<template>
  <el-dialog :title="isClaim ? '认领商品' : '分配商户'" :visible="visible" width="min(920px, 96%)" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" @close="close">
    <div class="assignment-summary">
      <template v-if="isClaim"><span class="assignment-label">认领商户</span><strong>{{ shop.name }}</strong><span class="assignment-muted">{{ shop.code }}</span></template>
      <template v-else><span class="assignment-label">目标商户</span><merchant-select v-model="targetId" clearable :empty-value="0" placeholder="未选择则取消商户归属" /><span class="assignment-muted">可取消归属，商品仍可上架</span></template>
    </div>
    <p class="assignment-note">分配与认领以最后一次成功操作为准，可覆盖已有归属。历史订单保留原商户。</p>
    <el-form v-if="isClaim" inline size="small" class="assignment-search" @submit.native.prevent="search">
      <el-form-item><el-input v-model="keyword" clearable placeholder="商品名称 / 商品ID" @keyup.enter.native="search" /></el-form-item>
      <el-form-item><el-select v-model="owner" @change="search"><el-option label="全部商品" value="" /><el-option label="未分配商户" value="0" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" @click="search">查询</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="assignment-error" />
    <el-table ref="products" v-loading="loading" :data="isClaim ? rows : products" row-key="id" max-height="390" size="small" empty-text="暂无可选商品" @selection-change="selectionChanged">
      <el-table-column v-if="isClaim" type="selection" width="45" :reserve-selection="true" />
      <el-table-column prop="id" label="商品ID" width="85" />
      <el-table-column label="商品名称" min-width="240" show-overflow-tooltip><template slot-scope="{ row }"><div class="assignment-product"><img v-if="row.image" :src="row.image" alt="" /><span>{{ row.store_name }}</span></div></template></el-table-column>
      <el-table-column label="当前商户" min-width="150" show-overflow-tooltip><template slot-scope="{ row }">{{ row.merchant_name || '未分配' }}</template></el-table-column>
      <el-table-column label="状态" width="85"><template slot-scope="{ row }"><span :class="Number(row.is_show) ? 'assignment-open' : 'assignment-muted'">{{ Number(row.is_show) ? '已上架' : '已下架' }}</span></template></el-table-column>
    </el-table>
    <div class="assignment-pagination">
      <span>已选择 <strong>{{ chosen.length }}</strong> 件商品<span v-if="isClaim" class="assignment-muted">（支持跨页选择，最多 200 件）</span></span>
      <el-button v-if="isClaim && chosen.length" type="text" size="small" @click="clearSelection">清空选择</el-button>
      <el-pagination v-if="isClaim" :current-page.sync="page" :page-size="20" :total="count" layout="prev, pager, next" @current-change="load" />
    </div>
    <span slot="footer"><el-button :disabled="saving" @click="close">取消</el-button><el-button type="primary" :loading="saving" :disabled="!chosen.length || chosen.length > 200 || loading" @click="submit">{{ isClaim ? '确认认领' : '确认分配' }}</el-button></span>
  </el-dialog>
</template>
<script>
import MerchantSelect from '../../../components/merchantSelect/index.vue';
import { merchantGet, merchantWrite, operationKey } from '@/api/merchant';
export default {
  name: 'MerchantProductAssignment', components: { MerchantSelect },
  props: { visible: Boolean, mode: { type: String, default: 'assign' }, shop: { type: Object, default: () => ({}) }, products: { type: Array, default: () => [] } },
  data() { return { targetId: 0, keyword: '', owner: '', page: 1, rows: [], count: 0, selected: [], loading: false, saving: false, error: '', sequence: 0, requestKey: '', fingerprint: '' }; },
  computed: { isClaim() { return this.mode === 'claim'; }, chosen() { return this.isClaim ? this.selected : this.products; } },
  watch: { visible: { immediate: true, handler(open) { if (!open) { this.sequence++; return; } this.error = ''; this.targetId = this.isClaim ? Number(this.shop.id) : (this.products.length === 1 ? Number(this.products[0].seller_shop_id) || 0 : 0); if (this.isClaim) this.load(); } } },
  beforeDestroy() { this.sequence++; },
  methods: {
    close() { if (!this.saving) this.$emit('update:visible', false); },
    search() { this.page = 1; this.load(); },
    selectionChanged(rows) { this.selected = rows; },
    clearSelection() { if (this.$refs.products) this.$refs.products.clearSelection(); },
    async load() { const sequence = ++this.sequence; this.loading = true; this.error = ''; try { const { data } = await merchantGet('product/candidates', { keyword: this.keyword, owner: this.owner, page: this.page, limit: 20 }); if (sequence === this.sequence) { this.rows = data.list; this.count = data.count; } } catch (e) { if (sequence === this.sequence) { this.error = e.msg || e.message || '商品读取失败'; this.rows = []; } } finally { if (sequence === this.sequence) this.loading = false; } },
    async submit() {
      if (this.saving || !this.chosen.length || this.chosen.length > 200) return;
      const payload = { product_ids: this.chosen.map(row => Number(row.id)).sort((a, b) => a - b), shop_id: this.isClaim ? Number(this.shop.id) : this.targetId || 0, entry: this.isClaim ? 'claim' : 'assign' };
      const fingerprint = JSON.stringify(payload);
      if (fingerprint !== this.fingerprint) { this.fingerprint = fingerprint; this.requestKey = operationKey(); }
      this.saving = true; this.error = '';
      try { const { data } = await merchantWrite('product/assign', { ...payload, request_key: this.requestKey }); this.$message.success(data.changed ? `已更新 ${data.changed} 件商品归属` : '所选商品已属于该商户'); this.$emit('success', data); this.$emit('update:visible', false); }
      catch (e) { this.error = e.msg || e.message || '操作失败，请重试'; }
      finally { this.saving = false; }
    },
  },
};
</script>
<style scoped>
.assignment-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 18px; border-radius: 6px; background: #f7f9fc; }.assignment-label { color: #7b8698; }.assignment-summary strong { color: #344054; font-size: 16px; }.assignment-summary .merchant-select { width: 280px; }.assignment-muted { color: #98a2b3; font-size: 12px; }.assignment-note { color: #7b8698; font-size: 12px; margin: 16px 0; }.assignment-search .el-form-item { margin-bottom: 14px; }.assignment-error { margin-bottom: 14px; }.assignment-product { display: flex; align-items: center; gap: 12px; min-width: 0; }.assignment-product img { width: 34px; height: 34px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }.assignment-product span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.assignment-open { color: #23a56d; font-size: 12px; }.assignment-pagination { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 16px; font-size: 13px; }.assignment-pagination strong { color: #3375ec; }.assignment-pagination .el-pagination { margin-left: auto; }
</style>
