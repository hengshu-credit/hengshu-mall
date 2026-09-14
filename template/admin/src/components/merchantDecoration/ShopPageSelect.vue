<template>
  <div>
    <el-select
      :value="value || ''"
      filterable
      remote
      clearable
      :remote-method="search"
      :loading="loading"
      :disabled="disabled"
      placeholder="选择商户主题"
      @change="$emit('input', Number($event) || 0)"
      ><el-option
        v-for="page in pages"
        :key="page.id"
        :value="Number(page.id)"
        :label="page.title || '商户主题 #' + page.id" /><el-option
        v-if="value && !pages.some((page) => Number(page.id) === value)"
        :value="value"
        :label="'商户主题 #' + value"
    /></el-select>
    <p v-if="error" class="error" @click="search('')">{{ error }}，点击重试</p>
  </div>
</template>
<script>
import { merchantGet } from '@/api/merchant';
export default {
  props: { value: { type: Number, default: 0 }, disabled: Boolean },
  data: () => ({ pages: [], loading: false, error: '', sequence: 0 }),
  created() {
    this.search('');
  },
  methods: {
    async search(keyword) {
      const seq = ++this.sequence;
      this.loading = true;
      this.error = '';
      try {
        const res = await merchantGet('shop/pages', { keyword });
        if (!Array.isArray(res.data)) throw new Error('页面列表返回格式不正确');
        if (seq === this.sequence) this.pages = res.data.filter(page => page && Number(page.id)>0);
      } catch (error) {
        if (seq === this.sequence) { this.pages=[]; this.error = error.msg || error.message || '读取页面失败'; }
      } finally {
        if (seq === this.sequence) this.loading = false;
      }
    },
  },
};
</script>
<style scoped>
.el-select {
  width: 100%;
}
.error {
  font-size: 12px;
  color: #f56c6c;
  cursor: pointer;
}
</style>
