// Runs the editor-saved home configurations on the local Android emulator only.
// Replaces and then restores one emulator resource; release APKs stay untouched.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/home-title');
const adb=path.join(root,'help/dev/.state/android-tools/platform-tools/adb.exe');
const target='/data/user/0/com.hengshucredit.mall/files/apps/__UNI__159D54B/www/app-service.js';
const run=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{windowsHide:true,timeout:30000,maxBuffer:16*1024*1024});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 assert.equal(run('shell','getprop','ro.kernel.qemu').toString().trim(),'1');
 const backup=path.join(out,'native-app-service.backup.js'),testFile=path.join(out,'native-app-service.fixture.js');
 assert(!fs.existsSync(backup),'Keep the original backup; do not overwrite it');
 run('pull',target,backup);
 const original=fs.readFileSync(backup),variants=JSON.parse(fs.readFileSync(path.join(out,'saved-pages.json')));
 let state='absent',homeReads=0,report=null;
 const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://fixture');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(u.pathname==='/__title_report'){let raw='';for await(const chunk of req)raw+=chunk;report=JSON.parse(raw);res.end('{}');return;}
  let data={};
  if(u.pathname==='/api/theme_info/home'){data=variants[state];homeReads++;}
  else if(u.pathname==='/api/theme_info/theme')data={theme_color:'#155eef'};
  else if(['/api/theme/navigation','/api/category','/api/products'].includes(u.pathname))data=[];
  else if(u.pathname==='/api/v2/get_today_coupon')data={list:[]};
  else if(u.pathname==='/api/v2/new_coupon')data={show:false,list:[]};
  else if(u.pathname==='/api/cart/count')data={count:0,ids:[]};
  res.end(JSON.stringify({status:200,msg:'fixture',data}));
 });
 await new Promise(resolve=>server.listen(18027,'127.0.0.1',resolve));
 const probe=`;setInterval(function(){try{var p=getCurrentPages().filter(function(p){return p.route==='pages/index/index';})[0];if(!p)return;var vm=p.$vm;var titles=[];function walk(v){if(!v)return;var cls=v._vnode&&v._vnode.data&&v._vnode.data.staticClass;if(cls==='page-title-bar')titles.push(v.title);(v.$children||[]).forEach(walk);}walk(vm);uni.request({url:'http://127.0.0.1:18027/__title_report',method:'POST',data:{title:vm.currentDiyData&&vm.currentDiyData.title,titles:titles}});}catch(e){}},500);`;
 fs.writeFileSync(testFile,original.toString().replaceAll('https://mall.hengshucredit.com','http://127.0.0.1:18027')+probe);
 run('reverse','tcp:18027','tcp:18027');
 try{
  run('shell','am','force-stop','com.hengshucredit.mall');run('push',testFile,target);
  for(const [key,titles] of [['absent',[]],['added',['首页精选好物']],['hidden',[]],['deleted',[]],['restored',['重新添加的首页标题']]]){
   state=key;report=null;const before=homeReads;
   run('shell','am','force-stop','com.hengshucredit.mall');
   run('shell','am','start','-n','com.hengshucredit.mall/io.dcloud.PandoraEntry');
   for(let attempt=0;attempt<50;attempt++){
    if(homeReads>before&&report?.title==='首页管理名称'&&JSON.stringify(report.titles)===JSON.stringify(titles))break;
    await pause(300);
   }
   assert(homeReads>before,'APP must load the saved home configuration');
   assert.deepEqual(report?.titles,titles,key);
   await pause(600);fs.writeFileSync(path.join(out,'android-'+key+'.png'),run('exec-out','screencap','-p'));
   console.log('PASS Android home title: '+key);
  }
 }finally{
  run('shell','am','force-stop','com.hengshucredit.mall');run('push',backup,target);
  const restored=path.join(out,'native-app-service.restored.js');run('pull',target,restored);
  assert(fs.readFileSync(restored).equals(original),'Restore original APP resources byte-for-byte');
  run('reverse','--remove','tcp:18027');server.closeAllConnections();server.close();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
