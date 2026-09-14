<template>
  <web-view
    v-if="url"
    class="web-view"
    :webview-styles="webviewStyles"
    :src="url"
    :style="{ width: windowW + 'px', height: windowH + 'px' }"
  ></web-view>
</template>

<script>
import {decodedExternalLink} from '../../../../shared/pageActions';
export default {
  data() {
    return {
      windowH: 0,
      windowW: 0,
      webviewStyles: {
        progress: {
          color: "transparent",
        },
      },
      url: "",
    };
  },
  onLoad(option) {
    this.url = decodedExternalLink(option.url);
    if(!this.url)uni.showToast({title:'链接地址不正确',icon:'none'});
    try {
      const res = uni.getWindowInfo();
      this.windowW = res.windowWidth;
      this.windowH = res.windowHeight;
    } catch (e) {
      // error
    }
  },
};
</script>
