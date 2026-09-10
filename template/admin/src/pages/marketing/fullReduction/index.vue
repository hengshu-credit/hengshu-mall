<template>
  <div class="full-reduction-page">
    <el-card shadow="never">
      <el-form :model="filters" inline label-width="86px" @submit.native.prevent="search">
        <el-form-item label="活动名称："
          ><el-input v-model="filters.name" placeholder="输入活动名称" clearable maxlength="60" @clear="search"
        /></el-form-item>
        <el-form-item label="活动状态：">
          <el-select v-model="filters.state" clearable placeholder="全部状态" @change="search"
            ><el-option v-for="item in states" :key="item.value" :label="item.label" :value="item.value"
          /></el-select>
        </el-form-item>
        <el-form-item
          ><el-button type="primary" native-type="submit">搜索</el-button
          ><el-button @click="reset">重置</el-button></el-form-item
        >
      </el-form>
    </el-card>
    <el-card shadow="never" class="mt16">
      <div class="list-toolbar">
        <el-button v-auth="['marketing-full-reduction-save']" type="primary" icon="el-icon-plus" @click="openCreate"
          >新增满减活动</el-button
        >
        <el-button
          v-auth="['marketing-full-reduction-delete']"
          :disabled="!selection.length || loading"
          :loading="deleting"
          @click="removeSelected"
          >批量删除</el-button
        >
        <span v-if="selection.length" class="selection-count">已选择 {{ selection.length }} 项</span>
      </div>
      <div v-if="error" class="list-error" role="alert">
        {{ error }} <el-button type="text" @click="getList">重试</el-button>
      </div>
      <el-table
        ref="table"
        v-loading="loading"
        :data="list"
        row-key="id"
        class="mt14"
        empty-text="暂无满减活动"
        :default-sort="{ prop: 'sort', order: 'ascending' }"
        @selection-change="selectionChange"
        @sort-change="sortChange"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column prop="name" label="活动名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="type_name" label="活动类型" width="100" />
        <el-table-column label="优惠规则" min-width="170"
          ><template slot-scope="{ row }"
            ><div v-for="(rule, index) in row.rules" :key="index" class="rule-description">
              {{ describeRule(row, rule) }}
            </div></template
          ></el-table-column
        >
        <el-table-column prop="start_time" label="起始日期" width="175" sortable="custom"
          ><template slot-scope="{ row }">{{ row.start_time_text }}</template></el-table-column
        >
        <el-table-column prop="end_time" label="截止日期" width="175" sortable="custom"
          ><template slot-scope="{ row }">{{ row.end_time_text }}</template></el-table-column
        >
        <el-table-column prop="sort" label="排序" width="100" sortable="custom">
          <template slot-scope="{ row }">
            <el-popover
              v-auth="['marketing-full-reduction-save']"
              placement="top"
              width="235"
              trigger="click"
              @show="$set(sortValues, row.id, row.sort)"
            >
              <p class="sort-help">默认50，数值越小越靠前</p>
              <el-input-number
                v-model="sortValues[row.id]"
                :min="0"
                :max="999999"
                :precision="0"
                size="small"
                :controls="false"
                class="sort-input"
              />
              <el-button type="primary" size="small" :loading="!!sortLoading[row.id]" @click="saveSort(row)"
                >保存</el-button
              >
              <el-button slot="reference" type="text">{{ row.sort }} <i class="el-icon-edit" /></el-button>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="95"
          ><template slot-scope="{ row }"
            ><el-tag size="small" :type="stateTag(row.state)">{{ row.state_name }}</el-tag></template
          ></el-table-column
        >
        <el-table-column label="是否启用" width="100">
          <template slot-scope="{ row }"
            ><el-switch
              v-auth="['marketing-full-reduction-status']"
              :value="row.status"
              :active-value="1"
              :inactive-value="0"
              :disabled="!!statusLoading[row.id]"
              :aria-label="row.name + '是否启用'"
              @change="changeStatus(row, $event)"
          /></template>
        </el-table-column>
        <el-table-column label="操作" width="125" fixed="right"
          ><template slot-scope="{ row }"
            ><el-button v-auth="['marketing-full-reduction-save']" type="text" @click="openEdit(row)">编辑</el-button
            ><el-button
              v-auth="['marketing-full-reduction-delete']"
              type="text"
              :disabled="deleting"
              @click="removeOne(row)"
              >删除</el-button
            ></template
          ></el-table-column
        >
      </el-table>
      <div class="pagination">
        <el-pagination
          :current-page="filters.page"
          :page-size="filters.limit"
          :page-sizes="[15, 30, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="pageChange"
          @size-change="sizeChange"
        />
      </div>
    </el-card>
    <activity-form v-if="formVisible" :id="editingId" @close="formVisible = false" @saved="onSaved" />
  </div>
</template>

<script>
import {
  fullReductionListApi,
  fullReductionStatusApi,
  fullReductionSortApi,
  fullReductionDeleteApi,
  fullReductionBatchDeleteApi,
} from '@/api/fullReduction';
import ActivityForm from './ActivityForm.vue';

