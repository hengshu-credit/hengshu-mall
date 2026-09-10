<template>
  <el-dialog
    class="full-reduction-picker-host"
    custom-class="full-reduction-picker"
    :title="title"
    :visible="true"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    @close="$emit('close')"
  >
    <el-form inline @submit.native.prevent="search">
      <el-form-item>
        <el-input v-model="keyword" placeholder="输入名称或ID搜索" clearable maxlength="60" @clear="search" />
      </el-form-item>
      <el-form-item><el-button type="primary" native-type="submit">搜索</el-button></el-form-item>
    </el-form>
    <div v-if="error" class="error" role="alert">{{ error }} <el-button type="text" @click="load">重试</el-button></div>
    <el-table
      ref="table"
      v-loading="loading"
      :data="list"
      row-key="id"
      max-height="330"
      @selection-change="selectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column v-if="type === 'product'" label="商品图片" width="80">
        <template slot-scope="{ row }"><img v-if="row.image" :src="row.image" class="product-image" alt="" /></template>
      </el-table-column>
      <el-table-column
        prop="name"
        :label="type === 'product' ? '商品名称' : '名称'"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column v-if="type === 'product'" label="售价" width="100">
        <template slot-scope="{ row }">¥{{ row.price }}</template>
      </el-table-column>
    </el-table>
    <el-pagination
      class="picker-pagination"
      :current-page="page"
      :page-size="20"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="pageChange"
    />
    <div class="selection-heading">
      已选择 {{ selected.length }} 项 <el-button type="text" :disabled="loading" @click="clear">清空</el-button>
    </div>
    <div class="selected-tags">
      <el-tag
        v-for="item in selected"
        :key="item.id"
        closable
        :type="item.unavailable ? 'danger' : 'info'"
        @close="remove(item)"
        >{{ item.name || 'ID ' + item.id }} #{{ item.id }}</el-tag
      >
      <span v-if="!selected.length" class="hint">暂未选择</span>
    </div>
    <div slot="footer">
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" :disabled="loading" @click="$emit('confirm', selected)">确定选择</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { fullReductionOptionsApi } from '@/api/fullReduction';

export default {
  name: 'FullReductionOptionPicker',
  props: {
    loadOptions: { type: Function, default: fullReductionOptionsApi },
    title: { type: String, default: '选择商品' },
    type: { type: String, default: 'product' },
    initial: { type: Array, default: () => [] },
  },
  data() {
    return {
      keyword: '',
      page: 1,
      total: 0,
      list: [],
      selected: this.initial.map((item) => ({ ...item })),
      loading: false,
      error: '',
      restoring: false,
      requestId: 0,
    };
  },
  created() {
    this.load();
  },
  beforeDestroy() {
    this.requestId++;
  },
  methods: {
    async load() {
      const requestId = ++this.requestId;
      this.loading = true;
      this.error = '';
      this.restoring = true;
      try {
        const res = await this.loadOptions({
          type: this.type,
          keyword: this.keyword.trim(),
          page: this.page,
          limit: 20,
        });
        if (requestId !== this.requestId) return;
        this.list = res.data.list;
        this.total = Number(res.data.count);
        await this.restoreSelection();
      } catch (error) {
        if (requestId === this.requestId) this.error = (error && error.msg) || '选择项加载失败';
      } finally {
        if (requestId === this.requestId) {
          this.loading = false;
          this.restoring = false;
        }
      }
    },
    async restoreSelection() {
      this.restoring = true;
      await this.$nextTick();
      if (this.$refs.table) {
        this.$refs.table.clearSelection();
        this.list.forEach((row) =>
          this.$refs.table.toggleRowSelection(
            row,
            this.selected.some((item) => Number(item.id) === Number(row.id)),
          ),
        );
      }
      await this.$nextTick();
      this.restoring = false;
    },
    selectionChange(rows) {
      if (this.restoring || this.loading) return;
      const ids = new Set(this.list.map((item) => Number(item.id)));
      const next = this.selected.filter((item) => !ids.has(Number(item.id))).concat(rows);
      if (next.length > 1000) {
        this.$message.error('最多选择1000项');
        this.restoreSelection();
        return;
      }
      this.selected = next;
    },
    search() {
      this.page = 1;
      this.load();
    },
    pageChange(page) {
      this.page = page;
      this.load();
    },
    clear() {
      this.selected = [];
      this.restoreSelection();
    },
    remove(item) {
      this.selected = this.selected.filter((row) => row.id !== item.id);
      this.restoreSelection();
    },
  },
};
</script>

<style scoped>
.product-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
}
.picker-pagination {
  margin-top: 16px;
  text-align: right;
}
.selection-heading {
  margin-top: 16px;
}
.selected-tags {
  max-height: 110px;
  overflow: auto;
}
.selected-tags .el-tag {
  margin: 4px 6px 4px 0;
}
.hint {
  color: #909399;
}
.error {
  color: #f56c6c;
}
</style>

<style>
.full-reduction-picker-host .el-dialog {
  max-width: calc(100vw - 24px);
}
</style>
