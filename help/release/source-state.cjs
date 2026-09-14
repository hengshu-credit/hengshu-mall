const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const roots = ['crmeb/app', 'crmeb/crmeb', 'crmeb/config', 'crmeb/route', 'crmeb/upgrade', 'crmeb/public/statics/ranking', 'template/admin/src', 'template/shared', 'template/uni-app', 'services', 'tests/regression'];
function sourceState(scope='all') {
  const records = [];
  function visit(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'unpackage', '.venv', '__pycache__', '.hbuilderx', 'runtime'].includes(item.name) || item.name.startsWith('.env')) continue;
      const file = path.join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile() && /\.(php|js|cjs|vue|scss|css|json|py|sql|yml|yaml|png|jpg|jpeg|svg|webp|avif|woff2?|ttf)$/.test(item.name)) records.push([path.relative(root,file).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
    }
  }
  const selected=scope==='admin'?['template/admin/src','template/shared']:['h5','app'].includes(scope)?['template/uni-app','template/shared']:roots;
  selected.forEach(dir=>visit(path.join(root,dir)));
  const extra=scope==='admin'?['template/admin/package.json','template/admin/package-lock.json','template/admin/vue.config.js']:['h5','app'].includes(scope)?['HBuilderX/plugins/uniapp-cli/package.json','HBuilderX/plugins/uniapp-cli/bin/uniapp-cli.js']:['template/admin/package.json','template/admin/package-lock.json','crmeb/composer.json','crmeb/composer.lock','tests/tooling/package-lock.json','tests/tooling/requirements.lock'];
  for(const name of extra)records.push([name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')]);
  records.sort((a,b)=>a[0].localeCompare(b[0],'en'));
  const dirty = cp.execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim();
  return {commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:!!dirty,
    sourceDigest:crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex'),fileCount:records.length};
}
module.exports = {sourceState};
if (require.main === module) console.log(JSON.stringify(sourceState(process.argv[2]||'all'),null,2));
