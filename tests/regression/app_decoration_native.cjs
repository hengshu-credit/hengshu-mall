// Run only against this project's Android emulator; restores its packaged resources afterward.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/app-decoration-fix');
const adb=path.join(root,'help/dev/.state/android-tools/platform-tools/adb.exe');
const device='/data/user/0/com.hengshucredit.mall/files/apps/__UNI__159D54B/www';
const run=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{windowsHide:true,timeout:30000,maxBuffer:16*1024*1024});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function navigate(url,login=false){const {data}=await(await fetch('http://127.0.0.1:18023/__navigate?url='+encodeURIComponent(url)+'&login='+(login?'1':'0'))).json();for(let i=0;i<80;i++){const {data:ack}=await(await fetch('http://127.0.0.1:18023/__status')).json();if(ack.seq===data.seq){assert(!ack.error,JSON.stringify(ack));return ack;}await pause(250);}throw Error('Native navigation did not acknowledge '+url);}
async function main(){
 assert.equal(run('shell','getprop','ro.kernel.qemu').toString().trim(),'1');
 assert(fs.existsSync(path.join(out,'native-backup/app-service.js')),'Back up emulator resources before testing');
 const staged=path.join(out,'native-fixture');fs.cpSync(path.join(out,fs.existsSync(path.join(out,'app-final/app-service.js'))?'app-final':'app'),staged,{recursive:true});
 function patch(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())patch(file);else if(entry.name.endsWith('.js'))fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('https://mall.hengshucredit.com','http://127.0.0.1:18023'));}}
 patch(staged);
 fs.appendFileSync(path.join(staged,'app-service.js'),`;setTimeout(function(){var seen=0;setInterval(function(){uni.request({url:'http://127.0.0.1:18023/__command',success:function(response){var cmd=response.data.data;if(!cmd||!cmd.seq||cmd.seq===seen)return;seen=cmd.seq;function ack(error){uni.request({url:'http://127.0.0.1:18023/__ack',method:'POST',data:{seq:cmd.seq,error:error||'',url:cmd.url}});}try{if(cmd.login){var app=getApp();var store=app.$store||(app.$vm&&app.$vm.$store);store.commit('LOGIN',{token:'fixture',time:0});store.commit('SETUID',1);}else{var currentApp=getApp();var currentStore=currentApp.$store||(currentApp.$vm&&currentApp.$vm.$store);if(currentStore&&currentStore.state.app.token==='fixture')currentStore.commit('LOGOUT');}uni.reLaunch({url:cmd.url,success:function(){ack();},fail:function(e){ack(e.errMsg);}});}catch(e){ack(e.message);}}});},400);},1500);`);
 run('reverse','tcp:18023','tcp:18023');run('shell','am','force-stop','com.hengshucredit.mall');
 try{
  run('push',staged+'/.',device);
  run('shell','am','start','-n','com.hengshucredit.mall/io.dcloud.PandoraEntry');
  for(const [name,url,login] of [['home','/pages/index/index',false],['detail','/pages/goods_details/index?id=1',false],['cart','/pages/order_addcart/order_addcart',true],['user','/pages/user/index',true]]){
   await navigate(url,login);await pause(2000);
   fs.writeFileSync(path.join(out,'native-'+name+'.png'),run('exec-out','screencap','-p'));
   console.log('CAPTURE Android '+name);
  }
  await navigate('/pages/index/index',false);
  fs.writeFileSync(path.join(out,'native-sockets.txt'),run('shell','cat','/proc/net/unix').toString().split('\n').filter(line=>line.includes('webview_devtools')).join('\n'));
 }finally{
  run('shell','am','force-stop','com.hengshucredit.mall');run('push',path.join(out,'native-backup')+'/.',device);
  run('reverse','--remove','tcp:18023');
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
