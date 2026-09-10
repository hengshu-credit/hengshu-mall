<template>
  <view class="merchant-entry">
    <view class="entry-heading"><view class="entry-title">商户入驻</view><view class="entry-intro">填写主体资料并上传电子合同，提交后可查看审核进度。</view></view>
    <view class="entry-tabs"><view :class="{ active: tab === 'form' }" @click="tab = 'form'">入驻资料</view><view :class="{ active: tab === 'records' }" @click="showRecords">我的申请</view></view>
    <view v-if="error" class="entry-error" @click="initialize">{{ error }} · 点击重试</view>
    <view v-if="tab === 'records'">
      <view v-for="item in records" :key="item.id" class="entry-card" @click="loadApplication(item.id)"><view class="record-title">{{ item.name }}<text>{{ statusNames[item.status] || item.status }}</text></view><view class="muted">{{ item.subject_name }}</view><view v-if="item.opinion" class="opinion">审核意见：{{ item.opinion }}</view></view>
      <view v-if="!records.length" class="entry-card muted">暂无申请记录</view>
      <button v-if="records.length < total" class="secondary" @click="moreRecords">加载更多</button>
      <button class="primary" @click="newApplication">新增申请</button>
    </view>
    <view v-else>
      <view v-if="applicationId" class="entry-card"><view>申请 #{{ applicationId }} · {{ statusNames[status] }}</view><view v-if="opinion" class="opinion">审核意见：{{ opinion }}</view></view>
      <view class="entry-card">
        <view class="section-title">基础资料</view>
        <view class="field"><text>商户名称 *</text><input v-model="form.name" :disabled="locked" maxlength="120" placeholder="请输入商户名称" /></view>
        <view class="field"><text>商户类型 *</text><picker :range="types" range-key="name" :disabled="locked" @change="chooseType"><view class="picker-value">{{ typeName || '请选择类型' }}</view></picker></view>
        <view class="field"><text>主体类别 *</text><picker :range="subjectOptions" range-key="name" :disabled="locked" @change="chooseSubject"><view class="picker-value">{{ subjectName }}</view></picker></view>
      </view>
      <view v-for="section in sections" :key="section.title" class="entry-card"><view class="section-title">{{ section.title }}</view><view v-for="field in section.fields" :key="field[0]" class="field"><text>{{ field[1] }}{{ field[2] ? ' *' : '' }}</text><input v-model="form[field[0]]" :disabled="locked" :maxlength="250" :placeholder="field[3] || '请输入' + field[1]" /></view></view>
      <view class="entry-card">
        <view class="section-title">电子合同与证照</view><view class="muted">电子合同和主体证照各至少一份，支持 PDF 或图片，单份不超过20MB。</view>
        <view v-if="!locked" class="file-actions"><picker :range="fileKinds" range-key="name" @change="fileKind = fileKinds[$event.detail.value].key"><view class="file-kind">{{ fileKindName }} ▾</view></picker><button size="mini" :loading="uploading" @click="chooseFile">上传文件</button></view>
        <view v-for="doc in selectedDocuments" :key="doc.id" class="document-row"><text>{{ doc.name }}</text><text v-if="!locked" class="remove" @click="removeFile(doc.id)">移除</text></view>
      </view>
      <view class="entry-actions"><button v-if="!locked" :loading="busy" class="secondary" @click="save(false)">保存草稿</button><button v-if="!locked" :loading="busy" class="primary" @click="save(true)">提交审核</button><button v-if="status === 'submitted'" :loading="busy" class="secondary" @click="withdraw">撤回并修改</button></view>
    </view>
  </view>
