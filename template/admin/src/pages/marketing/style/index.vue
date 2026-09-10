<template>
  <div class="marketing-style-page">
    <div class="style-kinds">
      <el-card v-for="kind in kinds" :key="kind.value" shadow="never"
        ><div class="kind-content">
          <div class="kind-icon"><i :class="kind.icon"></i></div>
          <div>
            <h3>{{ kind.name }}</h3>
            <p>{{ kind.description }}</p>
            <el-button v-auth="['marketing-style-save']" type="primary" size="small" @click="create(kind.value)"
              >创建{{ kind.name }}</el-button
            >
          </div>
        </div></el-card
      >
    </div>
    <el-card shadow="never" class="style-list-card">
      <el-form :model="filters" inline size="small" label-width="82px" @submit.native.prevent="search">
        <el-form-item label="活动搜索"
          ><el-input v-model="filters.keyword" clearable maxlength="60" placeholder="活动名称或ID"
        /></el-form-item>
        <el-form-item label="样式类型"
          ><el-select v-model="filters.kind" clearable placeholder="全部类型"
            ><el-option v-for="kind in kinds" :key="kind.value" :label="kind.name" :value="kind.value" /></el-select
        ></el-form-item>
        <el-form-item label="活动状态"
          ><el-select v-model="filters.status" clearable placeholder="全部状态"
            ><el-option
              v-for="state in states"
              :key="state.value"
              :label="state.name"
              :value="state.value" /></el-select
        ></el-form-item>
        <el-form-item label="活动时间"
          ><el-date-picker
            v-model="range"
            type="daterange"
            value-format="timestamp"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
        /></el-form-item>
        <el-form-item
          ><el-button type="primary" native-type="submit">搜索</el-button
          ><el-button @click="reset">重置</el-button></el-form-item
        >
      </el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon
        ><el-button type="text" @click="load">重试</el-button></el-alert
      >
      <el-table v-loading="loading" :data="list" empty-text="暂无营销样式" class="mt14">
        <el-table-column prop="id" label="ID" width="65" />
        <el-table-column prop="name" label="活动名称" min-width="165" show-overflow-tooltip />
        <el-table-column prop="kind_name" label="类型" width="100" />
        <el-table-column label="素材" width="100"
          ><template slot-scope="{ row }"
            ><div v-viewer class="style-thumb"><img :src="assetUrl(row.mobile_image)" :alt="row.name" /></div></template
        ></el-table-column>
        <el-table-column label="使用范围" min-width="110"
          ><template slot-scope="{ row }">{{ scopeName(row.scope_type) }}</template></el-table-column
        >
        <el-table-column prop="product_count" label="商品数" width="85" />
        <el-table-column prop="priority" label="优先级" width="85" />
        <el-table-column label="活动时间" min-width="170"
          ><template slot-scope="{ row }"
            ><div>{{ formatDate(row.start_time) }}</div>
            <div>{{ formatDate(row.end_time) }}</div></template
          ></el-table-column
        >
        <el-table-column label="活动状态" width="100"
          ><template slot-scope="{ row }"
            ><el-tag
              size="small"
              :type="row.status === 'running' ? 'success' : row.status === 'upcoming' ? 'warning' : 'info'"
              >{{ row.status_name }}</el-tag
            ></template
          ></el-table-column
        >
        <el-table-column label="是否开启" width="100"
          ><template slot-scope="{ row }"
            ><el-switch
              v-auth="['marketing-style-status']"
              :value="row.enabled"
              :active-value="1"
              :inactive-value="0"
              :disabled="!!updating[row.id]"
              :aria-label="row.name + '启用状态'"
              @change="toggle(row, $event)" /></template
        ></el-table-column>
        <el-table-column label="创建时间" width="170"
          ><template slot-scope="{ row }">{{ formatDate(row.add_time) }}</template></el-table-column
        >
        <el-table-column label="操作" width="130" fixed="right"
          ><template slot-scope="{ row }"
            ><el-button v-auth="['marketing-style-save']" type="text" :disabled="opening" @click="edit(row)"
              >编辑</el-button
            ><el-button
              v-auth="['marketing-style-delete']"
              type="text"
              :disabled="!!updating[row.id]"
              @click="remove(row)"
              >删除</el-button
            ></template
          ></el-table-column
        >
      </el-table>
      <div class="page-footer">
        <el-pagination
          :current-page="page"
          :page-size="15"
          :total="count"
          layout="total, prev, pager, next"
          @current-change="pageChange"
        />
      </div>
    </el-card>
    <style-form v-if="editor" :key="editor.id || editor.kind" :value="editor" @close="editor = null" @saved="saved" />
  </div>
