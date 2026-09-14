import { commonStyleDefaults } from "./componentStyle";

export const merchantModuleNames = [
  "shopStreet",
  "recommendGroup",
  "productRanking",
  "productRank",
  "shopInfo",
  "shopProducts",
  "shopHeader",
  "shopFollow",
];
export const rankingTypes = [
  { value: "sales", label: "销量榜" },
  { value: "rating", label: "好评榜" },
];
export const recommendationTypes = [
  { value: "new", label: "首发新品" },
  { value: "hot", label: "热门榜单" },
  { value: "best", label: "精品推荐" },
  { value: "benefit", label: "促销单品" },
];
const titles = {
  shopStreet: "推荐店铺",
  recommendGroup: "推荐组",
  productRanking: "排行榜",
  productRank: "上榜信息",
  shopInfo: "店铺信息",
  shopProducts: "店铺商品",
  shopHeader: "店铺页头",
  shopFollow: "关注店铺",
};
export function merchantComponent(
  name,
  value = {},
  timestamp = Date.now() * 1000
) {
  const styles = commonStyleDefaults();
  styles.marginConfig.val = 10;
  styles.paddingConfig.val = 12;
  styles.fillet.val = 12;
  return {
    ...styles,
    name,
    cname: titles[name],
    timestamp,
    id: "id" + timestamp,
    isHide: false,
    setUp: { tabVal: 0 },
    title: titles[name],
    showTitle: true,
    recommendTitleColor: "#333333",
    recommendSubtitleColor: "var(--view-theme)",
    showMore: true,
    moreText: "更多",
    shopId: 0,
    shopIds: [],
    typeId: 0,
    categoryId: 0,
    limit: name === "shopInfo" ? 6 : name === "shopProducts" ? 12 : 3,
    columns: name === "shopInfo" ? 3 : name === "recommendGroup" ? 4 : 2,
    sort: "default",
    showMerchantName: false,
    showLogo: true,
    showDescription: true,
    showScores: true,
    showProducts: name === "shopInfo",
    showSearch: true,
    showFollow: true,
    showFollowers: true,
    showNavigation: true,
    followText: "关注店铺",
    followedText: "已关注",
    searchPlaceholder: "搜索店内商品",
    headerLayout: 0,
    showSort: true,
    buttonText: "进店",
    productTitle: "店铺推荐",
    rankTypes: ["sales", "rating"],
    rankType: "sales",
    rankScope: "category",
    topN: 20,
    groups: recommendationTypes.map((item, index) => ({
      title: item.label,
      subtitle: ["新品抢先购", "剁手必备指南", "发现品质好物", "惊喜折扣价"][
        index
      ],
      type: item.value,
      categoryId: 0,
      link: "",
      image: { header: "封面图片", url: "", type: "code" },
    })),
    ...JSON.parse(JSON.stringify(value)),
  };
}
export function defaultShopPage() {
  const list = [
    merchantComponent(
      "shopHeader",
      { showProducts: false, showMore: false },
      1000
    ),
    merchantComponent("recommendGroup", {}, 2000),
    merchantComponent("shopProducts", {}, 3000),
  ];
  return {
    type: "shop",
    page_title_mode: 'component',
    title: "店铺首页",
    name: "店铺首页",
    shop_category_style: 1,
    is_show: 1,
    is_bg_color: 1,
    color_picker: "#f5f5f5",
    actions_mode: "components",
    navigation_mode: "page",
    value: Object.fromEntries(list.map((item) => [item.timestamp, item])),
  };
}
export function shopUrl(id, themeId = 0) {
  return (
    "/pages/merchant/shop?id=" +
    Number(id) +
    (Number(themeId) > 0 ? "&theme_id=" + Number(themeId) : "")
  );
}
export function rankingUrl(config = {}, shopId = 0, themeId = 0) {
  return (
    "/pages/merchant/ranking?type=" +
    (config.rankType === "rating" ? "rating" : "sales") +
    "&shop_id=" +
    Number(shopId || config.shopId || 0) +
    "&category_id=" +
    Number(config.categoryId || 0) +
    "&top=" +
    Math.min(100, Math.max(1, Number(config.topN || 20))) +
    (Number(themeId) > 0 ? "&theme_id=" + Number(themeId) : "")
  );
}
