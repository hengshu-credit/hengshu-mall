<template>
  <div class="common-page-editor" v-loading="loading || saving">
    <aside class="common-page-library">
      <h3>通用页面</h3>
      <button v-for="item in pageOptions" :key="item.key" :class="{ active: pageKey === item.key }" @click="pageKey = item.key">
        {{ item.label }}
      </button>
      <p>只显示当前页面实际支持的配置。业务数据、状态和权限仍由页面接口提供。</p>
    </aside>
    <main class="common-page-canvas">
      <div class="phone-preview" :style="previewStyle">
        <div v-if="controls.includes('title') && config.show_title" class="phone-title">{{ config.page_title || currentLabel }}</div>
        <div v-if="controls.includes('search') && config.show_search" class="phone-search">⌕ <span>{{ config.search_placeholder }}</span></div>
        <div class="phone-list" :class="config.list_layout">
          <div v-for="index in 4" :key="index" class="phone-card">
            <div class="phone-thumb"></div>
            <div class="phone-card-title">{{ currentLabel }}示例内容</div>
            <div class="phone-price" v-if="pageKey === 'goodsList'">¥99.00</div>
          </div>
        </div>
        <div v-if="controls.includes('empty')" class="phone-empty">{{ config.empty_text }}</div>
      </div>
    </main>
    <aside class="common-page-settings">
      <h3>{{ currentLabel }}配置</h3>
      <el-form label-position="top" size="small">
        <template v-if="controls.includes('title')">
          <el-form-item label="页面标题"><el-input v-model="config.page_title" maxlength="30" /></el-form-item>
          <el-form-item label="显示原生标题"><el-switch v-model="config.show_title" /></el-form-item>
        </template>
        <template v-if="controls.includes('background')">
          <el-form-item label="页面背景色"><el-color-picker v-model="config.background_color" /></el-form-item>
          <el-form-item label="页面背景图"><el-input v-model="config.background_image" placeholder="选择素材或输入地址"><el-button slot="append" @click="mediaOpen = true">选择素材</el-button></el-input></el-form-item>
        </template>
        <template v-if="controls.includes('search')">
          <el-form-item label="显示搜索框"><el-switch v-model="config.show_search" /></el-form-item>
          <el-form-item label="搜索提示" v-if="config.show_search"><el-input v-model="config.search_placeholder" maxlength="30" /></el-form-item>
          <el-form-item label="搜索框背景色"><el-color-picker v-model="config.search_background_color" /></el-form-item>
        </template>
        <el-form-item label="列表布局" v-if="controls.includes('listLayout')"><el-radio-group v-model="config.list_layout"><el-radio-button label="list">列表</el-radio-button><el-radio-button label="grid">网格</el-radio-button></el-radio-group></el-form-item>
        <template v-if="controls.includes('card')">
          <el-form-item label="卡片背景色"><el-color-picker v-model="config.card_background_color" /></el-form-item>
          <el-form-item label="卡片圆角"><el-slider v-model="config.card_radius" :max="60" show-input /></el-form-item>
        </template>
        <el-form-item label="卡片标题色" v-if="controls.includes('cardTitle')"><el-color-picker v-model="config.card_title_color" /></el-form-item>
        <el-form-item label="卡片间距" v-if="controls.includes('cardGap')"><el-slider v-model="config.card_gap" :max="60" show-input /></el-form-item>
        <el-form-item label="空态文案" v-if="controls.includes('empty')"><el-input v-model="config.empty_text" maxlength="30" /></el-form-item>
        <el-form-item label="显示推荐" v-if="controls.includes('recommend')"><el-switch v-model="config.show_recommend" /></el-form-item>
      </el-form>
      <el-button type="primary" :loading="saving" @click="saveOnly">保存通用页面</el-button>
    </aside>
    <el-dialog title="选择图片素材" :visible.sync="mediaOpen" width="950px" append-to-body>
      <upload-pictures v-if="mediaOpen" is-choice="单选" @getPic="selectImage" />
    </el-dialog>
  </div>
</template>
<script>
import { themeInfo, themeSave } from '@/api/diy';
import setting from '@/setting';
import uploadPictures from '@/components/uploadPictures';
import { COMMON_PAGE_KEYS, COMMON_PAGE_CONTROLS, normalizeCommonPages, commonPageStyle } from '../../../../../../../shared/commonPageConfig';

