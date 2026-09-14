// Synthetic public pages/cart only. No requests are forwarded to a real backend.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {root,compiler,transform}=require('./theme_component_harness.cjs');
const {loadShared}=require('./ranking_shared_loader.cjs');
function defaults(file){const source=compiler.parseComponent(fs.readFileSync(path.join(root,'template/admin/src/components/mobilePage',file),'utf8')).script.content;const m={exports:{}};new Function('module','exports','require',transform(source))(m,m.exports,id=>id==='vuex'?{mapState:()=>({})}:{});return m.exports.default.data.call({num:1}).defaultConfig;}
const out=path.join(root,'.build/app-decoration-fix');
function fixtures(origin){
  const picture=origin+'/uploads/product.avif';
  const catalog=[1,2,3].map(id=>({id,store_name:'测试商品'+id,price:id===1?'10.10':id===2?'20.20':'30.30',image:picture,slider_image:[picture],stock:20,sales:3,spec_type:0,activity:[],vip_price:0,is_vip:0,is_virtual:0,min_qty:1,unit_name:'件',label_list:[],cart_button:1,seller_shop_id:id===2?9:8,merchant_name:id===2?'数码店':'生活店'}));
  const goods=defaults('home_goods_list.vue');goods.id='goods';goods.goodsList.list=[{id:1},{id:2},{id:3}];goods.styleConfig.tabVal=1;goods.timestamp=2;
  const rich={...goods,id:'rich',name:'richText',richText:{val:'<p>装修中的安卓富文本内容</p>'},bgColor:{color:[{item:'#fff'}]},timestamp:1};
  const nav=loadShared('navigationComponent').navigationComponent();
  const title=loadShared('pageTitleComponent').pageTitleComponent({title:'商品详情'},1);
  const info=defaults('home_product_info.vue');info.id='product';info.timestamp=2;
  const detail={value:{title,info},navigation_mode:'page'};
  const cart=loadShared('cartPageConfig').normalizeCartPage({show_recommend:false,show_service:false});
  const row=(id,index)=>({id:101+index,product_id:id,cart_num:2,truePrice:catalog[id-1].price,attrStatus:true,status:true,min_qty:1,trueStock:20,productInfo:{...catalog[id-1],attrInfo:{stock:20,image:'',suk:'标准'}}});
  const shop={id:8,name:'生活店',description:'已进入商品对应店铺',available:true,product_count:2,categories:[],logo:picture};
  return {catalog,nav,detail,cart,rows:[row(1,0),row(2,1),row(3,2)],home:{value:{rich,goods},navigation_mode:'page'},user:{value:{},navigation_mode:'page'},shop};
}
async function createServer(port=18023){
  const data=fixtures('http://127.0.0.1:'+port);let command={seq:0},ack={};
  const server=http.createServer(async(req,res)=>{
    const u=new URL(req.url,'http://fixture');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
    const send=(body,status=200)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status,msg:'fixture',data:body}));};
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
    if(u.pathname==='/__command')return send(command);
    if(u.pathname==='/__navigate'){command={seq:command.seq+1,url:u.searchParams.get('url'),login:u.searchParams.get('login')==='1'};return send(command);}
    if(u.pathname==='/__ack'){let raw='';for await(const chunk of req)raw+=chunk;ack=JSON.parse(raw);return send({});}
    if(u.pathname==='/__status')return send(ack);
    if(u.pathname.startsWith('/_compat/images/'))return http.get('http://127.0.0.1:18024'+u.pathname.slice('/_compat/images'.length),r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);}).on('error',()=>{res.writeHead(502);res.end();});
    if(u.pathname==='/uploads/product.avif'){res.setHeader('Content-Type','image/avif');return fs.createReadStream(path.join(out,'media/product.avif')).pipe(res);}
    if(u.pathname.startsWith('/api/')){
      const name=u.pathname.slice(5);
      if(name==='get_script'){res.setHeader('Content-Type','application/javascript');return res.end('');}
      if(name==='theme_info/home')return send(data.home);
      if(name==='theme_info/user')return send(data.user);
      if(name==='theme_info/cart')return send(data.cart);
      if(name==='theme_info/detail')return send(data.detail);
      if(name==='theme_info/theme')return send({theme_color:'#155EEF',gradient_color:'#4C7DFF'});
      if(name==='theme/navigation')return send(data.nav);
      if(name==='storefront/product/1/theme'){res.writeHead(404);return res.end('Old server');}
      if(name==='products')return send(data.catalog);
      if(name==='product/detail/1')return send({storeInfo:{...data.catalog[0],slider_image:[data.catalog[0].image],description:'<p>商品说明</p>',params_list:[],protection_list:[],attrPics:[],custom_form:[]},productAttr:[],productValue:{default:{...data.catalog[0],unique:'sku-1',suk:'标准'}},spec_unique:'sku-1',reply:null,replyCount:0,replyChance:0,coupons:[],activity:[],good_list:[],priceName:0});
      if(name.startsWith('product/real_price/'))return send({real_price:'10.10',member_price:'10.10',ot_price:'20.00'});
      if(name==='cart/count')return send({count:6,ids:data.rows.map(x=>x.id)});
      if(name==='cart/list')return send({valid:u.searchParams.get('status')==='2'?[]:data.rows,invalid:[]});
      if(name==='cart/full_reduction_quote'){let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');const selected=data.rows.filter(row=>(body.ids||[]).map(String).includes(String(row.id)));const total=selected.reduce((sum,row)=>sum+Math.round(Number(row.truePrice)*100)*row.cart_num,0)/100;return send({pay_price:total.toFixed(2),full_reduction_price:'0.00'});}
      if(name==='user')return send({uid:1,nickname:'测试用户',orderStatusNum:{},diy_data:{value:0}});
      if(name==='menu/user')return send({diy_data:{value:0},routine_my_menus:[]});
      if(name==='merchant/followed')return send({list:[data.shop],count:1});
      if(name==='storefront/shop/8')return send(data.shop);
      if(name==='storefront/products')return send({list:data.catalog.filter(item=>item.seller_shop_id===8),count:2});
      if(name.startsWith('storefront/shop/8/theme/'))return send({page:loadShared('merchantDecoration').defaultShopPage(),shop:data.shop,palette:{theme_color:'#155EEF'}});
      if(name==='v2/new_coupon')return send({show:false,list:[]});
      if(name==='v2/get_today_coupon')return send({list:[]});
      if(name==='image_base64')return send({image:'',code:''});
      return send({});
    }
    const base=process.env.CRMEB_H5_BUILD||path.join(out,fs.existsSync(path.join(out,'final-h5/index.html'))?'final-h5':'h5');let file=path.resolve(base,'.'+u.pathname);
    if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(base,'index.html');
    res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return {server,data};
}
module.exports={createServer,defaults};
if(require.main===module)createServer().then(()=>console.log('App decoration fixture ready'));
