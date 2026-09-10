<template><product-bottom v-bind="$props" v-on="$listeners" /></template>
<script>
import ProductBottom from '@/subpackage/diyComponents/productBottom.vue';
// The public presentation component receives the current product and delegates transactions to its page.
export default { name:'productActionBar', components:{ProductBottom}, props:ProductBottom.props };
</script>