const labels = {
  goodsList: '商品列表', goodsSearch: '商品搜索', orderList: '订单列表', orderDetail: '订单详情', orderPayStatus: '支付结果',
  merchantStreet: '店铺街', merchantFollowed: '已关注店铺', merchantRanking: '商户排行榜', userSubpage: '用户子页面',
  activityList: '活动列表', activityDetail: '活动详情', pointsMall: '积分商城', newsList: '资讯列表', newsDetail: '资讯详情',
};
export default {
  name: 'CommonPageEditor',
  components: { uploadPictures },
  inject: { setDirty: { default: () => () => {} } },
  data() { return { pages: normalizeCommonPages({}), pageKey: 'goodsList', loading: true, saving: false, loadError: '', mediaOpen: false }; },
  computed: {
    pageOptions() { return COMMON_PAGE_KEYS.map(key => ({ key, label: labels[key] || key })); },
    controls() { return COMMON_PAGE_CONTROLS[this.pageKey] || []; },
    config: { get() { return this.pages[this.pageKey]; }, set(value) { this.$set(this.pages, this.pageKey, value); } },
    currentLabel() { return labels[this.pageKey] || this.pageKey; },
    previewStyle() { return commonPageStyle(this.config, this.pageKey, 'px'); },
  },
  watch: { pages: { deep: true, handler() { if (!this.loading) this.setDirty(true); } } },
  created() { this.getInfo(); },
  methods: {
    selectImage(pic) {
      if (pic && pic.att_dir) this.config.background_image = pic.att_dir;
      this.mediaOpen = false;
    },
    async getInfo() {
      this.loading = true;
      this.loadError = '';
      try {
        const id = Number(this.$route.query.tid || this.$route.query.id) || 0;
        const res = await themeInfo(id, 'common');
        this.pages = normalizeCommonPages(res.data);
        this.setDirty(false);
      } catch (error) {
        this.loadError = error.msg || '通用页面配置读取失败';
        this.$message.error(this.loadError);
      } finally { this.loading = false; }
    },
    async saveOnly() {
      if (this.loading || this.saving || this.loadError) return false;
      this.saving = true;
      try {
        const res = await themeSave(this.$route.query.id || 0, {
          page_type: this.$route.query.page_type || 'theme', type: 'common', tid: Number(this.$route.query.tid) || 0,
          value: normalizeCommonPages(this.pages),
        });
        if (!Number(this.$route.query.id)) {
          const query = { ...this.$route.query, id: res.data.id };
          delete query.tid;
          await this.$router.replace({ query });
        }
        this.setDirty(false);
        this.$message.success(res.msg || '保存成功');
        return true;
      } catch (error) { this.$message.error(error.msg || '保存失败'); return false; }
      finally { this.saving = false; }
    },
    async saveAndClose() {
      if (await this.saveOnly()) this.$router.push(`${setting.routePre}/setting/${this.$route.query.page_type === 'merchant' ? 'merchant_theme' : 'my_theme'}`);
    },
    preview() {
      const element = this.$el.querySelector('.phone-preview');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  },
};
</script>
<style scoped>
.common-page-editor{display:flex;height:100%;min-width:0;overflow:auto;background:#f5f5f5}.common-page-library,.common-page-settings{width:260px;flex-shrink:0;background:#fff;padding:20px;overflow:auto}.common-page-library h3,.common-page-settings h3{margin:0 0 16px;font-size:15px;font-weight:500}.common-page-library button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:10px 12px;border-radius:6px;cursor:pointer;color:#606266}.common-page-library button.active{background:#edf5ff;color:#1890ff}.common-page-library p{font-size:12px;line-height:1.7;color:#909399;margin-top:20px}.common-page-canvas{flex:1;min-width:420px;padding:40px;overflow:auto}.phone-preview{width:375px;min-height:650px;margin:auto;border-radius:22px;overflow:hidden;color:var(--common-page-card-title);padding-bottom:24px}.phone-title{text-align:center;color:var(--common-page-title-color);background:var(--common-page-title-background);font-size:18px;padding:18px 12px}.phone-search{margin:16px;border-radius:24px;padding:12px 18px;background:var(--common-page-search-background);color:var(--common-page-search-color)}.phone-search span{margin-left:8px;color:#999}.phone-list{display:grid;gap:var(--common-page-card-gap);padding:16px}.phone-list.grid{grid-template-columns:repeat(2,1fr)}.phone-list.list{grid-template-columns:1fr}.phone-card{background:var(--common-page-card-background);border-radius:var(--common-page-card-radius);padding:12px}.phone-thumb{height:110px;border-radius:10px;background:linear-gradient(135deg,#eef3f8,#dfe7ef)}.phone-card-title{font-size:14px;margin-top:10px}.phone-price{color:var(--common-page-price);margin-top:8px}.phone-empty{text-align:center;color:#999;padding:35px 12px;font-size:13px}.common-page-settings{width:340px}.common-page-settings>.el-button{width:100%;margin-top:10px}
</style>
