const {test}=require('node:test'),assert=require('node:assert/strict');
const {loadShared}=require('./ranking_shared_loader.cjs');
const {priceExplanation}=loadShared('priceExplanation');

test('product cards identify conditional membership prices without promising a final discount',()=>{
  assert.match(priceExplanation('product',{product:{vip_price:'8.50'}}).join(' '),/付费会员/);
  assert.match(priceExplanation('product',{}).join(' '),/运费.*结算/);
  assert.doesNotMatch(priceExplanation('product',{product:{vip_price:'0'}}).join(' '),/已优惠|立减|会员/);
});
test('cart identifies server applied activity and explicitly excludes checkout charges and discounts',()=>{
  const result=priceExplanation('cart',{activities:[{name:'秋季满减',discount:'5.20'}]}).join(' ');
  assert.match(result,/秋季满减.*5.20/);assert.match(result,/不含运费/);assert.match(result,/优惠券.*积分.*结算/);
});
test('unfinished and failed quotes never present old activities as current applied discounts',()=>{
  for(const state of [{pending:true},{error:'资格已变化'}]){
    const result=priceExplanation('confirm',{...state,activities:[{name:'旧优惠',discount:'5.20'}]}).join(' ');
    assert.doesNotMatch(result,/旧优惠/);assert.match(result,/重新|计算|确认/);
  }
});
test('order explanation uses saved activity snapshots and never calculates from current product price',()=>{
  const snapshot={cartInfo:[{full_reduction_activity:{id:7,name:'成交时满减'}},{full_reduction_activity:{id:7,name:'成交时满减'}}]};
  const result=priceExplanation('order',{snapshot}).join(' ');
  assert.equal(result.split('成交时满减').length,2);assert.match(result,/成交.*快照/);assert.match(result,/退款.*分摊/);
});
test('exclusive checkout explains eligibility and unknown activity amounts are not fabricated',()=>{
  const result=priceExplanation('confirm',{exclusive:true,activities:[{name:'活动',discount:'unknown'}]}).join(' ');
  assert.match(result,/专属活动.*优惠券/);assert.doesNotMatch(result,/NaN|0.00|unknown/);
});
