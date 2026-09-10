<template>
  <div class="brand-manager">
    <el-card shadow="never" :body-style="{ padding: 0 }">
      <div class="padding-add">
        <el-form :model="filters" inline label-width="82px" @submit.native.prevent="search">
          <el-form-item label="品牌名称：">
            <el-input v-model="filters.name" clearable placeholder="请输入品牌名称" class="form_content_width" />
          </el-form-item>
          <el-form-item label="品牌状态：">
            <el-select v-model="filters.status" clearable placeholder="全部状态" class="form_content_width">
              <el-option :value="1" label="启用" />
              <el-option :value="0" label="停用" />
            </el-select>
          </el-form-item>
          <el-form-item label="适用范围：">
            <el-select v-model="filters.is_global" clearable placeholder="全部范围" class="form_content_width">
              <el-option :value="1" label="通用品牌" />
              <el-option :value="0" label="指定分类" />
            </el-select>
          </el-form-item>
          <el-form-item label="商品分类：">
            <el-cascader
              v-model="filters.cate_id"
              :options="treeSelect"
              :props="{ checkStrictly: true, emitPath: false }"
              filterable
              clearable
              placeholder="请选择商品分类"
              class="form_content_width"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="search">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
        <div v-if="categoryError" class="load-error" role="alert">
          {{ categoryError }} <el-button type="text" @click="getCategories">重试</el-button>
        </div>
      </div>
    </el-card>
    <el-card shadow="never" class="mt16">
      <el-button v-auth="['admin-product-brand-save']" type="primary" :disabled="editLoading" @click="openCreate">
        添加品牌
      </el-button>
      <div v-if="listError" class="load-error" role="alert">
        {{ listError }} <el-button type="text" @click="getList">重试</el-button>
      </div>
      <el-table v-loading="loading" :data="list" class="mt14" empty-text="暂无品牌">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="品牌标识" width="100">
          <template slot-scope="{ row }">
            <div v-if="row.logo" v-viewer class="brand-logo"><img :src="row.logo" :alt="row.name" /></div>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="品牌名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="适用分类" min-width="240">
          <template slot-scope="{ row }">
            <el-tag v-if="Number(row.is_global) === 1" size="small" type="success">通用品牌</el-tag>
            <template v-else>
              <el-tag v-for="(name, index) in row.cate_names" :key="index" size="small" class="category-tag">
                {{ name }}
              </el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="product_count" label="商品数" width="90" />
        <el-table-column label="状态" width="120">
          <template slot-scope="{ row }">
            <el-switch
              v-auth="['admin-product-brand-status']"
              :value="row.status"
              :active-value="1"
              :inactive-value="0"
              :disabled="!!statusLoading[row.id]"
              :aria-label="row.name + '品牌状态'"
              @change="changeStatus(row, $event)"
            />
            <span class="status-label">{{ Number(row.status) === 1 ? '启用' : '停用' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template slot-scope="{ row }">
            <el-button v-auth="['admin-product-brand-save']" type="text" :disabled="editLoading" @click="openEdit(row)"
              >编辑</el-button
            >
            <el-tooltip
              :disabled="!Number(row.product_count)"
              content="品牌已关联商品，可停用后继续保留关联"
              placement="top"
            >
              <span>
                <el-button
                  v-auth="['admin-product-brand-delete']"
                  type="text"
                  :disabled="Number(row.product_count) > 0 || !!deleting[row.id]"
                  @click="remove(row)"
                  >删除</el-button
                >
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          :current-page="filters.page"
          :page-size="filters.limit"
          :page-sizes="[15, 30, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="pageChange"
          @size-change="sizeChange"
        />
      </div>
    </el-card>
    <el-dialog
      :title="form.id ? '编辑品牌' : '添加品牌'"
      :visible.sync="dialogVisible"
      width="660px"
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="100px" @submit.native.prevent>
        <el-form-item label="品牌名称：" prop="name">
          <el-input v-model="form.name" placeholder="请输入品牌名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="品牌标识：">
          <div class="logo-editor">
            <button type="button" class="logo-picker" aria-label="选择品牌标识图片" @click="selectLogo">
              <img v-if="form.logo" :src="form.logo" alt="品牌标识" />
              <i v-else class="el-icon-picture-outline" />
            </button>
            <el-button v-if="form.logo" type="text" @click="form.logo = ''">移除图片</el-button>
          </div>
          <div class="form-help">建议使用正方形图片，可从素材库选择。</div>
        </el-form-item>
        <el-form-item label="品牌描述：">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="请输入品牌描述"
          />
        </el-form-item>
        <el-form-item label="适用范围：" prop="is_global">
          <el-radio-group v-model="form.is_global">
            <el-radio :label="1">通用品牌</el-radio>
            <el-radio :label="0">指定分类</el-radio>
          </el-radio-group>
          <div class="form-help">通用品牌适用于所有商品分类。</div>
        </el-form-item>
        <el-form-item v-if="form.is_global === 0" label="适用分类：" prop="cate_ids" required>
          <el-cascader
            v-model="form.cate_ids"
            :options="categoryOptions"
            :props="{ multiple: true, checkStrictly: true, emitPath: false }"
            filterable
            clearable
            placeholder="请选择适用分类（可多选）"
            class="category-input"
          />
          <div class="form-help">可独立选择任意层级分类；选择上级分类后，其下级分类也适用。</div>
          <div v-if="categoryError" class="load-error" role="alert">
            {{ categoryError }} <el-button type="text" @click="getCategories">重试</el-button>
          </div>
        </el-form-item>
        <el-form-item label="排序：">
          <el-input-number v-model="form.sort" :min="0" :max="999999" :precision="0" controls-position="right" />
          <span class="form-help sort-help">数值越大越靠前</span>
        </el-form-item>
        <el-form-item label="品牌状态：">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
          <div class="form-help">停用后不可新增选择，已有商品仍保留关联。</div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button :disabled="saving" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { cascaderListApi } from '@/api/product';
import { brandListApi, brandInfoApi, brandSaveApi, brandStatusApi, brandDeleteApi } from '@/api/productBrand';

const emptyForm = () => ({
  id: 0,
  name: '',
  logo: '',
  description: '',
  is_global: 1,
  cate_ids: [],
  sort: 0,
  status: 1,
});

export default {
  name: 'product_brandList',
  data() {
    return {
      filters: { page: 1, limit: 15, name: '', status: '', is_global: '', cate_id: '' },
      list: [],
      total: 0,
      loading: false,
      listError: '',
      listSeq: 0,
      treeSelect: [],
      categoryError: '',
      categoryLabels: {},
      dialogVisible: false,
      editLoading: false,
      saving: false,
      statusLoading: {},
      deleting: {},
      form: emptyForm(),
      rules: {
        name: [
          { required: true, whitespace: true, message: '请输入品牌名称', trigger: 'blur' },
          { max: 100, message: '品牌名称不能超过100个字符', trigger: 'blur' },
        ],
      },
    };
  },
  computed: {
    categoryOptions() {
      const ids = new Set();
      const visit = (items) =>
        items.forEach((item) => {
          ids.add(Number(item.value));
          if (item.children) visit(item.children);
        });
      visit(this.treeSelect);
      const missing = this.form.cate_ids
        .filter((id) => !ids.has(id))
        .map((id) => ({
          value: id,
          label: this.categoryLabels[id] || `已失效分类 #${id}`,
        }));
      return this.treeSelect.concat(missing);
    },
  },
  mounted() {
    this.getCategories();
    this.getList();
  },
  beforeDestroy() {
    this.listSeq++;
  },
  methods: {
    async getCategories() {
      this.categoryError = '';
      try {
        const res = await cascaderListApi(1);
        this.treeSelect = res.data;
      } catch (error) {
        this.categoryError = (error && error.msg) || '商品分类加载失败，请重试';
      }
    },
    async getList() {
      const seq = ++this.listSeq;
      this.loading = true;
      this.listError = '';
      try {
        const res = await brandListApi({ ...this.filters, cate_id: this.filters.cate_id || '' });
        if (seq !== this.listSeq) return;
        this.list = res.data.list;
        this.total = Number(res.data.count);
      } catch (error) {
        if (seq === this.listSeq) this.listError = (error && error.msg) || '品牌列表加载失败，请重试';
      } finally {
        if (seq === this.listSeq) this.loading = false;
      }
    },
    search() {
      this.filters.page = 1;
      this.getList();
    },
    resetFilters() {
      this.filters = { page: 1, limit: this.filters.limit, name: '', status: '', is_global: '', cate_id: '' };
      this.getList();
    },
    pageChange(page) {
      this.filters.page = page;
      this.getList();
    },
    sizeChange(limit) {
      this.filters.limit = limit;
      this.search();
    },
    openCreate() {
      this.form = emptyForm();
      this.categoryLabels = {};
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
    },
    async openEdit(row) {
      if (this.editLoading) return;
      this.editLoading = true;
      try {
        const res = await brandInfoApi(row.id);
        const data = res.data;
        this.form = {
          ...emptyForm(),
          ...data,
          is_global: Number(data.is_global),
          status: Number(data.status),
          sort: Number(data.sort),
          cate_ids: Array.isArray(data.cate_ids) ? data.cate_ids.map(Number) : [],
        };
        this.categoryLabels = {};
        this.form.cate_ids.forEach((id, index) => {
          this.categoryLabels[id] = (data.cate_names || [])[index];
        });
        this.dialogVisible = true;
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
      } catch (error) {
        this.$message.error((error && error.msg) || '品牌详情加载失败');
      } finally {
        this.editLoading = false;
      }
    },
    selectLogo() {
      this.$imgModal((picture) => {
        this.form.logo = picture.att_dir;
      });
    },
    save() {
      if (this.saving) return;
      this.$refs.form.validate(async (valid) => {
        if (!valid) return;
        if (this.form.is_global === 0 && !this.form.cate_ids.length) {
          this.$message.error('请选择至少一个适用分类');
          return;
        }
        const payload = {
          name: this.form.name.trim(),
          logo: this.form.logo,
          description: this.form.description,
          sort: this.form.sort,
          status: this.form.status,
          is_global: this.form.is_global,
          cate_ids: this.form.is_global === 1 ? [] : this.form.cate_ids.slice(),
        };
        this.saving = true;
        try {
          const res = await brandSaveApi(this.form.id, payload);
          this.$message.success(res.msg || '保存成功');
          this.dialogVisible = false;
          this.getList();
        } catch (error) {
          this.$message.error((error && error.msg) || '品牌保存失败');
        } finally {
          this.saving = false;
        }
      });
    },
    async changeStatus(row, status) {
      if (this.statusLoading[row.id]) return;
      this.$set(this.statusLoading, row.id, true);
      try {
        const res = await brandStatusApi(row.id, status);
        row.status = status;
        this.$message.success(res.msg || '状态已更新');
      } catch (error) {
        this.$message.error((error && error.msg) || '品牌状态更新失败');
      } finally {
        this.$delete(this.statusLoading, row.id);
      }
    },
    async remove(row) {
      if (Number(row.product_count) > 0 || this.deleting[row.id]) return;
      try {
        await this.$confirm(`确定删除品牌“${row.name}”吗？`, '删除品牌', { type: 'warning' });
        this.$set(this.deleting, row.id, true);
        const res = await brandDeleteApi(row.id);
        this.$message.success(res.msg || '删除成功');
        if (this.list.length === 1 && this.filters.page > 1) this.filters.page--;
        this.getList();
      } catch (error) {
        if (error !== 'cancel' && error !== 'close') this.$message.error((error && error.msg) || '品牌删除失败');
      } finally {
        this.$delete(this.deleting, row.id);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.brand-logo {
  width: 40px;
  height: 40px;
  cursor: pointer;
}
.brand-logo img,
.logo-picker img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.category-tag {
  margin: 3px 6px 3px 0;
  max-width: 100%;
  white-space: normal;
  height: auto;
}
.status-label {
  margin-left: 6px;
  font-size: 12px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
.category-input {
  width: 100%;
}
.logo-editor {
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo-picker {
  width: 80px;
  height: 80px;
  border: 1px dashed #dcdee2;
  border-radius: 4px;
  background: #fff;
  padding: 0;
  cursor: pointer;
  color: #909399;
  font-size: 26px;
}
.form-help {
  color: #909399;
  line-height: 20px;
  font-size: 12px;
  margin-top: 4px;
}
.sort-help {
  margin-left: 12px;
}
.load-error {
  color: #f56c6c;
  font-size: 12px;
}
</style>
