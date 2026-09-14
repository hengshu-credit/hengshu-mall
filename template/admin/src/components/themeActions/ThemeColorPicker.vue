<template><div class="theme-color-picker">
  <el-select v-if="allowTheme" class="color-source" :value="source" size="mini" @change="changeSource" aria-label="颜色来源"><el-option value="custom" label="自定义颜色" /><el-option v-for="option in options" :key="option.value" :value="option.value" :label="option.label" /></el-select>
  <div v-if="source==='custom'" class="custom-color"><el-color-picker :value="value" show-alpha @change="update($event||'transparent')" /><el-input :value="value" size="mini" aria-label="自定义颜色值" @input="update" /></div>
  <span v-else class="bound-color" :style="{background:value}" aria-label="已绑定主题色"></span>
</div></template>
<script>
import {themeColorOptions,isThemeColor} from '../../../../shared/themeColors';
export default {props:{value:{type:String,default:'#ffffff'},allowTheme:{type:Boolean,default:true}},data(){return{options:themeColorOptions,lastCustom:isThemeColor(this.value)?'#ffffff':this.value};},computed:{source(){return isThemeColor(this.value)?this.value:'custom';}},watch:{value(value){if(!isThemeColor(value))this.lastCustom=value;}},methods:{changeSource(value){this.$emit('input',value==='custom'?this.lastCustom:value);},update(value){this.$emit('input',value);}}};
</script>
<style scoped>.theme-color-picker{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}.color-source{width:130px}.custom-color{display:flex;align-items:center;gap:6px;flex:1;min-width:100px}.custom-color .el-input{min-width:50px}.bound-color{display:block;width:22px;height:22px;border:1px solid #ddd;border-radius:3px}</style>
