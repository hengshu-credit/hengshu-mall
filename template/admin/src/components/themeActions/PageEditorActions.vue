<template>
  <div class="page-editor-actions" data-editor-chrome>
    <el-button size="mini" @click="$emit('settings')">页面设置</el-button>
    <el-button size="mini" :disabled="disabled || busy" @click="nameOpen = true">另存模板</el-button>
    <el-button size="mini" :disabled="disabled || busy" @click="resetPage">重置</el-button>
    <el-button size="mini" :disabled="disabled || busy" :loading="busy" @click="saveCover">保存为封面</el-button>
    <el-dialog title="另存模板" :visible.sync="nameOpen" width="420px" append-to-body>
      <el-input v-model="templateName" placeholder="请输入模板名称" maxlength="60" />
      <span slot="footer"><el-button @click="nameOpen = false">取消</el-button><el-button type="primary" :loading="busy" @click="saveTemplate">保存模板</el-button></span>
    </el-dialog>
  </div>
</template>
<script>
import html2canvas from 'html2canvas';
import { themeSave, saveThemeImage } from '@/api/diy';
import { fileUpload } from '@/api/setting';
export default {
  props: { pageType: String, config: Object, disabled: Boolean, savePage: Function, reloadPage: Function, getPreview: Function },
  data() { return { busy: false, nameOpen: false, templateName: '' }; },
  methods: {
    async saveTemplate() {
      if (this.busy || this.disabled) return;
      const title = this.templateName.trim();
      if (!title) return this.$message.warning('请输入模板名称');
      this.busy = true;
      try {
        await themeSave(0, { type: this.pageType, value: JSON.parse(JSON.stringify(this.config)), title,
          tid: Number(this.$route.query.id) || Number(this.$route.query.tid) || 0, page_type: 'theme' });
        this.nameOpen = false; this.templateName = ''; this.$message.success('模板保存成功');
      } catch (error) { this.$message.error(error.msg || '模板保存失败'); }
      finally { this.busy = false; }
    },
    async resetPage() {
      try { await this.$confirm('将恢复最近保存的页面配置，未保存的修改将丢失。是否继续？', '重置页面', { type: 'warning' }); }
      catch (_) { return; }
      await this.reloadPage();
      this.$emit('settings');
    },
    async saveCover() {
      if (this.busy || this.disabled) return;
      this.busy = true;
      try {
        if (!(await this.savePage())) return;
        await this.$nextTick();
        const container = this.getPreview();
        if (!container) throw new Error('未找到页面预览');
        const canvas = await html2canvas(container, { useCORS: true, allowTaint: false, scale: 2, logging: false,
          backgroundColor: this.config.background_color || '#ffffff',
          ignoreElements: element => element.hasAttribute('data-editor-chrome'),
          onclone: (_, cloned) => {
            cloned.querySelectorAll('.editor-module-frame').forEach(el => { el.style.outline = 'none'; });
            cloned.querySelectorAll('.editor-module-frame.hidden').forEach(el => { el.style.display = 'none'; });
            const scroll = cloned.querySelector('[data-editor-scroll]');
            if (scroll) {
              scroll.style.cssText += ';overflow:visible;flex:none;height:auto;min-height:0;margin:0;padding:0;';
              scroll.scrollTop = 0;
            }
            cloned.style.height = 'auto'; cloned.style.maxHeight = 'none'; cloned.style.minHeight = '0';
          },
        });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('图片生成失败');
        const data = new FormData(); data.append('file', new File([blob], `cover_${this.pageType}_${Date.now()}.png`, { type: 'image/png' })); data.append('type', 1);
        const upload = await fileUpload(data);
        if (!upload.data || !upload.data.src) throw new Error(upload.msg || '封面上传失败');
        await saveThemeImage(Number(this.$route.query.id), { image: upload.data.src, type: this.pageType });
        this.$message.success('封面保存成功');
      } catch (error) { this.$message.error(error.msg || error.message || '封面保存失败'); }
      finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>
.page-editor-actions{position:absolute;left:calc(100% + 48px);top:0;width:94px;display:flex;flex-direction:column;gap:20px;padding-top:20px;z-index:5}
.page-editor-actions>.el-button{display:block;width:94px;height:32px;margin:0;margin-left:0!important;padding:0;border:0;border-radius:3px;color:#282828;background:#fff;font-size:12px}
.page-editor-actions>.el-button:hover{color:var(--prev-color-primary);box-shadow:0 1px 6px #0001}
</style>
