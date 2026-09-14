// Local-only fixture server for inspecting the same saved decoration in H5 and Android.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {loadShared}=require('./ranking_shared_loader.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/ranking-review');
const origin='http://10.0.2.2:18013',photo=origin+'/fixture-product.png';
const {rankingComponent}=loadShared('rankingComponent'),{canvasPreset}=loadShared('rankingCanvas');
const {defaultShopPage,merchantComponent}=loadShared('merchantDecoration');
const {normalizeCategoryPage}=loadShared('categoryPageConfig');
const clone=value=>JSON.parse(JSON.stringify(value));
const page=(value,title='同步核验')=>({type:'home',title,name:title,is_show:1,page_title_mode:'component',actions_mode:'components',navigation_mode:'page',value});
const productRows=[1,2,3].map((rank)=>({id:rank===1?4:rank+4,rank,name:['轻薄平板电脑','智能数码套装','便携高清平板'][rank-1],image:photo,price:3999+rank*100,sales:2100-rank*100,score:9.9-rank*.1,rating:98,reviews:138,review_excerpt:'屏幕清晰，日常学习和办公都很方便。',rating_score:4.8}));
const board=id=>({id,name:id===9?'商品热销榜':'店铺口碑榜',description:'按近30天真实成交与评价排序',entity_type:id===9?'product':'shop',page_id:id===9?50:51,page_url:'/pages/annex/special/index?theme_id='+(id===9?50:51),top_n:10,window_days:30});
const shop={id:1,name:'数码生活旗舰店',logo:photo,description:'数码好物与安心服务',product_count:36,review_count:138,product_score:4.8,service_score:4.9,categories:[{id:1,cate_name:'数码精选',pic:photo,children:[{id:11,cate_name:'平板电脑',pic:photo}]}]};
const productCatalog=productRows.map(row=>({...row,store_name:row.name,stock:30,spec_type:0,is_virtual:0,activity:null,cart_num:0,seller_shop_id:1,merchant:{id:1,name:shop.name}}));
let fixtures,command={seq:0},lastAck={},revision=0;
async function initialize(){
 if(process.env.CRMEB_SYNC_REUSE==='1'&&fs.existsSync(path.join(out,'sync-configs.json'))){fixtures=JSON.parse(fs.readFileSync(path.join(out,'sync-configs.json'),'utf8'));return;}
 const detail=(await(await fetch('http://127.0.0.1:8011/api/theme_info/detail')).json()).data;
 const product=(await(await fetch('http://127.0.0.1:8011/api/product/detail/4')).json()).data;
 product.activity=[];product.coupons=[];product.storeInfo.seller_shop_id=1;product.storeInfo.merchant={id:1,name:shop.name};
 product.storeInfo.image=photo;product.storeInfo.slider_image=[photo];
 const pc=rankingComponent('marketingRanking',{rankingId:9,limit:3},1000);pc.appearance.canvas=canvasPreset('tmall_product');
 const sc=rankingComponent('marketingRanking',{rankingId:10,entityType:'shop',limit:3},1000);sc.appearance.canvas=canvasPreset('tmall_shop');
 const home=defaultShopPage();home.value[3500]=merchantComponent('productRanking',{shopId:1,limit:3},3500);
 const dt=clone(detail);dt.actions_mode='components';dt.navigation_mode='page';
 const original=Object.values(dt.value).sort((a,b)=>a.timestamp-b.timestamp);dt.value={};
 original.forEach((component,index)=>{const key=(index+1)*1000;dt.value[key]={...component,timestamp:key,id:'id'+key};});
 dt.value[1500]=rankingComponent('productRank',{},1500);dt.value[2500]=merchantComponent('shopInfo',{shopId:1,showProducts:true,limit:3},2500);
 const category=normalizeCategoryPage({status:1,show_title:1,page_title:'店铺商品分类',search_placeholder:'搜索店内好物'});
 fixtures={50:{home:page({1000:pc},board(9).name)},51:{home:page({1000:sc},board(10).name)},52:{home,detail:dt,category},product};saveFixtures();
}
function saveFixtures(){fs.writeFileSync(path.join(out,'sync-configs.json'),JSON.stringify(fixtures,null,2));}
async function createServer(port=18013){
 await initialize();
 const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://local');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  const send=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:200,msg:'成功',data}));};
  try{
   if(u.pathname==='/__fixtures')return send({fixtures,revision});
   if(u.pathname==='/__command')return send(command);
   if(u.pathname==='/__ack'){let body='';for await(const chunk of req)body+=chunk;lastAck=JSON.parse(body||'{}');return send({});}
   if(u.pathname==='/__status')return send(lastAck);
   if(u.pathname==='/__navigate'){command={seq:command.seq+1,url:u.searchParams.get('url'),viewer:Number(u.searchParams.get('viewer')||0)};return send(command);}
   if(u.pathname==='/__category'){fixtures[52].category.status=Number(u.searchParams.get('layout')||1);saveFixtures();return send({});}
   if(u.pathname==='/fixture-product.png'){res.setHeader('Content-Type','image/png');return fs.createReadStream(path.join(root,'template/admin/src/assets/images/product-diy.png')).pipe(res);}
   if(u.pathname.startsWith('/adminapi/')){
    const match=u.pathname.match(/\/theme\/info\/(\d+)\/(\w+)/);
    if(match)return send(match[2]==='base'?{id:Number(match[1]),title:'装修同步核验'}:match[2]==='theme'?{theme_color:'#155eef',price_color:'#e93323'}:fixtures[match[1]]?.[match[2]]||{});
    const save=u.pathname.match(/\/theme\/save\/(\d+)/);if(save){let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);fixtures[save[1]][data.type]=data.value;revision++;saveFixtures();return send({id:Number(save[1])});}
    if(u.pathname.endsWith('/ranking/list'))return send({list:[{...board(9),status:'running'}, {...board(10),status:'running'}],count:2});
    if(u.pathname.includes('/ranking/info/'))return send({...board(Number(u.pathname.split('/').pop())),metrics:[{field:'sales',direction:'desc',weight:100}],conditions:[],adjustments:[],exclude_ids:[],enabled:1});
    if(u.pathname.endsWith('/ranking/preview')){let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);return send({list:data.entity_type==='shop'?shopRows():productRows,candidate_count:3});}
    if(u.pathname.endsWith('/ranking/options'))return send({list:productRows,count:3});
    if(u.pathname.includes('category_list'))return send([]);
    if(req.resourceType==='script'||u.pathname.endsWith('/custom_admin_js')){res.setHeader('Content-Type','application/javascript');return res.end('');}
    return send({});
   }
   if(u.pathname==='/api/theme_info/home')return send(fixtures[Number(u.searchParams.get('theme_id'))]?.home||page({}));
   if(u.pathname==='/api/theme_info/detail')return send(fixtures[52].detail);
   if(u.pathname==='/api/theme_info/theme')return send({theme_color:'#155eef',price_color:'#e93323'});
   if(u.pathname==='/api/theme/navigation')return send([]);
   if(u.pathname==='/api/get_open_adv')return send({status:0});
   if(u.pathname==='/api/storefront/shop/1')return send(shop);
   if(u.pathname==='/api/storefront/shop/1/categories')return send(shop.categories);
   if(u.pathname.startsWith('/api/storefront/shop/1/theme/'))return send({shop_id:1,theme_id:52,page:fixtures[52][u.pathname.split('/').pop()],palette:{theme_color:'#155eef'}});
   if(u.pathname==='/api/storefront/product/4/theme')return send({shop_id:1,theme_id:52,page:fixtures[52].detail,palette:{theme_color:'#155eef'}});
   if(u.pathname==='/api/storefront/products')return send({list:productCatalog,count:3});
   if(u.pathname==='/api/storefront/ranking')return send(productCatalog);
   if(u.pathname==='/api/storefront/shop/1/follow')return send({followed:false,follower_count:28});
   if(u.pathname==='/api/category')return send(shop.categories);
   if(u.pathname==='/api/products')return send(productCatalog);
   if(u.pathname==='/api/product/detail/4')return send(fixtures.product);
   if(u.pathname.startsWith('/api/product/real_price/'))return send({real_price:3999,member_price:3999,ot_price:4799});
   if(u.pathname==='/api/marketing/product_rankings/4')return send({list:[{...board(9),rank:1}]});
   if(u.pathname.startsWith('/api/marketing/ranking/')){const id=Number(u.pathname.split('/').pop());return send({ranking:board(id),list:id===9?productRows:shopRows(),calculated_at:Date.now()/1000});}
   if(u.pathname==='/api/user')return send({uid:1,nickname:'同步核验客户',orderStatusNum:{}});
   if(u.pathname==='/api/cart/count')return send({count:0,ids:[]});
   if(u.pathname==='/api/image_base64')return send({image:'data:image/png;base64,'+fs.readFileSync(path.join(root,'template/admin/src/assets/images/product-diy.png')).toString('base64'),code:''});
   if(u.pathname==='/api/user/set_visit')return send({});
   if(u.pathname==='/api/v2/new_coupon')return send({show:false,list:[]});
   if(req.method!=='GET'){res.writeHead(405);return res.end('Local UI fixture does not forward business writes');}
   http.get('http://127.0.0.1:8011'+req.url,r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);}).on('error',()=>{res.writeHead(502);res.end();});
  }catch(error){res.writeHead(500);res.end(error.message);}
 });
 await new Promise(resolve=>server.listen(port,'0.0.0.0',resolve));return server;
}
function shopRows(){return [1,2,3].map(rank=>({id:rank,rank,name:[shop.name,'智能生活店','数码精选店'][rank-1],product_count:36,reviews:138,sales:10000,score:10-rank/10,products:productRows.map(p=>({...p}))}));}
module.exports={createServer};
if(require.main===module)createServer().then(()=>console.log('Decoration sync fixture ready on 18013')).catch(e=>{console.error(e);process.exitCode=1;});
