export function decorationProductIds(config) {
  return (config.goodsList && config.goodsList.list || []).map(item => Number(item.id)).filter(id => id > 0);
}

export function decorationProductQuery(config, shopId = 0) {
  const type = Number(config.typeConfig && config.typeConfig.activeValue);
  const sort = Number(config.goodsSort && config.goodsSort.tabVal);
  const ids = decorationProductIds(config);
  const csv = value => (Array.isArray(value) ? value : value ? [value] : []).join(',');
  const query = { limit: type === 1 ? ids.length : Number(config.numberConfig && config.numberConfig.val) || 10 };
  if (type === 1) query.ids = ids.join(',');
  else {
    query.priceOrder = sort === 2 ? 'desc' : '';
    query.salesOrder = sort === 1 ? 'desc' : '';
    if (type === 3) query.cate_id = csv(config.classList && config.classList.classVal);
    if (type === 4) query.store_label_id = csv(config.goodsLabel && config.goodsLabel.activeValue);
  }
  if (Number(shopId) > 0) query.seller_shop_id = Number(shopId);
  return query;
}

export function orderedDecorationProducts(products, config) {
  const list = Array.isArray(products) ? products : [];
  return Number(config.typeConfig && config.typeConfig.activeValue) === 1
    ? decorationProductIds(config).map(id => list.find(item => Number(item.id) === id)).filter(Boolean) : list;
}
