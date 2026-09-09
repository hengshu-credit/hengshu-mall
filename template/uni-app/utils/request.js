// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2024 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------

import {
	HTTP_REQUEST_URL,
	HEADER,
	TOKENNAME,
	TIMEOUT
} from '@/config/app';
import {
	toLogin,
	checkLogin
} from '../libs/login';
import store from '../store';
import i18n from './lang.js';

const pendingReads = new Map();
const copyResponse = response => JSON.parse(JSON.stringify(response));

/**
 * 发送请求
 */
function baseRequest(url, method, data, {
	noAuth = false,
	noVerify = false,
	dedupe = false
}) {
	let Url = HTTP_REQUEST_URL,
		header = { ...HEADER };

	if (!noAuth) {
		//登录过期自动登录
		if (!store.state.app.token && !checkLogin()) {
			toLogin();
			return Promise.reject({
				msg: i18n.t(`未登录`)
			});
		}
	}
	if (store.state.app.token) header[TOKENNAME] = 'Bearer ' + store.state.app.token;
	if (uni.getStorageSync('locale')) {
		header['Cb-lang'] = uni.getStorageSync('locale');
	}
	// Only explicitly selected configuration GETs share an in-flight request.
	// Include auth, locale and verification options; never retain settled data.
	const key = dedupe && method.toLowerCase() === 'get'
		? JSON.stringify([Url, url, data || {}, header, noAuth, noVerify]) : null;
	if (key && pendingReads.has(key)) return pendingReads.get(key).then(copyResponse);

	const promise = new Promise((reslove, reject) => {
		uni.request({
			url: Url + '/api/' + url,
			method: method || 'GET',
			header: header,
			data: data || {},
			timeout: TIMEOUT,
			success: (res) => {
				if (noVerify)
					reslove(res.data, res);
				else if (res.data.status == 200)
					reslove(res.data, res);
				else if (res.data.status == 401) {
					toLogin();
					reject(res.data);
				} else if (res.data.status == 402) {
					uni.showModal({
						title: i18n.t(`提示`),
						content: res.data.msg,
						showCancel: false,
						confirmText: i18n.t(`我知道了`)
					});
					reject(res.data);
				} else
					reject(res.data.msg || i18n.t(`系统错误`));
			},
			fail: (msg) => {
				let data = {
					mag: i18n.t(`请求失败`),
					status: 1 //1没网
				}
				// #ifdef APP-PLUS
				reject(data);
				// #endif
				// #ifndef APP-PLUS
				reject(i18n.t(`请求失败`));
				// #endif
			}
		})
	});
	if (!key) return promise;
	pendingReads.set(key, promise);
	const clear = () => pendingReads.delete(key);
	promise.then(clear, clear);
	return promise.then(copyResponse);
}

const request = {};

['options', 'get', 'post', 'put', 'head', 'delete', 'trace', 'connect'].forEach((method) => {
	request[method] = (api, data, opt) => baseRequest(api, method, data, opt || {})
});



export default request;
