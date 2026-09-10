<template>
  <el-card shadow="never" class="dictionary-page">
    <div class="toolbar"><div><h3>{{ title }}</h3><p class="help">{{ kind === 'type' ? '类型用于单选分类，不影响商户的经营身份、权限和结算。' : '标签用于运营分组，可为每个商户设置多个标签。' }}</p></div><el-button v-if="permissions[kind + '-save']" type="primary" size="small" @click="edit()">新增{{ noun }}</el-button></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-table v-loading="loading" :data="rows" row-key="id" empty-text="暂无数据">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="名称" min-width="150"><template slot-scope="{ row }"><el-tag v-if="kind === 'tag'" :style="{ color: row.color }">{{ row.name }}</el-tag><span v-else>{{ row.name }}</span></template></el-table-column>
      <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
      <el-table-column prop="sort" label="排序" width="85" />
      <el-table-column prop="merchant_count" label="关联商户" width="105" />
      <el-table-column label="状态" width="90"><template slot-scope="{ row }"><el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag></template></el-table-column>
      <el-table-column v-if="kind === 'type'" label="允许入驻选择" width="115"><template slot-scope="{ row }">{{ row.apply_selectable ? '是' : '否' }}</template></el-table-column>
      <el-table-column label="操作" width="140"><template slot-scope="{ row }"><el-button v-if="permissions[kind + '-save']" type="text" @click="edit(row)">编辑</el-button><el-button v-if="permissions[kind + '-delete']" type="text" :disabled="!!row.merchant_count" @click="remove(row)">删除</el-button></template></el-table-column>
    </el-table>
    <el-dialog :title="(form.id ? '编辑' : '新增') + noun" :visible.sync="dialog" width="560px" :close-on-click-modal="false" append-to-body>
      <el-form label-width="130px" @submit.native.prevent>
        <el-form-item label="名称" required><el-input v-model="form.name" maxlength="80" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" maxlength="1000" /></el-form-item>
        <el-form-item v-if="kind === 'tag'" label="颜色"><el-color-picker v-model="form.color" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" :max="999999" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item v-if="kind === 'type'" label="允许入驻选择"><el-switch v-model="form.apply_selectable" :active-value="1" :inactive-value="0" /></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="dialog = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></span>
    </el-dialog>
  </el-card>
</template>
<script>
import { merchantGet, merchantWrite } from '@/api/merchant';
export default {
  name: 'MerchantDictionary', props: { kind: { type: String, required: true } },
  data() { return { rows: [], permissions: {}, loading: false, error: '', dialog: false, saving: false, form: {}, sequence: 0 }; },
  computed: { noun() { return this.kind === 'type' ? '类型' : '标签'; }, title() { return '商户' + this.noun; } },
  watch: { kind: { immediate: true, handler() { this.dialog = false; this.load(); } } },
  methods: {
    async load() { const seq = ++this.sequence; this.loading = true; this.error = ''; try { const results = await Promise.all([merchantGet('config'), merchantGet(`${this.kind}/list`)]); if (seq === this.sequence) { this.permissions = results[0].data.permissions; this.rows = results[1].data; } } catch (e) { if (seq === this.sequence) this.error = e.msg || e.message || '读取失败'; } finally { if (seq === this.sequence) this.loading = false; } },
    edit(row) { this.form = row ? { ...row } : { id: 0, version: 0, name: '', description: '', sort: 0, status: 1, apply_selectable: 1, color: '#409EFF' }; this.dialog = true; },
    async save() { if (!this.form.name.trim()) return this.$message.error('请输入名称'); this.saving = true; try { await merchantWrite(`${this.kind}/save/${this.form.id}`, { profile: this.form, version: this.form.version }); this.dialog = false; this.$message.success('已保存'); await this.load(); } catch (e) { this.$message.error(e.msg || e.message || '保存失败'); } finally { this.saving = false; } },
    async remove(row) { try { await this.$confirm(`确定删除“${row.name}”？`, '删除' + this.noun, { type: 'warning' }); await merchantWrite(`${this.kind}/delete/${row.id}`, { version: row.version }, 'delete'); this.$message.success('已删除'); await this.load(); } catch (e) { if (e !== 'cancel' && e !== 'close') this.$message.error(e.msg || e.message || '删除失败'); } },
  },
};
</script>
<style scoped>.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }.toolbar h3 { margin: 0 0 10px; font-size: 16px; }.help { color: #909399; font-size: 12px; margin: 0; }</style>
