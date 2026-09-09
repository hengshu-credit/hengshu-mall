const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const net = require('net');
const http = require('http');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../..');
const release = {output:path.join(root,'dist'), archive:path.join(root,'dist/hengshu-mall.tar.gz')};
const project = 'crmeb-package-test-' + Date.now();
if (!process.env.CRMEB_VERIFY_ROOT) throw Error('Run ./package.ps1 -Verify to manage temporary test files');
const testRoot = path.resolve(process.env.CRMEB_VERIFY_ROOT);
if (!testRoot.startsWith(path.join(root,'.build')+path.sep)) throw Error('Test files must stay inside .build');
const app = path.join(testRoot, 'crmeb-mall');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const delay = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const record = name => { results.push(name); console.log('PASS ' + name); };
let compose;
function docker(args, options = {}) {
  return cp.execFileSync('docker', [...compose, ...args], { cwd: app, timeout: 180000, maxBuffer: 5 * 1024 * 1024, ...options }).toString();
}
async function main() {
  fs.mkdirSync(testRoot, { recursive: true });
  cp.execFileSync('tar', ['-xzf', release.archive, '-C', testRoot]);
  const entries = fs.readFileSync(path.join(app, 'files.sha256'), 'utf8').trim().split('\n');
  for (const row of entries) {
    const [hash, file] = [row.slice(0, 64), row.slice(66)];
    assert.equal(sha(fs.readFileSync(path.join(app, file))), hash, file);
  }
  record('archive extraction and all ' + entries.length + ' file hashes');
  for (const file of ['crmeb/.env', 'crmeb/.constant', 'crmeb/public/install.lock']) assert(!fs.existsSync(path.join(app, file)), file);
  const secrets = [];
  for (const file of ['appkey.local.json', 'signing.local.json']) {
    const p = path.join(root, 'help/dev/.state/android-signing', file);
    if (fs.existsSync(p)) {
      const v = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
      for (const key of ['androidAppKey', 'storePassword']) if (v[key]) secrets.push(v[key]);
    }
  }
  for (const row of entries) {
    const rel = row.slice(66);
    if (/\.(php|json|js|ini|env|yml|md|txt)$/.test(rel)) {
      const content = fs.readFileSync(path.join(app, rel), 'utf8');
      for (const secret of secrets) assert(!content.includes(secret), 'Local signing secret found in ' + rel);
    }
  }
  record('local credentials, installation state and Android secrets excluded');
  const html = fs.readFileSync(path.join(app, 'crmeb/public/admin/index.html'), 'utf8');
  const assetPaths = [...html.matchAll(/\b(?:src|href)=["']?(\/admin\/[^"' >]+)/g)].map(m => m[1]);
  for (const asset of assetPaths) assert(fs.existsSync(path.join(app, 'crmeb/public', asset)), asset);
  record('all admin HTML asset references exist');
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); }); });
  const loginPort = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); }); });
  const envFile = path.join(testRoot, 'test.env');
  const redisPassword = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(envFile, ['MYSQL_PASSWORD=' + crypto.randomBytes(24).toString('hex'), 'MYSQL_ROOT_PASSWORD=' + crypto.randomBytes(24).toString('hex'), 'REDIS_PASSWORD=' + redisPassword, 'BIND_IP=127.0.0.1', 'HTTP_PORT=' + port, 'JD_LOGIN_PORT=' + loginPort, ''].join('\n'));
  compose = ['compose', '-p', project, '--env-file', envFile, '-f', path.join(app, 'compose.yml')];
  docker(['config', '--quiet']);
  record('Compose configuration');
  cp.execFileSync('docker', ['run','--rm','-i','--entrypoint','bash','-v',app+':/fixture:ro','ccr.ccs.tencentyun.com/crmebky_php/php:v7.4','-s'], {input:fs.readFileSync(path.join(__dirname,'test-start.sh')),timeout:60000,stdio:['pipe','inherit','inherit']});
  record('startup script password generation and data protection');
  console.log('Starting isolated test containers');
  try {
    docker(['up', '-d', '--build'], { stdio: ['ignore', 'pipe', 'pipe'] });
    for (const [service, target] of [['mysql', '/var/lib/mysql'], ['redis', '/data']]) {
      const id = docker(['ps', '-q', service]).trim();
      const details = JSON.parse(cp.execFileSync('docker', ['inspect', id]).toString())[0];
      const mount = details.Mounts.find(m => m.Destination === target);
      assert.equal(mount.Type, 'bind');
      assert(mount.Source.replace(/\\/g, '/').endsWith('/data/' + service));
    }
    const mysql = sql => docker(['exec', '-T', 'mysql', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N -B crmeb'], { input: sql });
    const redis = (...args) => docker(['exec', '-T', 'redis', 'sh', '-c', 'IFS= read -r password; REDISCLI_AUTH="$password" redis-cli --raw "$@"', 'redis-check', ...args], { input: redisPassword + '\n' }).trim();
    const marker = crypto.randomBytes(16).toString('hex');
    mysql("CREATE TABLE persistence_probe (value VARCHAR(64) NOT NULL); INSERT INTO persistence_probe VALUES ('" + marker + "');");
    assert.equal(redis('SET', 'persistence_probe', marker), 'OK');
    assert.equal(redis('CONFIG', 'GET', 'appendonly'), 'appendonly\nyes');
    console.log('Recreating isolated containers to check bind-mount persistence');
    docker(['down']);
    docker(['up', '-d']);
    assert.equal(mysql('SELECT value FROM persistence_probe;').trim(), marker);
    assert.equal(redis('GET', 'persistence_probe'), marker);
    mysql('DROP TABLE persistence_probe;');
    record('MySQL and Redis bind mounts preserve written data across down and up');
    const base = 'http://127.0.0.1:' + port;
    // This Node runtime's fetch ignores an explicitly supplied Host header.
    // Use http.request so the smoke test matches NPM's forwarded Host exactly.
    const request = (url, extra = {}, form) => new Promise((resolve, reject) => {
      const body = form ? new URLSearchParams(form).toString() : undefined;
      const req = http.request(base + url, { method: body ? 'POST' : 'GET', headers: { Host: 'mall.hengshucredit.com', ...(body ? {'Content-Type':'application/x-www-form-urlencoded', 'Content-Length':Buffer.byteLength(body)} : {}), ...extra }, timeout: 30000 }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
        res.on('error', reject);
      });
      req.on('timeout', () => req.destroy(new Error('HTTP request timed out')));
      req.on('error', reject);
      req.end(body);
    });
    for (let i = 0; i < 30; i++) { try { if ((await request('/admin/')).status === 302) break; } catch {} await delay(1000); }
    for (const url of ['/admin/', '/admin/login', '/admin/index.html', '/adminapi/custom_admin_js']) {
      const response = await request(url);
      assert.equal(response.status, 302, url);
      assert.equal(response.headers.get('location'), '/install/index.php', url);
    }
    record('uninstalled admin pages redirect to installer before scripts execute');
    fs.writeFileSync(path.join(app, 'crmeb/public/install.lock'), 'verification only');
    for (const url of ['/admin/', '/admin/login', '/admin/index.html']) {
      const r = await request(url); assert.equal(r.status, 200, url); assert.equal(sha(Buffer.from(await r.text())), sha(Buffer.from(html)), url);
    }
    assert((await request('/admin/index.html')).headers.get('cache-control').includes('no-cache'));
    record('admin HTML, history fallback and HTML cache policy');
    const asset = assetPaths.find(p => /\.js$/.test(p));
    const ar = await request(asset); assert.equal(ar.status, 200); assert.equal(sha(Buffer.from(await ar.arrayBuffer())), sha(fs.readFileSync(path.join(app, 'crmeb/public', asset))));
    for (const url of ['/admin/system_static/missing.js', '/.env', '/install/.env', '/install/crmeb.sql', '/install/templates/step3.php']) assert.equal((await request(url)).status, 404, url);
    record('static JS bytes and private/install file protection');
    fs.unlinkSync(path.join(app, 'crmeb/public/install.lock'));
    for (const url of ['/install/index.php', '/install/index.php?step=2', '/install/index.php?step=3']) {
      const r = await request(url); assert.equal(r.status, 200, url); const text = await r.text(); assert(text.includes('CRMEB'), url); assert(!/Fatal error|缺少必要的安装文件/.test(text), url);
    }
    record('fresh installation entry and environment page');
    cp.execFileSync(process.execPath, [path.join(__dirname, 'test-install-form.cjs'), path.join(app, 'crmeb/public/install')]);
    const dbPassword = fs.readFileSync(envFile, 'utf8').match(/^MYSQL_PASSWORD=(.+)$/m)[1];
    const dbResponse = await request('/install/index.php?step=3&mysqldbpwd=1', {}, { dbHost:'mysql', dbport:'3306', dbUser:'crmeb', dbPwd:dbPassword, dbName:'crmeb', demo:'demo' });
    assert.equal(await dbResponse.text(), '1', 'Real MySQL installer validation');
    const redisResponse = await request('/install/index.php?step=3&redisdbpwd=1', {}, {rbhost:'redis',rbport:'6379',rbselect:'0',rbpw:redisPassword});
    assert.equal(await redisResponse.text(), '1', 'Real Redis installer validation');
    record('installer form events and real MySQL/Redis credential validation');
    const phpCheck = 'require "/var/www/vendor/autoload.php"; foreach (["mysqli","pdo_mysql","redis","curl","bcmath","mbstring","gd","zip","pcntl"] as $e) { if (!extension_loaded($e)) { fwrite(STDERR, $e); exit(1); } } if (!class_exists("think\\App")) exit(2); echo PHP_VERSION;';
    const phpVersion = docker(['exec', '-T', 'phpfpm', 'php', '-r', phpCheck]).trim();
    assert(phpVersion.startsWith('7.4.'));
    docker(['exec', '-T', 'phpfpm', 'sh', '-n', '/deploy/php-entrypoint.sh']);
    docker(['exec', '-T', 'phpfpm', 'sh', '-n', '/deploy/worker-entrypoint.sh']);
    docker(['exec', '-T', 'nginx', 'nginx', '-t']);
    record('PHP ' + phpVersion + ', extensions, autoloader, shell and Nginx syntax');
    const probe = path.join(app, 'crmeb/public/index.php');
    const original = fs.readFileSync(probe);
    try {
      fs.writeFileSync(probe, '<?php header("Content-Type: application/json"); echo json_encode(["https"=>$_SERVER["HTTPS"],"scheme"=>$_SERVER["REQUEST_SCHEME"],"port"=>$_SERVER["SERVER_PORT"],"host"=>$_SERVER["HTTP_HOST"]]);');
      await delay(2200);
      const response = await request('/index.php', { 'X-Forwarded-Proto': 'https' });
      const v = await response.json(); assert.equal(v.https, 'on'); assert.equal(v.scheme, 'https'); assert.equal(String(v.port), '443'); assert.equal(v.host, 'mall.hengshucredit.com');
      record('NPM HTTPS scheme, host and port reach PHP correctly');
    } finally { fs.writeFileSync(probe, original); }
    fs.writeFileSync(path.join(app, 'crmeb/public/install.lock'), 'verification only');
    assert.equal((await request('/install/index.php')).status, 404);
    record('installed site blocks installer');
    console.log('Preparing isolated seeded database for worker checks');
    mysql("SET SESSION sql_mode = '';\n" + fs.readFileSync(path.join(app, 'crmeb/public/install/crmeb.sql'), 'utf8'));
    // Disable seeded business schedules; verify daemon plumbing without running business jobs.
    mysql('UPDATE eb_system_timer SET is_open=0;');
    const values = {DB_HOST:'mysql',DB_PORT:'3306',DB_USER:'crmeb',DB_PWD:dbPassword,DB_NAME:'crmeb',DB_PREFIX:'eb_',CACHE_TYPE:'redis',CACHE_PREFIX:'test:',CACHE_TAG_PREFIX:'tag:',RB_HOST:'redis',RB_PORT:'6379',RB_PWD:redisPassword,RB_SELECT:'0',QUEUE_NAME:project};
    let appEnv = fs.readFileSync(path.join(app, 'crmeb/public/install/.env'), 'utf8');
    for (const [key, value] of Object.entries(values)) appEnv = appEnv.replaceAll('#' + key + '#', value);
    fs.writeFileSync(path.join(app, 'crmeb/.env'), appEnv);
    fs.writeFileSync(path.join(app, 'crmeb/.constant'), "<?php define('INSTALL_DATE', 1); define('SERIALNUMBER', 'test');");
    docker(['restart', 'phpfpm']);
    docker(['--profile', 'workers', 'up', '-d']);
    const socketProbe = 'foreach ([40001,40002,40003] as $port) { $s = @fsockopen("127.0.0.1",$port,$errno,$errstr,1); if (!$s) exit(1); fclose($s); } foreach (["runtime/timer.pid", "runtime/workerman.pid", "runtime/.timer"] as $file) { if (!is_file($file)) exit(1); } echo "connected";';
    let connected = false;
    for (let i=0; i<30; i++) {
      try { connected = docker(['exec','-T','phpfpm','php','-r',socketProbe]).trim() === 'connected'; } catch {}
      if (connected) break;
      await delay(1000);
    }
    assert(connected, 'PHP can reach both WebSockets and the local Channel server');
    for (const service of ['timer', 'workerman']) {
      const pidCheck = '$pid = (int)file_get_contents("runtime/' + service + '.pid"); if ($pid <= 1 || !posix_kill($pid,0)) exit(1); echo "visible";';
      assert.equal(docker(['exec','-T','--user','33:33','phpfpm','php','-r',pidCheck]).trim(), 'visible');
    }
    assert(docker(['exec','-T','phpfpm','sh','-c','ps aux | grep "[q]ueue:listen"']).includes('queue:listen'));
    const heartbeat = Number(fs.readFileSync(path.join(app, 'crmeb/runtime/.timer'), 'utf8'));
    assert(Math.abs(Date.now()/1000-heartbeat)<70, 'Timer heartbeat is current');
    for (const route of ['/notice', '/msg']) {
      await new Promise((resolve,reject)=> {
        const req = http.get(base+route, {timeout:10000,headers:{Host:'mall.hengshucredit.com',Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ==','Sec-WebSocket-Version':'13'}}, res => {res.resume();reject(new Error(route+' returned '+res.statusCode));});
        req.on('upgrade',(res,socket)=>{socket.destroy();res.statusCode===101 ? resolve() : reject(new Error(route+' upgrade failed'));});
        req.on('error',reject); req.on('timeout',()=>req.destroy(new Error('WebSocket timeout')));
      });
    }
    record('active queue, timer heartbeat, shared PID visibility, local Channel and both WebSocket upgrades');
    record('release verification complete');
  } finally {
    // package.ps1 removes only its staging directory after containers have stopped.
    docker(['--profile', 'workers', 'down', '-v', '--remove-orphans']);
    console.log('Removed isolated test containers');
  }
}
main().catch(e => { console.error(e.message); if (e.stderr) console.error(e.stderr.toString().slice(-3500)); process.exitCode = 1; });
