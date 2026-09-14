const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),dist=process.env.CRMEB_ADMIN_BUILD||path.join(root,'.build/theme-module-operations/admin');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  let file=path.resolve(dist,'.'+pathname.replace(/^\/admin/,''));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(dist,'index.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const base='http://127.0.0.1:'+server.address().port;
    const context=await browser.newContext({viewport:{width:1600,height:1000}});
    await context.addCookies([{name:'from-crmeb-admin:token',value:'fixture-only',url:base}]);
    await context.addInitScript(()=>localStorage.setItem('vuex',JSON.stringify({userInfo:{uniqueAuth:['fixture-theme'],userInfo:{id:1}}})));
    await context.routeWebSocket('**/*',()=>{});
    const page=await context.newPage(),errors=[],theme={base:{id:42,title:'组件操作回归'},theme:{theme_color:'#155EEF'},home:{value:{}},user:{value:{}},detail:{value:{},actions_mode:'components'}};
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/adminapi/**',async route=>{
      const u=new URL(route.request().url());let data={};
      if(route.request().resourceType()==='script'||u.pathname.endsWith('/custom_admin_js'))return route.fulfill({contentType:'application/javascript',body:''});
      const match=u.pathname.match(/\/theme\/info\/\d+\/(\w+)/);
      if(match)data=theme[match[1]]||{};
      else if(/\/theme\/save\//.test(u.pathname)){const body=route.request().postDataJSON();theme[body.type]=body.value;data={id:42};}
      else if(/category_list/.test(u.pathname))data=[];
      return route.fulfill({json:{status:200,msg:'成功',data}});
    });
    for(const type of ['home','user','detail']) {
      await page.goto(base+`/admin/setting/edit_theme?id=42&type=${type}`);
      await page.waitForFunction(()=>document.querySelector('.diy-page')?.__vue__.loading===false);
      await page.evaluate(()=>{window.diy=document.querySelector('.diy-page').__vue__;});
      const library=page.locator('.diy-wrapper .left .list-group-item');
      await library.filter({hasText:'辅助空白'}).click();
      await page.evaluate(()=>{diy.defaultArrays[diy.mConfig[0].num].heightConfig.val=100;});
      await library.filter({hasText:'导航栏'}).click();
      const dock=page.locator('.dock-component');
      await dock.getByRole('button',{name:'隐藏导航栏',exact:true}).click();
      assert.equal(await dock.locator('.iconyincang').count(),1);
      assert.notEqual(await dock.locator('.iconyincang').evaluate(el=>getComputedStyle(el,'::before').content),'none');
      const before=await page.evaluate(()=>JSON.stringify(diy.defaultArrays));
      await dock.getByRole('button',{name:'复制导航栏',exact:true}).click();
      assert.match(await page.locator('.el-message').last().innerText(),/只能添加一个/);
      assert.equal(await page.evaluate(()=>JSON.stringify(diy.defaultArrays)),before);
      assert.equal(await dock.locator('.handleType > button').count(),5);
      await library.filter({hasText:'辅助空白'}).click();
      await page.evaluate(()=>{diy.defaultArrays[diy.mConfig[diy.activeIndex].num].heightConfig.val=80;});
      const frames=page.locator('.scroll-box .mConfig-item');
      await frames.last().locator('.iconshang').click();
      assert.equal(await page.evaluate(()=>diy.defaultArrays[diy.flowComponents[0].num].heightConfig.val),80,'up skips the fixed navigation between content modules');
      assert.equal(await page.evaluate(()=>diy.activeIndex),0);
      await frames.first().locator('.icona-fuzhi1').click();
      assert.equal(await frames.count(),3);
      const copyId=await page.evaluate(()=>diy.mConfig[diy.activeIndex].id);
      await page.evaluate(()=>{diy.defaultArrays[diy.mConfig[diy.activeIndex].num].heightConfig.val=60;});
      assert.equal(await page.evaluate(()=>diy.defaultArrays[diy.flowComponents[0].num].heightConfig.val),80);
      const start=await frames.nth(1).boundingBox(),target=await frames.first().boundingBox();
      await page.mouse.move(start.x+100,start.y+50);await page.mouse.down();
      await page.mouse.move(start.x+100,start.y+40,{steps:3});await page.mouse.move(target.x+100,target.y+2,{steps:20});
      await page.waitForTimeout(350);await page.mouse.up();
      await page.waitForFunction(id=>diy.flowComponents[0].id===id,copyId);
      const heights=await page.evaluate(()=>diy.flowComponents.map(item=>diy.defaultArrays[item.num].heightConfig.val));
      assert.deepEqual(heights,[60,80,100]);
      await page.getByRole('button',{name:'保存',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.edit-theme-layout').__vue__.isDirty);
      await page.reload();await page.waitForFunction(()=>document.querySelector('.diy-page')?.__vue__.loading===false);
      assert.deepEqual(await page.evaluate(()=>{const vm=document.querySelector('.diy-page').__vue__;return vm.flowComponents.map(item=>vm.defaultArrays[item.num].heightConfig.val);}),heights);
      assert.equal(await page.locator('.dock-component.hide').count(),1);
      console.log(`PASS production ${type}: navigation tools, singleton protection, independent copies, visible-neighbor moves, actual drag and persisted order`);
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error);server.closeAllConnections();server.close();process.exitCode=1;});
