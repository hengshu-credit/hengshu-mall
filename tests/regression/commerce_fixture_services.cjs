const cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs'),net=require('node:net');
const root=path.resolve(__dirname,'../..');
async function waitPort(port,child){const end=Date.now()+10000;while(Date.now()<end){if(child.exitCode!==null)throw Error('Fixture exited '+child.exitCode);const ready=await new Promise(resolve=>{const socket=net.connect({port,host:'127.0.0.1'});socket.on('connect',()=>{socket.destroy();resolve(true);});socket.on('error',()=>resolve(false));});if(ready)return;await new Promise(r=>setTimeout(r,80));}throw Error('Fixture startup timed out');}
async function startMedia(){
  const python=process.env.PYTHON_BINARY||path.join(root,'tests/tooling/.venv/Scripts/python.exe');
  const php=process.env.PHP_BINARY||path.join(root,'.build/php74/php.exe');
  const children=[],handles=[];const close=()=>{children.forEach(c=>c.kill());handles.forEach(fd=>fs.closeSync(fd));};
  try{
    for(const [binary,args,port,extra]of [[python,[path.join(root,'services/media-display/server.py')],18129,{PORT:'18129',MEDIA_ROOT:path.join(root,'.build/storefront-audit/media')}],[php,['-n','-S','127.0.0.1:18128',path.join(__dirname,'commerce_media_router.php')],18128,{AUDIT_MEDIA_ORIGIN:'http://127.0.0.1:18129'}]]){
      const fd=fs.openSync(path.join(root,'.build/commerce-hardening-20260914/fixture-'+port+'.log'),'w');handles.push(fd);
      const child=cp.spawn(binary,args,{cwd:root,env:{...process.env,...extra},windowsHide:true,stdio:['ignore',fd,fd]});children.push(child);await waitPort(port,child);
    }
    process.env.CRMEB_AUDIT_MEDIA_PHP='http://127.0.0.1:18128';
    return {close};
  }catch(error){close();throw error;}
}
module.exports={startMedia};
