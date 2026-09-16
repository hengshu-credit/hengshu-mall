<template>
  <image class="product-image-fallback" :key="imageSrc" :src="imageSrc" :data-src="imageSrc"
    :mode="mode" @error="onImageError" />
</template>

<script>
const placeholder = '/static/easy-loadimage/loading.png';

export default {
  props: {
    product: { type: Object, default: () => ({}) },
    src: { type: String, default: '' },
    fallbackSrc: { type: String, default: '' },
    mode: { type: String, default: 'aspectFill' },
  },
  data() { return { failedSources: [] }; },
  computed: {
    sources() {
      const product = this.product || {};
      return [...new Set([this.src, (product.attrInfo || {}).image, product.image, this.fallbackSrc, placeholder]
        .filter(value => typeof value === 'string' && value.trim())
        .map(value => value.trim()))];
    },
    sourceKey() { return JSON.stringify(this.sources); },
    imageSrc() { return this.sources.find(src => !this.failedSources.includes(src)) || ''; },
  },
  watch: {
    sourceKey() { this.failedSources = []; },
  },
  methods: {
    onImageError(event) {
      // Use the failing element's URL: a late event from an old SKU must not
      // mark the replacement image as failed.
      const src = event.currentTarget.dataset.src;
      if (this.sources.includes(src) && !this.failedSources.includes(src)) this.failedSources.push(src);
    },
  },
};
</script>

<style scoped>
.product-image-fallback { display: block; width: 100%; height: 100%; border-radius: inherit; }
</style>
