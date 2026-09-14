export const metricLabels = { sales: '成交件数', reviews: '评价数', rating: '好评率', price: '售价', stock: '库存', product_count: '在售商品数' };
export const referenceTypes = { id: '', category_ids: 'category', brand_ids: 'brand', label_ids: 'label', shop_id: 'shop', type_id: 'shop_type' };
export function fields(type) {
  const shared = { id: '指定对象', name: '名称', sales: '成交件数', reviews: '评价数', rating: '好评率（%）' };
  return type === 'shop' ? { ...shared, type_id: '店铺类型', product_count: '在售商品数' } : { ...shared, category_ids: '商品分类（含子分类）', brand_ids: '品牌', label_ids: '标签', shop_id: '所属店铺', price: '售价', stock: '库存' };
}
export function metrics(type) { return Object.keys(metricLabels).filter(key => type === 'shop' ? !['price', 'stock'].includes(key) : key !== 'product_count'); }
export function defaults() {
  return { id: 0, name: '', description: '', entity_type: 'product', enabled: 0, priority: 0, top_n: 20, start_time: 0, end_time: 0,
    window_days: 30, match_mode: 'all', conditions: [], exclude_ids: [], sort_mode: 'single', metrics: [{ field: 'sales', direction: 'desc', weight: 100 }], adjustments: [], version: 0 };
}
