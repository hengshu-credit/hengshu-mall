const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.build/commerce-hardening-20260914');
const adb=path.join(root,'help/dev/.state/android-tools/platform-tools/adb.exe');
const devices=execFileSync(adb,['devices'],{encoding:'utf8',windowsHide:true});assert(/emulator-5554\s+device/.test(devices),'Required Android emulator is not connected');
process.env.CRMEB_AUDIT_PORT='18126';process.env.CRMEB_AUDIT_H5=path.join(root,'.build/storefront-hardening/h5');process.env.CRMEB_AUDIT_OUT=out;
process.env.CRMEB_AUDIT_APP=path.join(root,'.build/storefront-hardening/app');process.env.CRMEB_AUDIT_OFFLINE='1';
process.env.CRMEB_AUDIT_ROUNDTRIP=path.join(out,'saved-themes.json');
process.env.CRMEB_AUDIT_SAVED=path.join(out,'preview-themes.json');
const {createServer}=require('./storefront_audit_fixture.cjs');
const {startMedia}=require('./commerce_fixture_services.cjs');
(async()=>{
  require('./commerce_build_assert.cjs')('app');
  assert(fs.existsSync(path.join(process.env.CRMEB_AUDIT_APP,'app-service.js')),'Current App production build required');
  const media=await startMedia();const fixture=await createServer();
  try{
    const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,'storefront_audit_native.cjs')],{cwd:root,env:process.env,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',resolve);});
    assert.equal(status,0,'Android UI suite failed');
    const results=JSON.parse(fs.readFileSync(path.join(out,'android-results.json'),'utf8'));assert(results.length>=6,'All six pages must be exercised');
  }finally{await new Promise(resolve=>fixture.server.close(resolve));media.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
