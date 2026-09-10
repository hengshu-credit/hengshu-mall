import request from '@/libs/request';

export function brandListApi(params) {
  return request({ url: 'product/brand/list', method: 'get', params });
}

export function brandInfoApi(id) {
  return request({ url: `product/brand/info/${id}`, method: 'get' });
}

export function brandSaveApi(id, data) {
  return request({ url: `product/brand/save/${id}`, method: 'post', data });
}

export function brandStatusApi(id, status) {
  return request({ url: `product/brand/status/${id}/${status}`, method: 'put' });
}

export function brandDeleteApi(id) {
  return request({ url: `product/brand/del/${id}`, method: 'delete' });
}

export function brandOptionsApi(params) {
  return request({ url: 'product/brand/options', method: 'get', params });
}
