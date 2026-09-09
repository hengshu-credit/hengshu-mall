// Requires the running admin dev server, Playwright and Chrome. No login needed.
// A temporary, invisible CSS property verifies that source edits reach both
// origins through HMR; the original file is restored in finally.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const appFile = path.resolve(__dirname, '../../template/admin/src/App.vue');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const original = fs.readFileSync(appFile);
  const token = 'probe' + Date.now();
  const addition = `\n<style>\n:root { --crmeb-hmr-probe: ${token}; }\n</style>\n`;
  let edited = false;
  const issues = [];
  const pages = [];
  try {
    for (const origin of ['http://localhost:8011', 'http://localhost:1617']) {
      const page = await browser.newPage();
      pages.push(page);
      page.on('pageerror', error => issues.push(error.stack));
      page.on('console', message => {
        if (message.type() === 'error' || /Duplicate named routes/.test(message.text())) issues.push(message.text());
      });
      page.on('request', request => {
        if (request.url().includes('sockjs-node')) {
          const url = new URL(request.url());
          if (url.origin !== origin || !url.pathname.startsWith('/admin/sockjs-node/')) issues.push(`Wrong HMR URL: ${url}`);
        }
      });
      await page.goto(origin + '/admin/login', { waitUntil: 'networkidle', timeout: 45000 });
      await page.getByPlaceholder('请输入用户名').waitFor();
      // Empty form validation exercises Enter/click without sending credentials.
      await page.getByPlaceholder('请输入用户名').press('Enter');
      await page.getByRole('button', { name: '登录', exact: true }).click();
    }
    fs.writeFileSync(appFile, Buffer.concat([original, Buffer.from(addition)]));
    edited = true;
    for (const page of pages) {
      await page.waitForFunction(expected => getComputedStyle(document.documentElement)
        .getPropertyValue('--crmeb-hmr-probe').trim() === expected, token, { timeout: 45000 });
    }
    assert.deepEqual(issues, [], 'Browser errors or invalid HMR connections');
    console.log('PASS: login validation, unique routes, same-origin HMR and live CSS updates on ports 8011 and 1617');
  } finally {
    if (edited) {
      const current = fs.readFileSync(appFile);
      const patched = Buffer.concat([original, Buffer.from(addition)]);
      // Preserve edits made by a person while this check was running.
      fs.writeFileSync(appFile, current.equals(patched) ? original : current.toString().replace(addition, ''));
    }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
