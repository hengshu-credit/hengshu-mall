// Admin development proxy. HBuilderX reads its proxy from manifest.json.
module.exports = function developmentProxy() {
  const backend = process.env.CRMEB_API_TARGET || 'http://127.0.0.1:8011';
  const proxy = {};
  for (const prefix of ['/adminapi', '/api', '/kefuapi', '/outapi', '/surl', '/uploads', '/statics', '/assets']) {
    proxy[prefix] = { target: backend, changeOrigin: true };
  }
  for (const [prefix, port] of [['/notice', 40001], ['/msg', 40002]]) {
    proxy[prefix] = {
      target: `http://127.0.0.1:${port}`,
      ws: true,
      changeOrigin: true,
      pathRewrite: { [`^${prefix}`]: '' },
    };
  }
  return proxy;
};
