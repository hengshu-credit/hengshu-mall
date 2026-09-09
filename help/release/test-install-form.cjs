const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { JSDOM, VirtualConsole } = require('../../template/admin/node_modules/jsdom');
const install = path.resolve(process.argv[2] || 'crmeb/public/install');
async function check(dbResult) {
  const source = fs.readFileSync(path.join(install, 'templates/step3.php'), 'utf8').replace(/<\?php[\s\S]*?\?>/g, '');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), { url: 'http://localhost/install/index.php?step=3', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  try {
    for (const file of ['vue2.6.11.js', 'element-ui.js', 'jquery.js']) w.eval(fs.readFileSync(path.join(install, 'js', file), 'utf8'));
    w.eval(source.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
    let submitted = 0;
    const calls = [];
    w.HTMLFormElement.prototype.submit = () => { submitted++; };
    w.$.ajax = options => { calls.push(options); options.success(options.url.includes('mysqldbpwd') ? dbResult : 1); };
    for (const [id, value] of Object.entries({dbhost:'mysql',dbport:'3306',dbuser:'crmeb',dbpw:'test-db-password',dbname:'crmeb',rbhost:'redis',rbport:'6379',rbselect:'0',rbpw:'test-redis-password',manager:'admin',manager_pwd:'test-admin-password',manager_ckpwd:'test-admin-password'})) w.document.getElementById(id).value = value;
    const vm = w.document.getElementById('step3').__vue__;
    assert(vm, 'Installer Vue application mounts');
    vm.radio = 1;
    await vm.$nextTick();
    w.document.getElementById('dbport').dispatchEvent(new w.Event('blur'));
    assert.deepEqual(errors, [], 'Leaving the database port field must not throw');
    w.document.querySelector('.next a').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(errors, []);
    assert.equal(calls[0].data.dbHost, 'mysql');
    if (dbResult === 1) {
      assert.equal(calls.length, 2);
      assert.equal(calls[1].data.rbhost, 'redis');
      assert.equal(submitted, 1, 'Valid MySQL, Redis and administrator fields submit installation');
    } else {
      assert.equal(submitted, 0);
      assert(w.document.getElementById('J_install_tip_dbpw').textContent.includes('用户名或密码错误'));
    }
  } finally { w.close(); }
}
check(1).then(() => check(1045)).then(() => console.log('PASS installer blur, valid submission and invalid credentials')).catch(error => { console.error(error); process.exitCode = 1; });
