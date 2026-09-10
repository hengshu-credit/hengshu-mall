<template>
  <div class="checkout-settings">
    <c-set-up :configObj="config" configNme="setUp" />
    <el-form v-if="config.setUp.tabVal === 0" size="small" label-width="95px">
      <el-form-item label="结算栏预设"><el-radio-group :value="config.barLayout" @input="applyPreset"><el-radio-button label="standard">普通结算栏</el-radio-button><el-radio-button label="floating">悬浮胶囊</el-radio-button></el-radio-group></el-form-item>
      <el-form-item label="购物车入口"><el-switch v-model="config.showCart" /></el-form-item>
      <el-form-item label="展示内容"><el-radio-group v-model="config.cartDisplay"><el-radio-button label="text">仅文字</el-radio-button><el-radio-button label="icon">仅图标</el-radio-button><el-radio-button label="both">文字+图标</el-radio-button></el-radio-group></el-form-item>
      <el-form-item label="入口文字"><el-input v-model="config.cartText" maxlength="8" /></el-form-item>
      <el-form-item v-for="state in iconStates" :key="state.key" :label="state.label">
        <div class="checkout-icon-preview"><img :src="iconUrl(state.selected)" :alt="state.label + '购物车图标'" /><el-button @click="imageField = state.key; mediaOpen = true">选择素材</el-button><el-button type="text" @click="resetIcon(state)">恢复默认</el-button></div>
      </el-form-item>
      <el-form-item label="预览状态"><el-radio-group v-model="previewSelected" @change="$emit('preview-state', $event)"><el-radio-button :label="false">选中前</el-radio-button><el-radio-button :label="true">选中后</el-radio-button></el-radio-group></el-form-item>
      <el-form-item label="显示金额"><el-switch v-model="config.showAmount" /></el-form-item>
      <el-form-item label="结算按钮"><el-switch v-model="config.showButton" /></el-form-item>
      <el-form-item label="按钮文字"><el-input v-model="config.buttonText" maxlength="8" /></el-form-item>
      <el-form-item label="按钮显示数量"><el-switch v-model="config.showButtonCount" /></el-form-item>
      <el-form-item label="查看明细入口"><el-switch v-model="config.showDetails" /></el-form-item>
      <el-form-item v-if="config.showDetails" label="明细文字"><el-input v-model="config.detailsText" maxlength="8" /></el-form-item>
      <p class="note">购物车有商品时显示选中态；空购物车时不能结算。</p>
    </el-form>
    <template v-else>
      <el-form size="small" label-width="95px">
        <el-form-item label="按钮样式"><el-radio-group v-model="config.buttonStyle"><el-radio-button label="text">简洁文字</el-radio-button><el-radio-button label="solid">填充按钮</el-radio-button></el-radio-group></el-form-item>
        <el-form-item label="入口文字色"><el-color-picker v-model="config.cartColor" /></el-form-item>
        <el-form-item label="图标圆形背景"><el-color-picker v-model="config.cartBackground" show-alpha /></el-form-item>
        <el-form-item label="图标大小"><el-slider v-model="config.cartIconSize" :min="16" :max="40" /></el-form-item>
        <el-form-item label="明细文字颜色"><el-color-picker v-model="config.detailsColor" /></el-form-item>
        <el-form-item label="选中文字色"><el-color-picker v-model="config.activeCartColor" /></el-form-item>
        <el-form-item label="金额颜色"><el-color-picker v-model="config.priceColor" /><span class="note">留空跟随主题</span></el-form-item>
        <el-form-item label="按钮背景"><el-color-picker v-model="config.buttonColor" /></el-form-item>
        <el-form-item label="按钮文字色"><el-color-picker v-model="config.buttonTextColor" /></el-form-item>
        <el-form-item label="按钮圆角"><el-slider v-model="config.buttonRadius" :max="30" /></el-form-item>
      </el-form>
      <c-common-style :configObj="config" />
    </template>
    <el-dialog title="选择购物车图标" :visible.sync="mediaOpen" width="950px" append-to-body><upload-pictures v-if="mediaOpen" is-choice="单选" @getPic="selectImage" /></el-dialog>
  </div>
</template>
<script>
import cSetUp from '@/components/mobileConfigRight/c_set_up';
import cCommonStyle from '@/components/mobileConfigRight/c_common_style';
import uploadPictures from '@/components/uploadPictures';
import setting from '@/setting';
import { checkoutCartIcon, checkoutPreset } from '../../../../shared/checkoutComponent';
export default {
  props: { config: Object },
  components: { cSetUp, cCommonStyle, uploadPictures },
  data() { return { mediaOpen: false, imageField: 'iconImage', previewSelected: false, iconStates: [{ key: 'iconImage', label: '选中前图标', selected: false }, { key: 'activeIconImage', label: '选中后图标', selected: true }] }; },
  methods: {
    resetIcon(state) { this.$set(this.config, state.key, checkoutCartIcon({}, state.selected)); },
    applyPreset(layout) { const preset=checkoutPreset(layout);Object.keys(preset).forEach(key=>this.$set(this.config,key,preset[key])); },
    iconUrl(selected) {
      let url = checkoutCartIcon(this.config, selected);
      if (url.startsWith('/static/')) url = '/statics/mp_view' + url;
      return url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '').replace(/\/$/, '') + url : url;
    },
    selectImage(pic) { this.$set(this.config, this.imageField, pic.att_dir); this.mediaOpen = false; },
  },
};
</script>
<style scoped>
.checkout-settings > .el-form{padding:15px}.note{font-size:12px;color:#909399;line-height:1.8}.checkout-icon-preview{display:flex;gap:8px;align-items:center}.checkout-icon-preview img{width:36px;height:36px;object-fit:contain;border:1px solid #eee;border-radius:4px}
</style>
