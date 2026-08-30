// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2024 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------

import request from "@/utils/request.js";

/**
 * 统计数据
 */
export function getStatisticsInfo() {
  return request.get(
    "admin/order/statistics",
    {},
    {
      login: true,
    },
  );
}
/**
 * 订单月统计
 */
export function getStatisticsMonth(where) {
  return request.get("admin/order/data", where, {
    login: true,
  });
}
/**
 * 订单月统计
 */
export function getAdminOrderList(where) {
  return request.get("admin/order/list", where, {
    login: true,
  });
}
/**
 * 订单改价
 */
export function setAdminOrderPrice(data) {
  return request.post("admin/order/price", data, {
    login: true,
  });
}
/**
 * 订单备注
 */
export function setAdminOrderRemark(data) {
  return request.post("admin/order/remark", data, {
    login: true,
  });
}
/**
 * 订单详情
 */
export function getAdminOrderDetail(orderId) {
  return request.get(
    "admin/order/detail/" + orderId,
    {},
    {
      login: true,
    },
  );
}

/**
 * 退款订单详情
 */
export function getAdminRefundOrderDetail(orderId) {
  return request.get(
    "admin/refund_order/detail/" + orderId,
    {},
    {
      login: true,
    },
  );
}

/**
 * 订单发货信息获取
 */
export function getAdminOrderDelivery(orderId) {
  return request.get(
    "admin/order/delivery/gain/" + orderId,
    {},
    {
      login: true,
    },
  );
}

/**
 * 订单发货保存
 */
export function setAdminOrderDelivery(id, data) {
  return request.post("admin/order/delivery/keep/" + id, data, {
    login: true,
  });
}
/**
 * 订单统计图
 */
export function getStatisticsTime(data) {
  return request.get("admin/order/time", data, {
    login: true,
  });
}
/**
 * 线下付款订单确认付款
 */
export function setOfflinePay(data) {
  return request.post("admin/order/offline", data, {
    login: true,
  });
}
/**
 * 订单确认退款
 */
export function setOrderRefund(data) {
  return request.post("admin/order/refund", data, {
    login: true,
  });
}

/**
 * 获取快递公司
 * @returns {*}
 */
export function getLogistics(data) {
  return request.get("logistics", data, {
    login: false,
  });
}

/**
 * 订单核销
 * @returns {*}
 */
export function orderVerific(verify_code, is_confirm, auth = 0) {
  return request.post("order/order_verific", {
    verify_code,
    is_confirm,
    auth,
  });
}

/**
 * 获取物流公司模板
 * @returns {*}
 */
export function orderExportTemp(data) {
  return request.get("admin/order/export_temp", data);
}

/**
 * 获取订单打印默认配置
 * @returns {*}
 */
export function orderDeliveryInfo() {
  return request.get("admin/order/delivery_info");
}

/**
 * 配送员列表
 * @returns {*}
 */
export function orderOrderDelivery() {
  return request.get("admin/order/delivery");
}

/**
 * 退款列表
 * @returns {*}
 */
export function orderRefund_order(where) {
  return request.get("admin/refund_order/list", where, {
    login: true,
  });
}

/**
 * 订单备注（退款）
 */
export function setAdminRefundRemark(data) {
  return request.post("admin/refund_order/remark", data, {
    login: true,
  });
}

/**
 * 订单同意退货
 */
export function agreeExpress(data) {
  return request.post("admin/order/agreeExpress", data, {
    login: true,
  });
}

/**
 * 商家管理统计
 */
export function getManageStatistics() {
  return request.get(
    "admin/manage/statistics",
    {},
    {
      login: true,
    },
  );
}

/**
 * 平台-商品列表
 */
export function adminProductList(data) {
  return request.get("admin/manage/product", data);
}

/**
 * 商品上下架
 */
export function productSetShow(data) {
  return request.post("admin/manage/product/set_show", data, {
    login: true,
  });
}

/**
 * 获取标签数据
 */
export function getProductLabel() {
  return request.get(
    "admin/manage/product/label",
    {},
    {
      login: true,
    },
  );
}

/**
 * 获取分类数据
 */
export function getProductCate() {
  return request.get(
    "admin/manage/product/cate",
    {},
    {
      login: true,
    },
  );
}

/**
 * 商品标签修改
 */
export function postBatchProcess(data) {
  return request.post("admin/manage/product/save_label", data, {
    login: true,
  });
}

/**
 * 商品分类修改
 */
export function postManageSaveCate(data) {
  return request.post("admin/manage/product/save_cate", data, {
    login: true,
  });
}
/**
 * 商品规格
 */
export function getManageProductAttr(id) {
  return request.get(
    `admin/manage/product/attr/${id}`,
    {},
    {
      login: true,
    },
  );
}

export function postUpdateAttrs(id, data) {
  return request.post(`admin/manage/product/save_attr/${id}`, data, {
    login: true,
  });
}

/**
 * 统计管理-获取订单可拆分商品列表
 */
export function orderSplitInfo(id) {
  return request.get("admin/order/split_cart_info/" + id);
}

/**
 * 统计管理-提交
 */
export function orderSplitDelivery(id, data) {
  return request.put("admin/order/split_delivery/" + id, data);
}

/**
 * 平台-用户列表
 */
export function getUserList(data) {
  return request.get(`admin/manage/user`, data);
}

/**
 * 平台-修改余额、积分
 */
export function postUserUpdateOther(uid, data) {
  return request.post(`admin/manage/user/update/${uid}`, data);
}

/**
 * 平台-分组列表
 */
export function getGroupList() {
  return request.get(`admin/manage/user/group`);
}

/**
 * 平台-修改用户信息
 */
export function postUserUpdate(data) {
  return request.post(`admin/user/update`, data);
}

/**
 * 平台-优惠券
 */
export function getUserCoupon(data) {
  return request.get(`admin/manage/user/coupon`, data);
}

/**
 * 平台-用户标签
 */
export function getUserLabel(uid) {
  return request.get(`admin/manage/user/label/${uid}`);
}

/**
 * 平台-等级列表
 */
export function getLevelList() {
  return request.get(`admin/manage/user/level`);
}

/**
 * 平台-用户详情
 */
export function getUserInfo(uid) {
  return request.get(`admin/manage/user/info/${uid}`);
}

/**
 * 平台-退款列表
 */
export function adminRefundList(data) {
  return request.get("admin/refund_order/list", data);
}

/**
 * 订单详情(退款)
 */
export function getAdminRefundDetail(orderId) {
  return request.get(
    "admin/refund_order/detail/" + orderId,
    {},
    {
      login: true,
    },
  );
}

export function getTemplateOption() {
  return request.get(`admin/manage/product/shipping_temp`);
}

export function productCreate(data) {
  return request.post(`admin/manage/product/create`, data);
}

/**
 * 配送员-核销订单获取商品信息
 */
export function orderCartInfo(data) {
  return request.post("store/order/cart_info", data);
}

/**
 * 配送员-订单核销
 */
export function orderWriteoff(data) {
  return request.post("store/order/writeoff", data);
}
