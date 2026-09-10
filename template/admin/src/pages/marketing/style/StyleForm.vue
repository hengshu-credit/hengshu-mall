<template>
  <el-dialog
    :title="(value.id ? '编辑' : '创建') + kindName"
    :visible="true"
    width="1000px"
    append-to-body
    :close-on-click-modal="false"
    @close="$emit('close')"
  >
    <div class="style-editor">
      <section class="style-fields">
        <el-steps :active="step" finish-status="success" simple
          ><el-step title="基础设置" /><el-step title="使用范围"
        /></el-steps>
        <el-form ref="form" :model="draft" :rules="rules" label-width="92px" size="small" class="style-form">
          <div v-show="step === 0">
            <el-form-item label="活动名称" prop="name"
              ><el-input v-model.trim="draft.name" maxlength="60" placeholder="请输入活动名称" show-word-limit
            /></el-form-item>
            <el-form-item label="活动时间" prop="range"
              ><el-date-picker
                v-model="draft.range"
                type="datetimerange"
                value-format="timestamp"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                :default-time="['00:00:00', '23:59:59']"
            /></el-form-item>
            <el-form-item :label="draft.kind === 'border' ? '边框素材' : '移动端氛围图'" prop="mobile_image">
              <div class="style-material">
                <img v-if="draft.mobile_image" :src="assetUrl(draft.mobile_image)" alt="所选素材" /><el-button
                  @click="chooseImage('mobile_image')"
                  >{{ draft.mobile_image ? '更换素材' : '选择素材' }}</el-button
                ><el-button v-if="draft.mobile_image" type="text" @click="draft.mobile_image = ''">清除</el-button>
              </div>
              <p class="hint">
                {{
                  draft.kind === 'border'
                    ? '建议750×750px透明PNG，中心保持透明，避免遮住商品主图。'
                    : '建议750×152px，用于商品详情主图下方的活动氛围展示。'
                }}
              </p>
            </el-form-item>
            <el-form-item v-if="draft.kind === 'atmosphere'" label="PC氛围图">
              <div class="style-material">
                <img v-if="draft.pc_image" :src="assetUrl(draft.pc_image)" alt="PC氛围素材" /><el-button
                  @click="chooseImage('pc_image')"
                  >{{ draft.pc_image ? '更换素材' : '选择素材' }}</el-button
                ><el-button v-if="draft.pc_image" type="text" @click="draft.pc_image = ''">清除</el-button>
              </div>
              <p class="hint">选填，建议810×50px；未设置时使用移动端素材。</p>
            </el-form-item>
            <el-form-item label="是否开启"
              ><el-switch v-model="draft.enabled" :active-value="1" :inactive-value="0" />
              <p class="hint">开启后，在活动时间内自动展示；停用或到期后不再展示。</p></el-form-item
            >
            <el-form-item label="优先级"
              ><el-input-number v-model="draft.priority" :min="0" :max="9999" :precision="0" />
              <p class="hint">同一商品有多个同类样式时，优先级高者生效；相同时采用后创建的样式。</p></el-form-item
            >
          </div>
          <div v-show="step === 1">
            <el-form-item label="使用范围"
              ><el-radio-group v-model="draft.scope_type" @change="changeScope"
                ><el-radio v-for="scope in scopes" :key="scope.value" :label="scope.value">{{
                  scope.label
                }}</el-radio></el-radio-group
              ></el-form-item
            >
            <el-form-item v-if="draft.scope_type !== 'all'" :label="scopeName">
              <el-button type="primary" plain @click="pickerOpen = true">{{ '选择' + scopeName }}</el-button
              ><span class="selected-count">已选择 {{ scopeItems.length }} 项</span>
              <div class="scope-tags">
                <el-tag
                  v-for="item in scopeItems"
                  :key="item.id"
                  :type="item.unavailable ? 'danger' : 'info'"
                  closable
                  @close="removeScope(item.id)"
                  >{{ item.name }} #{{ item.id }}</el-tag
                >
              </div>
            </el-form-item>
            <p class="scope-help">
              {{
                draft.scope_type === 'all'
                  ? '全部现有商品及后续新增商品均可参与。'
                  : draft.scope_type === 'categories'
                  ? '包含所选分类的下级分类商品，后续新增或调整分类的商品自动匹配。'
                  : draft.scope_type === 'products'
                  ? '仅所选商品参与。'
                  : '按商品当前关联的' + scopeName + '自动匹配，多个选择项满足任意一项即可。'
              }}
            </p>
          </div>
        </el-form>
      </section>
      <aside class="style-preview">
        <h3>效果预览</h3>
        <el-radio-group v-if="draft.kind === 'atmosphere'" v-model="previewDevice" size="mini"
          ><el-radio-button label="mobile">移动端</el-radio-button
          ><el-radio-button label="pc">PC端</el-radio-button></el-radio-group
        >
        <div class="preview-product">
          <div class="preview-image">
            <img :src="sampleImage" alt="商品示例" /><img
              v-if="draft.kind === 'border' && draft.mobile_image"
              class="preview-border"
              :src="assetUrl(draft.mobile_image)"
              alt="营销边框效果"
            />
          </div>
          <img
            v-if="draft.kind === 'atmosphere' && previewImage"
            class="preview-atmosphere"
            :src="assetUrl(previewImage)"
            alt="活动氛围效果"
          />
          <div class="preview-info">
            <p>品质生活精选商品</p>
            <strong>¥199.00</strong><span>商品示例</span>
          </div>
        </div>
        <p class="hint">
          {{
            draft.kind === 'border'
              ? '边框叠加在商品图片上，商品原图保持不变。'
              : '氛围图展示在商品详情主图与商品信息之间。'
          }}
        </p>
      </aside>
    </div>
    <div slot="footer">
      <el-button :disabled="saving" @click="$emit('close')">取消</el-button
      ><el-button v-if="step" :disabled="saving" @click="step = 0">上一步</el-button
      ><el-button v-if="!step" type="primary" @click="next">下一步</el-button
      ><el-button v-else type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
    <el-dialog title="选择素材" :visible.sync="mediaOpen" width="950px" append-to-body
      ><upload-pictures v-if="mediaOpen" is-choice="单选" @getPic="selectedImage"
    /></el-dialog>
    <option-picker
      v-if="pickerOpen"
      :title="'选择' + scopeName"
      :type="entityType"
      :initial="scopeItems"
      :load-options="loadOptions"
      @close="pickerOpen = false"
      @confirm="selectedScope"
    />
  </el-dialog>
