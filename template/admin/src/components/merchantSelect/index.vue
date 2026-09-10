<template>
  <div class="merchant-select">
    <el-select :value="value || ''" filterable remote :remote-method="search" :loading="loading" :clearable="clearable" :disabled="disabled" :placeholder="placeholder" @change="change" @visible-change="visible">
      <el-option v-for="item in options" :key="item.id" :value="Number(item.id)" :label="item.name" :disabled="!allowUnavailable && !item.available && !item.draft_available">
        <span>{{ item.name }}</span><span class="merchant-option-type">{{ item.type_name }}</span>
      </el-option>
    </el-select>
    <p v-if="selected && !selected.available && !allowUnavailable" class="merchant-select-note">{{ selected.reason }}，可保存下架商品。</p>
    <p v-if="error" class="merchant-select-error">{{ error }} <el-button type="text" @click="search('')">重试</el-button></p>
  </div>
</template>
<script>
import { merchantOptions } from '@/api/merchant';
export default {
  name: 'MerchantSelect',
  props: { value: [Number, String], clearable: Boolean, disabled: Boolean, allowUnavailable: Boolean, autoDefault: Boolean, placeholder: { type: String, default: '请选择所属商户' } },
  data() { return { options: [], loading: false, error: '', sequence: 0 }; },
  computed: { selected() { return this.options.find((item) => Number(item.id) === Number(this.value)); } },
  watch: { value(value) { if (value && !this.options.some((item) => Number(item.id) === Number(value))) this.search(''); } },
  created() { this.search(''); },
  methods: {
    visible(open) { if (open && !this.options.length) this.search(''); },
    change(value) { this.$emit('input', value === '' ? null : Number(value)); this.$emit('change', value); },
    async search(keyword) { const seq = ++this.sequence; this.loading = true; this.error = ''; try { const { data } = await merchantOptions({ keyword, selected_ids: Number(this.value) > 0 ? [Number(this.value)] : [] }); if (seq === this.sequence) { this.options = data; if (!this.value && this.autoDefault) { const platform = data.find((item) => item.is_platform); if (platform) this.change(platform.id); } } } catch (e) { if (seq === this.sequence) this.error = e.msg || e.message || '商户候选读取失败'; } finally { if (seq === this.sequence) this.loading = false; } },
  },
};
</script>
<style scoped>.merchant-select .el-select { width: 100%; }.merchant-option-type { float: right; margin-left: 18px; color: #909399; font-size: 12px; }.merchant-select-note { color: #e6a23c; font-size: 12px; line-height: 1.7; margin: 6px 0; }.merchant-select-error { color: #f56c6c; font-size: 12px; margin: 5px 0; }</style>
