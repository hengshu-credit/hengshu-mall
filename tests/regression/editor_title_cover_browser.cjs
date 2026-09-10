const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const {bundle,install,root}=require('./theme_component_harness.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await install(page,bundle('template/admin/src/pages/setting/theme/editTheme/components/CategoryEditor.vue'));await page.waitForFunction(()=>!editor.loading);
 const font=fs.readFileSync(path.join(root,'template/admin/src/assets/iconfontYI/iconfontYI.woff2')).toString('base64');
 let css=fs.readFileSync(path.join(root,'template/admin/src/styles/font/mobile_iconfont.css'),'utf8');css=css.replace(/@font-face\s*\{[^}]+\}/,`@font-face{font-family:'mb-iconfont';src:url(data:font/woff2;base64,${font}) format('woff2')}`);await page.addStyleTag({content:css});
 await page.evaluate(()=>{editor.config.title_actions.left=[{type:'home',label:'首页',icon:'icon-shouye6',image:'',enabled:true,showLabel:false}];editor.config.title_actions.right=[{type:'search',label:'搜索',icon:'icon-sousuo',image:'',enabled:true,showLabel:true}];});await page.evaluate(()=>document.fonts.ready);
 for(const size of [20,30]){
 await page.evaluate(size=>{editor.config.title_actions.iconSize=size;},size);
 const bounds=await page.locator('.canvas-page-title').evaluate(el=>{const title=el.getBoundingClientRect();return [...el.querySelectorAll('.title-right-actions i,.title-right-actions span')].map(item=>({titleTop:title.top,titleBottom:title.bottom,top:item.getBoundingClientRect().top,bottom:item.getBoundingClientRect().bottom}));});
 assert.ok(bounds.every(r=>r.top>=r.titleTop && r.bottom<=r.titleBottom),`search icon and label fit title at ${size}px`);
 }
 await page.evaluate(()=>{editor.config.title_actions.iconSize=20;const NativeFile=File;window.File=class extends NativeFile{constructor(...args){super(...args);window.capturedCover=this;}};});
 await page.locator('.page-editor-actions').getByRole('button',{name:'保存为封面',exact:true}).click();await page.waitForFunction(()=>covers.length===1);
 const bytes=await page.evaluate(async()=>Array.from(new Uint8Array(await capturedCover.arrayBuffer())));
 const output=path.join(root,'.build/theme-consistency/screenshots/category-title-cover.png');fs.writeFileSync(output,Buffer.from(bytes));
 await page.evaluate(()=>{editor.$route.query={id:'0',tid:'99'};});
 await page.locator('.page-editor-actions').getByRole('button',{name:'另存模板',exact:true}).click();await page.getByPlaceholder('请输入模板名称').fill('来源模板');await page.getByRole('button',{name:'保存模板',exact:true}).click();await page.waitForFunction(()=>saved.length===2);
 assert.equal(await page.evaluate(()=>saved[1].tid),99,'string zero route ID retains source template ID');
 await install(page,bundle('template/admin/src/pages/setting/theme/editTheme/components/CartEditor.vue'));await page.waitForFunction(()=>!editor.loading);
 await page.evaluate(async()=>{editor.config.title_actions.right=[];const settings=document.querySelector('.header-actions-settings').__vue__;settings.add('right');const action=editor.config.title_actions.right[0];action.type='cartManage';settings.changeType(action);await editor.$nextTick();});
 assert.equal(await page.locator('.title-right-actions').innerText(),'管理','switching to text-only manage action provides a visible default');
 console.log('PASS title cover geometry/PNG, new-template save-as source and text-only manage defaults');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