</template>
<script>
import uploadPictures from '@/components/uploadPictures';
import OptionPicker from '@/pages/marketing/fullReduction/OptionPicker';
import { marketingStyleSave, marketingStyleOptions } from '@/api/marketingStyle';
import setting from '@/setting';
export default {
  components: { uploadPictures, OptionPicker },
  props: { value: Object },
  data() {
    const data = JSON.parse(JSON.stringify(this.value));
    return {
      draft: {
        name: '',
        kind: 'border',
        mobile_image: '',
        pc_image: '',
        enabled: 0,
        priority: 0,
        scope_type: 'all',
        scope_ids: [],
        ...data,
        range: data.start_time ? [data.start_time * 1000, data.end_time * 1000] : [],
      },
      scopeItems: data.scope_items || [],
      step: 0,
      saving: false,
      mediaOpen: false,
      imageField: 'mobile_image',
      pickerOpen: false,
      previewDevice: 'mobile',
      sampleImage: require('@/assets/images/product-diy.png'),
      loadOptions: marketingStyleOptions,
      scopes: [
        { value: 'all', label: '全部商品' },
        { value: 'products', label: '指定商品' },
        { value: 'categories', label: '指定分类' },
        { value: 'brands', label: '指定品牌' },
        { value: 'labels', label: '指定商品标签' },
      ],
      rules: {
        name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
        mobile_image: [{ required: true, message: '请选择图片素材', trigger: 'change' }],
        range: [
          {
            validator: (_, value, done) => {
              if (
                !value ||
                value.length !== 2 ||
                !Number.isFinite(Number(value[0])) ||
                Number(value[1]) <= Number(value[0])
              )
                done(new Error('请选择有效的活动起止时间'));
              else done();
            },
            trigger: 'change',
          },
        ],
      },
    };
  },
  computed: {
    kindName() {
      return this.draft.kind === 'border' ? '营销边框' : '活动氛围';
    },
    entityType() {
      return { products: 'product', categories: 'category', brands: 'brand', labels: 'label' }[this.draft.scope_type];
    },
    scopeName() {
      return (
        { products: '商品', categories: '分类', brands: '品牌', labels: '商品标签' }[this.draft.scope_type] || '商品'
      );
    },
    previewImage() {
      return this.previewDevice === 'pc' && this.draft.pc_image ? this.draft.pc_image : this.draft.mobile_image;
    },
  },
  methods: {
    assetUrl(url) {
      return url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '') + url : url;
    },
    chooseImage(field) {
      this.imageField = field;
      this.mediaOpen = true;
    },
    selectedImage(pic) {
      this.draft[this.imageField] = pic.att_dir;
      this.mediaOpen = false;
      this.$refs.form.validateField('mobile_image');
    },
    changeScope() {
      this.scopeItems = [];
      this.draft.scope_ids = [];
    },
    selectedScope(items) {
      this.scopeItems = items;
      this.draft.scope_ids = items.map((item) => Number(item.id));
      this.pickerOpen = false;
    },
    removeScope(id) {
      this.selectedScope(this.scopeItems.filter((item) => item.id !== id));
    },
    next() {
      this.$refs.form.validate((valid) => {
        if (valid) this.step = 1;
      });
    },
    save() {
      if (this.saving) return;
      this.$refs.form.validate(async (valid) => {
        if (!valid) {
          this.step = 0;
          return;
        }
        if (this.draft.scope_type !== 'all' && !this.draft.scope_ids.length)
          return this.$message.warning('请至少选择一项使用范围');
        this.saving = true;
        try {
          const { range, ...data } = this.draft;
          await marketingStyleSave(Number(this.value.id) || 0, {
            ...data,
            start_time: Math.floor(Number(range[0]) / 1000),
            end_time: Math.floor(Number(range[1]) / 1000),
          });
          this.$message.success('营销样式已保存');
          this.$emit('saved');
        } catch (error) {
          this.$message.error(error.msg || error.message || '保存失败');
        } finally {
          this.saving = false;
        }
      });
    },
  },
};
</script>
<style scoped lang="scss">
.style-editor {
  display: flex;
  gap: 28px;
}
.style-fields {
  flex: 1;
  min-width: 0;
}
.style-form {
  margin-top: 24px;
}
.style-form ::v-deep .el-date-editor {
  width: 100%;
}
.style-material {
  display: flex;
  align-items: center;
  gap: 10px;
}
.style-material img {
  width: 80px;
  height: 70px;
  object-fit: contain;
  background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 0/12px 12px;
  border: 1px solid #eee;
}
.hint,
.scope-help {
  font-size: 12px;
  color: #909399;
  line-height: 1.8;
  margin: 8px 0 0;
}
.style-preview {
  width: 270px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  flex-shrink: 0;
}
.style-preview h3 {
  font-size: 14px;
  margin: 0 0 16px;
}
.preview-product {
  margin-top: 16px;
  background: white;
  border-radius: 6px;
  overflow: hidden;
}
.preview-image {
  position: relative;
  aspect-ratio: 1;
}
.preview-image > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-image > .preview-border {
  position: absolute;
  inset: 0;
  object-fit: fill;
  pointer-events: none;
}
.preview-atmosphere {
  display: block;
  width: 100%;
  height: auto;
}
.preview-info {
  padding: 12px;
}
.preview-info p {
  margin: 0 0 10px;
  font-size: 14px;
}
.preview-info strong {
  color: #e93323;
  font-size: 18px;
  font-weight: normal;
}
.preview-info span {
  float: right;
  color: #999;
  font-size: 12px;
}
.style-form .el-radio {
  display: block;
  margin: 0 0 15px;
}
.scope-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  max-height: 230px;
  overflow: auto;
}
.selected-count {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
.scope-help {
  padding-left: 20px;
}
</style>
