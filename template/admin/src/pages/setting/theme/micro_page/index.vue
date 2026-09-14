<template>
  <div>
    <div class="i-layout-page-header header-title">
      <div class="fl_header">
        <span class="ivu-page-header-title">{{ $route.meta.title }}</span>
      </div>
    </div>
    <el-card :bordered="false" shadow="never" class="ivu-mt">
      <div class="acea-row row-between-wrapper mb20">
        <div class="acea-row row-middle">
          <el-button type="primary" @click="add('micro')">添加专题页面</el-button>
          <el-button @click="$router.push('/admin/setting/merchant_theme')">商户主题</el-button>
          <el-select v-model="pageType" clearable placeholder="全部页面类型" style="margin-left:16px" @change="page=1;getList()"><el-option label="普通专题" value="micro" /><el-option label="店铺页面" value="shop" /></el-select>
        </div>
      </div>
      <el-table
        :data="tableList"
        v-loading="loading"
        highlight-current-row
        no-userFrom-text="暂无数据"
        no-filtered-userFrom-text="暂无筛选结果"
      >
        <el-table-column label="编号" min-width="80" prop="id"></el-table-column>
        <el-table-column label="名称" min-width="150" prop="title"></el-table-column>
        <el-table-column label="页面类型" width="120"><template slot-scope="{row}"><el-tag :type="row.page_type==='shop'?'success':'info'">{{row.page_type==='shop'?'店铺页面':'普通专题'}}</el-tag></template></el-table-column>
        <el-table-column label="添加时间" min-width="150" prop="add_time"></el-table-column>
        <el-table-column label="更新时间" min-width="150" prop="up_time"></el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template slot-scope="scope">
            <a @click="edit(scope.row)">编辑</a>
            <el-divider direction="vertical"></el-divider>
            <a @click="del(scope.row, '删除微页面', scope.$index)">删除</a>
          </template>
        </el-table-column>
      </el-table>
      <div class="acea-row row-right page">
        <pagination v-if="total" :total="total" :page.sync="page" :limit.sync="limit" @pagination="getList" />
      </div>
    </el-card>
  </div>
</template>

<script>
import { getMicroPageList } from '@/api/diy';
import { mapState } from 'vuex';

export default {
  name: 'MicroPageList',
  data() {
    return {
      loading: false,
      tableList: [],
      total: 0,
      page: 1,
      limit: 20,
      pageType: '',
    };
  },
  created() {
    this.getList();
  },
  methods: {
    getList() {
      this.loading = true;
      getMicroPageList({ page: this.page, limit: this.limit, page_type: this.pageType })
        .then((res) => {
          this.tableList = res.data.list;
          this.total = res.data.count;
          this.loading = false;
        })
        .catch((err) => {
          this.loading = false;
          this.$message.error(err.msg);
        });
    },
    add(pageType = 'micro') {
      this.$router.push({
        path: '/admin/setting/edit_theme',
        query: { type: pageType === 'shop' ? 'shop' : 'home', page_type: pageType, id: 0 },
      });
    },
    edit(row) {
      this.$router.push({
        path: '/admin/setting/edit_theme',
        query: { type: 'home', page_type: row.page_type === 'shop' ? 'merchant' : row.page_type, id: row.id },
      });
    },
    del(row, title, num) {
      let delfromData = {
        title: title,
        num: num,
        url: `theme/del/${row.id}`,
        method: 'DELETE',
        ids: '',
      };
      this.$modalSure(delfromData)
        .then((res) => {
          this.$message.success(res.msg);
          this.tableList.splice(num, 1);
          if (!this.tableList.length && this.page > 1) {
            this.page = this.page - 1;
            this.getList();
          }
        })
        .catch((res) => {
          this.$message.error(res.msg);
        });
    },
    preview(row) {
      this.$message.info('功能开发中');
    },
  },
};
</script>

<style scoped></style>
