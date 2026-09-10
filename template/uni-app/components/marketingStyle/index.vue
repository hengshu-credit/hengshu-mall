<template>
  <view
    v-if="marketingImage && failedImage !== marketingImage"
    class="marketing-style"
    :class="marketingKind"
    :aria-label="currentMarketingStyle.name"
  >
    <image :src="marketingImage" :mode="marketingKind === 'border' ? 'scaleToFill' : 'widthFix'" @error="imageFailed" />
  </view>
</template>
<script>
import marketingStyle from '@/mixins/marketingStyle';
export default {
  mixins: [marketingStyle],
  data() {
    return { failedImage: '' };
  },
  watch: {
    marketingImage: {
      immediate: true,
      handler(value) {
        this.$emit('visibility', !!value && this.failedImage !== value);
      },
    },
  },
  methods: {
    imageFailed() {
      this.failedImage = this.marketingImage;
      this.$emit('visibility', false);
    },
  },
};
</script>
<style scoped>
.marketing-style {
  pointer-events: none;
}
.marketing-style.border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}
.marketing-style.border image {
  display: block;
  width: 100%;
  height: 100%;
}
.marketing-style.atmosphere {
  width: 100%;
  line-height: 0;
}
.marketing-style.atmosphere image {
  display: block;
  width: 100%;
}
</style>
