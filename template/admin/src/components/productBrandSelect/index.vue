<template>
  <div class="product-brand-select">
    <el-select
      :value="value"
      multiple
      filterable
      clearable
      :loading="loading"
      placeholder="搜索并选择品牌（可多选）"
      no-data-text="暂无适用品牌"
      class="brand-input"
      @input="$emit('input', $event)"
    >
      <el-option
        v-for="brand in displayOptions"
        :key="brand.id"
        :value="brand.id"
        :label="optionLabel(brand)"
        :disabled="loading || !!loadError || !brand.available"
      >
        <img v-if="brand.logo" :src="brand.logo" alt="" class="brand-logo" />
        <span>{{ brand.name }}</span>
        <span v-if="!loading && !loadError && !brand.available" class="unavailable">不可用</span>
      </el-option>
    </el-select>
    <div v-if="loadError" class="brand-error" role="alert">
      {{ loadError }}
      <el-button type="text" :loading="loading" @click="loadOptions">重试</el-button>
    </div>
    <div v-else-if="invalidBrands.length" class="brand-warning" role="alert">
      已选品牌已停用或不适用于当前分类，请移除不可用品牌后保存。
    </div>
    <div v-else class="brand-help">非必填，可选择多个品牌；候选品牌包含通用品牌和适用于所选分类的品牌。</div>
  </div>
</template>

<script>
import { brandOptionsApi } from '@/api/productBrand';

export default {
  name: 'ProductBrandSelect',
  props: {
    value: { type: Array, default: () => [] },
    cateIds: { type: Array, default: () => [] },
    selectedBrands: { type: Array, default: () => [] },
  },
  data() {
    return { options: [], loading: false, loadError: '', requestSeq: 0, loaded: false };
  },
  computed: {
    requestKey() {
      return JSON.stringify(this.cateIds);
    },
    displayOptions() {
      const options = this.options.slice();
      this.value.forEach((id) => {
        if (options.some((brand) => brand.id === Number(id))) return;
        const saved = this.selectedBrands.find((brand) => Number(brand.id) === Number(id));
        options.push({ ...saved, id: Number(id), name: saved ? saved.name : `品牌 #${id}`, available: false });
      });
      return options;
    },
    invalidBrands() {
      if (this.loading || this.loadError || !this.loaded) return [];
      return this.displayOptions.filter((brand) => this.value.includes(brand.id) && !brand.available);
    },
  },
  watch: {
    requestKey: { immediate: true, handler: 'loadOptions' },
    value: {
      deep: true,
      handler(ids) {
        if (ids.some((id) => !this.options.some((brand) => brand.id === Number(id)))) this.loadOptions();
      },
    },
  },
  beforeDestroy() {
    this.requestSeq++;
  },
  methods: {
    optionLabel(brand) {
      return this.loaded && !this.loading && !this.loadError && !brand.available
        ? `${brand.name}（不可用）`
        : brand.name;
    },
    async loadOptions() {
      const requestSeq = ++this.requestSeq;
      this.loading = true;
      this.loadError = '';
      try {
        const res = await brandOptionsApi({ cate_ids: this.cateIds.slice(), selected_ids: this.value.slice() });
        if (requestSeq !== this.requestSeq) return;
        if (!Array.isArray(res.data)) throw new Error('品牌数据异常，请重试');
        const options = res.data.map((brand) => ({
          ...brand,
          id: Number(brand.id),
          available: brand.available === true || Number(brand.available) === 1,
        }));
        this.displayOptions.forEach((brand) => {
          if (this.value.includes(brand.id) && !options.some((option) => option.id === brand.id)) {
            options.push({ ...brand, available: false });
          }
        });
        this.options = options;
        this.loaded = true;
      } catch (error) {
        if (requestSeq !== this.requestSeq) return;
        this.loadError = (error && (error.msg || error.message)) || '品牌加载失败，请重试';
      } finally {
        if (requestSeq === this.requestSeq) this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.product-brand-select {
  width: 460px;
  max-width: 100%;
}
.brand-input {
  width: 100%;
}
.brand-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  vertical-align: middle;
  margin-right: 8px;
}
.brand-help,
.brand-warning,
.brand-error {
  margin-top: 4px;
  font-size: 12px;
  line-height: 20px;
}
.brand-help {
  color: #909399;
}
.brand-warning,
.unavailable {
  color: #b5791b;
}
.unavailable {
  margin-left: 8px;
  font-size: 12px;
}
.brand-error {
  color: #f56c6c;
}
</style>
