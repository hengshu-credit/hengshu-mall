<template><view class="component-wrapper" :style="styles.outer"><view class="component-surface" :style="styles.inner"><slot /></view></view></template>
<script>
import {componentStyle} from '../../../shared/componentStyle';
import {HTTP_REQUEST_URL} from '@/config/app';
export default {name:'commonWrapper',props:{config:{type:Object,default:()=>({})}},computed:{styles(){return componentStyle(this.config,'rpx',url=>url&&url.startsWith('/')&&!url.startsWith('/static/')?HTTP_REQUEST_URL+url:url);}}};
</script>
