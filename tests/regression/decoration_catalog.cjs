const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {root,compiler}=require('./theme_component_harness.cjs'),{loadShared}=require('./ranking_shared_loader.cjs');
const {preprocess}=require(path.join(root,'HBuilderX/plugins/uniapp-cli/node_modules/@dcloudio/vue-cli-plugin-uni/packages/webpack-preprocess-loader/preprocess/lib/preprocess'));
const renderer=preprocess(compiler.parseComponent(fs.readFileSync(path.join(root,'template/uni-app/subpackage/diyComponents/pageDesign.vue'),'utf8')).template.content,{APP_PLUS:true,APP:true},{type:'html'});
const modules=loadShared('merchantDecoration').merchantModuleNames,rows=[];
const dir=path.join(root,'template/admin/src/components/mobilePage');
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.vue'))){
 const file=path.join(dir,name),source=fs.readFileSync(file,'utf8'),component=source.match(/defaultName:\s*['"]([^'"]+)/)?.[1],type=Number(source.match(/\n\s*type:\s*(-?\d+)/)?.[1]);
 if(!component||type<0)continue;
 const supported=loadShared('decorationCapabilities').decorationSupported(component,'app');
 const owner=({bottomMenu:'goods_details/index.vue',mainNavigation:'pageFooter/index.vue',productRank:'marketingRankInfo.vue'})[component]||(modules.includes(component)?'merchantModules.vue':'pageDesign.vue');
 if(supported&&owner==='pageDesign.vue')assert(renderer.includes('"'+component+'"')||renderer.includes("'"+component+"'"),'No APP render branch: '+component);
 if(!supported)assert.equal(component,'liveBroadcast');
 assert.deepEqual(compiler.compile(compiler.parseComponent(source).template.content).errors,[],name+' preview template');
 rows.push({component,admin:'template/admin/src/components/mobilePage/'+name,type,app:supported,renderer:owner,limitation:supported?'':'微信小程序直播插件专属，APP编辑视图不提供此组件'});
}
const controls=path.join(root,'template/admin/src/components/mobileConfig');let panels=0;
for(const name of fs.readdirSync(controls).filter(n=>n.endsWith('.vue'))){const sfc=compiler.parseComponent(fs.readFileSync(path.join(controls,name),'utf8'));if(sfc.template){assert.deepEqual(compiler.compile(sfc.template.content).errors,[],name+' controls');panels++;}}
const out=path.join(root,'.build/decoration-sync');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'component-matrix.json'),JSON.stringify({kind:'Full component mapping and template compilation; not exhaustive interaction validation',components:rows.length,appComponents:rows.filter(x=>x.app).length,controlPanels:panels,rows},null,2));
console.log('PASS decoration catalog: '+rows.length+' available components, '+rows.filter(x=>x.app).length+' APP mappings, '+panels+' configuration templates');
