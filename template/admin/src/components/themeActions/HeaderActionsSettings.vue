<template><div class="header-actions-settings">
  <section v-for="side in ['left', 'right']" :key="side">
    <h4>{{ side === 'left' ? '左侧按钮' : '右侧按钮' }} <el-button size="mini" type="text" :disabled="config[side].length >= 3" @click="add(side)">添加按钮</el-button></h4>
    <p v-if="!config[side].length" class="note">未添加按钮</p>
    <div v-for="(button, index) in config[side]" :key="index" class="button-card">
      <div class="button-row"><el-select v-model="button.type" size="small" @change="changeType(button)">
        <el-option v-for="action in actions" :key="action.type" :value="action.type" :label="action.label" />
      </el-select><el-switch v-model="button.enabled" /><el-button size="mini" icon="el-icon-delete" @click="config[side].splice(index, 1)" /></div>
      <div class="button-row"><el-input v-model="button.label" maxlength="8" size="small" placeholder="按钮名称" /><el-checkbox v-model="button.showLabel">显示文字</el-checkbox></div>
      <div class="button-row"><el-button size="mini" @click="chooseImage(button)">{{ button.image ? '更换图标' : '选择素材图标' }}</el-button><el-button size="mini" type="text" @click="button.image = ''">恢复默认图标</el-button></div>
      <div v-if="button.type === 'link'" class="button-row"><el-input :value="button.link" size="small" placeholder="请选择商城页面" readonly @click.native="chooseLink(button)" /><el-button size="mini" @click="chooseLink(button)">选择页面</el-button></div>
      <div v-if="button.type === 'url'" class="button-row"><el-input v-model.trim="button.link" size="small" maxlength="1000" placeholder="请输入 http:// 或 https:// 网址" /></div>
      <div class="button-row"><el-button size="mini" :disabled="index === 0" @click="move(side,index,-1)">前移</el-button><el-button size="mini" :disabled="index === config[side].length-1" @click="move(side,index,1)">后移</el-button></div>
    </div>
  </section>
  <el-form label-width="85px" size="small">
    <el-form-item label="图标大小"><el-input-number v-model="config.iconSize" :min="16" :max="30" /></el-form-item>
    <el-form-item label="图标文字色"><el-color-picker v-model="config.color" /></el-form-item>
    <el-form-item label="按钮背景"><el-color-picker v-model="config.background" show-alpha /></el-form-item>
    <el-form-item label="按钮圆角"><el-slider v-model="config.radius" :max="30" /></el-form-item>
  </el-form>
  <p class="note">每侧最多3个按钮。收藏操作需要当前商品；分享使用当前页面或商品。图片直接使用素材原文件。</p>
  <el-dialog title="选择按钮图标" :visible.sync="mediaOpen" width="950px" append-to-body><upload-pictures v-if="mediaOpen" is-choice="单选" @getPic="selectedImage" /></el-dialog>
  <linkaddress ref="links" @linkUrl="selectedLink" />
</div></template>
<script>
import { ACTIONS, pageAction, actionLink } from '../../../../shared/pageActions';
import uploadPictures from '@/components/uploadPictures';
import linkaddress from '@/components/linkaddress';
export default { props: { config: Object, allowCartManage: Boolean }, components: { uploadPictures, linkaddress },
  data() { return { mediaOpen: false, selected: null }; },
  computed: { actions() { return ACTIONS.filter(action => this.allowCartManage || action.type !== 'cartManage'); } },
  methods: {
    add(side) { if (this.config[side].length < 3) this.config[side].push(pageAction({ type: side === 'left' ? 'home' : 'share' })); },
    changeType(button) { const preset = pageAction({ type: button.type }); button.label = preset.label; button.icon = preset.icon; button.link = preset.link || ''; if (!preset.icon && !button.image) button.showLabel = true; },
    move(side, index, delta) { const items = this.config[side], item = items.splice(index,1)[0]; items.splice(index+delta,0,item); },
    chooseImage(button) { this.selected = button; this.mediaOpen = true; },
    selectedImage(pic) { this.selected.image = pic.att_dir; this.mediaOpen = false; },
    chooseLink(button) { this.selected = button; this.$refs.links.modals = true; },
    selectedLink(link) {
      if (!this.selected) return;
      const type = actionLink({type:'url',link}) ? 'url' : 'link';
      if (!actionLink({type,link})) return this.$message.warning('请选择商城页面或 HTTP(S) 网址');
      this.selected.type = type;
      this.selected.link = link;
    },
  },
};
</script>
<style scoped>
.header-actions-settings{padding:12px 15px}.header-actions-settings h4{display:flex;justify-content:space-between;align-items:center;margin:8px 0}
.button-card{background:#f7f8fa;padding:10px;margin-bottom:10px;border-radius:4px}.button-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}.button-row .el-input,.button-row .el-select{flex:1;min-width:0}.note{font-size:12px;color:#909399;line-height:1.7}
</style>
