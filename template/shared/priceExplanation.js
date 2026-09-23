// Explanations describe server prices; they never compute an alternative checkout total.
function cents(value) {
  if (value === null || value === undefined || !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(value))) return null;
  const parts = String(value).split('.');
  const amount = Number(parts[0]) * 100 + Number(((parts[1] || '') + '00').slice(0, 2));
  return Number.isSafeInteger(amount) ? amount : null;
}
const money = value => (value / 100).toFixed(2);

export function productPriceSummary(product = {}, displayedPrice, explanation = null) {
  if (explanation && Array.isArray(explanation.line_items)) {
    const amount = explanation.payable_amount === undefined ? '' : Number(explanation.payable_amount).toFixed(2);
    const rows = explanation.line_items.map(row => ({ label: row.label, amount: Math.abs(Number(row.amount)).toFixed(2), discount: Number(row.amount) < 0, total: false, note: row.applied === false ? '当前未满足使用条件。' : '' }));
    rows.push({ label: '应付金额', amount, total: true });
    return { amount, reference: '', saving: '', rows };
  }
  const base = cents(product.price);
  const current = cents(displayedPrice === undefined ? product.price : displayedPrice);
  const reference = cents(product.ot_price), vip = cents(product.vip_price);
  if (current === null) return { amount: '', reference: '', saving: '', rows: [] };
  const saving = base !== null && base > current ? base - current : 0;
  const rows = [];
  if (saving) {
    rows.push({ label: '商品售价', amount: money(base) });
    rows.push({ label: '已计入优惠', amount: money(saving), discount: true });
  }
  rows.push({ label: saving ? '优惠后价格' : '当前售价', amount: money(current), total: true });
  if (reference !== null && reference > current) rows.push({ label: '划线参考价', amount: money(reference), note: '参考价格，不代表原成交价，也不计为已享优惠。' });
  if (vip !== null && vip > 0 && base !== null && vip < base && vip !== current) rows.push({ label: 'SVIP会员价', amount: money(vip), note: '需满足付费会员条件，是否适用以结算为准。' });
  return { amount: money(current), reference: reference !== null && reference > current ? money(reference) : '', saving: saving ? money(saving) : '', rows };
}

export function priceExplanation(mode, context = {}) {
  if (context.explanation && Array.isArray(context.explanation.line_items)) {
    const rows = context.explanation.line_items;
    const payable = context.explanation.payable_amount;
    const lines = rows.map(row => `${row.label}：${Number(row.amount) < 0 ? '优惠 ' : ''}¥${Math.abs(Number(row.amount)).toFixed(2)}`);
    if (payable !== undefined) lines.push(`应付金额：¥${Number(payable).toFixed(2)}`);
    return lines;
  }
  if (context.pending) return ['正在计算优惠，完成后请确认金额。'];
  if (context.error) return ['优惠尚未确认，请重新计算后提交。'];
  const lines = [];
  if (mode === 'product') {
    if (Number((context.product || {}).vip_price) > 0) lines.push('付费会员价格需满足对应会员条件。');
    lines.push('商品价格以所选规格为准，运费与可用优惠在结算时确认。');
    return lines;
  }
  let activities = context.activities || [];
  if (mode === 'order') {
    const saved = ((context.snapshot || {}).cartInfo || []).map(item => item.price_explanation).filter(Boolean);
    if (saved.length) {
      const rows = [], index = new Map(); let payable = 0;
      saved.forEach(item => {
        payable += Number(item.payable_amount || 0);
        (item.line_items || []).forEach(row => {
          const key = row.kind === 'sku_price' ? 'sku_price' : `${row.kind}:${row.source_id || row.label}`;
          if (!index.has(key)) { index.set(key, rows.length); rows.push({...row, amount: Number(row.amount || 0).toFixed(2)}); }
          else rows[index.get(key)].amount = (Number(rows[index.get(key)].amount) + Number(row.amount || 0)).toFixed(2);
        });
      });
      return priceExplanation(mode, { explanation: { line_items: rows, payable_amount: payable.toFixed(2) } });
    }
    activities = ((context.snapshot || {}).cartInfo || []).map(item => item.full_reduction_activity).filter(Boolean);
    lines.push('金额依据成交时保存的价格与优惠快照。退款按商品行已分摊实付款计算。');
  }
  const seen = new Set();
  activities.forEach(activity => {
    const name = typeof activity.name === 'string' ? activity.name : '';
    const key = activity.id || name;
    if (!name || seen.has(key)) return;
    seen.add(key);
    const amount = Number(activity.discount);
    lines.push(name + (Number.isFinite(amount) && amount > 0 ? '：优惠 ¥' + amount.toFixed(2) : ''));
  });
  if (mode === 'cart') lines.push('合计不含运费；优惠券与积分在结算时确认。');
  if (mode === 'confirm') lines.push(context.exclusive ? '专属活动按活动规则结算，优惠券与积分是否可用以本页试算为准。' : '先按会员价计算满减，再使用符合条件的优惠券与积分；运费另计。');
  return lines;
}
