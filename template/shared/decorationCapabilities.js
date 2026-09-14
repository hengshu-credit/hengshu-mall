export function decorationSupported(name, platform = 'app') {
  return name !== 'liveBroadcast' || platform === 'mp-weixin';
}
