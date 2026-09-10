<template>
  <el-form label-position="top" size="small">
    <el-form-item v-for="field in pageColors" :key="field.key" :label="field.label"
      ><el-color-picker :value="config[field.key]" @change="setColor(field.key, $event)" /><el-button
        type="text"
        @click="resetColor(field.key)"
        >重置</el-button
      ></el-form-item
    >
    <el-form-item label="背景图"
      ><img v-if="config.background_image" :src="config.background_image" class="image-thumbnail" /><el-button
        @click="chooseImage('background_image')"
        >选择图片</el-button
      ><el-button type="text" @click="config.background_image = ''">清除</el-button></el-form-item
    >
    <el-form-item label="背景图显示"
      ><el-radio-group v-model="config.background_repeat"
        ><el-radio-button v-for="item in repeats" :key="item.value" :label="item.value">{{
          item.label
        }}</el-radio-button></el-radio-group
      ></el-form-item
    >
    <el-form-item label="背景图填充大小"
      ><el-select v-model="config.background_size"
        ><el-option label="横向100%" value="100% auto" /><el-option label="纵向100%" value="auto 100%" /><el-option
          label="100%填充"
          value="100% 100%" /></el-select
    ></el-form-item>
  </el-form>
</template>
<script>
import { categoryPageDefaults } from '../../../../../../../../shared/categoryPageConfig';
export default {
  props: { config: Object, pageColors: Array, repeats: Array },
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
.tip {
  color: #999;
  font-size: 12px;
}
</style>
