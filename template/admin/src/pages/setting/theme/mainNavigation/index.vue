<template><div class="navigation-redirect">正在打开主题编辑器…</div></template>
<script>
import { themeInfo } from '@/api/diy';
import setting from '@/setting';
export default {
  name: 'MainNavigationRedirect',
  async created() {
    try {
      const { data } = await themeInfo(Number(this.$route.query.id) || 0, 'base');
      await this.$router.replace({
        path: setting.routePre + '/setting/edit_theme',
        query: { id: data.id, type: 'home', component: 'main_navigation' },
      });
    } catch (error) {
      this.$message.error(error.msg || '主题读取失败');
    }
  },
};
</script>
