// Uses the isolated emulator and restores its original App resources on exit.
const path = require('node:path'), fs = require('node:fs'), { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
process.env.CRMEB_AUDIT_PORT = '18146';
process.env.CRMEB_AUDIT_OFFLINE = '1';
process.env.CRMEB_AUDIT_CART_IMAGES = '1';
process.env.CRMEB_AUDIT_PRODUCT_IMAGES = '1';
process.env.CRMEB_AUDIT_OUT = path.join(root, '.build/cart-category-images');
process.env.CRMEB_AUDIT_APP ||= path.join(root, '.build/storefront-hardening/app');
if (process.argv.includes('--baseline')) process.env.CRMEB_AUDIT_IMAGE_BASELINE = '1';
const { createServer } = require('./storefront_audit_fixture.cjs');
const { startMedia } = require('./commerce_fixture_services.cjs');
(async () => {
  fs.mkdirSync(process.env.CRMEB_AUDIT_OUT, { recursive: true });
  const media = await startMedia();
  const adb = (...args) => execFileSync(path.join(root, 'help/dev/.state/android-tools/platform-tools/adb.exe'), ['-s', 'emulator-5554', ...args], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  const rules = [];
  let fixture;
  try {
    if (adb('shell', 'getprop', 'ro.kernel.qemu').trim() !== '1') throw Error('Only the isolated emulator is supported');
    const uid = adb('shell', 'dumpsys', 'package', 'com.hengshucredit.mall').match(/userId=(\d+)/)[1];
    for (const [binary, destination] of [['iptables', '127.0.0.0/8'], ['ip6tables', '::1/128']]) {
      const rule = ['OUTPUT', '-m', 'owner', '--uid-owner', uid, '!', '-d', destination, '-m', 'comment', '--comment', 'cart-image-replay', '-j', 'REJECT'];
      adb('shell', binary, '-I', ...rule);
      rules.push([binary, rule]);
    }
    fixture = await createServer(require('./cart_image_fixture.cjs'));
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'storefront_audit_native.cjs')], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
      child.on('error', reject); child.on('exit', resolve);
    });
    if (code !== 0) throw Error('Android cart image verification failed');
  } finally {
    for (const [binary, rule] of rules) adb('shell', binary, '-D', ...rule);
    if (fixture) await new Promise(resolve => fixture.server.close(resolve));
    media.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
