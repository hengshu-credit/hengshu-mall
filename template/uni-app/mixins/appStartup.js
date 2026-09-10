let splashClosed = false;

export default {
  onReady() {
    // 广告关闭时引导页会立即切到首页，两个页面中先完成渲染的负责关闭。
    // 不等待广告接口/图片，也不依赖原生的白屏检测超时。
    if (splashClosed || typeof plus === 'undefined' || !plus.navigator) return;
    plus.navigator.closeSplashscreen();
    splashClosed = true;
  },
};
