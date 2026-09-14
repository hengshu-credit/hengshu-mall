import { commonStyleDefaults } from './componentStyle';
import { normalizePresentation, presetPresentation } from './rankingPresentation';
export function rankingComponent(name = 'marketingRanking', value = {}, timestamp = Date.now() * 1000) {
  const detail = ['marketingRankInfo','productRank'].includes(name);
  const styles = commonStyleDefaults();
  styles.marginConfig.val = 10; styles.paddingConfig.val = 14; styles.fillet.val = 12;
  if (detail) styles.paddingConfig.val = 10;
  const freshRanking = !detail && !value.appearance;
  const appearance = freshRanking ? presetPresentation(value.entityType === 'shop' ? 'tmall_shop' : 'tmall_product') : normalizePresentation(value.appearance);
  if (freshRanking) { styles.marginConfig.val = 0; styles.paddingConfig.val = 0; styles.fillet.val = 0; }
  if (!value.appearance && value.accentColor && value.accentColor !== '#c77932') {
    appearance.header.titleColor = value.accentColor;
    appearance.detail.arrowColor = value.accentColor;
    Object.values(appearance.ranks).forEach(rank => { rank.badge.textColor = value.accentColor; });
  }
  return { ...styles, name, cname: detail ? (name === 'productRank' ? '排行榜' : '商品上榜信息') : '营销排行榜', id: 'id' + timestamp, timestamp,
    setUp: { tabVal: 0 }, isHide: false, rankingId: 0, title: '', limit: name === 'marketingRankInfo' ? 1 : 10,
    showTitle: true, showDescription: true, showMore: true, showScore: false, accentColor: '#c77932', ...JSON.parse(JSON.stringify(value)),
    appearance, ...(detail ? {limit:1} : {}) };
}
