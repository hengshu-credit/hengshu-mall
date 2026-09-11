export const stateNames = { preparing: '待开业', open: '营业中', paused: '暂停营业', closed: '已关闭' };
export const auditNames = { draft: '草稿', submitted: '待审核', approved: '已通过', rejected: '已驳回', supplement: '待补充', withdrawn: '已撤回', cancelled: '已结束' };
export const eventNames = { create: '创建', change: '修改信息', product_assignment: '商品归属调整', submit: '提交审核', audit: '审核', withdraw: '撤回', state: '状态调整', dictionary: '分类字典调整', export: '资料导出' };
export const subjectNames = { company: '企业法人', organization: '其他组织', individual: '个体工商户', person: '自然人' };
export const docNames = { contract: '电子合同', license: '营业执照／登记证明', identity: '身份证明', qualification: '专项资质' };
export const sections = [
  { title: '主体身份', fields: [
    ['subject_name', '主体全称', true], ['identity_number', '信用代码／证件号码', true, 'sensitive'],
    ['representative', '法定代表人／经营者', true], ['representative_title', '职务'], ['representative_phone', '代表人联系电话'],
    ['registered_address', '登记住所', true], ['registration_authority', '登记机关'], ['business_scope', '经营范围', false, 'textarea'],
    ['established_date', '成立日期', false, '', 'YYYY-MM-DD'], ['valid_until', '证件有效期', false, '', '长期或 YYYY-MM-DD'],
  ] },
  { title: '地址与联系方式', fields: [
    ['business_address', '实际经营地址', true], ['contact_name', '联系人', true], ['contact_phone', '联系电话', true],
    ['contact_email', '邮箱'], ['contact_address', '联系地址'], ['postal_code', '邮编'], ['service_phone', '客服电话'],
  ] },
  { title: '结算账户', fields: [
    ['bank_holder', '账户户名'], ['bank_kind', '账户类型', false, '', '对公／个人'], ['bank_name', '开户银行'],
    ['bank_branch', '开户支行'], ['bank_account', '银行账号', false, 'sensitive'],
  ] },
];
export function emptyMerchant(types = []) {
  const selected = types.find((item) => item.status);
  const data = { name: '', type_id: selected ? selected.id : 0, tag_ids: [], subject_kind: 'company', logo: '', description: '', remark: '', document_ids: [] };
  sections.forEach((section) => section.fields.forEach(([key]) => { data[key] = ''; }));
  return data;
}
export function formatTime(value) { return value ? new Date(Number(value) * 1000).toLocaleString('zh-CN', { hour12: false }) : '—'; }
