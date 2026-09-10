<template>
  <div class="merchant-form">
    <el-alert v-if="readonly" title="当前展示资料快照" type="info" :closable="false" class="mb16" />
    <el-form :model="value" label-width="155px" :disabled="readonly" @submit.native.prevent>
      <h3>基础资料</h3>
      <el-row :gutter="20">
        <el-col :span="24"><el-form-item label="商户名称" required><el-input :value="value.name" maxlength="120" @input="set('name', $event)" /></el-form-item></el-col>
        <el-col :md="12" :span="24"><el-form-item label="商户类型" required>
          <el-select :value="value.type_id" filterable @change="set('type_id', $event)">
            <el-option v-for="item in types" :key="item.id" :value="Number(item.id)" :label="item.name + (!Number(item.status) ? '（停用）' : '')" :disabled="!Number(item.status) && Number(item.id) !== Number(value.type_id)" />
          </el-select>
        </el-form-item></el-col>
        <el-col :md="12" :span="24"><el-form-item label="商户标签">
          <el-select :value="value.tag_ids" multiple filterable @change="set('tag_ids', $event)">
            <el-option v-for="item in tags" :key="item.id" :value="Number(item.id)" :label="item.name + (!Number(item.status) ? '（停用）' : '')" :disabled="!Number(item.status) && !(value.tag_ids || []).includes(Number(item.id))" />
          </el-select>
        </el-form-item></el-col>
        <el-col :span="24"><el-form-item label="Logo"><el-input :value="value.logo" placeholder="图片地址，可选" @input="set('logo', $event)"><el-button v-if="!readonly" slot="append" @click="chooseLogo">选择图片</el-button></el-input></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="简介"><el-input :value="value.description" type="textarea" :rows="2" maxlength="2000" @input="set('description', $event)" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="内部备注"><el-input :value="value.remark" type="textarea" :rows="2" maxlength="2000" @input="set('remark', $event)" /></el-form-item></el-col>
      </el-row>
      <el-form-item label="主体类别" required>
        <el-select :value="value.subject_kind" @change="set('subject_kind', $event)"><el-option v-for="(name, key) in subjectNames" :key="key" :label="name" :value="key" /></el-select>
      </el-form-item>
      <section v-for="section in sections" :key="section.title">
        <h3>{{ section.title }}</h3>
        <p v-if="section.title === '结算账户'" class="help">账户可以在建档后补充，修改后审核通过才会替换有效资料。</p>
        <el-row :gutter="20">
          <el-col v-for="field in section.fields" :key="field[0]" :md="field[3] === 'textarea' || field[0].includes('address') ? 24 : 12" :span="24">
            <el-form-item :label="field[1]" :required="!!field[2]">
              <el-input :value="value[field[0]]" :type="field[3] === 'textarea' ? 'textarea' : 'text'" :rows="2" :disabled="field[3] === 'sensitive' && !sensitive" :placeholder="field[4] || (field[3] === 'sensitive' && !sensitive ? '需敏感资料权限' : '')" :maxlength="field[3] === 'textarea' ? 2000 : 250" @input="set(field[0], $event)" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>
    </el-form>
    <h3>电子合同与资质</h3>
    <p class="help">上传 PDF、JPG、PNG 或 WebP，每份不超过 20MB。提交审核需要电子合同及主体证照。</p>
    <div v-if="!readonly && canFiles" class="upload-bar">
      <el-select v-model="uploadKind" size="small"><el-option v-for="(name, key) in docNames" :key="key" :label="name" :value="key" /></el-select>
      <el-upload action="" :show-file-list="false" :http-request="upload" :disabled="uploading" accept=".pdf,.jpg,.jpeg,.png,.webp">
        <el-button type="primary" size="small" :loading="uploading">上传文件</el-button>
      </el-upload>
    </div>
    <el-table :data="selectedDocuments" size="small" empty-text="暂无文件">
      <el-table-column label="文件类别" width="145"><template slot-scope="{ row }">{{ docNames[row.kind] }}</template></el-table-column>
      <el-table-column prop="name" label="文件名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="上传时间" width="165"><template slot-scope="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
      <el-table-column label="操作" width="170"><template slot-scope="{ row }">
        <el-button v-if="canFiles" type="text" @click="preview(row)">预览</el-button><el-button v-if="canFiles" type="text" @click="download(row)">下载</el-button>
        <el-button v-if="!readonly" type="text" @click="remove(row)">移除</el-button>
      </template></el-table-column>
    </el-table>
    <el-dialog title="文件预览" :visible.sync="previewOpen" append-to-body width="85%" @closed="clearPreview">
      <iframe v-if="previewUrl && previewMime === 'application/pdf'" :src="previewUrl" sandbox="allow-scripts" class="file-preview" title="PDF资料预览" />
      <img v-else-if="previewUrl" :src="previewUrl" class="image-preview" alt="资料原文件" />
    </el-dialog>
  </div>
