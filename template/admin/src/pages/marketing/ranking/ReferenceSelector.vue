<template>
  <div class="rank-reference">
    <el-tag v-for="id in value" :key="id" closable size="small" @close="remove(id)">{{ names[id] || '#' + id }}</el-tag>
    <el-button size="mini" plain @click="open = true">{{ value.length ? '调整选择' : '选择' + label }}</el-button>
    <option-picker v-if="open" :key="type" :type="type" :title="'选择' + label" :initial="selected" :load-options="options" @close="open = false" @confirm="confirm" />
  </div>
</template>
<script>
import OptionPicker from '../fullReduction/OptionPicker';
import { rankingOptions } from '@/api/ranking';
export default {
  components: { OptionPicker }, props: { value: { type: Array, default: () => [] }, type: { type: String, default: 'product' }, label: { type: String, default: '对象' } },
  data() { return { open: false, names: {}, options: rankingOptions, requestId: 0 }; },
  computed: { selected() { return this.value.map(id => ({ id, name: this.names[id] || '#' + id })); } },
  watch: { type() { this.names = {}; this.loadNames(); }, value: { immediate: true, handler() { this.loadNames(); } } },
  beforeDestroy() { this.requestId++; },
  methods: {
    async loadNames() {
      const requestId = ++this.requestId;
      if (!this.value.length) return;
      try { const res = await rankingOptions({ type: this.type, ids: this.value, limit: 200 }); if (requestId === this.requestId) res.data.list.forEach(item => this.$set(this.names, item.id, item.name)); }
      catch (_) { /* Selected IDs remain visible and can be removed if unavailable. */ }
    },
    remove(id) { this.$emit('input', this.value.filter(value => value !== id)); },
    confirm(items) { if (items.length > 200) return this.$message.warning('最多选择200项'); items.forEach(item => this.$set(this.names, item.id, item.name)); this.$emit('input', items.map(item => Number(item.id))); this.$emit('selected', items); this.open = false; },
  },
};
</script>
<style scoped>.rank-reference{display:flex;flex-wrap:wrap;gap:6px;align-items:center}</style>
