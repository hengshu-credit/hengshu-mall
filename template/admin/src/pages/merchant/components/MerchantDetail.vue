<template>
  <article class="merchant-detail">
    <header class="detail-overview">
      <div class="detail-avatar"><img v-if="value.logo" :src="value.logo" alt="商户Logo" /><i v-else class="el-icon-s-shop" aria-hidden="true" /></div>
      <div class="detail-heading">
        <h2 :title="value.name">{{ display(value.name) }}</h2>
        <p :title="value.subject_name">{{ display(value.subject_name) }}</p>
        <div class="detail-badges">
          <span class="detail-type">{{ typeName }}</span>
          <span v-if="meta.state" class="detail-status" :class="'is-' + meta.state">{{ stateNames[meta.state] }}</span>
          <span v-if="meta.audit_status" class="detail-audit">{{ auditNames[meta.audit_status] || meta.audit_status }}</span>
        </div>
      </div>
      <div v-if="meta.code" class="detail-code"><span>商户ID</span><strong>{{ meta.code }}</strong></div>
    </header>

    <section class="detail-section">
      <h3>基础信息</h3>
      <dl class="detail-grid">
        <div class="detail-row"><dt>商户名称</dt><dd>{{ display(value.name) }}</dd></div>
        <div class="detail-row"><dt>商户类型</dt><dd>{{ typeName }}</dd></div>
        <div class="detail-row"><dt>主体类别</dt><dd>{{ subjectNames[value.subject_kind] || '—' }}</dd></div>
        <div class="detail-row"><dt>商户标签</dt><dd class="detail-tags"><template v-if="selectedTags.length"><span v-for="tag in selectedTags" :key="tag.id" class="detail-tag" :title="tag.name">{{ tag.name }}</span></template><span v-else class="detail-empty">—</span></dd></div>
        <div v-if="meta.created_at" class="detail-row"><dt>创建时间</dt><dd>{{ formatTime(meta.created_at) }}</dd></div>
        <div v-if="meta.updated_at" class="detail-row"><dt>最近更新</dt><dd>{{ formatTime(meta.updated_at) }}</dd></div>
      </dl>
    </section>

    <section v-for="section in sections" :key="section.title" class="detail-section">
      <h3>{{ section.title }}</h3>
      <dl class="detail-grid">
        <div v-for="field in section.fields" :key="field[0]" class="detail-row" :class="{ 'is-wide': field[3] === 'textarea' || field[0].includes('address') }">
          <dt>{{ field[1] }}</dt><dd :class="{ 'detail-empty': !hasValue(value[field[0]]) }">{{ display(value[field[0]]) }}</dd>
        </div>
      </dl>
    </section>

    <section class="detail-section">
      <h3>补充说明</h3>
      <dl class="detail-grid">
        <div class="detail-row is-wide"><dt>简介</dt><dd :class="{ 'detail-empty': !value.description }">{{ display(value.description) }}</dd></div>
        <div class="detail-row is-wide"><dt>内部备注</dt><dd :class="{ 'detail-empty': !value.remark }">{{ display(value.remark) }}</dd></div>
      </dl>
    </section>

    <section class="detail-section">
      <div class="detail-section-heading"><h3>电子合同与资质</h3><span>{{ selectedDocuments.length }} 份文件</span></div>
      <div v-if="!selectedDocuments.length" class="detail-files-empty"><i class="el-icon-document" aria-hidden="true" />暂无文件</div>
      <ul v-else class="detail-files">
        <li v-for="doc in selectedDocuments" :key="doc.id" class="detail-file">
          <div class="detail-file-icon"><i :class="doc.mime && doc.mime.startsWith('image/') ? 'el-icon-picture-outline' : 'el-icon-document'" aria-hidden="true" /></div>
          <div class="detail-file-info"><span class="detail-file-name" :title="doc.name">{{ doc.name }}</span><span class="detail-file-meta">{{ docNames[doc.kind] || '资料文件' }} · {{ formatTime(doc.created_at) }}</span></div>
          <div v-if="canFiles" class="detail-file-actions"><el-button type="text" size="small" @click="preview(doc)">预览</el-button><el-button type="text" size="small" @click="download(doc)">下载</el-button></div>
          <span v-else class="detail-file-meta">暂无查看权限</span>
        </li>
      </ul>
    </section>
    <el-dialog title="文件预览" :visible.sync="previewOpen" append-to-body width="85%" @closed="clearPreview">
      <iframe v-if="previewUrl && previewMime === 'application/pdf'" :src="previewUrl" sandbox="allow-scripts" class="detail-file-preview" title="PDF资料预览" />
      <img v-else-if="previewUrl" :src="previewUrl" class="detail-image-preview" alt="资料原文件" />
    </el-dialog>
  </article>
