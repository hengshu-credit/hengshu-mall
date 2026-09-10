const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const babel = require(path.join(root, 'template/admin/node_modules/@babel/core'));
const code = babel.transformSync(fs.readFileSync(path.join(root, 'template/shared/mainNavigation.js'), 'utf8'), {
  babelrc: false, configFile: false, plugins: [require(path.join(root, 'template/admin/node_modules/@babel/plugin-transform-modules-commonjs'))],
}).code;
const shared = { exports: {} }; new Function('module', 'exports', code)(shared, shared.exports);
const { activeNavigationIndex: active, navigationVisible: visible } = shared.exports;
const menus = [{ link: '/pages/goods_cate/goods_cate' }, { link: '/pages/goods_cate/goods_cate?sid=8' }, { link: '/pages/goods_cate/goods_cate?sid=9' }];
assert.equal(active(menus, '/pages/goods_cate/goods_cate?sid=9&cid=1'), 2);
assert.equal(active(menus, '/pages/goods_cate/goods_cate?sid=8'), 1);
assert.equal(active(menus, '/pages/goods_cate/goods_cate?sid=7'), 0);
assert.equal(active(menus, '/pages/user/index'), -1);
assert.equal(active([{ link: '/pages/test?q=a%3Db' }], '/pages/test?q=a%3Db'), 0);
const nav = { effectConfig: { tabVal: 1 }, menuList: menus };
assert.equal(visible(nav, menus[0].link, false), false);
nav.mainNavigation = { visiblePages: [menus[0].link] };
assert.equal(visible(nav, menus[1].link, false), true);
assert.equal(visible(nav, '/pages/user/index'), false);
nav.effectConfig.tabVal = 0;
assert.equal(visible(nav, menus[0].link), false);
console.log('PASS navigation: query-specific single selection, URL decoding, legacy visibility and configured page visibility');