</template>
<script>
import StyleForm from './StyleForm';
import {
  marketingStyleList,
  marketingStyleInfo,
  marketingStyleStatus,
  marketingStyleDelete,
} from '@/api/marketingStyle';
import setting from '@/setting';
export default {
  name: 'MarketingStyleList',
  components: { StyleForm },
  data() {
    return {
      filters: { keyword: '', kind: '', status: '' },
      range: [],
      page: 1,
      count: 0,
      list: [],
      loading: false,
      error: '',
      opening: false,
      updating: {},
      editor: null,
      requestId: 0,
      kinds: [
        {
          value: 'border',
          name: '营销边框',
          icon: 'el-icon-picture-outline',
          description: '为商品列表、分类与首页商品图统一添加活动边框。',
        },
        {
          value: 'atmosphere',
          name: '活动氛围',
          icon: 'el-icon-picture',
          description: '为商品详情添加活动氛围图，支持移动端和PC素材。',
        },
      ],
      states: [
        { value: 'upcoming', name: '未开始' },
        { value: 'running', name: '进行中' },
        { value: 'ended', name: '已结束' },
        { value: 'disabled', name: '已停用' },
      ],
    };
  },
  created() {
    this.load();
  },
  beforeDestroy() {
    this.requestId++;
  },
  methods: {
    assetUrl(url) {
      return url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '') + url : url;
    },
    formatDate(value) {
      const d = new Date(Number(value) * 1000),
        pad = (n) => String(n).padStart(2, '0');
      return (
        [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-') +
        ' ' +
        [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':')
      );
    },
    scopeName(scope) {
      return (
        { all: '全部商品', products: '指定商品', categories: '指定分类', brands: '指定品牌', labels: '指定商品标签' }[
          scope
        ] || scope
      );
    },
    async load() {
      const id = ++this.requestId;
      this.loading = true;
      this.error = '';
      try {
        const res = await marketingStyleList({
          ...this.filters,
          page: this.page,
          limit: 15,
          from: this.range && this.range[0] ? Math.floor(Number(this.range[0]) / 1000) : '',
          to: this.range && this.range[1] ? Math.floor(Number(this.range[1]) / 1000) + 86399 : '',
        });
        if (id !== this.requestId) return;
        this.list = res.data.list;
        this.count = Number(res.data.count);
      } catch (error) {
        if (id === this.requestId) this.error = error.msg || '营销样式加载失败';
      } finally {
        if (id === this.requestId) this.loading = false;
      }
    },
    search() {
      this.page = 1;
      this.load();
    },
    reset() {
      this.filters = { keyword: '', kind: '', status: '' };
      this.range = [];
      this.search();
    },
    pageChange(page) {
      this.page = page;
      this.load();
    },
    create(kind) {
      this.editor = { id: 0, kind };
    },
    async edit(row) {
      this.opening = true;
      try {
        const res = await marketingStyleInfo(row.id);
        this.editor = res.data;
      } catch (error) {
        this.$message.error(error.msg || '样式读取失败');
      } finally {
        this.opening = false;
      }
    },
    saved() {
      this.editor = null;
      this.load();
    },
    async toggle(row, value) {
      this.$set(this.updating, row.id, true);
      try {
        await marketingStyleStatus(row.id, value);
        await this.load();
      } catch (error) {
        this.$message.error(error.msg || '状态修改失败');
      } finally {
        this.$delete(this.updating, row.id);
      }
    },
    async remove(row) {
      try {
        await this.$confirm('删除后，该样式不再展示。确认删除“' + row.name + '”？', '删除营销样式', {
          type: 'warning',
        });
      } catch (_) {
        return;
      }
      this.$set(this.updating, row.id, true);
      try {
        await marketingStyleDelete(row.id);
        if (this.list.length === 1 && this.page > 1) this.page--;
        await this.load();
        this.$message.success('已删除');
      } catch (error) {
        this.$message.error(error.msg || '删除失败');
      } finally {
        this.$delete(this.updating, row.id);
      }
    },
  },
};
</script>
<style scoped lang="scss">
.style-kinds {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.kind-content {
  display: flex;
  gap: 20px;
  align-items: center;
  min-height: 118px;
}
.kind-content h3 {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 12px;
}
.kind-content p {
  color: #909399;
  line-height: 1.7;
  font-size: 13px;
  margin-bottom: 14px;
}
.kind-icon {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--prev-color-primary-light-9, #eef6ff);
  border-radius: 12px;
  color: var(--prev-color-primary);
  font-size: 36px;
}
.style-thumb {
  width: 66px;
  height: 58px;
  border: 1px solid #eee;
  background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 0/12px 12px;
}
.style-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.page-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
.style-list-card ::v-deep .el-table .cell {
  line-height: 1.7;
}
@media (max-width: 1100px) {
  .style-kinds {
    grid-template-columns: 1fr;
  }
  .kind-content {
    min-height: 90px;
  }
}
</style>
