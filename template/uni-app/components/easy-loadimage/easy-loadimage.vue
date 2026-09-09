<template>
  <view class="easy-loadimage" :style="[boxStyle]" :id="uid">
    <image
      class="origin-img"
      :key="imageSrc"
      :src="imageSrc"
      mode="aspectFill"
      v-if="loadImg && !isLoadError"
      v-show="showImg"
      :style="[imgStyle]"
      :class="{
        'no-transition': !openTransition,
        'show-transition': showTransition && openTransition,
      }"
      @load="handleImgLoad"
      @error="handleImgError"
    >
    </image>
    <image
      class="border-img"
      :key="'border-' + borderSrc"
      :src="borderSrc"
      mode="aspectFill"
      v-if="loadImg && !isLoadError && borderSrc && borderLoaded !== 2"
      v-show="showImg && borderLoaded === 1"
      :style="[imgStyle]"
      :class="{
        'no-transition': !openTransition,
        'show-transition': showTransition && openTransition,
      }"
      @load="handleBorderLoad"
      @error="handleBorderError"
    >
    </image>
    <view
      :class="isLoadError ? 'loadfail-img' : ['loading-img', loadingMode]"
      v-if="!showImg || isLoadError"
    >
      <slot name="placeholder"><view class="placeholder-picture"></view></slot>
    </view>
  </view>
</template>
<script>
import { Throttle } from "@/utils/validate.js";
// #ifdef H5
import { observeImageVisibility } from "@/utils/imageVisibility.js";
// #endif

// 生成全局唯一id
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export default {
  props: {
    imageSrc: {
      type: String,
      default: "",
    },
    borderSrc: {
      type: String,
      default: "",
    },
    mode: {
      type: String,
      default: "",
    },
    loadingMode: {
      type: String,
      default: "looming-gray",
    },
    openTransition: {
      type: Boolean,
      default: true,
    },
    viewHeight: {
      type: Number,
      default() {
        return uni.getWindowInfo().windowHeight;
      },
    },
    width: {
      type: String,
      default: "",
    },
    height: {
      type: String,
      default: "",
    },
    borderRadius: {
      type: String,
      default: "",
    },
  },
  data() {
    const that = this;
    return {
      // uid:'',
      uid: "uid-" + generateUUID(),
      loadImg: false,
      showImg: false,
      isLoadError: false,
      borderLoaded: 0,
      showTransition: false,
      scrollFn: Throttle(function () {
        // 加载img时才执行滚动监听判断是否可加载
        if (that._isDestroyed || that.loadImg || that.isLoadError) return;
        const id = that.uid;
        const query = uni.createSelectorQuery().in(that);
        query
          .select("#" + id)
          .boundingClientRect((data) => {
            if (!data || that._isDestroyed) return;
            if (data.top - that.viewHeight < 0) {
              that.loadVisibleImage();
            }
          })
          .exec();
      }, 200),
    };
  },
  computed: {
    boxStyle() {
      return {
        width: this.width,
        height: this.height,
        borderRadius: this.borderRadius,
      };
    },
    imgStyle() {
      return {
        borderRadius: this.borderRadius,
      };
    },
  },
  watch: {
    imageSrc() {
      clearTimeout(this._transitionTimer);
      this.showImg = false;
      this.showTransition = false;
      this.isLoadError = false;
      if (this.loadImg) {
        this.loadVisibleImage();
      } else {
        this.$nextTick(this.startVisibility);
      }
    },
    borderSrc() {
      this.borderLoaded = 0;
    },
  },
  methods: {
    stopVisibility() {
      if (this._stopVisibility) this._stopVisibility();
      this._stopVisibility = null;
      uni.$off("scroll", this.scrollFn);
    },
    startVisibility() {
      if (this._isDestroyed) return;
      this.stopVisibility();
      // #ifdef H5
      this._stopVisibility = observeImageVisibility(this.$el, this.loadVisibleImage);
      if (this._stopVisibility) return;
      // #endif
      uni.$on("scroll", this.scrollFn);
      this.init();
    },
    loadVisibleImage() {
      if (this._isDestroyed) return;
      this.loadImg = !!this.imageSrc;
      this.isLoadError = !this.loadImg;
      if (!this.loadImg) this.borderLoaded = 0;
      this.stopVisibility();
    },
    init() {
      this.$nextTick(this.onScroll);
    },
    handleBorderLoad() {
      this.borderLoaded = 1;
    },
    handleBorderError() {
      this.borderLoaded = 2;
    },
    handleImgLoad(e) {
      this.showImg = true;
      // this.$nextTick(function(){
      //     this.showTransition = true
      // })
      clearTimeout(this._transitionTimer);
      this._transitionTimer = setTimeout(() => {
        if (!this._isDestroyed) this.showTransition = true;
      }, 50);
    },
    handleImgError(e) {
      clearTimeout(this._transitionTimer);
      this.showImg = false;
      this.showTransition = false;
      this.borderLoaded = 0;
      this.isLoadError = true;
    },
    onScroll() {
      this.scrollFn();
    },
  },
  mounted() {
    this.startVisibility();
  },
  beforeDestroy() {
    this.stopVisibility();
    clearTimeout(this._transitionTimer);
  },
};
</script>

