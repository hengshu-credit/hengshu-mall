// Run against the local development service; all requests are read-only.
const assert = require('node:assert/strict');
const base = process.env.CRMEB_TEST_BASE || 'http://localhost:8011';
(async () => {
  for (const page of ['home', 'category', 'cart', 'detail', 'user']) {
    const response = await fetch(`${base}/api/theme/navigation?page=${page}&theme_id=0`);
    assert.equal(response.status, 200, `${page} navigation HTTP status`);
    const result = await response.json();
    assert.equal(result.status, 200, `${page} navigation business status`);
    assert(result.data && typeof result.data === 'object', `${page} navigation configuration`);
  }
  console.log('PASS local navigation endpoints for all five decorated pages');
})().catch(error => { console.error(error); process.exitCode = 1; });