const emptyFilters = () => ({ page: 1, limit: 15, name: '', state: '', sort_field: 'sort', sort_order: 'ascending' });

export default {
  name: 'marketing_fullReduction',
  components: { ActivityForm },
  data() {
    return {
      filters: emptyFilters(),
      list: [],
      total: 0,
      selection: [],
      loading: false,
      error: '',
      requestId: 0,
      formVisible: false,
      editingId: 0,
      deleting: false,
      statusLoading: {},
      sortLoading: {},
      sortValues: {},
      states: [
        { value: 'pending', label: '未开始' },
        { value: 'running', label: '进行中' },
        { value: 'ended', label: '已结束' },
        { value: 'disabled', label: '已停用' },
      ],
    };
  },
  mounted() {
    this.getList();
  },
  beforeDestroy() {
    this.requestId++;
  },
  methods: {
    async getList() {
      const requestId = ++this.requestId;
      this.loading = true;
      this.error = '';
      this.selection = [];
      if (this.$refs.table) this.$refs.table.clearSelection();
      try {
        const res = await fullReductionListApi({ ...this.filters, name: this.filters.name.trim() });
        if (requestId !== this.requestId) return;
        this.list = res.data.list;
        this.total = Number(res.data.count);
        if (!this.list.length && this.filters.page > 1) {
          this.filters.page = Math.max(1, Math.ceil(this.total / this.filters.limit));
          return this.getList();
        }
      } catch (error) {
        if (requestId === this.requestId) this.error = (error && error.msg) || '满减活动列表加载失败';
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },
    search() {
      this.filters.page = 1;
      this.getList();
    },
    reset() {
      this.filters.name = '';
      this.filters.state = '';
      this.search();
    },
    pageChange(page) {
      this.filters.page = page;
      this.getList();
    },
    sizeChange(limit) {
      this.filters.limit = limit;
      this.search();
    },
    sortChange({ prop, order }) {
      this.filters.sort_field = order ? prop : 'sort';
      this.filters.sort_order = order || 'ascending';
      this.search();
    },
    selectionChange(rows) {
      this.selection = rows.map((row) => row.id);
    },
    stateTag(state) {
      return { pending: 'warning', running: 'success', ended: 'info', disabled: 'info' }[state];
    },
    describeRule(row, rule) {
      return `${row.rules_type ? '满' : '每满'}${Number(rule.threshold)}${row.unit === 1 ? '元' : '件'}${
        row.discount_type === 1 ? '减' : '打'
      }${Number(rule.discount)}${row.discount_type === 1 ? '元' : '折'}`;
    },
    openCreate() {
      this.editingId = 0;
      this.formVisible = true;
    },
    openEdit(row) {
      this.editingId = Number(row.id);
      this.formVisible = true;
    },
    onSaved() {
      this.formVisible = false;
      this.getList();
    },
    async changeStatus(row, status) {
      if (this.statusLoading[row.id]) return;
      this.$set(this.statusLoading, row.id, true);
      try {
        await fullReductionStatusApi(row.id, status);
        this.$message.success('状态已更新');
        await this.getList();
      } catch (error) {
        this.$message.error((error && error.msg) || '状态更新失败');
      } finally {
        this.$delete(this.statusLoading, row.id);
      }
    },
    async saveSort(row) {
      if (this.sortLoading[row.id]) return;
      this.$set(this.sortLoading, row.id, true);
      try {
        await fullReductionSortApi(row.id, this.sortValues[row.id]);
        this.$message.success('排序已更新');
        await this.getList();
      } catch (error) {
        this.$message.error((error && error.msg) || '排序更新失败');
      } finally {
        this.$delete(this.sortLoading, row.id);
      }
    },
    removeOne(row) {
      return this.remove([row.id], `确定删除满减活动“${row.name}”吗？`);
    },
    removeSelected() {
      return this.remove(this.selection.slice(), `确定删除选中的 ${this.selection.length} 个满减活动吗？`);
    },
    async remove(ids, message) {
      if (!ids.length || this.deleting) return;
      this.deleting = true;
      try {
        await this.$confirm(message, '删除满减活动', { type: 'warning' });
        if (ids.length === 1) await fullReductionDeleteApi(ids[0]);
        else await fullReductionBatchDeleteApi(ids);
        this.$message.success('删除成功');
        await this.getList();
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error((error && error.msg) || '删除失败');
      } finally {
        this.deleting = false;
      }
    },
  },
};
</script>

<style scoped>
.list-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.selection-count {
  color: #606266;
  font-size: 13px;
}
.list-error {
  color: #f56c6c;
  padding-top: 12px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  overflow-x: auto;
}
.sort-help {
  font-size: 12px;
  color: #909399;
}
.sort-input {
  width: 110px;
  margin-right: 8px;
}
.rule-description {
  line-height: 24px;
}
</style>
