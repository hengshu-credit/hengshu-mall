const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup() {
  let resolveUrl, rejectUrl;
  const url = new Promise((resolve, reject) => { resolveUrl = resolve; rejectUrl = reject; });
  const connections = [], events = [];
  const uni = {
    $emit: (...args) => events.push(args),
    closeSocket() {}, sendSocketMessage() {},
    connectSocket(options) {
      const callbacks = {};
      const task = { callbacks, failSend: false,
        onOpen(fn) { callbacks.open = fn; }, onError(fn) { callbacks.error = fn; },
        onMessage(fn) { callbacks.message = fn; }, onClose(fn) { callbacks.close = fn; },
        send(options) { this.failSend ? options.fail({ errMsg: 'test send failure' }) : options.success({}); },
        close() { callbacks.close?.(); },
      };
      connections.push({ options, task });
      return task;
    },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../../template/uni-app/libs/new_chat.js'), 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace('export default Socket;', 'globalThis.Socket = Socket;');
  const context = { uni, getWorkermanUrl: () => url, VUE_APP_WS_URL: '', document: { location: { protocol: 'http:' } },
    setInterval, clearInterval, encodeURIComponent, console };
  vm.createContext(context); vm.runInContext(source, context);
  return { socket: new context.Socket(), connections, events, resolveUrl, rejectUrl };
}
(async () => {
  const test = setup();
  const start = test.socket.onStart('synthetic-token', 3);
  assert.equal(test.connections.length, 0, 'Do not open a socket before its URL API resolves');
  test.resolveUrl({ data: { chat: 'ws://localhost:8011/msg' } });
  await start;
  assert.equal(test.connections.length, 1);
  assert.ok(test.connections[0].options.url.startsWith('ws://localhost:8011/msg?'));
  assert.equal(await test.socket.send({ type: 'chat' }), false, 'Not connected must report failure');
  const task = test.connections[0].task;
  task.callbacks.open({});
  assert.equal(await test.socket.send({ type: 'chat', data: { msn: 'synthetic' } }), true);
  task.failSend = true;
  assert.equal(await test.socket.send({ type: 'chat' }), false, 'Transport failure must reach the page');
  task.callbacks.message({ data: JSON.stringify({ type: 'error', data: { msg: 'Synthetic login expired' }, close: true }) });
  assert.equal(test.socket.connected, false);
  assert.ok(test.events.some(([type, data]) => type === 'socket_error' && data.msg === 'Synthetic login expired'));
  test.socket.onClose();
  assert.equal(await test.socket.send({ type: 'chat' }), false);
  const cancelled = setup();
  const pending = cancelled.socket.onStart('synthetic', 3);
  cancelled.socket.onClose();
  cancelled.resolveUrl({ data: { chat: 'ws://localhost:8011/msg' } });
  await pending;
  assert.equal(cancelled.connections.length, 0, 'Leaving the page must cancel a pending connection');
  const failed = setup();
  const failedStart = failed.socket.onStart('synthetic', 3);
  failed.rejectUrl(new Error('API unavailable'));
  await failedStart;
  assert.equal(failed.connections.length, 0);
  assert.ok(failed.events.some(([type]) => type === 'socket_error'));
  console.log('PASS: delayed URL, task sends, send failure, auth error, close, cancellation and API failure');
})().catch(error => { console.error(error); process.exitCode = 1; });
