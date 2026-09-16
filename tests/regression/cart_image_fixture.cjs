// Current public product snapshots; isolated cart rows exercise image failures.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const product = JSON.parse(fs.readFileSync(path.join(root, '.build/storefront-audit/live/detail1.json'), 'utf8')).data.storeInfo;
const host = 'https://mall.hengshucredit.com';
const row = (id, label, image) => ({ id, product_id: 1, cart_num: 1, truePrice: product.price,
  trueStock: product.stock, attrStatus: true, status: true, min_qty: 1,
  productInfo: { ...product, store_name: label, attrInfo: { image, suk: label, stock: product.stock } } });
module.exports = {
  cartRows: [row(701, '空规格图片', ''), row(702, '失效规格图片', host + '/uploads/cart-image-missing.png'), row(703, '正常规格图片', product.image)],
  invalidCartRows: [{ ...row(704, '失效商品主图回退', host + '/uploads/cart-image-missing.png'), attrStatus: false, status: false }],
  order: {
    id: 919, order_id: 'image-audit', uid: 9999, pid: 0, split: false, paid: 0, status: 4, refund_status: 0,
    refund_type: 0, shipping_type: 1, virtual_type: 0, is_gift: 0, gift_uid: 0, total_num: 2,
    total_price: '246.90', vip_true_price: '0.00', total_postage: '0.00', pay_postage: '0.00', pay_price: '246.90', deduction_price: '0.00', coupon_price: '0.00',
    _status: { _type: 4, _msg: '已取消订单（隔离图片回归）' }, custom_form: [], invoice: {}, system_store: {}, help_info: { help_status: 0 },
    add_time_y: '2026-09-16', add_time_h: '00:00:00',
    cartInfo: [{ ...row(705, '历史成交商品（快照）', host + '/uploads/legacy-sku.jpg.avi'), cart_num: 2, is_valid: 1,
      productInfo: { ...product, price: '123.45', attrInfo: { image: host + '/uploads/legacy-sku.jpg.avi', price: '123.45', suk: '成交规格' } } }],
  },
};
