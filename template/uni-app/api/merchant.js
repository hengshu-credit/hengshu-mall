import request from '@/utils/request';
import { HTTP_REQUEST_URL, TOKENNAME } from '@/config/app';
import store from '@/store';
export const merchantKey = () => `u_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
export const merchantConfig = () => request.get('merchant/config');
export const merchantApplications = (page = 1) => request.get('merchant/applications', { page });
export const merchantApplication = id => request.get(`merchant/application/${id}`);
export const saveMerchantApplication = (id, profile, version, key) => request.post(`merchant/application/save/${id}`, { profile, version, request_key: key });
export const submitMerchantApplication = (id, version) => request.post(`merchant/application/submit/${id}`, { version, request_key: merchantKey() });
export const withdrawMerchantApplication = (id, version) => request.post(`merchant/application/withdraw/${id}`, { version, request_key: merchantKey() });
export function uploadMerchantFile(path, kind) {
  return new Promise((resolve, reject) => uni.uploadFile({ url: `${HTTP_REQUEST_URL}/api/merchant/document/upload`, filePath: path, name: 'file', header: { [TOKENNAME]: `Bearer ${store.state.app.token}` }, formData: { kind }, success(res) { try { const body = JSON.parse(res.data); if (body.status === 200) resolve(body.data); else reject(body.msg || '上传失败'); } catch (e) { reject('上传返回格式不正确'); } }, fail: reject }));
}