<style scoped>
.easy-loadimage {
  position: relative;
  overflow: hidden;
}

.border-img {
  position: absolute;
  width: 100%;
  height: 100%;
  /* max-height: 360rpx; */
  top: 0;
  left: 0;
}

/* 官方优化图片tips */
image {
  will-change: transform;
}

/* 渐变过渡效果处理 */
image.origin-img {
  width: 100%;
  height: 100%;
  opacity: 0.3;
  /* max-height: 360rpx; */
}

image.origin-img.show-transition {
  transition: opacity 0.5s;
  opacity: 1;
}

image.origin-img.no-transition {
  opacity: 1;
}

/* 渐变过渡效果处理 */
image.border-img {
  width: 100%;
  height: 100%;
  opacity: 0.3;
  /* max-height: 360rpx; */
}

image.border-img.show-transition {
  transition: opacity 0.5s;
  opacity: 1;
}

image.border-img.no-transition {
  opacity: 1;
}

/* 加载失败、加载中的占位图样式控制 */
.loadfail-img,
.loading-img {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.placeholder-picture {
  width: 100%;
  height: 100%;
  background: #f5f5f5 url("~@/static/easy-loadimage/loading.png") no-repeat center;
  background-size: auto 45%;
}

/* Keep a stable local placeholder while the network image loads. */
.loading-img::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.45) 50%, transparent 80%);
  animation: image-shimmer 1.4s ease-in-out infinite;
}

@keyframes image-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .loading-img, .loading-img::after {
    animation: none !important;
  }
}

/* 动态灰色若隐若现 */
.looming-gray {
  animation: looming-gray 1s infinite linear;
  background-color: #e3e3e3;
  border-radius: 12rpx;
}

@keyframes looming-gray {
  0% {
    background-color: #e3e3e3aa;
  }

  50% {
    background-color: #e3e3e3;
  }

  100% {
    background-color: #e3e3e3aa;
  }
}

/* 骨架屏1 */
.skeleton-1 {
  background-color: #e3e3e3;
  background-image: linear-gradient(
    100deg,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0) 80%
  );
  background-size: 100rpx 100%;
  background-repeat: repeat-y;
  background-position: 0 0;
  animation: skeleton-1 0.6s infinite;
}

@keyframes skeleton-1 {
  to {
    background-position: 200% 0;
  }
}

/* 骨架屏2 */
.skeleton-2 {
  background-image: linear-gradient(
    -90deg,
    #fefefe 0%,
    #e6e6e6 50%,
    #fefefe 100%
  );
  background-size: 400% 400%;
  background-position: 0 0;
  animation: skeleton-2 1.2s ease-in-out infinite;
}

@keyframes skeleton-2 {
  to {
    background-position: -135% 0;
  }
}
</style>
