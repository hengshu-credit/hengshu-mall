// Browser integration with an isolated WebSocket peer, never a real customer.
// Requires running H5, Playwright and Chrome.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { Server } = require(path.resolve(__dirname, '../../template/admin/node_modules/ws'));
(async () => {
  const peer = new Server({ host: '127.0.0.1', port: 0 });
  await new Promise(resolve => peer.once('listening', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const chats = [], errors = [], messageTypes = [], requests = [];
  let connection;
  peer.on('connection', socket => {
    connection = socket;
    let authenticated = false;
    socket.on('message', payload => {
      const message = JSON.parse(payload.toString());
      messageTypes.push(message.type);
      if (message.type === 'login') {
        assert.equal(message.data, 'synthetic-chat-token');
        authenticated = true;
        socket.send(JSON.stringify({ type: 'success', data: {} }));
      } else if (message.type === 'chat') {
        assert.ok(authenticated);
        chats.push(message);
        socket.send(JSON.stringify({ type: 'chat', data: {
          id: 999, uid: 1, to_uid: 2, msn_type: 1, msn: message.data.msn,
          add_time: 1788880000, _add_time: '2026-09-09 01:00:00', avatar: '',
        } }));
      }
    });
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    page.on('pageerror', error => errors.push(error.stack));
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      requests.push(pathname);
      let data;
      if (pathname.endsWith('/get_workerman_url')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        data = { chat: `ws://127.0.0.1:${peer.address().port}/msg` };
      } else if (pathname.endsWith('/v2/user/service/record')) {
        data = { serviceList: [], uid: 2, nickname: 'Synthetic support' };
      } else if (Object.values(route.request().headers()).some(value => value.includes('synthetic-chat-token'))) {
        // Other page resources remain anonymous; no test token reaches the API.
        const headers = Object.fromEntries(Object.entries(route.request().headers())
          .filter(([, value]) => !value.includes('synthetic-chat-token')));
        if (pathname.endsWith('/v2/get_today_coupon')) data = { list: [] };
        else if (pathname.endsWith('/v2/new_coupon')) data = { show: false, list: [] };
        else if (pathname.endsWith('/cart/count')) data = { count: 0 };
        else if (pathname === '/api/user') data = { uid: 1, nickname: 'Synthetic user' };
        else return route.continue({ headers });
      } else return route.continue();
      await route.fulfill({ json: { status: 200, data } });
    });
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => typeof getApp === 'function' && getApp().$store);
    await page.waitForURL('**/pages/index/index');
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
      getApp().$store.commit('LOGIN', { token: 'synthetic-chat-token', time: 0 });
      getApp().$store.commit('SETUID', 1);
      uni.removeStorageSync('WORKERMAN_URL');
      await new Promise((resolve, reject) => uni.navigateTo({
        url: '/pages/extension/customer_list/chat?to_uid=2', success: resolve, fail: reject,
      }));
    });
    await page.waitForFunction(() => {
      const pages = getCurrentPages();
      const vm = pages[pages.length - 1]?.$vm;
      return vm && vm.chatStatus && vm.socketAuthenticated;
    }, null, { timeout: 15000 }).catch(async error => {
      console.error({ messageTypes, requests, errors, state: await page.evaluate(() => {
        const vm = getCurrentPages().slice(-1)[0]?.$vm;
        return { url: location.pathname, chatStatus: vm?.chatStatus, authenticated: vm?.socketAuthenticated };
      }) });
      throw error;
    });
    const input = page.locator('.input-box input');
    await input.fill('synthetic-message');
    await page.locator('.input-box .icon-fasong').click();
    await page.getByText('synthetic-message', { exact: true }).waitFor();
    assert.equal(chats.length, 1);
    assert.equal(chats[0].data.to_uid, 2);
    await page.waitForFunction(() => document.querySelector('.input-box input').value === '', null, { timeout: 5000 });
    connection.close();
    await page.waitForFunction(() => !getCurrentPages().slice(-1)[0].$vm.socketAuthenticated);
    await input.fill('retain-after-disconnect');
    await page.locator('.input-box .icon-fasong').click();
    assert.equal(await input.inputValue(), 'retain-after-disconnect');
    assert.deepEqual(errors, []);
    console.log('PASS: delayed socket URL, login, message delivery/rendering, and retaining input after disconnect');
  } finally {
    await browser.close();
    for (const socket of peer.clients) socket.terminate();
    await new Promise(resolve => peer.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