</template>
<script>
import { uploadMerchantDocument, merchantFile, saveBlob } from '@/api/merchant';
import { sections, subjectNames, docNames, formatTime } from '../fields';
export default {
  name: 'MerchantForm',
  props: { value: { type: Object, required: true }, types: { type: Array, default: () => [] }, tags: { type: Array, default: () => [] }, documents: { type: Array, default: () => [] }, shopId: { type: Number, default: 0 }, readonly: Boolean, sensitive: Boolean, canFiles: Boolean },
  data() { return { sections, subjectNames, docNames, uploading: false, uploadKind: 'contract', localDocuments: [], previewOpen: false, previewUrl: '', previewMime: '' }; },
  computed: { selectedDocuments() { const map = new Map([...this.documents, ...this.localDocuments].map((item) => [Number(item.id), item])); return (this.value.document_ids || []).map((id) => map.get(Number(id)) || { id, name: `文件 #${id}`, kind: '', created_at: 0 }); } },
  beforeDestroy() { this.clearPreview(); },
  methods: {
    formatTime,
    set(key, value) { this.$emit('input', { ...this.value, [key]: value }); },
    chooseLogo() { this.$imgModal((item) => this.set('logo', item.att_dir)); },
    async upload({ file, onSuccess, onError }) {
      if (this.uploading) return;
      if (file.size > 20 * 1024 * 1024) { const error = new Error('文件不能超过20MB'); this.$message.error(error.message); onError(error); return; }
      this.uploading = true;
      try { const { data } = await uploadMerchantDocument(file, this.uploadKind, this.shopId); this.localDocuments.push(data); this.set('document_ids', [...(this.value.document_ids || []), Number(data.id)]); this.$emit('documents', this.localDocuments); onSuccess(data); }
      catch (error) { this.$message.error(error.msg || error.message || '上传失败'); onError(error); } finally { this.uploading = false; }
    },
    remove(row) { this.set('document_ids', this.value.document_ids.filter((id) => Number(id) !== Number(row.id))); },
    async download(row) { try { saveBlob(await merchantFile(`document/${row.id}`), row.name); } catch (e) { this.$message.error(e.msg || e.message || '下载失败'); } },
    async preview(row) { try { this.clearPreview(); const blob = await merchantFile(`document/${row.id}?preview=1`); this.previewUrl = URL.createObjectURL(blob); this.previewMime = blob.type; this.previewOpen = true; } catch (e) { this.$message.error(e.msg || e.message || '预览失败'); } },
    clearPreview() { if (this.previewUrl) URL.revokeObjectURL(this.previewUrl); this.previewUrl = ''; },
  },
};
</script>
<style scoped>
.merchant-form h3 { font-size: 15px; border-left: 3px solid #409eff; padding-left: 10px; margin: 20px 0; }
.merchant-form .el-select { width: 100%; }
.help { color: #7a8699; font-size: 12px; line-height: 1.8; margin-bottom: 14px; }
.upload-bar { display: flex; gap: 12px; margin-bottom: 14px; }.upload-bar .el-select { width: 190px; }
.file-preview { width: 100%; height: 68vh; border: 0; }.image-preview { max-width: 100%; max-height: 70vh; display: block; margin: auto; }
.mb16 { margin-bottom: 16px; }
</style>
