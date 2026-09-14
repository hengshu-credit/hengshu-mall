import request from '@/libs/request';
const base = 'marketing/ranking/';
export const rankingList = (params) => request({ url: base + 'list', method: 'get', params });
export const rankingInfo = (id) => request({ url: base + 'info/' + id, method: 'get' });
export const rankingSave = (id, data) => request({ url: base + 'save/' + id, method: 'post', data });
export const rankingPreview = (data) => request({ url: base + 'preview', method: 'post', data });
export const rankingStatus = (id, enabled) => request({ url: base + 'status/' + id, method: 'put', data: { enabled } });
export const rankingDelete = (id) => request({ url: base + 'del/' + id, method: 'delete' });
export const rankingOptions = (params) => request({ url: base + 'options', method: 'get', params });
