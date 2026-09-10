import request from '@/libs/request';
export const marketingStyleList = (params) => request({ url: 'marketing/style/list', method: 'get', params });
export const marketingStyleInfo = (id) => request({ url: `marketing/style/info/${id}`, method: 'get' });
export const marketingStyleSave = (id, data) => request({ url: `marketing/style/save/${id}`, method: 'post', data });
export const marketingStyleStatus = (id, enabled) =>
  request({ url: `marketing/style/status/${id}`, method: 'put', data: { enabled } });
export const marketingStyleDelete = (id) => request({ url: `marketing/style/del/${id}`, method: 'delete' });
export const marketingStyleOptions = (params) => request({ url: 'marketing/style/options', method: 'get', params });
