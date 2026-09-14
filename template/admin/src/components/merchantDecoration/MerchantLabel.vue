<template>
  <div v-if="name" class="merchant-name"><i class="merchant-icon" aria-hidden="true" /><span class="merchant-name-text">{{ name }}</span><span class="merchant-enter">进店<span class="merchant-enter-arrow">›</span></span></div>
</template>
<script>
export default { props:{name:{type:String,default:''}} };
</script>
<style scoped lang="scss">
@import '../../../../shared/merchantPresentation.scss';
@include merchant-entry(.5px);
</style>
