export function serviceSelection(config = {}) {
  const selected = config.checkBoxConfig && config.checkBoxConfig.type;
  return Array.isArray(selected) ? selected.map(Number).filter(id => [0, 1, 2, 3].includes(id)) : [0, 1, 2, 3];
}

export const serviceActivities = {
  1: { label: '限时秒杀', icon: 'icon-miaosha1' },
  2: { label: '参与砍价', icon: 'icon-ic_sale' },
  3: { label: '拼团活动', icon: 'icon-wodetuandui' },
};

export function serviceSummary(items, field) {
  return (Array.isArray(items) ? items : []).map(item => String(item && item[field] || '').trim()).filter(Boolean).join(' · ');
}
