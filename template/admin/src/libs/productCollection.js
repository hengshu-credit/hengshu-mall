export class CollectionCancelledError extends Error {
  constructor() {
    super('商品采集已取消');
    this.name = 'CollectionCancelledError';
  }
}

export function isCollectionCancelled(error) {
  return error instanceof CollectionCancelledError || (error && error.name === 'CollectionCancelledError');
}

export function validateCollectionUrl(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) throw new Error('请输入链接地址！');
  if (url.length > 2048) throw new Error('链接地址不能超过2048个字符！');
  if (!/^https?:\/\/[^\s]+$/i.test(url)) throw new Error('请输入以http或https开头的链接地址！');
  return url;
}

function responseData(response) {
  return response && Object.prototype.hasOwnProperty.call(response, 'data') ? response.data : response;
}

function errorMessage(error, fallback) {
  if (error && error.msg) return error.msg;
  if (error && error.message) return error.message;
  if (error && error.error && error.error.message) return error.error.message;
  return fallback;
}

export function createCollectionRunner({
  request,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = () => Date.now(),
  pollIntervalMs = 2000,
  maxDurationMs = 360000,
}) {
  let generation = 0;
  let active = false;
  let timerId = null;
  let rejectWait = null;

  const assertActive = (runGeneration) => {
    if (runGeneration !== generation) throw new CollectionCancelledError();
  };

  const cancel = () => {
    generation += 1;
    active = false;
    if (timerId !== null) {
      clearTimeoutFn(timerId);
      timerId = null;
    }
    if (rejectWait) {
      const reject = rejectWait;
      rejectWait = null;
      reject(new CollectionCancelledError());
    }
  };

  const wait = (runGeneration) =>
    new Promise((resolve, reject) => {
      rejectWait = reject;
      timerId = setTimeoutFn(() => {
        timerId = null;
        rejectWait = null;
        try {
          assertActive(runGeneration);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, pollIntervalMs);
    });

  const collect = async (payload) => {
    if (active) throw new Error('商品正在采集中，请勿重复提交');
    active = true;
    const runGeneration = ++generation;
    const startedAt = now();
    try {
      let data = responseData(await request(payload));
      assertActive(runGeneration);
      while (true) {
        if (data && data.productInfo) return data;
        if (data && data.state === 'failed') {
          throw new Error(errorMessage(data, '商品采集失败，请稍后重试'));
        }
        if (!data || !data.task_id || !['queued', 'running'].includes(data.state)) {
          throw new Error('商品采集接口返回的数据格式不正确');
        }
        if (now() - startedAt >= maxDurationMs) {
          throw new Error('商品采集超时，请稍后重试');
        }
        await wait(runGeneration);
        assertActive(runGeneration);
        if (now() - startedAt >= maxDurationMs) {
          throw new Error('商品采集超时，请稍后重试');
        }
        data = responseData(await request({ task_id: data.task_id }));
        assertActive(runGeneration);
      }
    } catch (error) {
      if (isCollectionCancelled(error)) throw error;
      throw new Error(errorMessage(error, '商品采集失败，请稍后重试'));
    } finally {
      if (runGeneration === generation) {
        active = false;
        timerId = null;
        rejectWait = null;
      }
    }
  };

  return {
    collect,
    cancel,
    isActive: () => active,
  };
}
