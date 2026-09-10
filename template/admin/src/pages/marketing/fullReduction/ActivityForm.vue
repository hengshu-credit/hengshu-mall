<template>
  <el-drawer
    class="full-reduction-drawer-host"
    custom-class="full-reduction-drawer"
    :title="id ? '编辑满减活动' : '新增满减活动'"
    :visible="true"
    size="min(1040px, 100%)"
    :wrapper-closable="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @close="$emit('close')"
  >
    <div v-loading="loading" class="activity-form-wrap">
      <div v-if="loadError" class="error-box" role="alert">
        {{ loadError }} <el-button type="text" @click="load">重新加载</el-button>
      </div>
      <el-tabs v-if="!loadError && !loading" v-model="activeTab" class="activity-tabs">
        <el-tab-pane label="基本设置" name="basic">
          <el-form
            v-if="!loadError && !loading"
            ref="form"
            :model="form"
            label-width="120px"
            :disabled="saving"
            @submit.native.prevent="save"
          >
            <el-form-item label="活动类型：" required>
              <el-radio-group v-model="form.unit" @change="changeUnit">
                <el-radio :label="1" border>满 N 元减元 / 折</el-radio>
                <el-radio :label="2" border>满 N 件减元 / 折</el-radio>
              </el-radio-group>
              <div class="form-help">
                {{ form.unit === 1 ? '例：满100元减10元，或满100元打8折' : '例：满3件减10元，或满3件打8折' }}
              </div>
            </el-form-item>
            <el-form-item label="活动名称：" required>
              <el-input
                v-model="form.name"
                placeholder="请输入活动名称"
                maxlength="60"
                show-word-limit
                class="name-input"
              />
            </el-form-item>
            <el-form-item label="活动时间：" required>
              <div class="time-controls">
                <el-date-picker
                  v-model="form.time_range"
                  type="datetimerange"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  start-placeholder="起始日期"
                  end-placeholder="截止日期"
                  range-separator="至"
                  :default-time="['00:00:00', '23:59:59']"
                />
                <el-button-group
                  ><el-button v-for="days in [1, 7, 15]" :key="days" @click="setDays(days)"
                    >{{ days }}天</el-button
                  ></el-button-group
                >
              </div>
            </el-form-item>
            <el-form-item label="优惠规则：" required>
              <el-radio-group v-model="form.rules_type" @change="changeRulesType">
                <el-radio :label="1">阶梯优惠</el-radio>
                <el-radio :label="0">循环优惠</el-radio>
              </el-radio-group>
              <div class="form-help">
                {{
                  form.rules_type
                    ? '最多设置5级，门槛从小到大填写。'
                    : '每达到一次门槛，减免一次金额；循环优惠仅支持减价。'
                }}
              </div>
              <div class="rules-editor">
                <div class="rules-toolbar">
                  <el-radio-group v-model="form.discount_type" size="small" @change="changeDiscountType">
                    <el-radio-button :label="1">减价</el-radio-button>
                    <el-radio-button :label="2" :disabled="!form.rules_type">折扣</el-radio-button>
                  </el-radio-group>
                  <el-button
                    v-if="form.rules_type"
                    type="text"
                    icon="el-icon-plus"
                    :disabled="form.rules.length >= 5"
                    @click="addRule"
                    >{{ form.rules.length >= 5 ? '最多添加5级优惠' : '添加下一级优惠' }}</el-button
                  >
                </div>
                <el-table :data="form.rules" size="small">
                  <el-table-column v-if="form.rules_type" label="层级" width="65"
                    ><template slot-scope="scope">{{ scope.$index + 1 }}</template></el-table-column
                  >
                  <el-table-column label="门槛" min-width="220">
                    <template slot-scope="{ row }">
                      <span>{{ form.rules_type ? '满' : '每满' }}</span>
                      <el-input-number
                        v-model="row.threshold"
                        :min="form.unit === 1 ? 0.01 : 1"
                        :max="99999"
                        :precision="form.unit === 1 ? 2 : 0"
                        :controls="false"
                        size="small"
                        aria-label="优惠门槛"
                      />
                      <span>{{ form.unit === 1 ? '元' : '件' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column :label="form.discount_type === 1 ? '减免金额' : '折扣'" min-width="220">
                    <template slot-scope="{ row }">
                      <span>{{ form.discount_type === 1 ? '减' : '打' }}</span>
                      <el-input-number
                        v-model="row.discount"
                        :min="form.discount_type === 1 ? 0.01 : 0.1"
                        :max="form.discount_type === 1 ? 99999 : 9.9"
                        :precision="2"
                        :controls="false"
                        size="small"
                        aria-label="优惠数值"
                      />
                      <span>{{ form.discount_type === 1 ? '元' : '折' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column v-if="form.rules_type" label="操作" width="65"
                    ><template slot-scope="scope"
                      ><el-button
                        type="text"
                        :disabled="form.rules.length === 1"
                        @click="form.rules.splice(scope.$index, 1)"
                        >删除</el-button
                      ></template
                    ></el-table-column
                  >
                </el-table>
              </div>
            </el-form-item>
            <el-form-item label="参与客户限制：">
              <el-button plain @click="openPicker('levels')">选择会员等级</el-button
              ><span class="inline-help">不选则不限制等级</span>
              <div class="selected-items">
                <el-tag
                  v-for="item in levels"
                  :key="item.id"
                  closable
                  :type="item.unavailable ? 'danger' : 'info'"
                  @close="removeSelection('levels', item.id)"
                  >{{ item.name }}</el-tag
                >
              </div>
            </el-form-item>
            <el-form-item label="适用会员：" required>
              <el-radio-group :value="form.member_type === 'all' ? 0 : 1" @input="changeMemberRange"
                ><el-radio :label="0">全部会员</el-radio><el-radio :label="1">部分会员</el-radio></el-radio-group
              >
              <div v-if="form.member_type !== 'all'" class="member-editor">
                <el-radio-group v-model="form.member_type" size="small" @change="changeMemberType"
                  ><el-radio-button label="user">指定会员</el-radio-button
                  ><el-radio-button label="tag">会员标签</el-radio-button
                  ><el-radio-button label="level">会员等级</el-radio-button></el-radio-group
                >
                <div v-if="form.member_type === 'tag'" class="tag-match">
                  <span>标签条件：</span
                  ><el-radio-group v-model="form.tag_match"
                    ><el-radio label="any">满足任一</el-radio><el-radio label="all">满足全部</el-radio></el-radio-group
                  >
                </div>
                <div>
                  <el-button type="text" icon="el-icon-plus" @click="openPicker('members')">{{
                    memberPickerTitle
                  }}</el-button
                  ><span class="form-help">已选择 {{ members.length }} 项</span>
                </div>
                <div class="selected-items">
                  <el-tag
                    v-for="item in members"
                    :key="item.id"
                    closable
                    :type="item.unavailable ? 'danger' : 'info'"
                    @close="removeSelection('members', item.id)"
                    >{{ item.name }} #{{ item.id }}</el-tag
                  >
                </div>
                <div class="form-help">指定会员、会员标签、会员等级三种方式互斥，切换方式将清空已选内容。</div>
              </div>
            </el-form-item>
            <el-form-item label="排序："
              ><el-input-number
                v-model="form.sort"
                :min="0"
                :max="999999"
                :precision="0"
                controls-position="right"
              /><span class="inline-help">默认50，数值越小越靠前</span></el-form-item
            >
            <el-form-item label="是否启用："
              ><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /><span class="inline-help">{{
                form.status ? '启用' : '停用'
              }}</span></el-form-item
            >
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="适用商品" name="products" lazy>
          <product-scope
            :range-type="form.range_type"
            :selected="products"
            :disabled="saving"
            @change="changeProducts"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
    <div class="form-footer">
      <span v-if="saveError" class="save-error" role="alert">{{ saveError }}</span>
      <el-button :disabled="saving" @click="$emit('close')">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="loading || !!loadError" @click="save">保存</el-button>
    </div>
    <option-picker
      v-if="pickerTarget"
      :key="pickerTarget + pickerType"
      :title="pickerTitle"
      :type="pickerType"
      :initial="pickerItems"
      @close="pickerTarget = ''"
      @confirm="confirmSelection"
    />
  </el-drawer>
</template>

<script>
import dayjs from 'dayjs';
import { fullReductionInfoApi, fullReductionSaveApi } from '@/api/fullReduction';
import OptionPicker from './OptionPicker.vue';
import ProductScope from './ProductScope.vue';
import { emptyForm, emptyRule, formError, payload } from './form';

export default {
  name: 'FullReductionActivityForm',
  components: { OptionPicker, ProductScope },
  props: { id: { type: Number, default: 0 } },
  data() {
    return {
      form: emptyForm(),
      activeTab: 'basic',
      products: [],
      levels: [],
      members: [],
      loading: false,
      loadError: '',
      saving: false,
      saveError: '',
      pickerTarget: '',
      requestId: 0,
    };
  },
  computed: {
    memberPickerTitle() {
      return { user: '选择会员', tag: '选择会员标签', level: '选择会员等级' }[this.form.member_type] || '选择会员';
    },
    pickerTitle() {
      return this.pickerTarget === 'products'
        ? '选择商品'
        : this.pickerTarget === 'levels'
        ? '选择参与客户等级'
        : this.memberPickerTitle;
    },
    pickerType() {
      return this.pickerTarget === 'products'
        ? 'product'
        : this.pickerTarget === 'levels'
        ? 'level'
        : this.form.member_type;
    },
    pickerItems() {
      return this[this.pickerTarget] || [];
    },
  },
  created() {
    if (this.id) this.load();
  },
  beforeDestroy() {
    this.requestId++;
  },
  methods: {
    async load() {
      const requestId = ++this.requestId;
      this.loading = true;
      this.loadError = '';
      try {
        const { data } = await fullReductionInfoApi(this.id);
        if (requestId !== this.requestId) return;
        const form = emptyForm();
        Object.keys(form).forEach((key) => {
          if (key in data) form[key] = data[key];
        });
        form.time_range = [data.start_time_text, data.end_time_text];
        form.rules = data.rules.map((rule) => ({ threshold: Number(rule.threshold), discount: Number(rule.discount) }));
        this.form = form;
        this.products = data.products;
        this.levels = data.levels;
        this.members = data.members;
      } catch (error) {
        if (requestId === this.requestId) this.loadError = (error && error.msg) || '活动详情加载失败';
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },
    setDays(days) {
      this.form.time_range = [
        dayjs().format('YYYY-MM-DD HH:mm:ss'),
        dayjs().add(days, 'day').format('YYYY-MM-DD HH:mm:ss'),
      ];
    },
    changeUnit() {
      this.form.rules = [emptyRule()];
    },
    changeRulesType() {
      if (!this.form.rules_type) {
        this.form.rules = [this.form.rules[0] || emptyRule()];
        if (this.form.discount_type !== 1) {
          this.form.discount_type = 1;
          this.changeDiscountType();
        }
      }
    },
    changeDiscountType() {
      this.form.rules.forEach((rule) => {
        rule.discount = undefined;
      });
    },
    addRule() {
      if (this.form.rules.length < 5) this.form.rules.push(emptyRule());
    },
    changeRange() {
      this.products = [];
      this.form.product_ids = [];
    },
    changeProducts({ rangeType, selected }) {
      this.form.range_type = rangeType;
      this.products = selected;
      this.form.product_ids = selected.map((item) => Number(item.id));
    },
    changeMemberRange(value) {
      this.form.member_type = value ? 'user' : 'all';
      this.changeMemberType();
    },
    changeMemberType() {
      this.members = [];
      this.form.member_ids = [];
      this.form.tag_match = 'any';
    },
    openPicker(target) {
      this.pickerTarget = target;
    },
    selectionKey(target) {
      return { products: 'product_ids', levels: 'level_ids', members: 'member_ids' }[target];
    },
    confirmSelection(items) {
      this[this.pickerTarget] = items;
      this.form[this.selectionKey(this.pickerTarget)] = items.map((item) => Number(item.id));
      this.pickerTarget = '';
    },
    removeSelection(target, id) {
      this[target] = this[target].filter((item) => item.id !== id);
      this.form[this.selectionKey(target)] = this[target].map((item) => Number(item.id));
    },
    async save() {
      if (this.saving || this.loading || this.loadError) return;
      this.saveError = formError(this.form);
      if (!this.saveError && [...this.products, ...this.levels, ...this.members].some((item) => item.unavailable))
        this.saveError = '请移除或重新选择已失效的商品、会员、标签或等级';
      if (this.saveError) {
        if (this.form.range_type === 3 && !this.form.product_ids.length) this.activeTab = 'products';
        this.$message.error(this.saveError);
        return;
      }
      this.saving = true;
      try {
        await fullReductionSaveApi(this.id, payload(this.form));
        this.$message.success('保存成功');
        this.$emit('saved');
      } catch (error) {
        this.saveError = (error && error.msg) || '活动保存失败，请重试';
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.activity-form-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 28px 24px 12px;
}
.name-input {
  max-width: 460px;
}
.time-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.time-controls .el-date-editor {
  max-width: 100%;
}
.form-help,
.inline-help {
  color: #909399;
  font-size: 12px;
  line-height: 22px;
}
.inline-help {
  margin-left: 12px;
}
.rules-editor {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafbfc;
}
.rules-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.rules-editor .el-input-number {
  width: 110px;
  margin: 0 8px;
}
.selected-items {
  max-height: 160px;
  overflow-y: auto;
}
.selected-items .el-tag {
  margin: 4px 6px 4px 0;
  max-width: 100%;
  height: auto;
  white-space: normal;
}
.member-editor {
  padding: 14px;
  margin-top: 10px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.tag-match {
  margin-top: 12px;
}
.form-footer {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  background: #fff;
}
.save-error {
  color: #f56c6c;
  flex: 1;
  line-height: 20px;
  font-size: 13px;
}
.error-box {
  color: #f56c6c;
  padding: 12px;
}
@media (max-width: 700px) {
  .activity-form-wrap {
    padding-right: 12px;
  }
  .activity-form-wrap >>> .el-form-item__label {
    float: none;
    display: block;
    text-align: left;
  }
  .activity-form-wrap >>> .el-form-item__content {
    margin-left: 0 !important;
  }
  .activity-form-wrap .el-radio {
    margin: 5px 10px 5px 0;
  }
}
</style>

<style>
.full-reduction-drawer-host .el-drawer__header {
  flex-shrink: 0;
}
.full-reduction-drawer-host .el-drawer__body {
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}
</style>
