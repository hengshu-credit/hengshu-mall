// +----------------------------------------------------------------------
// | CRMEB [ CRMEB赋能开发者，助力企业发展 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2016~2024 https://www.crmeb.com All rights reserved.
// +----------------------------------------------------------------------
// | Licensed CRMEB并不是自由软件，未经许可不能去掉CRMEB相关版权
// +----------------------------------------------------------------------
// | Author: CRMEB Team <admin@crmeb.com>
// +----------------------------------------------------------------------

import { getWorkermanUrl } from '@/api/kefu.js';
const Socket = function() {
	this.ws = null;
	this.connected = false;
	this.startId = 0;
};


// #ifdef H5
function wss(wsSocketUrl) {
	let ishttps = document.location.protocol == 'https:';
	if (ishttps) {
		return wsSocketUrl.replace('ws:', 'wss:');
	} else {
		return wsSocketUrl.replace('wss:', 'ws:');
	}
}
// #endif



Socket.prototype = {
	// close() {
	//   clearInterval(this.timer);
	//   this.ws.close();
	// },
	onSocketOpen: function(my) {
		this.connected = true;
		uni.$emit('socketOpen', my)
	},
	init: function() {
		var that = this;
		clearInterval(this.timer);
		this.timer = setInterval(function() {
			that.send({
				type: "ping"
			});
		}, 10000);
	},
	send: function(data) {
		if (!this.ws || !this.connected) {
			this.onError({ errMsg: 'Socket is not connected' });
			return Promise.resolve(false);
		}
		return new Promise((resolve, reject) => {
			this.ws.send({ data: JSON.stringify(data), success: () => resolve(true), fail: reject });
		}).catch(error => {
			this.onError(error);
			return false;
		});
	},
	onMessage: function(res) {
		const task = this.ws;
		const {
			type,
			data = {},
			close = false
		} = JSON.parse(res.data);
		if (type === 'error') this.onError(data);
		else uni.$emit(type, data);
		// A timeout handler may already have begun a new connection.
		if (close && this.ws === task) this.onClose();
	},

	onClose: function() {
		this.startId++;
		const task = this.ws;
		this.ws = null;
		this.connected = false;
		clearInterval(this.timer);
		if (task) task.close();
		uni.$emit("socket_close");
	},
	onError: function(e) {
		uni.$emit("socket_error", e);
	},
	close: function() {
		this.onClose();
	},
	onStart: async function(token, form_type) {
		this.onClose();
		const startId = this.startId;
		try {
			// The URL is asynchronous. Never connect using an empty or stale cache.
			const response = await getWorkermanUrl();
			if (startId !== this.startId) return false;
			let url = response.data && response.data.chat;
			if (typeof url !== 'string' || !/^wss?:\/\//.test(url)) throw new Error('Invalid chat socket URL');
			// #ifdef H5
			url = wss(url);
			// #endif
			const task = uni.connectSocket({
				url: url + (url.includes('?') ? '&' : '?') + 'type=user&token=' + encodeURIComponent(token) + '&form_type=' + form_type,
				header: { 'content-type': 'application/json' },
				method: 'GET', success: () => {},
			});
			this.ws = task;
			task.onOpen(event => { if (this.ws === task) this.onSocketOpen(event); });
			task.onError(error => { if (this.ws === task) this.onError(error); });
			task.onMessage(event => { if (this.ws === task) this.onMessage(event); });
			task.onClose(() => {
				if (this.ws !== task) return;
				this.ws = null;
				this.connected = false;
				clearInterval(this.timer);
				uni.$emit('socket_close');
			});
			return true;
		} catch (error) {
			if (startId === this.startId) this.onError(error);
			return false;
		}
	}
};

Socket.prototype.constructor = Socket;
export default Socket;
