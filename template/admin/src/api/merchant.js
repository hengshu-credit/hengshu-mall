import request from '@/libs/request';
import axios from 'axios';
import Setting from '@/setting';
import { getCookies } from '@/libs/util';

export const operationKey = () => `m_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
export const merchantGet = (path, params = {}) => request({ url: `merchant/${path}`, method: 'get', params });
export const merchantWrite = (path, data, method = 'post') => request({ url: `merchant/${path}`, method, data: { ...data, request_key: data.request_key || operationKey() } });
export const merchantOptions = (params) => merchantGet('shop/options', params);
export function uploadMerchantDocument(file, kind, shopId) {
  const body = new FormData(); body.append('file', file); body.append('kind', kind); body.append('shop_id', shopId || 0);
  return request({ url: 'merchant/document/upload', method: 'post', data: body, file: true });
}
export async function merchantFile(path) {
  const response = await axios.get(`${Setting.apiBaseURL.replace(/\/$/, '')}/merchant/${path}`, {
    responseType: 'blob', headers: { 'Authori-zation': `Bearer ${getCookies('token')}` }, withCredentials: true,
  });
  if ((response.headers['content-type'] || '').includes('application/json')) {
    const result = JSON.parse(await response.data.text()); throw new Error(result.msg || '资料读取失败');
  }
  return response.data;
}
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
