import dayjs from 'dayjs';

export const emptyRule = () => ({ threshold: undefined, discount: undefined });
export const emptyForm = () => ({
  name: '',
  time_range: [dayjs().format('YYYY-MM-DD HH:mm:ss'), dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss')],
  unit: 1,
  rules_type: 1,
  discount_type: 1,
  rules: [emptyRule()],
  range_type: 0,
  product_ids: [],
  level_ids: [],
  member_type: 'all',
  member_ids: [],
  tag_match: 'any',
  status: 1,
  sort: 50,
});

export function formError(form) {
  if (!form.name.trim() || form.name.trim().length > 60) return '活动名称需为1至60个字符';
  if (
    !form.time_range ||
    form.time_range.length !== 2 ||
    form.time_range.some((value) => !value || !dayjs(value).isValid())
  )
    return '请选择完整的活动起止时间';
  if (!dayjs(form.time_range[1]).isAfter(dayjs(form.time_range[0]))) return '截止时间必须晚于起始时间';
  if (!form.rules.length || form.rules.length > 5 || (!form.rules_type && form.rules.length !== 1))
    return '阶梯优惠需设置1至5级，循环优惠仅支持1级';
  if (!form.rules_type && form.discount_type !== 1) return '循环优惠仅支持减价';
  let previous = 0;
  for (const [index, rule] of form.rules.entries()) {
    const threshold = Number(rule.threshold);
    const discount = Number(rule.discount);
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 99999) return `第${index + 1}级：请填写有效门槛`;
    if (form.unit === 2 && !Number.isInteger(threshold)) return '件数门槛必须为正整数';
    if (threshold <= previous) return '各级门槛须从小到大且不能重复';
    if (!Number.isFinite(discount) || discount <= 0 || discount > 99999) return `第${index + 1}级：请填写有效优惠数值`;
    if (form.discount_type === 2 && (discount < 0.1 || discount > 9.9)) return '折扣范围为0.1至9.9折';
    if (form.discount_type === 1 && form.unit === 1 && discount >= threshold) return '减免金额必须小于门槛金额';
    previous = threshold;
  }
  if (form.range_type && !form.product_ids.length) return '请至少选择一个商品';
  if (form.member_type !== 'all' && !form.member_ids.length) return '请选择适用会员';
  if (
    form.member_type === 'level' &&
    form.level_ids.length &&
    !form.level_ids.some((id) => form.member_ids.includes(id))
  )
    return '适用会员等级与参与客户限制没有交集';
  if (!Number.isInteger(form.sort) || form.sort < 0 || form.sort > 999999) return '排序需为0至999999的整数';
  return '';
}

export function payload(form) {
  const { time_range, ...data } = form;
  return {
    ...data,
    name: data.name.trim(),
    start_time: time_range[0],
    end_time: time_range[1],
    rules: data.rules.map((rule) => ({ threshold: String(rule.threshold), discount: String(rule.discount) })),
    product_ids: data.range_type ? data.product_ids.slice() : [],
    member_ids: data.member_type === 'all' ? [] : data.member_ids.slice(),
    tag_match: data.member_type === 'tag' ? data.tag_match : 'any',
  };
}