</template>
<script>
import { merchantFile, saveBlob } from '@/api/merchant';
import { sections, subjectNames, stateNames, auditNames, docNames, formatTime } from '../fields';
export default {
  name: 'MerchantDetail',
  props: { value: { type: Object, required: true }, meta: { type: Object, default: () => ({}) }, types: { type: Array, default: () => [] }, tags: { type: Array, default: () => [] }, documents: { type: Array, default: () => [] }, canFiles: Boolean },
  data() { return { sections, subjectNames, stateNames, auditNames, docNames, previewOpen: false, previewUrl: '', previewMime: '' }; },
  computed: {
    typeName() { const type = this.types.find((item) => Number(item.id) === Number(this.value.type_id)); return type ? type.name : this.meta.type_name || '—'; },
    selectedTags() { return (this.value.tag_ids || []).map((id) => this.tags.find((tag) => Number(tag.id) === Number(id)) || { id, name: `标签 #${id}` }); },
    selectedDocuments() { return (this.value.document_ids || []).map((id) => this.documents.find((doc) => Number(doc.id) === Number(id)) || { id, name: `文件 #${id}`, kind: '', created_at: 0 }); },
  },
  beforeDestroy() { this.clearPreview(); },
  methods: {
    formatTime,
    hasValue(value) { return value !== null && value !== undefined && value !== ''; },
    display(value) { return this.hasValue(value) ? String(value) : '—'; },
    async download(doc) { if (!this.canFiles) return; try { saveBlob(await merchantFile(`document/${doc.id}`), doc.name); } catch (e) { this.$message.error(e.msg || e.message || '下载失败'); } },
    async preview(doc) { if (!this.canFiles) return; try { this.clearPreview(); const blob = await merchantFile(`document/${doc.id}?preview=1`); this.previewUrl = URL.createObjectURL(blob); this.previewMime = blob.type; this.previewOpen = true; } catch (e) { this.$message.error(e.msg || e.message || '预览失败'); } },
    clearPreview() { if (this.previewUrl) URL.revokeObjectURL(this.previewUrl); this.previewUrl = ''; },
  },
};
</script>
<style scoped>
.merchant-detail { color: #303b4d; }
.detail-overview { display: flex; align-items: center; gap: 18px; padding: 24px; background: #f7f9fc; border: 1px solid #edf0f5; border-radius: 8px; margin-bottom: 8px; }
.detail-avatar { width: 60px; height: 60px; flex: 0 0 60px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: #eaf0ff; color: #3c72ea; font-size: 29px; }
.detail-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.detail-heading { flex: 1; min-width: 0; }.detail-heading h2 { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.detail-heading p { color: #8590a1; margin: 4px 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
.detail-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 12px; }.detail-type,.detail-audit { color: #64748b; background: #edf1f6; padding: 3px 8px; border-radius: 4px; }.detail-type { background: #eaf0ff; color: #4374d8; }
.detail-status { color: #8993a4; display: inline-flex; align-items: center; gap: 5px; }.detail-status:before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.detail-status.is-open { color: #23a56d; }.detail-status.is-preparing,.detail-status.is-paused { color: #be8b2d; }
.detail-code { text-align: right; flex: 0 0 auto; font-size: 12px; color: #98a2b2; }.detail-code strong { display: block; margin-top: 7px; font-size: 13px; color: #657184; font-weight: 500; }
.detail-section { padding: 24px 4px; border-bottom: 1px solid #edf0f5; }.detail-section:last-of-type { border-bottom: 0; }.detail-section h3 { margin: 0 0 20px; font-size: 15px; font-weight: 600; color: #344054; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 36px; margin: 0; }.detail-row { display: flex; min-width: 0; line-height: 1.7; font-size: 13px; }.detail-row.is-wide { grid-column: 1 / -1; }.detail-row dt { flex: 0 0 142px; color: #929baa; }.detail-row dd { margin: 0; flex: 1; min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere; }.detail-empty { color: #b8bec8; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }.detail-tag { color: #66748c; background: #f2f5fa; padding: 0 8px; border-radius: 4px; }
.detail-section-heading { display: flex; align-items: baseline; justify-content: space-between; }.detail-section-heading>span { font-size: 12px; color: #98a2b2; }.detail-files { list-style: none; padding: 0; margin: 0; }.detail-files-empty { display: flex; align-items: center; gap: 8px; background: #fafbfc; color: #a3acb9; border-radius: 6px; padding: 22px 16px; font-size: 13px; }
.detail-file { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #edf0f5; border-radius: 6px; margin-bottom: 10px; }.detail-file-icon { flex: 0 0 38px; height: 42px; background: #eef3ff; color: #5884df; display: flex; align-items: center; justify-content: center; font-size: 23px; border-radius: 5px; }.detail-file-info { min-width: 0; flex: 1; }.detail-file-name { display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.detail-file-meta { display: block; margin-top: 5px; color: #99a3b2; font-size: 12px; }.detail-file-actions { display: flex; flex-wrap: nowrap; gap: 14px; flex: 0 0 auto; }.detail-file-actions .el-button { margin: 0; white-space: nowrap; }
.detail-file-preview { width: 100%; height: 68vh; border: 0; }.detail-image-preview { max-width: 100%; max-height: 70vh; display: block; margin: auto; }
@media (max-width: 700px) { .detail-overview { padding: 18px; gap: 12px; }.detail-code { display: none; }.detail-grid { grid-template-columns: minmax(0,1fr); gap: 16px; }.detail-row dt { flex-basis: 125px; }.detail-heading h2 { font-size: 18px; }.detail-file { padding: 12px; gap: 10px; } }
</style>
