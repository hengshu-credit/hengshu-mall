// Runtime API override for local Android/iOS acceptance.
// The production address remains the config default. A launch parameter can
// override it before App.vue starts any prefetch or business request.
const appConfig = require('../config/app.js');

const API_KEYS = ['api_base', 'apiBase', 'debug_api_base'];

function normalize(value) {
  if (typeof value !== 'string') return '';
  let url = value.trim();
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(url);
      if (decoded === url) break;
      url = decoded;
    } catch (_) { break; }
  }
  if (!/^https?:\/\/[^\s<>"'`]+$/i.test(url)) return '';
  return url.replace(/\/+$/, '');
}

function queryValue(query = {}) {
  for (const key of API_KEYS) {
    const value = normalize(query[key]);
    if (value) return value;
  }
  return '';
}

export function setRuntimeApiBase(value) {
  const url = normalize(value);
  if (!url) return appConfig.HTTP_REQUEST_URL;
  appConfig.HTTP_REQUEST_URL = url;
  uni.setStorageSync('debugApiBase', url);
  return url;
}

export function runtimeApiBase() {
  return appConfig.HTTP_REQUEST_URL;
}

export function initRuntimeApiBase(option = {}) {
  let query = { ...(option && option.query || {}) };
  try {
    const launch = uni.getLaunchOptionsSync && uni.getLaunchOptionsSync();
    query = { ...(launch && launch.query || {}), ...query };
  } catch (_) {}
  try {
    const enter = uni.getEnterOptionsSync && uni.getEnterOptionsSync();
    query = { ...(enter && enter.query || {}), ...query };
  } catch (_) {}
  const value = queryValue(query);
  if (value) return setRuntimeApiBase(value);
  const stored = normalize(uni.getStorageSync('debugApiBase'));
  if (stored) appConfig.HTTP_REQUEST_URL = stored;
  return appConfig.HTTP_REQUEST_URL;
}
