const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'../..'), deps = path.join(root,'template/admin/node_modules');
const Vue = require(path.join(deps,'vue')), babel = require(path.join(deps,'@babel/core'));
global.uni = {createSelectorQuery(){return{in(){return this;},select(){return this;},boundingClientRect(fn){fn({height:50});return this;},exec(){}};}};
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  let source = fs.readFileSync(file,'utf8'); if(file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const module = {exports:{}};
  new Function('module','exports','require',babel.transformSync(source,{babelrc:false,configFile:false,plugins:[require(path.join(deps,'@babel/plugin-transform-modules-commonjs'))]}).code)(module,module.exports,name => name.startsWith('.') ? load(path.resolve(path.dirname(file),name+'.js')) : {});
  return cache[file] = module.exports;
}
const config = load(path.join(root,'template/shared/checkoutComponent.js')).checkoutComponent({buttonText:'确认结算',showAmount:false});
const options = load(path.join(root,'template/uni-app/components/categoryCheckout/index.vue')).default;
const bar = new Vue({...options,propsData:{config,count:0,amount:0}}), events=[];
bar.$on('checkout',()=>events.push('checkout')); bar.checkout(); assert.deepEqual(events,[],'Empty carts cannot create checkout requests');
bar.count=2; bar.checkout(); assert.deepEqual(events,['checkout'],'A populated cart invokes the existing checkout owner');
assert.match(bar.cartIcon,/3-002/,'Populated carts use the selected default icon');
bar.count=0; assert.match(bar.cartIcon,/3-001/,'Empty carts use the unselected default icon');
bar.config={...config,iconImage:'/uploads/cart.svg',activeIconImage:'/uploads/active.svg',cartDisplay:'both',cartText:'购物袋'};
assert.equal(bar.cartIcon,'/uploads/cart.svg');bar.count=1;assert.equal(bar.cartIcon,'/uploads/active.svg');
assert.equal(bar.displayConfig.cartDisplay,'both');
bar.config=config;
assert.equal(bar.displayConfig.buttonText,'确认结算'); assert.equal(bar.displayConfig.showAmount,false);
assert.equal(bar.currentAmount,'0.00');assert.equal(bar.displayConfig.buttonStyle,'text');
bar.config={...config,isHide:true}; assert.equal(bar.visible,false,'Hidden checkout components must not render');
bar.config={...config,showCart:false}; assert.equal(bar.displayConfig.showCart,false);
console.log('PASS checkout component: configured visibility, labels, amounts and empty-cart guard');
