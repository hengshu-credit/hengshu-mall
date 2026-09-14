// Shared by the decoration preview and UniApp. All dimensions are design pixels.
import { canvasDefaults, normalizeCanvas, canvasPreset } from './rankingCanvas';
export const rankingPresets = [
  { id: 'tmall_product', name: '天猫商品榜 · 全元素', description: '榜头、标签切换、指数条、图文区、价格栏逐元素编辑' },
  { id: 'tmall_shop', name: '天猫店铺榜 · 全元素', description: '店铺名次、背景水印、数据摘要、店铺内商品组' },
  { id: 'dianping_shop', name: '点评店铺榜 · 全元素', description: 'TOP竖标、店铺图、评分、类型和评价信息' },
  { id: 'gold', name: '热销商品榜', description: '参考淘宝：图文卡片、指数条、价格底栏' },
  { id: 'hot', name: '热卖商品榜', description: '参考京东：大商品图、名次奖牌、成交信息' },
  { id: 'review', name: '店铺 TOP 榜', description: '参考大众点评：TOP竖标、店名、评分和评价' },
];
export const surfaceDefaults = () => ({
  mode: 'solid', color: '#ffffff', color2: '#ffffff', angle: 135,
  image: '', imageFit: 'cover', imagePosition: 'center',
  borderWidth: 0, borderStyle: 'solid', borderColor: '#e8e0d4', radius: 12,
  shadow: false, shadowColor: '#ded7cc', shadowBlur: 12, shadowX: 0, shadowY: 3,
});
export const rankStyleDefaults = () => ({
  card: surfaceDefaults(),
  badge: { ...surfaceDefaults(), color: '#fff3df', color2: '#f2d7a6', radius: 8,
    visible: true, shape: 'ribbon', text: 'TOP {rank}', textColor: '#966220', fontSize: 12, bold: true,
    width: 54, height: 34, customImage: '', showText: true, stacked: false, labelSize: 9, numberSize: 21 },
  titleColor: '#333333', priceColor: '#e93323', metaColor: '#999999',
});
export function presentationDefaults() {
  const normal = rankStyleDefaults();
  normal.badge = { ...normal.badge, shape: 'text', text: '{rank}', color: 'transparent', textColor: '#9298a0', width: 30, fontSize: 22 };
  const top1 = rankStyleDefaults(), top2 = rankStyleDefaults(), top3 = rankStyleDefaults();
  Object.assign(top1.card, { color: '#fff9ed', borderWidth: 1, borderColor: '#ecd5a8' });
  Object.assign(top1.badge, { mode: 'gradient', color: '#f9dfa1', color2: '#c88b3a', textColor: '#653f14' });
  Object.assign(top2.badge, { mode: 'gradient', color: '#edf2f7', color2: '#acbacb', textColor: '#47596d' });
  Object.assign(top3.badge, { mode: 'gradient', color: '#f4dfce', color2: '#c9906a', textColor: '#71452c' });
  return {
    version: 1, preset: 'gold', followTheme: true, canvas: canvasDefaults(),
    layout: 'list', columns: 2, gap: 10, padding: 12, imageGap: 12, badgePosition: 'side', podiumLift: 18,
    cardLayout: 'standard', panel: { ...surfaceDefaults(), color: 'transparent', radius: 0 }, panelPadding: 0,
    commerce: { color: '#f6ede3', paddingX: 12, paddingY: 9, reverse: false },
    header: { surface: { ...surfaceDefaults(), mode: 'solid', color: '#ffffff', color2: '#ffffff', radius: 8 },
      padding: 12, align: 'left', overline: '商品排行榜', showOverline: false,
      overlineColor: '#e9c990', overlineSize: 10, overlineSpacing: 2,
      titleColor: '#333333', titleSize: 16, titleBold: true, description: '',
      descriptionColor: '#999999', descriptionSize: 12, gap: 6, icon: '', iconSize: 24,
      moreText: '查看全部', moreColor: '#999999', moreSize: 12 },
    content: { showImage: true, imageWidth: 84, imageHeight: 84, gridImageHeight: 140, podiumImageSize: 72,
      imageFit: 'contain', imageRadius: 8, imageBackground: '#ffffff', imageBorderWidth: 0, imageBorderColor: '#eee8df',
      showName: true, nameSize: 14, nameBold: false, nameLines: 2, lineHeight: 1.5, gap: 8,
      showPrice: true, priceSize: 17, priceBold: true, pricePrefix: '¥',
      showSales: false, showReviews: false, showRating: false, showProductCount: true,
      metaSize: 11, salesLabel: '成交', reviewsLabel: '评价', ratingLabel: '好评率', productCountLabel: '在售商品', scoreLabel: '综合得分',
      showButton: false, buttonText: '去看看', buttonColor: '#ffffff', buttonBackground: '#b77e37', buttonBorderColor: '#b77e37', buttonBorderWidth: 0, buttonRadius: 18, buttonSize: 12, buttonPaddingX: 12, buttonPaddingY: 6,
      showStars: false, starColor: '#ff7b31', starEmptyColor: '#dedede', starSize: 12,
      showType: false, showShopDescription: false,
      highlightMetric: 'none', highlightLabel: '', highlightColor: '#bd7436', highlightBackground: '#fff5e7', highlightSize: 12, highlightPadding: 6, highlightRadius: 5,
      order: ['name', 'price', 'metrics', 'button'] },
    footer: { show: false, text: '榜单根据所选指标排序', color: '#999999', fontSize: 11, align: 'center', padding: 12 },
    empty: { hide: false, text: '暂无符合条件的对象', color: '#999999', fontSize: 13, padding: 24 },
    detail: { textColor:'#333333', badgeColor:'#f8d887', badgeBackground:'#252525', showArrow: true, arrowColor: '#333333', arrowSize: 12, rankText: '第{rank}名', showShopLabel: true, shopLabel: '所属店铺', fontSize: 13, bold: false },
    separateTop: true, ranks: { top1, top2, top3, normal }, ranges: [],
  };
}
function mergeKnown(base, value) {
  const result = {};
  Object.keys(base).forEach(key => {
    const old = value && value[key];
    if (Array.isArray(base[key])) result[key] = Array.isArray(old) ? JSON.parse(JSON.stringify(old)) : [...base[key]];
    else if (base[key] && typeof base[key] === 'object') result[key] = mergeKnown(base[key], old && typeof old === 'object' && !Array.isArray(old) ? old : {});
    else result[key] = old === undefined || old === null ? base[key] : old;
  });
  return result;
}
export function normalizePresentation(value) {
  const result = mergeKnown(presentationDefaults(), value);
  result.canvas = normalizeCanvas(value && value.canvas || {});
  result.ranges = result.ranges.map(range => ({ from: range.from, to: range.to, style: mergeKnown(rankStyleDefaults(), range.style) }));
  return result;
}
export function presetPresentation(id) {
  const value = presentationDefaults(); value.preset = id;
  if(['tmall_product','tmall_shop','dianping_shop'].includes(id)) { value.canvas=canvasPreset(id); return value; }
  value.layout = 'list'; value.badgePosition = 'image'; value.panelPadding = 8;
  value.gap = 10; value.padding = 12; value.imageGap = 12;
  Object.assign(value.header, { titleSize: 22, padding: 16, descriptionSize: 11, gap: 7 });
  Object.assign(value.content, { nameBold: true, nameSize: 14, imageWidth: 112, imageHeight: 124, imageRadius: 8, gap: 9, showProductCount: false, metaSize: 11, order: ['name','metrics','price','button'] });
  Object.values(value.ranks).forEach((rank, index) => {
    Object.assign(rank.card, { color: '#ffffff', borderWidth: 0, radius: 10 });
    Object.assign(rank.badge, { shape: 'shield', stacked: true, text: 'TOP {rank}', width: 31, height: 42, labelSize: 8, numberSize: 20, radius: 2, mode: 'gradient', color: ['#f8df9f','#d8e4ef','#f3d5c3','#b7b7b7'][index], color2: ['#cf9947','#9eafc4','#d99f7c','#969696'][index], textColor: index === 3 ? '#ffffff' : ['#755125','#475c77','#825134'][index] });
  });
  if (id === 'gold') {
    value.cardLayout = 'commerce'; value.panel.color = '#f3eee7'; value.panel.radius = 10;
    Object.assign(value.header.surface, { mode: 'gradient', color: '#f5e3c8', color2: '#fffaf2', radius: 8 });
    Object.assign(value.header, { titleColor: '#604627', descriptionColor: '#9a8061' });
    Object.assign(value.content, { imageWidth: 120, imageHeight: 138, nameBold: false, imageFit: 'cover', showSales: true, showReviews: true, showButton: true, highlightMetric: 'score', highlightLabel: '综合得分', highlightColor: '#87633b', highlightBackground: '#f7ecdd', buttonText: '去看看', buttonBackground: '#f0d4ad', buttonBorderColor: '#f0d4ad', buttonColor: '#614426', buttonPaddingY: 5, priceSize: 19 });
    value.followTheme = false; Object.values(value.ranks).forEach(rank => { rank.priceColor = '#795736'; });
  }
  if (id === 'hot') {
    value.cardLayout = 'retail';
    value.panel.color = '#f5f5f5'; value.panel.radius = 10;
    Object.assign(value.header.surface, { mode: 'gradient', color: '#f94727', color2: '#e72e30', angle: 120, radius: 8 });
    Object.assign(value.header, { titleColor: '#ffffff', descriptionColor: '#ffe7db', moreColor: '#ffffff' });
    Object.assign(value.content, { nameSize: 15, imageWidth: 108, imageHeight: 122, highlightMetric: 'sales', highlightLabel: '成交', highlightColor: '#e93323', highlightBackground: 'transparent', highlightPadding: 0, highlightSize: 13, showRating: true, showButton: true, buttonText: '›', buttonSize: 22, buttonPaddingX: 9, buttonPaddingY: 0, buttonBackground: '#fff0eb', buttonColor: '#e93323', buttonRadius: 20, priceSize: 19 });
    value.followTheme = false;
    Object.values(value.ranks).forEach(rank => { rank.badge.shape = 'crown'; rank.priceColor = '#e93323'; });
  } else if (id === 'review') {
    value.cardLayout = 'shop'; value.panel.color = '#f6f6f6'; value.panel.radius = 10;
    Object.assign(value.header.surface, { mode: 'gradient', color: '#34302f', color2: '#201e1e', radius: 8 });
    Object.assign(value.header, { titleColor: '#fff4e7', descriptionColor: '#d1bdae', moreColor: '#eed7bd', titleSize: 22 });
    Object.assign(value.content, { showStars: true, showRating: false, showReviews: true, showType: true, showShopDescription: true, showProductCount: true, showPrice: false, imageFit: 'cover', imageWidth: 84, imageHeight: 92, nameSize: 15, buttonBackground: '#ee8c35', buttonBorderColor: '#ee8c35' });
    Object.values(value.ranks).forEach((rank, index) => {
      Object.assign(rank.card, { radius: 10, borderWidth: 0 });
      Object.assign(rank.badge, { shape: 'flag', text: 'TOP {rank:02}', mode: 'solid', color: index < 3 ? '#ff7a37' : '#777777', textColor: '#ffffff', width: 26, height: 40, labelSize: 9, numberSize: 19, radius: 0 });
      rank.metaColor = '#888888';
    });
  }
  return value;
}
export const dimension = (value, unit = 'px') => Number(value) * (unit === 'rpx' ? 2 : 1) + unit;
export function surfaceStyle(value, unit = 'px', imageUrl = url => url) {
  const px = number => dimension(number, unit);
  const result = { backgroundColor: value.color, borderWidth: px(value.borderWidth), borderStyle: value.borderStyle, borderColor: value.borderColor, borderRadius: px(value.radius), boxSizing: 'border-box' };
  if (value.mode === 'gradient') result.backgroundImage = `linear-gradient(${value.angle}deg, ${value.color}, ${value.color2})`;
  if (value.mode === 'image' && value.image) { result.backgroundImage = `url(${JSON.stringify(imageUrl(value.image))})`; result.backgroundSize = value.imageFit; result.backgroundPosition = value.imagePosition; result.backgroundRepeat = 'no-repeat'; }
  result.boxShadow = value.shadow ? `${px(value.shadowX)} ${px(value.shadowY)} ${px(value.shadowBlur)} ${value.shadowColor}` : 'none';
  return result;
}
export function rankAppearance(presentation, rank) {
  const range = presentation.ranges.find(item => rank >= item.from && rank <= item.to);
  return range ? range.style : presentation.ranks[presentation.separateTop && rank >= 1 && rank <= 3 ? 'top' + rank : 'normal'];
}
export function badgeLabel(style, rank) { return style.text.replace(/\{rank:02\}/g, String(rank).padStart(2, '0')).replace(/\{rank\}/g, String(rank)); }
export function badgeParts(style, rank) { const label = badgeLabel(style, rank); const match = style.text.match(/\{rank(?::02)?\}/); if (!match) return { prefix: '', number: label }; const index = style.text.indexOf(match[0]); return { prefix: style.text.slice(0,index).trim(), number: badgeLabel({...style,text:style.text.slice(index)},rank) }; }
export function badgeStyle(style, unit = 'px', imageUrl) {
  const result = { ...surfaceStyle(style, unit, imageUrl), width: dimension(style.width, unit), height: dimension(style.height, unit), color: style.textColor, fontSize: dimension(style.fontSize, unit), fontWeight: style.bold ? '700' : '400' };
  if (style.shape === 'medal') result.borderRadius = '50%';
  if (style.shape === 'text') { result.backgroundColor = 'transparent'; result.backgroundImage = 'none'; result.borderWidth = '0'; result.boxShadow = 'none'; result.borderRadius = '0'; }
  if (style.shape === 'ribbon') result.clipPath = 'polygon(0 0,100% 0,100% 100%,50% 86%,0 100%)';
  if (style.shape === 'shield') result.clipPath = 'polygon(0 0,100% 0,100% 82%,50% 100%,0 82%)';
  if (style.shape === 'flag') result.clipPath = 'polygon(0 0,100% 0,100% 86%,0 100%)';
  if (style.shape === 'crown') result.clipPath = 'polygon(0 8%,25% 16%,50% 0,75% 16%,100% 8%,100% 100%,50% 90%,0 100%)';
  return result;
}
export function headerStyles(p, unit = 'px', imageUrl) {
  const h = p.header;
  return {
    box: { ...surfaceStyle(h.surface, unit, imageUrl), padding: dimension(h.padding, unit), textAlign: h.align },
    overline: { color: h.overlineColor, fontSize: dimension(h.overlineSize, unit), letterSpacing: dimension(h.overlineSpacing, unit), marginBottom: dimension(h.gap, unit) },
    title: { color: h.titleColor, fontSize: dimension(h.titleSize, unit), fontWeight: h.titleBold ? '700' : '400', lineHeight: '1.35' },
    description: { color: h.descriptionColor, fontSize: dimension(h.descriptionSize, unit), lineHeight: '1.6', marginTop: dimension(h.gap, unit) },
    more: { color: h.moreColor, fontSize: dimension(h.moreSize, unit), marginTop: dimension(h.gap, unit) },
    icon: { width: dimension(h.iconSize, unit), height: dimension(h.iconSize, unit), marginBottom: dimension(h.gap, unit) },
  };
}
export function itemStyles(p, row, variant = 'list', unit = 'px', imageUrl) {
  const r = rankAppearance(p, Number(row.rank)), c = p.content;
  const isList = variant === 'list';
  return {
    card: { ...surfaceStyle(r.card, unit, imageUrl), padding: dimension(p.padding, unit), gap: dimension(p.imageGap, unit), flexDirection: isList ? 'row' : 'column', alignItems: isList ? 'center' : 'stretch', minWidth: '0' },
    body: { gap: dimension(c.gap, unit), textAlign: variant === 'podium' ? 'center' : 'left' },
    image: { width: isList ? dimension(c.imageWidth, unit) : variant === 'podium' ? dimension(c.podiumImageSize, unit) : '100%', height: dimension(isList ? c.imageHeight : variant === 'podium' ? c.podiumImageSize : c.gridImageHeight, unit), borderRadius: dimension(c.imageRadius, unit), backgroundColor: c.imageBackground, border: `${dimension(c.imageBorderWidth, unit)} solid ${c.imageBorderColor}`, objectFit: c.imageFit, alignSelf: 'center', boxSizing: 'border-box' },
    name: { color: r.titleColor, fontSize: dimension(c.nameSize, unit), fontWeight: c.nameBold ? '700' : '400', lineHeight: String(c.lineHeight), WebkitLineClamp: String(c.nameLines) },
    price: { color: p.followTheme ? 'var(--view-priceColor, #e93323)' : r.priceColor, fontSize: dimension(c.priceSize, unit), fontWeight: c.priceBold ? '700' : '400' },
    meta: { color: r.metaColor, fontSize: dimension(c.metaSize, unit), gap: dimension(c.gap, unit) },
    button: { color: c.buttonColor, backgroundColor: p.followTheme ? 'var(--view-theme, #e93323)' : c.buttonBackground, border: `${dimension(c.buttonBorderWidth, unit)} solid ${p.followTheme ? 'var(--view-theme, #e93323)' : c.buttonBorderColor}`, borderRadius: dimension(c.buttonRadius, unit), fontSize: dimension(c.buttonSize, unit), padding: `${dimension(c.buttonPaddingY, unit)} ${dimension(c.buttonPaddingX, unit)}` },
    main: { display: 'flex', flexDirection: isList ? 'row' : 'column', alignItems: isList ? 'center' : 'stretch', gap: dimension(p.imageGap, unit), width: '100%', minWidth: '0' },
    commerce: { backgroundColor: p.commerce.color, padding: `${dimension(p.commerce.paddingY,unit)} ${dimension(p.commerce.paddingX,unit)}`, margin: `${dimension(p.imageGap,unit)} ${dimension(-p.padding,unit)} ${dimension(-p.padding,unit)}`, display: 'flex', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between', flexDirection: p.commerce.reverse ? 'row-reverse' : 'row' },
    highlight: { color: c.highlightColor, backgroundColor: c.highlightBackground, padding: dimension(c.highlightPadding,unit), borderRadius: dimension(c.highlightRadius,unit), fontSize: dimension(c.highlightSize,unit), fontWeight: '600' },
    stars: { fontSize: dimension(c.starSize,unit), color: c.starEmptyColor }, starFill: { color: c.starColor },
  };
}
export function rankingHighlight(content, row) { const field = content.highlightMetric; if (field === 'none' || row[field] === undefined || row[field] === null) return ''; const labels = { score:'综合得分',sales:'成交',rating:'好评率',reviews:'评价数' }; const val = field === 'score' ? Number(row[field]).toFixed(1) : field === 'rating' ? Number(row[field]).toFixed(1)+'%' : row[field]; return (content.highlightLabel || labels[field]) + ' ' + val; }
export function rankingMetrics(p, row, showScore) {
  const c = p.content, items = [];
  if (c.showSales && row.sales !== undefined) items.push(c.salesLabel + ' ' + row.sales);
  if (c.showReviews && row.reviews !== undefined) items.push(c.reviewsLabel + ' ' + row.reviews);
  if (c.showRating && row.rating !== undefined) items.push(c.ratingLabel + ' ' + Number(row.rating).toFixed(1) + '%');
  if (c.showProductCount && row.product_count !== undefined) items.push(c.productCountLabel + ' ' + row.product_count);
  if (showScore && row.score !== undefined) items.push(c.scoreLabel + ' ' + Number(row.score).toFixed(2));
  return items;
}
export function presentationRows(rows, p, limit) {
  const selected = rows.slice(0, limit);
  if (p.layout !== 'podium') return [{ variant: p.layout, rows: selected }];
  const top = selected.filter(row => Number(row.rank) <= 3);
  top.sort((a, b) => [2, 1, 3].indexOf(Number(a.rank)) - [2, 1, 3].indexOf(Number(b.rank)));
  return [{ variant: 'podium', rows: top }, { variant: 'list', rows: selected.filter(row => Number(row.rank) > 3) }];
}
