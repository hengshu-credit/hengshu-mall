import request from '@/libs/request';

const base = 'marketing/full_reduction';
export const fullReductionListApi = (params) => request({ url: `${base}/list`, method: 'get', params });
export const fullReductionInfoApi = (id) => request({ url: `${base}/info/${id}`, method: 'get' });
export const fullReductionOptionsApi = (params) => request({ url: `${base}/options`, method: 'get', params });
export const fullReductionSaveApi = (id, data) => request({ url: `${base}/save/${id}`, method: 'post', data });
export const fullReductionStatusApi = (id, status) =>
  request({ url: `${base}/status/${id}`, method: 'put', data: { status } });
export const fullReductionSortApi = (id, sort) => request({ url: `${base}/sort/${id}`, method: 'put', data: { sort } });
export const fullReductionDeleteApi = (id) => request({ url: `${base}/del/${id}`, method: 'delete' });
export const fullReductionBatchDeleteApi = (ids) =>
  request({ url: `${base}/batch_delete`, method: 'post', data: { ids } });
