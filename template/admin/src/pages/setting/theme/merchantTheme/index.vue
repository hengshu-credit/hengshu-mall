<template>
  <div>
    <div class="i-layout-page-header header-title"><span class="ivu-page-header-title">商户主题</span></div>
    <el-card shadow="never"
      ><div class="theme-tools">
        <el-button type="primary" @click="edit({ id: 0 })">新增商户主题</el-button
        ><el-input
          v-model="keyword"
          clearable
          placeholder="搜索商户主题名称"
          @keyup.enter.native="
            page = 1;
            load();
          "
        /><el-button
          @click="
            page = 1;
            load();
          "
          >搜索</el-button
        >
      </div>
      <p class="theme-help">独立装修商户首页、分类、详情及风格；在商户资料中绑定主题，进店后自动使用。</p>
      <el-table :data="list" v-loading="loading"
        ><el-table-column prop="id" label="编号" width="80" /><el-table-column
          prop="title"
          label="主题名称"
          min-width="180"
        /><el-table-column prop="info" label="简介" min-width="180" show-overflow-tooltip /><el-table-column
          prop="up_time"
          label="更新时间"
          width="170"
        /><el-table-column label="操作" width="190"
          ><template slot-scope="{ row }"
            ><el-button type="text" @click="edit(row)">主题配置</el-button
            ><el-button type="text" @click="remove(row)">删除</el-button></template
          ></el-table-column
        ></el-table
      ><pagination v-if="count" :total="count" :page.sync="page" :limit.sync="limit" @pagination="load"
    /></el-card>
  </div>
</template>
<script>
import { getThemeList, deleteTheme } from '@/api/diy';
export default {
  name: 'MerchantThemeList',
  data: () => ({ list: [], count: 0, page: 1, limit: 20, keyword: '', loading: false }),
  created() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await getThemeList({
          page_type: 'merchant',
          title: this.keyword,
          page: this.page,
          limit: this.limit,
        });
        this.list = res.data.list;
        this.count = res.data.count;
      } catch (error) {
        this.$message.error(error.msg || '读取失败');
      } finally {
        this.loading = false;
      }
    },
    edit(row) {
      this.$router.push({
        path: '/admin/setting/edit_theme',
        query: { id: row.id, type: 'home', page_type: 'merchant' },
      });
    },
    async remove(row) {
      try {
        await this.$confirm('删除商户主题“' + (row.title || '未命名') + '”？已绑定的主题需要先解除绑定。', '删除主题', {
          type: 'warning',
        });
        await deleteTheme(row.id);
        this.$message.success('删除成功');
        this.load();
      } catch (error) {
        if (error && error.msg) this.$message.error(error.msg);
      }
    },
  },
};
</script>
<style scoped>
.theme-tools {
  display: flex;
  gap: 12px;
}
.theme-tools .el-input {
  width: 260px;
  margin-left: auto;
}
.theme-help {
  font-size: 13px;
  color: #909399;
  margin: 18px 0;
}
</style>
