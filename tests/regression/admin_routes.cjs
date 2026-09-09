// Load the real route definitions without loading page components or a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const admin = path.resolve(__dirname, '../../template/admin');
const babel = require(path.join(admin, 'node_modules/@babel/core'));
const transformModules = require(path.join(admin, 'node_modules/@babel/plugin-transform-modules-commonjs'));
const Router = require(path.join(admin, 'node_modules/vue-router'));
const cache = new Map();
function load(file) {
  if (!path.extname(file)) file += '.js';
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const localRequire = (request) => {
    if (request === '@/layout') return {};
    if (request === '@/setting') return load(path.join(admin, 'src/setting.js'));
    if (request.startsWith('.')) return load(path.resolve(path.dirname(file), request));
    return require(require.resolve(request, { paths: [admin] }));
  };
  localRequire.context = (relative, recursive, pattern) => {
    const root = path.resolve(path.dirname(file), relative);
    const files = fs.readdirSync(root, { recursive }).filter(name => pattern.test(name));
    const context = name => load(path.join(root, name));
    context.keys = () => files.map(name => './' + name.replaceAll('\\', '/'));
    return context;
  };
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false, plugins: [transformModules],
  });
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire,
    process: { env: {} }, location: { origin: 'http://localhost:8011' } }, { filename: file });
  return module.exports;
}
const routes = load(path.join(admin, 'src/router/routers.js')).default;
const names = new Map();
const redirects = new Set();
const duplicates = [];
function walk(records, parent = '') {
  for (const route of records) {
    const fullPath = route.path.startsWith('/') ? route.path : parent.replace(/\/$/, '') + '/' + route.path;
    if (route.name) {
      if (route.redirect) redirects.add(route.name);
      if (names.has(route.name)) duplicates.push(`${route.name}: ${names.get(route.name)} and ${fullPath}`);
      else names.set(route.name, fullPath);
    }
    if (route.children) walk(route.children, fullPath);
  }
}
walk(routes);
assert.deepEqual(duplicates, [], 'Every named route must identify exactly one page');
const router = new Router({ mode: 'abstract', routes });
for (const [name, pathname] of names) {
  if (pathname.includes(':') || pathname.includes('*') || redirects.has(name)) continue;
  const matched = router.match({ name });
  // Explicit redirect routes are intentionally resolved to their destinations.
  if (!matched.redirectedFrom) assert.equal(matched.path, pathname.replace(/\/$/, '') || '/', name);
}
console.log(`PASS: ${names.size} unique route names and named navigation`);
