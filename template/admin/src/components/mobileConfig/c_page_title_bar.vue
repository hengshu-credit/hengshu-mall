<template><div v-if="configObj">
  <c-set-up :configObj="configObj" configNme="setUp" />
  <div v-if="configObj.setUp.tabVal === 0" class="title-content">
    <el-form label-position="top" size="small"><el-form-item label="标题文字"><el-input v-model="configObj.title" maxlength="30" /></el-form-item></el-form>
    <header-actions-settings :config="configObj.headerActions" :allowCartManage="!!allowCartManage" />
  </div>
  <template v-else>
    <el-form label-width="90px" size="small" class="title-content"><el-form-item label="标题文字色"><el-color-picker v-model="configObj.textColor" /></el-form-item></el-form>
    <c-common-style :configObj="styleConfig" />
  </template>
</div></template>
<script>
import cSetUp from '@/components/mobileConfigRight/c_set_up';
import cCommonStyle from '@/components/mobileConfigRight/c_common_style';
import HeaderActionsSettings from '@/components/themeActions/HeaderActionsSettings';
export default {
  name: 'c_page_title_bar', componentsName: 'page_title_bar', cname: '页面标题',
  components: { cSetUp, cCommonStyle, HeaderActionsSettings }, props: ['num', 'activeIndex', 'dataConfig', 'allowCartManage'],
  computed: {
    configObj() { return this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num]; },
    styleConfig() { const { textColor, ...styles } = this.configObj; return styles; },
  },
};
</script>
<style scoped>.title-content{padding:15px}</style>
