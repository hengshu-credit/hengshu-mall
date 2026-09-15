// Replays read-only live public configuration/product snapshots. The cart is synthetic.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {loadShared}=require('./ranking_shared_loader.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/storefront-audit'),port=Number(process.env.CRMEB_AUDIT_PORT||18026);
const origin='http://127.0.0.1:'+port;
const read=name=>JSON.parse(fs.readFileSync(path.join(out,'live',name+'.json'))).data;
const remap=value=>JSON.parse(JSON.stringify(value).replaceAll('https://mall.hengshucredit.com',origin));
async function createServer(){
 const h5=path.resolve(process.env.CRMEB_AUDIT_H5||path.join(out,'h5'));
 const home=remap(read('home')),category=remap(read('category_theme')),cart=remap(read('cart_theme')),detail=remap(read('detail_theme'));
 const product=remap(read('detail1')),catalog=remap(read('products_shop1')),shop=remap(read('shop1'));
 const shopHome=remap(read('shop1home')),shopCategory=remap(read('shop1category'));
 const savedFile=process.env.CRMEB_AUDIT_SAVED;
 const saved=savedFile&&fs.existsSync(savedFile)?JSON.parse(fs.readFileSync(savedFile,'utf8')):null;
 if(process.env.CRMEB_AUDIT_ROUNDTRIP){const data=JSON.parse(fs.readFileSync(process.env.CRMEB_AUDIT_ROUNDTRIP,'utf8'));for(const [target,key]of [[home,'home'],[category,'category'],[cart,'cart'],[detail,'detail']]){Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,remap(data[key]));}}
 const nav=remap(JSON.parse(fs.readFileSync(path.join(out,'resolved-cart-navigation.json'))));
 const sku=Object.values(product.productValue)[0]||{};
 const row={id:701,product_id:1,cart_num:2,truePrice:product.storeInfo.price,trueStock:product.storeInfo.stock,attrStatus:true,status:true,min_qty:1,
  productInfo:{...product.storeInfo,merchant_name:shop.name,attrInfo:{...sku,suk:sku.suk||'默认',image:sku.image||product.storeInfo.image}}};
 let command={seq:0},reports=[],navMode='home';const requests=[],imageResults=[];
 async function media(filePath){
  if(!/^\/uploads\/[\w/.-]+$/.test(filePath)||filePath.includes('..'))throw Error('Invalid media path');
  const file=path.join(out,'media',filePath.slice('/uploads/'.length));
  if(!fs.existsSync(file)){
    const local=path.join(root,'crmeb/public',filePath);
    if(fs.existsSync(local)){fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(local,file);}
    else {if(process.env.CRMEB_AUDIT_OFFLINE)throw Error('Offline fixture media missing: '+filePath);const r=await fetch('https://mall.hengshucredit.com'+filePath);if(!r.ok)throw Error('Original image '+r.status);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));}
  }
  return file;
 }
 const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,origin);res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Cache-Control','no-store');
  const send=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:200,msg:'audit',data}));};
  try{
   if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
   if(saved && u.pathname.startsWith('/adminapi/')) {
    const p=u.pathname;let data={};
    if(p.endsWith('custom_admin_js')){res.setHeader('Content-Type','application/javascript');return res.end('');}
    const themeMatch=p.match(/\/theme\/info\/\d+\/(\w+)/);
    if(themeMatch)data=themeMatch[1]==='base'?{id:42,title:'装修与APP同步验收'}:saved[themeMatch[1]]||{};
    else if(p.includes('/theme/save/')){
      let raw='';for await(const part of req)raw+=part;
      const body=JSON.parse(raw),{execFileSync}=require('node:child_process');
      const checked=execFileSync(path.join(root,'.build/php74/php.exe'),['-n','-d','extension_dir='+path.join(root,'.build/php74/ext'),'-d','extension=mbstring',path.join(__dirname,'decoration_sync_save.php')],{input:JSON.stringify(body),encoding:'utf8',windowsHide:true});
      saved[body.type]=JSON.parse(checked);fs.writeFileSync(savedFile,JSON.stringify(saved,null,2));data={id:42};
    }else if(p.endsWith('/merchant/shop/options'))data=[{id:1,name:shop.name,available:true}];
    else if(p.endsWith('/diy_pro/get_product')&&!u.searchParams.has('preview_kind'))data=catalog.filter(x=>!u.searchParams.get('ids')||u.searchParams.get('ids').split(',').includes(String(x.id)));
    else if(p.endsWith('/diy_pro/get_product')&&u.searchParams.has('preview_kind')){
      const kind=u.searchParams.get('preview_kind');
      data=kind==='shop'?shop:kind==='follow'?{followed:false,follower_count:1}:kind==='categories'?remap(read('categories')):kind==='shops'?{list:[shop],count:1}:kind==='ranking'?catalog.map((x,i)=>({...x,rank:i+1})):{list:catalog,count:catalog.length};
    }else if(p.includes('category'))data=[];
    return send(data);
   }
   if(saved && u.pathname.startsWith('/admin')) {
    const adminRoot=path.resolve(process.env.CRMEB_AUDIT_ADMIN||path.join(root,'.build/decoration-sync/admin'));
    let file=path.resolve(adminRoot,'.'+u.pathname.replace(/^\/admin/,''));
    if(!file.startsWith(adminRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(adminRoot,'index.html');
    if(file.endsWith('index.html')){
      res.setHeader('Content-Type','text/html');res.setHeader('Set-Cookie','from-crmeb-admin:token=decoration-fixture; Path=/');
      return res.end(fs.readFileSync(file,'utf8').replace('<head>','<head><script>localStorage.setItem("vuex",JSON.stringify({userInfo:{uniqueAuth:["fixture-theme"],userInfo:{id:1}}}));</script>'));
    }
    res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff'})[path.extname(file)]||'application/octet-stream');return fs.createReadStream(file).pipe(res);
   }
   if(u.pathname==='/__command')return send(command);
   if(u.pathname==='/__navigate'){command={seq:command.seq+1,url:u.searchParams.get('url'),login:u.searchParams.get('login')==='1'};reports=[];return send(command);}
   if(u.pathname==='/__probe'){command={seq:command.seq+1,expression:u.searchParams.get('expression')};reports=[];return send(command);}
   if(u.pathname==='/__report'){let raw='';for await(const c of req)raw+=c;reports.push(JSON.parse(raw));return send({});}
   if(u.pathname==='/__reports')return send(reports);
   if(u.pathname==='/__navigation'){navMode=u.searchParams.get('source');return send({});}
   if(u.pathname==='/__requests')return send({requests,imageResults});
   if(u.pathname==='/api/media/image'){
    await media(u.searchParams.get('path'));
    const r=await fetch((process.env.CRMEB_AUDIT_MEDIA_PHP||'http://127.0.0.1:18028')+req.url,{headers:{Accept:req.headers.accept||'*/*'}}),b=Buffer.from(await r.arrayBuffer());
    const png=b.subarray(0,8).toString('hex')==='89504e470d0a1a0a',jpeg=b.subarray(0,3).toString('hex')==='ffd8ff',avif=b.subarray(4,8).toString()==='ftyp'&&b.subarray(8,40).includes(Buffer.from('avif'));
    imageResults.push({path:u.searchParams.get('path'),status:r.status,type:r.headers.get('content-type'),png,jpeg,avif});
    res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/octet-stream'});return res.end(b);
   }
   if(u.pathname.startsWith('/uploads/')){const file=await media(u.pathname);res.setHeader('Content-Type',({'avif':'image/avif','png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','gif':'image/gif'})[file.split('.').pop()]||'application/octet-stream');return fs.createReadStream(file).pipe(res);}
   if(u.pathname.startsWith('/api/')){
    requests.push(req.url);const name=u.pathname.slice(5);let data={};
    if(['get_script','custom_admin_js'].includes(name)){res.setHeader('Content-Type','application/javascript');return res.end('');}
    if(name==='theme_info/home')data=home;
    else if(name==='theme_info/category')data=category;
    else if(name==='theme_info/cart')data={...cart,navigation_source:navMode};
    else if(name==='theme_info/detail')data=detail;
    else if(name==='theme_info/theme')data={theme_color:'#ff4081',gradient_color:'#ff6b98',cart_page:cart};
    else if(name==='theme/navigation')data=u.searchParams.get('page')==='cart'?(navMode==='none'?[]:nav):u.searchParams.get('page')==='category'?category.navigation:Object.values(home.value).find(x=>x.name==='mainNavigation')||[];
    else if(name==='category'||name==='storefront/shop/1/categories')data=remap(read('categories'));
    else if(name==='products')data=catalog.filter(x=>!u.searchParams.get('ids')||u.searchParams.get('ids').split(',').includes(String(x.id)));
    else if(name==='storefront/products')data={list:catalog,count:catalog.length};
    else if(name==='product/detail/1')data=product;
    else if(name.startsWith('product/real_price/'))data={real_price:product.storeInfo.price,member_price:product.storeInfo.price,ot_price:product.storeInfo.ot_price};
    else if(name==='storefront/shop/1')data=shop;
    else if(name==='storefront/shop/1/follow')data={followed:false,follower_count:1};
    else if(name==='storefront/shop/1/theme/home')data=saved&&u.searchParams.get('shop_page_id')==='42'?{page:saved.home,palette:saved.theme,shop_id:1,theme_id:42}:{...shopHome,page:shopHome.page?.value?shopHome.page:loadShared('merchantDecoration').defaultShopPage()};
    else if(name==='storefront/shop/1/theme/category')data=saved&&u.searchParams.get('shop_page_id')==='42'?{page:saved.category,palette:saved.theme,shop_id:1,theme_id:42}:shopCategory;
    else if(name==='storefront/product/1/theme')data={page:detail,palette:saved&&u.searchParams.get('shop_page_id')==='42'?saved.theme:{theme_color:'#ff4081'},shop_id:1};
    else if(name==='cart/count')data={count:2,ids:[701]};
    else if(name==='v2/diy/sign')data={continuousSignDays:0,signGivePoint:0,signList:[[]]};
    else if(name==='seckill/index')data={seckillTime:[],seckillTimeIndex:-1};
    else if(['pink','combination/list','bargain/list','reply/list/1','v2/cart_list'].includes(name))data=[];
    else if(name==='cart/list')data={valid:u.searchParams.get('status')==='2'?[]:[row],invalid:[]};
    else if(name==='cart/full_reduction_quote')data={pay_price:(Number(row.truePrice)*2).toFixed(2),full_reduction_price:'0.00'};
    else if(name==='user')data={uid:9999,nickname:'隔离验收用户',orderStatusNum:{},diy_data:{value:0}};
    else if(name==='menu/user')data={diy_data:{value:0},routine_my_menus:[]};
    else if(name==='v2/get_today_coupon')data={list:[]};
    else if(name==='v2/new_coupon')data={show:false,list:[]};
    else if(name.startsWith('marketing/product_rankings/'))data={list:[]};
    else if(name.includes('product/hot'))data=[];
    return send(data);
   }
   let file=path.resolve(h5,'.'+u.pathname);if(!file.startsWith(h5+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(h5,'index.html');
   res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  }catch(e){res.writeHead(502);res.end(e.message);}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return {server,origin,home,cart,category,product,catalog};
}
module.exports={createServer};
if(require.main===module)createServer().then(()=>console.log('Live snapshot replay ready: '+origin));
