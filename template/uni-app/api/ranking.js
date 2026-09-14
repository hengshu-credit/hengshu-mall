import request from '@/utils/request';
export const getMarketingRanking = (id) => request.get('marketing/ranking/' + id, {}, { noAuth: true });
export const getProductRankings = (id, limit = 1) => request.get('marketing/product_rankings/' + id, { limit }, { noAuth: true });
