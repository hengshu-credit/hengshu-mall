// Called by the root package.ps1 after compiling the admin frontend.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const root = path.resolve(__dirname, '../..');
if (!process.argv[2]) throw Error('Run ./package.ps1 from the project root');
const stageParent = path.resolve(process.argv[2]);
if (!stageParent.startsWith(path.join(root, '.build') + path.sep)) throw Error('Staging must be inside .build');
const output = path.join(root, 'dist');
const stage = path.join(stageParent, 'crmeb-mall');
const update = process.argv.includes('--update');
const releaseId = new Date().toISOString();
fs.mkdirSync(output, {recursive:true});
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const git = (...args) => cp.execFileSync('git', args, { cwd: root, maxBuffer: 30 * 1024 * 1024 });
const tracked = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'crmeb').toString().split('\0').filter(Boolean))];
const index = path.join(root, 'template/admin/dist/index.html');
if (!fs.existsSync(index)) throw Error('Build template/admin first');
const latestSource = git('ls-files', '-z', '--', 'template/admin').toString().split('\0')
  .filter(Boolean).filter(p => fs.existsSync(path.join(root, p)))
  .reduce((n, p) => Math.max(n, fs.statSync(path.join(root, p)).mtimeMs), 0);
if (fs.statSync(index).mtimeMs < latestSource) throw Error('Admin build is older than its sources');
fs.mkdirSync(stage, { recursive: true });
const seed = fs.readFileSync(path.join(root, 'crmeb/public/install/crmeb.sql'), 'utf8').replace(/\\\//g, '/');
const seedUploads = new Set((seed.match(/\/uploads\/[a-zA-Z0-9_./%-]+/g) || []).map(p => 'crmeb/public' + p));
let copied = 0, seedCopied = 0;
for (const rel of tracked) {
  if (/^crmeb\/(\.env|\.constant|\.phpstorm\.meta\.php|\.travis\.yml)$/.test(rel)) continue;
  if (/^crmeb\/(runtime|backup)\//.test(rel)) continue;
  if (/^crmeb\/public\/(install\.lock|product_migration\.xlsx)$/.test(rel)) continue;
  if (/^crmeb\/public\/(admin|theme\/import)\//.test(rel)) continue;
  if (update && /^crmeb\/public\/(uploads|install)\//.test(rel)) continue;
  if (/(^|\/)(\.idea|\.git|node_modules)(\/|$)|\.(log|pid|p12|jks|keystore)$/i.test(rel)) continue;
  const isUpload = rel.startsWith('crmeb/public/uploads/');
  if (isUpload && !seedUploads.has(rel)) continue;
  const source = path.join(root, rel);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
  // Seed media comes from committed distribution content, never local uploads.
  const content = isUpload ? git('show', 'HEAD:' + rel) : fs.readFileSync(source);
  if (/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(content.toString('utf8'))) continue;
  const target = path.join(stage, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  copied++;
  if (isUpload) seedCopied++;
}
fs.cpSync(path.join(root, 'template/admin/dist'), path.join(stage, 'crmeb/public/admin'), { recursive: true });
if (!update) for (const dir of ['runtime', 'backup', 'public/uploads', 'public/theme']) fs.mkdirSync(path.join(stage, 'crmeb', dir), { recursive: true });
for (const file of ['compose.yml', 'README.md', 'start.sh']) {
  const source = file === 'README.md' && update ? 'README-update.md' : file;
  fs.writeFileSync(path.join(stage, file), fs.readFileSync(path.join(__dirname, source), 'utf8').replace(/\r\n/g, '\n').replaceAll('__RELEASE_ID__', releaseId));
}
if (update) fs.writeFileSync(path.join(stage, '.update-only'), 'Preserve the existing installation and .env. No database initialization.\n');
const crawlerRoot = path.join(root, 'services/jd-crawler');
function copyCrawler(source, target) {
  fs.mkdirSync(target, {recursive: true});
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    if (['.env', '.venv', 'data', '__pycache__', '.pytest_cache', '.git', 'tests'].includes(entry.name) || entry.name.endsWith('.pyc')) continue;
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) copyCrawler(from, to);
    else if (entry.isFile()) {
      const data = fs.readFileSync(from);
      fs.writeFileSync(to, /\.(sh|py|yaml)$/.test(entry.name) || entry.name === 'Dockerfile' ? data.toString('utf8').replace(/\r\n/g, '\n') : data);
    }
  }
}
copyCrawler(crawlerRoot, path.join(stage, 'jd-crawler'));
// Update mode does not carry any installer files or write its environment template.
fs.copyFileSync(path.join(__dirname, 'env.example'), path.join(stage, '.env.example'));
fs.mkdirSync(path.join(stage, 'deploy'));
for (const file of ['nginx.conf', 'php.ini', 'php-entrypoint.sh', 'worker-entrypoint.sh']) {
  fs.writeFileSync(path.join(stage, 'deploy', file), fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n'));
}
const template = path.join(stage, 'crmeb/public/install/.env');
if (!update) fs.writeFileSync(template, fs.readFileSync(template, 'utf8').replace(/^DEBUG\s*=\s*true\s*$/m, 'DEBUG = false'));
const info = { createdAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD').toString().trim(),
  domain: 'mall.hengshucredit.com', mode: update ? 'existing-installation-update' : 'fresh-install', php: '7.4',
  backendFiles: copied, seedUploadReferences: seedUploads.size, bundledSeedUploads: seedCopied,
  missingSeedUploads: seedUploads.size - seedCopied, adminEntrySha256: sha(fs.readFileSync(index)),
  includes: ['PHP backend and vendor', 'admin production build', ...(update ? [] : ['installer seed SQL']), 'deployment configuration', 'independent JD crawler and browser'],
  excludes: ['local database', 'local credentials', 'runtime logs', 'Android signing and AppKey', 'mobile H5/APK'] };
fs.writeFileSync(path.join(stage, 'release.json'), JSON.stringify(info, null, 2) + '\n');
function files(p) { return fs.readdirSync(p, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(p, e.name)) : [path.join(p, e.name)]); }
const manifest = files(stage).sort().map(p => sha(fs.readFileSync(p)) + '  ' + path.relative(stage, p).replace(/\\/g, '/')).join('\n') + '\n';
fs.writeFileSync(path.join(stage, 'files.sha256'), manifest);
const archiveName = update ? 'hengshu-mall-update.tar.gz' : 'hengshu-mall.tar.gz';
const archive = path.join(output, archiveName);
const candidate = path.join(stageParent, archiveName);
cp.execFileSync('tar', ['-czf', candidate, '-C', stageParent, 'crmeb-mall']);
cp.execFileSync('tar', ['-tzf', candidate], {stdio:'ignore'});
fs.renameSync(candidate, archive);
fs.writeFileSync(archive + '.sha256', sha(fs.readFileSync(archive)) + '  ' + path.basename(archive) + '\n');
if (!update) fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), sha(fs.readFileSync(archive)) + '  ' + path.basename(archive) + '\n');
console.log(JSON.stringify({ archive, bytes:fs.statSync(archive).size, ...info }, null, 2));
