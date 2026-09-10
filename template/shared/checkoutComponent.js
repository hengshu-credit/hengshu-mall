import { commonStyleDefaults } from './componentStyle';
export function checkoutComponent(value = {}) {
  return { ...commonStyleDefaults('#FFFFFF'), name:'categoryCheckout', cname:'分类结算栏', isHide:false, setUp:{tabVal:0},
    showCart:true, showAmount:true, showButton:true, buttonText:'去结算', buttonStyle:'text', priceColor:'', buttonColor:'', buttonTextColor:'',
    iconImage:'', activeIconImage:'', cartDisplay:'icon', cartText:'购物车', cartColor:'', activeCartColor:'',
    barLayout:'standard', showDetails:false, detailsText:'查看明细', detailsColor:'#999999', showButtonCount:false,
    cartBackground:'', cartIconSize:28, buttonRadius:22, ...JSON.parse(JSON.stringify(value)) };
}
export function checkoutCartIcon(config, selected = false) {
  return (selected ? config.activeIconImage || config.iconImage : config.iconImage) || `/static/images/3-00${selected ? 2 : 1}.png`;
}
export function isDefaultCheckoutIcon(url) {
  return /^\/static\/images\/3-00[12]\.png$/.test(url);
}
export function checkoutPreset(layout) {
  const floating=layout==='floating', style=commonStyleDefaults(floating?'#303030':'#FFFFFF');
  if(floating){
    style.fillet.val=24;
    style.fillet.valList.forEach(item=>{item.val=24;});
    style.marginConfig.isAll=true;
    style.marginConfig.valList=[0,10,8,10].map(val=>({val}));
  }
  return {...style,barLayout:floating?'floating':'standard',cartDisplay:'icon',cartIconSize:28,
    showDetails:floating,showButtonCount:floating,detailsColor:'#BBBBBB',cartBackground:'',
    priceColor:floating?'#FFFFFF':'',buttonStyle:'solid',buttonColor:'',buttonTextColor:'#FFFFFF',buttonRadius:22};
}
