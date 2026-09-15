// Curated suites have explicit prerequisites. Missing/skip is never a release pass.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {sourceState}=require('../../help/release/source-state.cjs');
const root=path.resolve(__dirname,'../..'),group=process.argv[2]||'method',out=path.join(root,'.build/commerce-hardening-20260914');
const node=path.join(root,'HBuilderX/plugins/node/node.exe'),php=process.env.PHP_BINARY||path.join(root,'.build/php74/php.exe');
const python=process.env.PYTHON_BINARY||path.join(root,'tests/tooling/.venv/Scripts/python.exe');
const before=sourceState(),env={...process.env,NODE_PATH:path.join(root,'tests/tooling/node_modules'),PYTHONIOENCODING:'utf-8',PHP_BINARY:php};
const method=['admin_routes','admin_tags_lifecycle','request_completion','config_requests','cart_loading','chat_socket','h5_category','h5_lazy_images','full_reduction_frontend','full_reduction_mobile','product_description','product_detail_empty','product_recommendation_race','product_brand_frontend','merchant_frontend','storefront_frontend','decoration_scope','decoration_catalog','page_actions','main_navigation','theme_page_navigation','discount_explanation','ranking_assets','ranking_detail'];
method.push('transfer_request','release_gate');
method.push('home_prefetch','app_startup','app_home_startup');
const phpMethod=['invoice_ownership','apple_auth','cart_decoration','category_decoration','decoration_controls','page_module_operations','theme_palette','page_actions','theme_import_decoration','payment_transport','commerce_lock','commerce_delivery_failure'];
const suites={
  method:[...method.map(name=>[node,path.join(__dirname,name+'.cjs')]),...phpMethod.map(name=>[php,path.join(__dirname,name+'.php')]),[python,path.join(__dirname,'media_display.py')]],
  database:['commerce_database.php','commerce_refund.php','commerce_tasks.php','commerce_concurrency.php','commerce_theme_roundtrip.php','product_quality.php','payment_database.php','payment_dispatch.php','payment_nested_dispatch.php'].map(file=>[php,path.join(__dirname,file)]),
  http:[[python,path.join(__dirname,'commerce_http.py')]],
  browser:[[node,path.join(__dirname,'commerce_browser.cjs')],[node,path.join(__dirname,'product_recommendations.cjs')],[node,path.join(__dirname,'commerce_admin_browser.cjs')]],
  native:[[node,path.join(__dirname,'commerce_native.cjs')]],
};
if(!suites[group])throw Error('Use method, database, http, browser or native');
fs.mkdirSync(out,{recursive:true});const results=[];
for(const command of suites[group]){
  const name=path.basename(command[1]);let result;
  try{
    const commandEnv={...env};
    if(group==='database'&&['payment_database.php','payment_dispatch.php','payment_nested_dispatch.php'].includes(name))commandEnv.CRMEB_AUDIT_DATABASE='crmeb_audit';
    const proc=cp.spawnSync(command[0],command.slice(1),{cwd:root,env:commandEnv,encoding:'utf8',windowsHide:true,timeout:group==='native'?300000:180000,maxBuffer:8*1024*1024});
    const output=(proc.stdout||'')+(proc.stderr||'');fs.writeFileSync(path.join(out,group+'-'+name+'.log'),output);
    const skipped=/(?:# skipped [1-9]|\bSKIP\b|skipped=[1-9]|"skipped"\s*:\s*[1-9])/i.test(output);
    const runtimeError=/\[Vue warn\]: Error|UnhandledPromiseRejection|Fatal error:/.test(output);
    result={name,exitCode:proc.status,passed:proc.status===0&&!proc.error&&!skipped&&!runtimeError,skipped,runtimeError,error:proc.error?proc.error.message:undefined};
  }catch(e){result={name,passed:false,error:e.message};}
  results.push(result);console.log(JSON.stringify(result));
}
const unchanged=sourceState().sourceDigest===before.sourceDigest;
const receipt={group,createdAt:new Date().toISOString(),...before,unchanged,passed:unchanged&&results.every(r=>r.passed),results};
fs.writeFileSync(path.join(out,'receipt-'+group+'.json'),JSON.stringify(receipt,null,2));
if(!receipt.passed)process.exitCode=1;
