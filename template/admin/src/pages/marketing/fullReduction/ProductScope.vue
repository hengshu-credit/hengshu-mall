<template>
  <div class="product-scope">
    <el-radio-group :value="rangeType" :disabled="disabled" @input="changeRange">
      <el-radio :label="0">全部商品</el-radio><el-radio :label="3">指定商品</el-radio
      ><el-radio :label="4">排除指定商品</el-radio>
    </el-radio-group>
    <p class="scope-help">
      {{
        rangeType === 3 ? '只有下方已选商品参与活动，可逐个移除。' : '全部非预售商品参与活动，可单独剔除不参加的商品。'
      }}
    </p>
    <div class="product-filters">
      <el-input
        v-model="filters.keyword"
        placeholder="商品名称 / ID"
        clearable
        maxlength="60"
        @keyup.enter.native="search"
      />
      <el-cascader
        v-model="filters.category_id"
        :options="dictionaries.categories"
        :props="{ checkStrictly: true, emitPath: false }"
        placeholder="筛选商品分类"
        clearable
        filterable
      />
      <el-select v-model="filters.brand_id" placeholder="筛选品牌" clearable filterable
        ><el-option v-for="item in dictionaries.brands" :key="item.id" :label="item.name" :value="Number(item.id)"
      /></el-select>
      <el-select v-model="filters.label_id" placeholder="筛选商品标签" clearable filterable
        ><el-option v-for="item in dictionaries.labels" :key="item.id" :label="item.name" :value="Number(item.id)"
      /></el-select>
      <el-button type="primary" @click="search">筛选</el-button><el-button @click="reset">重置</el-button>
    </div>
    <div v-if="dictionaryError" class="scope-error" role="alert">
      {{ dictionaryError }} <el-button type="text" @click="loadDictionaries">重试筛选项</el-button>
    </div>
    <div v-if="error" class="scope-error" role="alert">
      {{ error }} <el-button type="text" @click="load">重试商品列表</el-button>
    </div>
    <div class="scope-toolbar">
      <el-button :disabled="disabled || loading || !checked.length" @click="add(checked)">{{
        rangeType === 3 ? '加入选中商品' : '剔除选中商品'
      }}</el-button
      ><span class="scope-help">筛选不会改变已选范围，选择商品后才会生效。</span>
    </div>
    <el-table ref="table" v-loading="loading" :data="list" row-key="id" @selection-change="checked = $event">
      <el-table-column type="selection" width="45" :selectable="() => !disabled && !loading" />
      <el-table-column prop="id" label="ID" width="65" />
      <el-table-column label="商品" min-width="240"
        ><template slot-scope="{ row }"
          ><div class="product-cell">
            <img v-if="row.image" :src="row.image" alt="" /><span>{{ row.name }}</span>
          </div></template
        ></el-table-column
      >
      <el-table-column label="售价" width="100"
        ><template slot-scope="{ row }">¥{{ row.price }}</template></el-table-column
      >
      <el-table-column label="参与状态" width="100"
        ><template slot-scope="{ row }"
          ><el-tag size="small" :type="participates(row) ? 'success' : 'info'">{{
            participates(row) ? '参与活动' : '不参与'
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="操作" width="100"
        ><template slot-scope="{ row }"
          ><el-button type="text" :disabled="disabled" @click="toggle(row)">{{
            contains(row) ? (rangeType === 3 ? '移除' : '恢复参与') : rangeType === 3 ? '加入' : '剔除'
          }}</el-button></template
        ></el-table-column
      >
    </el-table>
    <el-pagination
      class="scope-pagination"
      :current-page="page"
      :page-size="20"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="pageChange"
    />
    <div class="selected-heading">
      {{ rangeType === 3 ? '已选商品' : '已剔除商品' }}（{{ selected.length }}）<el-button
        v-if="selected.length"
        type="text"
        :disabled="disabled"
        @click="$emit('change', { rangeType: rangeType === 4 ? 0 : rangeType, selected: [] })"
        >清空清单</el-button
      >
    </div>
    <el-table :data="selected" max-height="300" empty-text="暂无商品">
      <el-table-column prop="id" label="ID" width="65" />
      <el-table-column label="商品名称" min-width="240"
        ><template slot-scope="{ row }"
          ><span :class="{ 'scope-error': row.unavailable }">{{ row.name }}</span></template
        ></el-table-column
      >
      <el-table-column label="操作" width="100"
        ><template slot-scope="{ row }"
          ><el-button type="text" :disabled="disabled" @click="remove(row)">{{
            rangeType === 3 ? '移除' : '恢复参与'
          }}</el-button></template
        ></el-table-column
      >
    </el-table>
  </div>
</template>

<script>
import { fullReductionOptionsApi } from '@/api/fullReduction';
export default {
  name: 'FullReductionProductScope',
  props: { rangeType: { type: Number, default: 0 }, selected: { type: Array, default: () => [] }, disabled: Boolean },
  data() {
    return {
      filters: { keyword: '', category_id: '', brand_id: '', label_id: '' },
      dictionaries: { categories: [], brands: [], labels: [] },
      dictionaryError: '',
      list: [],
      checked: [],
      page: 1,
      total: 0,
      loading: false,
      error: '',
      requestId: 0,
    };
  },
  created() {
    this.loadDictionaries();
    this.load();
  },
  beforeDestroy() {
    this.requestId++;
  },
  methods: {
    async loadDictionaries() {
      try {
        const { data } = await fullReductionOptionsApi({ type: 'product_filters' });
        this.dictionaries = data;
        this.dictionaryError = '';
      } catch (error) {
        this.dictionaryError = error.msg || '筛选项加载失败';
      }
    },
    async load() {
      const id = ++this.requestId;
      this.loading = true;
      this.error = '';
      this.checked = [];
      if (this.$refs.table) this.$refs.table.clearSelection();
      try {
        const { data } = await fullReductionOptionsApi({
          type: 'product',
          ...this.filters,
          keyword: this.filters.keyword.trim(),
          page: this.page,
          limit: 20,
        });
        if (id !== this.requestId) return;
        this.list = data.list;
        this.total = Number(data.count);
      } catch (error) {
        if (id === this.requestId) this.error = error.msg || '商品加载失败';
      } finally {
        if (id === this.requestId) this.loading = false;
      }
    },
    search() {
      this.page = 1;
      this.load();
    },
    reset() {
      this.filters = { keyword: '', category_id: '', brand_id: '', label_id: '' };
      this.search();
    },
    pageChange(page) {
      this.page = page;
      this.load();
    },
    contains(row) {
      return this.selected.some((item) => Number(item.id) === Number(row.id));
    },
    participates(row) {
      return this.rangeType === 3 ? this.contains(row) : !this.contains(row);
    },
    changeRange(rangeType) {
      if (!this.disabled && rangeType !== this.rangeType) this.$emit('change', { rangeType, selected: [] });
    },
    add(rows) {
      if (this.disabled || this.loading) return;
      const selected = this.selected
        .concat(rows.filter((row) => !this.contains(row)))
        .map((row) => ({ ...row, id: Number(row.id) }));
      if (selected.length > 1000) return this.$message.error('最多选择1000个商品');
      this.$emit('change', { rangeType: this.rangeType || 4, selected });
    },
    remove(row) {
      if (this.disabled) return;
      const selected = this.selected.filter((item) => Number(item.id) !== Number(row.id));
      this.$emit('change', { rangeType: this.rangeType === 4 && !selected.length ? 0 : this.rangeType, selected });
    },
    toggle(row) {
      if (this.contains(row)) this.remove(row);
      else this.add([row]);
    },
  },
};
</script>

<style scoped>
.product-scope {
  padding: 12px 16px;
}
.scope-help {
  color: #909399;
  font-size: 12px;
}
.product-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0;
}
.product-filters .el-input,
.product-filters .el-select,
.product-filters .el-cascader {
  width: 190px;
}
.scope-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.scope-error {
  color: #f56c6c;
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.product-cell img {
  width: 40px;
  height: 40px;
  object-fit: cover;
}
.scope-pagination {
  text-align: right;
  margin-top: 16px;
}
.selected-heading {
  margin-top: 22px;
  font-weight: 500;
}
.selected-heading .el-button {
  margin-left: 12px;
}
</style>
