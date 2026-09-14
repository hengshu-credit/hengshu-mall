// Keep common search/category links inside the current store; explicit other links retain their destination.
export function merchantLink(url, shopId) {
  if (!shopId || typeof url !== "string") return url;
  const [path, query = ""] = url.split("?");
  const params = {};
  query
    .split("&")
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...value] = part.split("=");
      try {
        params[key] = decodeURIComponent(value.join("="));
      } catch (e) {}
    });
  if (path === '/pages/merchant/shop' && params.from === 'product' && !params.id)
    return '/pages/merchant/shop?id=' + Number(shopId);
  if (path === "/pages/goods_cate/goods_cate")
    return "/pages/merchant/category?id=" + Number(shopId);
  if (
    [
      "/pages/goods/goods_search/index",
      "/pages/goods/goods_list/index",
    ].includes(path)
  )
    return (
      "/pages/merchant/products?shop_id=" +
      Number(shopId) +
      "&category_id=" +
      Number(params.sid || params.cid || params.cate_id || 0) +
      "&keyword=" +
      encodeURIComponent(
        params.keyword || params.searchValue || params.searchVal || ""
      )
    );
  return url;
}
