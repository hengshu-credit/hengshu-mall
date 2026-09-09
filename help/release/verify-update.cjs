// Exercise the delivered archive on a synthetic existing installation and isolated Docker project.
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const archive = path.join(root, 'dist/hengshu-mall-update.tar.gz');
const testRoot = path.resolve(process.env.CRMEB_VERIFY_ROOT || '');
if (!process.env.CRMEB_VERIFY_ROOT || !testRoot.startsWith(path.join(root, '.build') + path.sep)) throw Error('Use package.ps1 -Update -Verify');
const app = path.join(testRoot, 'crmeb-mall');
const project = 'jd-update-test-' + Date.now();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function compose(args, options = {}) {
  return cp.execFileSync('docker', ['compose', '-p', project, '-f', 'compose.yml', ...args], {
    cwd: app, maxBuffer: 12 * 1024 * 1024, timeout: 180000, ...options,
  }).toString();
}
async function main() {
  fs.mkdirSync(app, {recursive: true});
  const port = await new Promise(resolve => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const env = ['MYSQL_ROOT_PASSWORD=testroot', 'MYSQL_PASSWORD=testmysql', 'REDIS_PASSWORD=testredis',
    'JD_LOGIN_PORT=' + port, 'HTTP_PORT=18011', ''].join('\n');
  const preserved = {'.env': env, 'crmeb/.env': 'existing application credentials', 'crmeb/.constant': 'existing constants',
    'crmeb/public/install.lock': 'installed', 'crmeb/public/uploads/existing.svg': '<svg/>',
    'data/mysql/existing.marker': 'database marker', 'data/redis/existing.marker': 'redis marker'};
  for (const [name, bytes] of Object.entries(preserved)) {
    fs.mkdirSync(path.dirname(path.join(app, name)), {recursive: true});
    fs.writeFileSync(path.join(app, name), bytes);
  }
  cp.execFileSync('tar', ['-xzf', archive, '-C', testRoot]);
  for (const [name, bytes] of Object.entries(preserved)) assert.equal(fs.readFileSync(path.join(app, name), 'utf8'), bytes, name);
  const files = fs.readFileSync(path.join(app, 'files.sha256'), 'utf8').trim().split('\n');
  for (const row of files) {
    const name = row.slice(66);
    assert(!/^(data\/|crmeb\/(runtime\/|backup\/|\.env$|\.constant$|public\/(install(?:\/|\.lock$)|uploads\/)))/.test(name), name);
    assert(!/(^|\/)(credentials\.json|__pycache__|\.env)$/.test(name), name);
    assert.equal(sha(fs.readFileSync(path.join(app, name))), row.slice(0, 64), name);
  }
  assert(fs.existsSync(path.join(app, '.update-only')));
  assert(fs.existsSync(path.join(app, 'jd-crawler/Dockerfile')));
  const html = fs.readFileSync(path.join(app, 'crmeb/public/admin/index.html'), 'utf8');
  for (const match of html.matchAll(/\b(?:src|href)=["']?(\/admin\/[^"' >]+)/g)) {
    assert(fs.existsSync(path.join(app, 'crmeb/public', match[1])), match[1]);
  }
  console.log(`PASS: extracted ${files.length} verified files; existing credentials, installation, uploads and data preserved`);
  const config = JSON.parse(compose(['config', '--format', 'json']));
  assert.equal(Object.keys(config.services).length, 8);
  for (const name of ['queue', 'timer', 'workerman']) {
    assert(!config.services[name].profiles?.length, 'workers must start by default');
    assert.equal(config.services[name].labels['com.hengshu.release'], config.services.phpfpm.labels['com.hengshu.release']);
    assert(!config.services[name].labels['com.hengshu.release'].includes('__RELEASE_ID__'));
  }
  assert.equal(config.services['jd-crawler'].environment.JD_CRAWLER_TOKEN, '');
  assert.equal(config.services['jd-crawler'].ports[0].host_ip, '127.0.0.1');
  cp.execFileSync('docker', ['run', '--rm', '-i', '--entrypoint', 'bash', '-v', app + ':/fixture:ro',
    'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4', '-s'], {
    input: fs.readFileSync(path.join(__dirname, 'test-start.sh')), stdio: ['pipe', 'inherit', 'inherit'], timeout: 60000,
  });
  console.log('PASS: Compose accepts existing .env without JD setup; all workers enabled; startup/update guards passed');
  const credentials = () => JSON.parse(compose(['exec', '-T', 'jd-crawler', 'python', '-c',
    'import json; print(open("/data/credentials.json").read())']));
  const healthy = async () => {
    for (let attempt = 0; attempt < 45; attempt++) {
      const id = compose(['ps', '-q', 'jd-crawler']).trim();
      if (id) {
        const state = JSON.parse(cp.execFileSync('docker', ['inspect', id]).toString())[0];
        if (state.State.Health?.Status === 'healthy') return;
      }
      await delay(1000);
    }
    throw Error('JD crawler did not become healthy');
  };
  try {
    compose(['up', '-d', '--build', '--no-deps', 'jd-crawler']);
    await healthy();
    const initial = credentials();
    assert.equal(initial.JD_CRAWLER_TOKEN.length, 64);
    assert.equal(initial.JD_VNC_PASSWORD.length, 8);
    const lockProbe = 'import fcntl\nf=open("/data/.browser-profile.lock","r+")\n'
      + 'try:\n fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError:\n print("locked")\nelse:\n raise SystemExit(1)';
    assert.equal(compose(['exec', '-T', 'jd-crawler', 'python', '-c', lockProbe]).trim(), 'locked');
    compose(['exec', '-T', 'jd-crawler', 'python', '/app/healthcheck.py']);
    const show = compose(['exec', '-T', 'jd-crawler', 'python', '-m', 'jd_crawler.bootstrap', 'show']);
    assert(show.includes(initial.JD_VNC_PASSWORD) && show.includes(initial.JD_CRAWLER_TOKEN) && show.includes('ssh -N'));
    const response = await fetch(`http://127.0.0.1:${port}/vnc.html`);
    assert.equal(response.status, 200);
    assert((await response.text()).includes('noVNC'));
    const php = '$c=stream_context_create(["http"=>["header"=>"Authorization: Bearer ".getenv("TOKEN")]]);'
      + '$r=json_decode(file_get_contents("http://jd-crawler:8091/health",false,$c),true); if(!$r) exit(1); echo "reachable";';
    const result = cp.execFileSync('docker', ['run', '--rm', '--network', project + '_default', '-e', 'TOKEN=' + initial.JD_CRAWLER_TOKEN,
      '--entrypoint', 'php', 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4', '-r', php]).toString();
    assert.equal(result, 'reachable');
    const logs = compose(['logs', '--no-color', 'jd-crawler']);
    for (const secret of Object.values(initial)) assert(!logs.includes(secret), 'Credentials leaked into startup logs');
    compose(['exec', '-T', 'jd-crawler', 'python', '-c',
      'from pathlib import Path; assert Path("/data/credentials.json").stat().st_mode & 0o777 == 0o600; Path("/data/chromium/update-test-marker").write_text("persistent profile")']);
    console.log('PASS: real Chromium/API health, noVNC page, PHP network access, private auto-generated credentials and login-info command');
    compose(['down']);
    compose(['up', '-d', '--no-deps', 'jd-crawler']);
    await healthy();
    assert.deepEqual(credentials(), initial);
    compose(['exec', '-T', 'jd-crawler', 'python', '-c',
      'from pathlib import Path; assert Path("/data/chromium/update-test-marker").read_text() == "persistent profile"']);
    console.log('PASS: container removal/recreation preserves credentials and Chromium profile');
  } finally {
    // Only this uniquely named test project owns these disposable volumes.
    compose(['down', '-v', '--remove-orphans']);
  }
}
main().catch(error => { console.error(error.message); if (error.stderr) console.error(error.stderr.toString().slice(-2000)); process.exitCode = 1; });
