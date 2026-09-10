<template>
  <div>
    <el-form label-position="top" size="small">
      <template v-if="centerVersion === 1">
        <el-form-item label="展示分类名称"
          ><el-switch v-model="config.show_category_name" :active-value="1" :inactive-value="0"
        /></el-form-item>
        <el-form-item label="显示推荐入口"
          ><el-switch v-model="config.show_recommend" :active-value="1" :inactive-value="0"
        /></el-form-item>
        <el-form-item v-if="config.show_recommend" label="推荐文案"
          ><el-input v-model="config.recommend_text" maxlength="12" />
          <p class="tip">推荐入口展示当前分类导航，分类内容在商品分类管理中维护。</p></el-form-item
        >
        <el-form-item label="每行分类数"
          ><el-radio-group v-model="config.columns"
            ><el-radio-button v-for="n in [2, 3, 4]" :key="n" :label="n">{{ n }}列</el-radio-button></el-radio-group
          ></el-form-item
        >
      </template>
      <template v-else>
        <el-form-item v-for="field in productOptions" :key="field.key" :label="field.label"
          ><el-radio-group v-model="config[field.key]"
            ><el-radio-button v-for="option in field.options" :key="option.value" :label="option.value">{{
              option.label
            }}</el-radio-button></el-radio-group
          ></el-form-item
        >
        <el-form-item label="购买按钮样式"
          ><el-radio-group v-model="config.buy_button_style" class="button-options"
            ><el-radio-button :label="0">不显示</el-radio-button
            ><el-radio-button v-for="n in 8" :key="n" :label="n">样式{{ n }}</el-radio-button></el-radio-group
          ></el-form-item
        >
      </template>
      <el-form-item label="图片显示"
        ><el-radio-group v-model="config.image_fit"
          ><el-radio label="contain">完整显示</el-radio><el-radio label="cover">填充裁剪</el-radio></el-radio-group
        ></el-form-item
      >
      <el-form-item label="图片圆角"><el-slider v-model="config.image_radius" :max="60" show-input /></el-form-item>
      <h4>颜色设置</h4>
      <el-form-item v-for="field in contentColors" :key="field.key" :label="field.label"
        ><el-color-picker :value="config[field.key]" @change="setColor(field.key, $event)" /><el-button
          type="text"
          @click="resetColor(field.key)"
          >重置</el-button
        ></el-form-item
      >
      <h4>顶部广告</h4>
      <el-form-item label="显示顶部广告"
        ><el-switch v-model="config.banner_enabled" :active-value="1" :inactive-value="0"
      /></el-form-item>
      <template v-if="config.banner_enabled"
        ><el-form-item label="广告图片"
          ><img v-if="config.banner_image" :src="config.banner_image" class="image-thumbnail" /><el-button
            @click="chooseImage('banner_image')"
            >选择素材</el-button
          ></el-form-item
        ><el-form-item label="跳转页面（选填）"
          ><el-input v-model="config.banner_link" clearable
            ><el-button slot="append" icon="el-icon-link" @click="$emit('link')" /></el-input></el-form-item
      ></template>
    </el-form>
  </div>
</template>
<script>
import { categoryPageDefaults } from '../../../../../../../../shared/categoryPageConfig';
export default {
  props: { config: Object, productOptions: Array, contentColors: Array },
  computed: {
    centerVersion() {
      return this.config.status;
    },
  },
  methods: {
    setColor(key, value) {
      this.config[key] = value || categoryPageDefaults()[key];
    },
    resetColor(key) {
      this.config[key] = categoryPageDefaults()[key];
    },
    chooseImage(key) {
      this.$emit('image', key);
    },
  },
};
</script>
<style scoped>
.image-thumbnail {
  max-width: 100%;
  display: block;
}
.button-options {
  display: flex;
  flex-wrap: wrap;
}
.tip {
  color: #999;
  font-size: 12px;
}
</style>