</template>
<script>
import { merchantConfig, merchantApplications, merchantApplication, saveMerchantApplication, submitMerchantApplication, withdrawMerchantApplication, uploadMerchantFile, merchantKey } from '@/api/merchant';
const sections = [
  { title: '主体身份', fields: [['subject_name', '主体全称', true], ['identity_number', '信用代码／证件号码', true], ['representative', '法定代表人／经营者', true], ['representative_title', '职务'], ['representative_phone', '代表人联系电话'], ['registered_address', '登记住所', true], ['valid_until', '证件有效期', false, '长期或 YYYY-MM-DD']] },
  { title: '地址与联系方式', fields: [['business_address', '实际经营地址', true], ['contact_name', '联系人', true], ['contact_phone', '联系电话', true], ['contact_email', '邮箱'], ['contact_address', '联系地址']] },
  { title: '结算账户（可后补）', fields: [['bank_holder', '账户户名'], ['bank_name', '开户银行'], ['bank_branch', '开户支行'], ['bank_account', '银行账号']] },
];
const empty = () => { const value = { name: '', type_id: 0, subject_kind: 'company', document_ids: [], tag_ids: [] }; sections.forEach(section => section.fields.forEach(field => { value[field[0]] = ''; })); return value; };
export default {
  data() { return { sections, types: [], form: empty(), tab: 'form', error: '', busy: false, uploading: false, applicationId: 0, version: 0, status: 'draft', opinion: '', documents: [], records: [], page: 1, total: 0, fileKind: 'contract', saveKey: '', saveFingerprint: '', statusNames: { draft: '草稿', submitted: '待审核', approved: '已通过', rejected: '已驳回', supplement: '待补充', withdrawn: '已撤回', cancelled: '已结束' }, subjectOptions: [{ key: 'company', name: '企业法人' }, { key: 'organization', name: '其他组织' }, { key: 'individual', name: '个体工商户' }, { key: 'person', name: '自然人' }], fileKinds: [{ key: 'contract', name: '电子合同' }, { key: 'license', name: '营业执照／登记证明' }, { key: 'identity', name: '身份证明' }, { key: 'qualification', name: '专项资质' }] }; },
  computed: { locked() { return this.status === 'submitted' || this.status === 'approved'; }, typeName() { const type = this.types.find(item => Number(item.id) === Number(this.form.type_id)); return type ? type.name : ''; }, subjectName() { const option = this.subjectOptions.find(item => item.key === this.form.subject_kind); return option ? option.name : ''; }, fileKindName() { return this.fileKinds.find(item => item.key === this.fileKind).name; }, selectedDocuments() { return this.documents.filter(item => this.form.document_ids.includes(Number(item.id))); } },
  onLoad() { this.initialize(); },
  methods: {
    message(error) { uni.showToast({ title: typeof error === 'string' ? error : error.msg || error.message || '操作失败', icon: 'none' }); },
    async initialize() { this.error = ''; try { const { data } = await merchantConfig(); this.types = data.types; } catch (e) { this.error = typeof e === 'string' ? e : e.msg || '请登录后重试'; } },
    chooseType(event) { this.form.type_id = Number(this.types[event.detail.value].id); }, chooseSubject(event) { this.form.subject_kind = this.subjectOptions[event.detail.value].key; },
    newApplication() { this.form = empty(); this.applicationId = 0; this.version = 0; this.status = 'draft'; this.opinion = ''; this.documents = []; this.tab = 'form'; this.saveFingerprint = ''; },
    async showRecords() { this.tab = 'records'; this.page = 1; try { const { data } = await merchantApplications(1); this.records = data.list; this.total = data.count; } catch (e) { this.message(e); } },
    async moreRecords() { try { const { data } = await merchantApplications(this.page + 1); this.page++; this.records = this.records.concat(data.list); this.total = data.count; } catch (e) { this.message(e); } },
    async loadApplication(id) { try { const { data } = await merchantApplication(id); this.applicationId = Number(id); this.version = Number(data.version); this.form = { ...empty(), ...data.profile }; this.documents = data.documents; this.status = data.status; this.opinion = data.opinion; this.tab = 'form'; this.saveFingerprint = ''; } catch (e) { this.message(e); } },
    async save(submit) { if (this.busy || this.uploading) return; if (!this.form.name || !this.form.type_id) return this.message('请填写商户名称并选择类型'); this.busy = true; try { const fingerprint = JSON.stringify([this.applicationId, this.version, this.form]); if (fingerprint !== this.saveFingerprint) { this.saveFingerprint = fingerprint; this.saveKey = merchantKey(); } const { data } = await saveMerchantApplication(this.applicationId, this.form, this.version, this.saveKey); this.applicationId = Number(data.id); this.version = Number(data.version); if (submit) { await submitMerchantApplication(this.applicationId, this.version); this.message('已提交审核'); } else this.message('草稿已保存'); await this.loadApplication(this.applicationId); } catch (e) { this.message(e); } finally { this.busy = false; } },
    async withdraw() { if (this.busy) return; this.busy = true; try { await withdrawMerchantApplication(this.applicationId, this.version); await this.loadApplication(this.applicationId); this.message('已撤回，可以继续修改'); } catch (e) { this.message(e); } finally { this.busy = false; } },
    removeFile(id) { this.form.document_ids = this.form.document_ids.filter(value => Number(value) !== Number(id)); },
    chooseFile() { if (this.uploading) return; const success = res => { const item = res.tempFiles && res.tempFiles[0]; const path = item && (item.path || item.tempFilePath) || res.tempFilePaths && res.tempFilePaths[0]; if (path) this.upload(path); }; if (typeof uni.chooseFile === 'function') uni.chooseFile({ count: 1, extension: ['pdf', 'jpg', 'jpeg', 'png', 'webp'], success }); else if (typeof uni.chooseMessageFile === 'function') uni.chooseMessageFile({ count: 1, type: 'file', success }); else uni.chooseImage({ count: 1, success }); },
    async upload(path) { this.uploading = true; try { const doc = await uploadMerchantFile(path, this.fileKind); this.documents.push(doc); this.form.document_ids.push(Number(doc.id)); this.message('文件已上传'); } catch (e) { this.message(e); } finally { this.uploading = false; } },
  },
};
</script>
<style scoped>
.merchant-entry { min-height: 100vh; background: #f5f7fa; padding: 28rpx 24rpx 70rpx; color: #303133; }.entry-heading { padding: 10rpx 8rpx 28rpx; }.entry-title { font-size: 40rpx; font-weight: 600; }.entry-intro { font-size: 24rpx; color: #7a8699; margin-top: 14rpx; line-height: 1.7; }.entry-tabs { display: flex; background: #fff; border-radius: 12rpx; overflow: hidden; margin-bottom: 24rpx; }.entry-tabs view { flex: 1; text-align: center; padding: 26rpx; color: #909399; }.entry-tabs .active { color: #3375ec; border-bottom: 4rpx solid #3375ec; }.entry-card { background: #fff; border-radius: 14rpx; padding: 28rpx; margin-bottom: 24rpx; }.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }.field { padding: 20rpx 0; border-bottom: 1px solid #f2f3f5; }.field text { display: block; font-size: 25rpx; margin-bottom: 15rpx; color: #606266; }.field input,.picker-value { min-height: 48rpx; font-size: 28rpx; }.muted { color: #909399; font-size: 24rpx; line-height: 1.8; }.file-actions,.document-row { display: flex; justify-content: space-between; align-items: center; gap: 15rpx; margin-top: 22rpx; }.file-actions button { margin: 0; }.file-kind { font-size: 25rpx; color: #3375ec; }.document-row { font-size: 25rpx; overflow-wrap: anywhere; }.remove { color: #f56c6c; white-space: nowrap; }.entry-actions { display: flex; gap: 20rpx; }.entry-actions button { flex: 1; font-size: 28rpx; }.primary { background: #3375ec; color: #fff; }.secondary { background: #fff; color: #3375ec; }.record-title { font-weight: 600; margin-bottom: 15rpx; }.record-title text { float: right; color: #3375ec; font-size: 25rpx; }.opinion { margin-top: 20rpx; font-size: 25rpx; color: #b57724; }.entry-error { color: #e65a51; padding: 20rpx; }
</style>
