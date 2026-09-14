import {actionLink} from './pageActions';
export function recommendationLinkType(group={}) {
  if(['auto','page','url'].includes(group.linkType))return group.linkType;
  return !group.link?'auto':/^https?:\/\//i.test(group.link)?'url':'page';
}
export function recommendationDestination(group,shopId=0,themeId=0) {
  const type=recommendationLinkType(group);
  if(type!=='auto'){
    let url=actionLink({type:type==='url'?'url':'link',link:group.link});
    if(url==='/pages/merchant/shop?from=product' && Number(shopId)>0)url='/pages/merchant/shop?id='+Number(shopId);
    return {type,url};
  }
  return {type:'page',url:'/pages/merchant/products?shop_id='+Number(shopId||0)+'&recommend='+group.type+'&category_id='+Number(group.categoryId||0)+'&title='+encodeURIComponent(group.title||'')+(themeId?'&theme_id='+Number(themeId):'')};
}
