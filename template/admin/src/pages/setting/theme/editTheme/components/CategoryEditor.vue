<template>
  <div class="category-editor" v-loading="loading || saving">
    <aside class="module-panel">
      <h3>基础组件</h3>
      <div class="module-grid">
        <button @click="addModule('search')" :class="{ active: panel === 'search' }">
          <component-library-icon name="#iconzujian-sousuokuang" />搜索框
        </button>
        <button
          v-for="layout in layouts"
          class="layout-choice"
          :key="layout.value"
          @click="chooseVersion(layout.value)"
          :class="{ active: panel === 'category' && centerVersion === layout.value }"
        >
          <component-library-icon :name="['#iconzujian-shangpinfenlei','#iconzujian-shangpinliebiao','#iconzujian-shangpinxuanxiangka'][layout.value - 1]" />分类组件{{ layout.value }}
        </button>
        <button @click="addModule('navigation')" :class="{ active: panel === 'navigation' }">
          <component-library-icon name="#iconzujian-dibucaidan" />导航栏
        </button>
        <button @click="addModule('checkout')" :class="{active:panel === 'checkout'}"><component-library-icon name="#iconzujian-dibucaidan1" />分类结算栏</button>
        <button @click="addModule('title')" :class="{ active: panel === 'title' }"><component-library-icon name="#iconzujian-biaoti" />页面标题</button>
      </div>
      <p>分类组件1/2/3切换布局，各自保留样式。选择画布中的组件可调整内容与样式，支持复制搜索框、拖拽排序及上移下移。页面标题、分类主体、结算栏和导航栏只能各添加一个。</p>
    </aside>
    <main class="canvas">
      <div class="editor-canvas-stage">
      <div class="category-canvas-page" :style="previewStyle">
        <div class="canvas-status"><img src="@/assets/images/electric.png" alt="" /></div>
        <editor-module-frame v-if="config.show_title" class="canvas-module canvas-title-module" name="页面标题" :selected="panel === 'title'" :hidden="!!config.title_component.isHide" @select="panel = 'title'; settingsTab = 'content'" @toggle="config.title_component.isHide = !config.title_component.isHide" @remove="config.show_title = 0; panel = 'page'" @copy="singleModule('title')" moveHint="页面标题固定在顶部">
          <page-title-preview class="canvas-page-title" :dataConfig="config.title_component" />
        </editor-module-frame>
        <draggable v-model="contentModules" class="category-canvas-scroll" data-editor-scroll :animation="200" handle=".module-name" @start="dragging = true" @end="dragging = false">
          <editor-module-frame v-for="(module, index) in contentModules" :key="module.id" class="canvas-module" :class="{'category-body-module': module.type === 'category'}" :name="module.type === 'search' ? '搜索框' : '分类组件' + centerVersion" :selected="panel === module.type && selectedContent === module.id" :hidden="module.type === 'search' ? !!module.config.isHide : !!config.category_hidden" :canMoveUp="index > 0" :canMoveDown="index < contentModules.length - 1" @select="selectContent(module)" @toggle="toggleContent(module)" @remove="removeContent(module)" @copy="copyContent(module)" @move="moveContent(module, $event)" :style="module.type === 'category' ? {...categoryStyle.outer, display: 'flex'} : {}">
            <search-preview v-if="module.type === 'search'" :dataConfig="module.config" :colorStyle="{theme:themeColor}" />
            <div v-else class="category-body-surface" :style="categoryStyle.inner"><category-preview :config="config" :showMerchantName="showMerchantName" /></div>
          </editor-module-frame>
        </draggable>
        <editor-module-frame v-if="config.checkout && config.checkout.name" class="canvas-module category-checkout-module" name="分类结算栏" :selected="panel === 'checkout'" :hidden="!!config.checkout.isHide" @select="selectModule('checkout')" @toggle="config.checkout.isHide = !config.checkout.isHide" @remove="removeCheckout" @copy="singleModule('checkout')" moveHint="结算栏固定在底部">
          <checkout-preview :config="config.checkout" :selected="checkoutSelected" :themeColor="themeColor" />
        </editor-module-frame>
        <editor-module-frame v-if="hasNavigation" class="canvas-module" name="导航栏" :selected="panel === 'navigation'" :hidden="!!config.navigation.isHide" @select="selectModule('navigation')" @toggle="config.navigation.isHide = !config.navigation.isHide" @remove="removeNavigation" @copy="singleModule('navigation')" moveHint="导航栏固定在底部">
          <navigation-preview :config="config.navigation" :themeColor="themeColor" />
        </editor-module-frame>
      </div>
      <page-editor-actions pageType="category" :config="config" :disabled="loading || saving || !!loadError" :savePage="saveOnly" :reloadPage="getInfo" :getPreview="getPreviewElement" @settings="selectModule('page')" />
      </div>
    </main>
    <aside class="settings-panel">
      <navigation-settings v-if="panel === 'navigation' && hasNavigation" :configObj="config.navigation" />
      <page-title-settings v-else-if="panel === 'title'" :dataConfig="config.title_component" />
      <search-settings v-else-if="panel === 'search'" :dataConfig="selectedSearch" :key="selectedContent" />
      <checkout-settings v-else-if="panel === 'checkout' && config.checkout.name" :config="config.checkout" @preview-state="checkoutSelected = $event" />
      <template v-else>
        <div class="settings-heading">
          {{ panel === 'page' ? '页面设置' : panel === 'title' ? '页面标题' : panel === 'search' ? '搜索框' : '分类组件' + centerVersion }}
        </div>
        <el-tabs v-if="panel !== 'page'" v-model="settingsTab"
          ><el-tab-pane label="内容设置" name="content" /><el-tab-pane label="样式设置" name="style"
        /></el-tabs>
        <div class="panel-content" :class="{ 'common-style-panel': settingsTab === 'style' && panel !== 'page' }">
          <el-button v-if="panel === 'category' && settingsTab === 'content'" class="restore-category-preset" size="small" @click="restorePreset">恢复当前分类预设</el-button>
          <page-settings
            v-if="panel === 'page'"
            :config="config"
            :pageColors="pageColors"
            :repeats="repeats"
            @image="chooseImage"
          />
          <template v-else
            ><category-settings
              v-if="settingsTab === 'content'"
              :config="config"
              :productOptions="productOptions"
              :contentColors="contentColors"
              @image="chooseImage"
              @link="$refs.linkaddres.modals = true" /><common-style v-else :configObj="config.category_style" hide-radius
          /></template>
        </div>
      </template>
      <div class="settings-actions">
        <el-button type="primary" :disabled="loading || !!loadError" :loading="saving" @click="saveOnly"
          >保存分类页</el-button
        >
      </div>
      <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" />
    </aside>
    <el-dialog title="选择图片素材" :visible.sync="mediaOpen" width="950px" append-to-body
      ><upload-pictures v-if="mediaOpen" is-choice="单选" @getPic="selectImage" /></el-dialog
    ><linkaddress ref="linkaddres" @linkUrl="config.banner_link = $event" />
  </div>
</template>
<script>
import draggable from 'vuedraggable';
import { pageContentModules } from '../../../../../../../shared/pageModuleOrder';
import { searchBoxComponent } from '../../../../../../../shared/searchBoxComponent';
import { themeInfo, themeSave } from '@/api/diy';
import setting from '@/setting';
import uploadPictures from '@/components/uploadPictures';
import linkaddress from '@/components/linkaddress';
import {
  normalizeCategoryPage,
  categoryPageDefaults,
  categoryPageStyle,
  categoryLayoutPreset,
  categoryBodyStyle,
} from '../../../../../../../shared/categoryPageConfig';
import { commonStyleDefaults, componentStyle } from '../../../../../../../shared/componentStyle';
import { navigationComponent } from '../../../../../../../shared/navigationComponent';
import NavigationSettings from '@/components/themeNavigation/NavigationSettings';
import PageTitleSettings from '@/components/mobileConfig/c_page_title_bar';
import SearchSettings from '@/components/mobileConfig/c_search_box';
import SearchPreview from '@/components/mobilePage/search_box';
import ComponentLibraryIcon from '@/components/themeActions/ComponentLibraryIcon';
import CheckoutPreview from '@/components/themeActions/CheckoutPreview';
import CheckoutSettings from '@/components/themeActions/CheckoutSettings';
import { checkoutComponent } from '../../../../../../../shared/checkoutComponent';
import NavigationPreview from '@/components/themeNavigation/NavigationPreview';
import CommonStyle from '@/components/mobileConfigRight/c_common_style';
import CategoryPreview from './categoryModules/CategoryPreview';
import CategorySettings from './categoryModules/CategorySettings';
import PageSettings from './categoryModules/PageSettings';
import EditorModuleFrame from '@/components/themeActions/EditorModuleFrame';
import PageEditorActions from '@/components/themeActions/PageEditorActions';
import PageTitlePreview from '@/components/mobilePage/page_title_bar';
import { headerActions } from '../../../../../../../shared/pageActions';
const fields = (pairs) => pairs.map(([key, label]) => ({ key, label }));
export default {
  name: 'CategoryEditor',
  components: {
    draggable,
    uploadPictures,
    linkaddress,
    NavigationSettings,
    PageTitleSettings, SearchSettings, SearchPreview,
    ComponentLibraryIcon, CheckoutPreview, CheckoutSettings,
    NavigationPreview,
    CommonStyle,
    CategoryPreview,
    CategorySettings,
    PageSettings, EditorModuleFrame, PageEditorActions, PageTitlePreview,
  },
  inject: { setDirty: { default: () => () => {} } },
  data() {
    return {
      config: normalizeCategoryPage(1),
      loading: true,
      saving: false,
      checkoutSelected: false,
      loadError: '',
      mediaOpen: false,
      imageField: '',
      themeColor: '#E93323',
      showMerchantName: false,
      panel: 'category',
      selectedContent: 'category',
      dragging: false,
      moduleSequence: 0,
      settingsTab: 'content',
      legacyNavigation: null,
      previewCategory: 0,
      layoutChoices: { 2: 'large', 3: 'list' },
      layouts: [
        { value: 1, label: '样式1 · 分类导航', image: require('@/assets/images/cate1.png') },
        { value: 2, label: '样式2 · 大图商品', image: require('@/assets/images/cate2.png') },
        { value: 3, label: '样式3 · 图文列表', image: require('@/assets/images/cate3.png') },
      ],
      categories: ['家居', '女装', '男装', '母婴', '运动', '数码', '食品'],
      sampleNames: ['全部商品', '床上用品', '生活好物', '数码配件', '电器', '精选礼品'],
      icons: [
        'el-icon-goods',
        'el-icon-house',
        'el-icon-coffee-cup',
        'el-icon-headset',
        'el-icon-mobile-phone',
        'el-icon-present',
      ],
      pageColors: fields([
        ['background_color', '页面背景颜色'],
      ]),
      repeats: [
        { value: 'no-repeat', label: '不平铺' },
        { value: 'repeat', label: '平铺' },
        { value: 'repeat-y', label: '纵向平铺' },
        { value: 'repeat-x', label: '横向平铺' },
      ],
      productOptions: [
        {
          key: 'product_layout',
          label: '展示布局',
          options: [
            { value: 'large', label: '单列大图' },
            { value: 'grid', label: '双列网格' },
            { value: 'list', label: '图文列表' },
          ],
        },
        {
          key: 'sub_tab_style',
          label: '二级分类标签风格',
          options: [
            { value: 'solid', label: '实心高亮' },
            { value: 'outline', label: '描边高亮' },
          ],
        },
        {
          key: 'text_align',
          label: '文本对齐',
          options: [
            { value: 'left', label: '左对齐' },
            { value: 'center', label: '居中对齐' },
          ],
        },
        {
          key: 'text_bold',
          label: '文字粗细',
          options: [
            { value: 0, label: '常规体' },
            { value: 1, label: '加粗体' },
          ],
        },
        {
          key: 'name_lines',
          label: '商品名称行数',
          options: [
            { value: 1, label: '1行' },
            { value: 2, label: '2行' },
          ],
        },
        {
          key: 'show_product_name',
          label: '显示商品名称',
          options: [
            { value: 1, label: '显示' },
            { value: 0, label: '不显示' },
          ],
        },
      ],
    };
  },
  computed: {
    contentModules: {
      get() { return pageContentModules(this.config, 'category'); },
      set(modules) { this.config.content_order = modules.map(item => item.id); },
    },
    selectedSearch() { return this.selectedContent === 'search' ? this.config.search_component : (this.config.extra_modules.find(item => item.id === this.selectedContent) || {}).config; },
    centerVersion() {
      return this.config.status;
    },
    hasNavigation() {
      return !!(this.config.navigation && this.config.navigation.menuList);
    },
    categoryStyle() {
      return componentStyle(categoryBodyStyle(this.config.category_style));
    },
    previewStyle() {
      return categoryPageStyle(this.config, this.themeColor);
    },
    contentColors() {
      return fields([
        ['active_color', '主题色（价格、按钮、选中态）'],
        ['side_background_color', '一级分类栏背景色'],
        ['side_text_color', '一级分类文字色'],
        ['side_active_text_color', '一级分类选中文字色'],
        ['side_active_background_color', '一级分类选中背景色'],
        ...(this.centerVersion === 1
          ? [
              ['group_title_color', '分组标题色'],
              ['category_name_color', '分类名称色'],
            ]
          : [
              ['side_indicator_color', '一级分类选中指示条颜色'],
              ['sub_tab_text_color', '二级标签文字色'],
              ['sub_tab_background_color', '二级标签背景色'],
              ['sub_tab_active_text_color', '二级标签选中文字色'],
              ['sub_tab_active_background_color', '二级标签选中背景色'],
              ['product_background_color', '商品区背景色'],
              ['product_title_color', '商品标题色'],
              ['price_color', '商品价格色'],
              ['buy_button_color', '购买按钮色'],
            ]),
      ]);
    },
  },
  watch: {
    config: {
      deep: true,
      handler() {
        if (!this.loading) this.setDirty(true);
      },
    },
  },
  created() {
    this.getInfo();
  },
  methods: {
    singleModule(key) { this.$message.warning(({title:'页面标题',category:'分类组件',checkout:'分类结算栏',navigation:'导航栏'})[key] + '只能添加一个'); },
    addModule(key) {
      if (key === 'search') {
        if (this.config.show_search) return this.copyContent({type:'search', id:this.selectedContent, config:searchBoxComponent()});
      } else if ((key === 'navigation' && this.hasNavigation) || (key === 'checkout' && this.config.checkout && this.config.checkout.name) || (key === 'title' && this.config.show_title)) {
        this.singleModule(key);
        return this.selectModule(key);
      }
      this.selectModule(key);
    },
    selectContent(module) { if(this.dragging)return; this.selectedContent = module.id; this.panel = module.type; this.settingsTab = 'content'; },
    toggleContent(module) { if(module.type === 'search') module.config.isHide = !module.config.isHide; else this.config.category_hidden = Number(!this.config.category_hidden); },
    removeContent(module) {
      if (module.id === 'search') this.config.show_search = 0;
      else if (module.id === 'category') this.config.show_category = 0;
      else this.config.extra_modules = this.config.extra_modules.filter(item => item.id !== module.id);
      this.config.content_order = this.config.content_order.filter(id => id !== module.id);
      this.panel = 'page';
    },
    copyContent(module) {
      if (module.type !== 'search') return this.singleModule('category');
      const id = 'search_' + Date.now() + '_' + (++this.moduleSequence);
      const copy = {id, config:searchBoxComponent({...JSON.parse(JSON.stringify(module.config)), id, timestamp:Date.now() * 1000 + this.moduleSequence})};
      const order = this.contentModules.map(item => item.id);
      order.splice(Math.max(0, order.indexOf(module.id) + 1), 0, id);
      this.config.extra_modules.push(copy);
      this.config.content_order = order;
      this.selectContent({...copy, type:'search'});
    },
    moveContent(module, step) {
      const modules = this.contentModules.slice(), index = modules.findIndex(item => item.id === module.id), next = index + step;
      if(next < 0 || next >= modules.length)return;
      modules.splice(next, 0, modules.splice(index, 1)[0]); this.contentModules = modules; this.selectContent(module);
    },
    chooseVersion(version) {
      if (this.config.show_category) this.$message.warning('分类组件只能添加一个，已切换当前组件的布局');
      this.config.show_category = 1;
      this.selectedContent = 'category';
      const globalKeys = [
        'show_title', 'title_hidden', 'show_category', 'category_hidden', 'search_hidden',
        'show_search',
        'search_placeholder',
        'page_title',
        'title_actions', 'title_background_color',
        'title_text_color',
        'background_color',
        'background_image',
        'background_repeat',
        'background_size',
      ];
      const keys = Object.keys(categoryPageDefaults())
        .filter((key) => !globalKeys.includes(key))
        .concat('category_style');
      const snapshot = {};
      keys.forEach((key) => {
        snapshot[key] = this.config[key];
      });
      this.$set(this.config.layout_configs, this.config.status, JSON.parse(JSON.stringify(snapshot)));
      const saved = this.config.layout_configs[version] || {
        ...categoryLayoutPreset(version),
        category_style: commonStyleDefaults(),
      };
      keys.forEach((key) => {
        this.$set(this.config, key, saved[key] === undefined ? categoryPageDefaults()[key] : saved[key]);
      });
      this.config.status = version;
      this.panel = 'category';
      this.settingsTab = 'content';
    },
    selectModule(panel) {
      if (panel === 'title') this.config.show_title = 1;
      if (panel === 'checkout' && !(this.config.checkout && this.config.checkout.name)) this.$set(this.config,'checkout',checkoutComponent());
      if (panel === 'search') { this.config.show_search = 1; this.selectedContent = 'search'; }
      if (panel === 'navigation' && !this.hasNavigation) {
        this.config.navigation = navigationComponent(this.legacyNavigation || {});
        this.config.navigation.isHide = false;
        this.config.navigation.setUp.tabVal = 0;
      }
      this.panel = panel;
      this.settingsTab = 'content';
      if (panel === 'navigation') this.$nextTick(() => {
        const module = this.$el.querySelector('.canvas-module.selected');
        if (module) module.scrollIntoView({ block: 'nearest' });
      });
    },
    restorePreset() {
      const preset=categoryLayoutPreset(this.config.status);
      const globalKeys=['show_title','title_hidden','show_category','category_hidden','search_hidden','show_search','search_placeholder','page_title','title_actions','title_background_color','title_text_color','background_color','background_image','background_repeat','background_size'];
      Object.keys(preset).filter(key=>!globalKeys.includes(key)).forEach(key=>this.$set(this.config,key,preset[key]));
      this.$set(this.config,'category_style',commonStyleDefaults());
    },
    removeSearch() {
      this.config.show_search = 0;
      this.panel = 'page';
    },
    removeCheckout() { this.config.checkout = {}; this.panel = 'page'; },
    removeNavigation() {
      this.config.navigation = [];
      this.panel = 'page';
    },
    setColor(key, value) {
      this.config[key] = value || categoryPageDefaults()[key];
    },
    resetColor(key) {
      this.config[key] = categoryPageDefaults()[key];
    },
    chooseImage(key) {
      this.imageField = key;
      this.mediaOpen = true;
    },
    selectImage(pic) {
      this.config[this.imageField] = pic.att_dir;
      this.mediaOpen = false;
    },
    async getInfo() {
      this.loading = true;
      this.loadError = '';
      try {
        const id = this.$route.query.tid || this.$route.query.id || 0;
        const [category, theme, home] = await Promise.all([
          themeInfo(id, 'category'),
          themeInfo(id, 'theme'),
          themeInfo(id, 'home'),
        ]);
        this.config = normalizeCategoryPage(category.data);
        this.legacyNavigation =
          Object.values(home.data.value || {}).find((item) => ['pageFoot', 'mainNavigation'].includes(item.name)) ||
          null;
        // Legacy pageFoot may have no visibility metadata. Match the storefront
        // fallback until the category page explicitly owns its navigation.
        const legacyNavigation = !this.config.navigation_mode && this.legacyNavigation?.menuList;
        this.$set(
          this.config,
          'navigation',
          this.config.navigation?.menuList
            ? navigationComponent(this.config.navigation)
            : legacyNavigation
            ? navigationComponent(this.legacyNavigation)
            : [],
        );
        this.$set(this.config, 'title_actions', headerActions(this.config.title_actions || { left: [], right: [] }));
        this.$set(this.config, 'navigation_mode', 'page');
        this.$set(this.config, 'checkout', this.config.checkout && this.config.checkout.name ? checkoutComponent(this.config.checkout) : {});
        this.$set(this.config, 'actions_mode', 'components');
        this.$set(this.config, 'search_style', this.config.search_style || commonStyleDefaults());
        this.$set(this.config, 'category_style', this.config.category_style || commonStyleDefaults());
        this.$set(this.config, 'layout_configs', this.config.layout_configs || {});
        this.themeColor = theme.data.theme_color || '#E93323';
        this.showMerchantName = !!theme.data.show_merchant_name;
        if (this.config.status > 1) this.layoutChoices[this.config.status] = this.config.product_layout;
        await this.$nextTick();
        this.setDirty(false);
      } catch (e) {
        this.loadError = e.msg || '分类页配置读取失败，请刷新后重试';
      } finally {
        this.loading = false;
      }
    },
    getPreviewElement() { return this.$el.querySelector('.category-canvas-page'); },
    async saveOnly() {
      if (this.loading || this.saving || this.loadError) return false;
      if (this.config.banner_enabled && !this.config.banner_image) {
        this.$message.error('请先选择分类广告图片');
        return false;
      }
      this.saving = true;
      const snapshot = normalizeCategoryPage(this.config);
      try {
        const result = await themeSave(this.$route.query.id || 0, {
          page_type: this.$route.query.page_type || 'theme',
          type: 'category',
          value: snapshot,
          tid: Number(this.$route.query.tid) || 0,
        });
        if (!Number(this.$route.query.id)) {
          const query = { ...this.$route.query, id: result.data.id };
          delete query.tid;
          await this.$router.replace({ query });
        }
        this.setDirty(JSON.stringify(snapshot) !== JSON.stringify(normalizeCategoryPage(this.config)));
        this.$message.success(result.msg || '保存成功');
        return true;
      } catch (e) {
        this.$message.error(e.msg || '保存失败');
        return false;
      } finally {
        this.saving = false;
      }
    },
    async saveAndClose() {
      if (await this.saveOnly()) this.$router.push(`${setting.routePre}/setting/${this.$route.query.page_type === 'merchant' ? 'merchant_theme' : 'my_theme'}`);
    },
    preview() {
      this.$el.querySelector('.category-canvas-page').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  },
};
</script>
<style lang="scss" scoped>
.category-editor {
  display: flex;
  height: 100%;
  min-width: 0;
  color: #303133;
  background: #f5f5f5;
  overflow: auto;
}
.module-panel {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  padding: 22px 15px;
  overflow: auto;
  h3 {
    font-size: 14px;
    font-weight: normal;
    margin: 0 0 20px;
  }
  p {
    font-size: 12px;
    color: #999;
    line-height: 1.8;
    margin-top: 24px;
  }
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px 4px;
  button {
    border: 1px solid transparent;
    background: #fff;
    border-radius: 6px;
    height: 80px;
    font-size: 12px;
    cursor: pointer;
    color: #606266;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    i {
      color: #1890ff;
      font-size: 23px;
    }
  }
  button:hover,
  button.active {
    border-color: #e6f4ff;
    background: #f8fcff;
  }
}
.canvas {
  flex: 1;
  min-width: 640px;
  overflow: auto;
  padding: 20px 154px 20px 110px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
.category-canvas-page {
  width: 375px;
  margin: 0 auto;
  background: #fff;
}
.canvas-status {
  height: 30px;
  background: #fff;
  img {
    width: 100%;
    height: 30px;
    object-fit: contain;
  }
}
.canvas-page-title {
  text-align: center;
  cursor: pointer;
}
.search {
  margin: 0;
  padding: 16px 20px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  background: transparent;
  font-size: 12px;
}
.category-checkout {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 14px;
  background: white;
  font-size: 13px;
  b {
    color: #e93323;
  }
}
.canvas-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.settings-panel {
  width: 340px;
  flex-shrink: 0;
  background: #fff;
  overflow: auto;
}
.settings-heading {
  padding: 20px 15px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}
.panel-content {
  padding: 0 15px 20px;
}
.panel-content.common-style-panel {
  padding: 0 0 20px;
}
.settings-actions {
  padding: 15px;
  border-top: 1px solid #eee;
}
.settings-panel > .el-tabs {
  padding: 0 15px;
}
.settings-panel > .el-tabs ::v-deep .el-tabs__nav-scroll {
  display: flex;
  justify-content: center;
}
.settings-panel > .el-tabs ::v-deep .el-tabs__item {
  padding: 0 60px;
}
</style>

<style scoped>.category-search-preview{display:flex;align-items:center;gap:6px}.category-search-preview .search{flex:1;min-width:40px;margin:10px 6px}.category-checkout-module{margin-top:auto}.category-canvas-page{display:flex;flex-direction:column;height:calc(100vh - 200px);min-height:520px;max-height:740px}.category-canvas-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;margin-left:-110px;margin-right:-52px;padding:2px 52px 2px 110px;scrollbar-width:none}.category-canvas-scroll::-webkit-scrollbar{display:none}.category-canvas-page>.canvas-module{flex-shrink:0}.canvas-status{flex-shrink:0}</style>

<style scoped>
.category-canvas-scroll ::v-deep .module-name{cursor:grab}.category-canvas-scroll{display:flex;flex-direction:column;padding-top:0;padding-bottom:0}
.category-body-module{flex:1;display:flex;flex-direction:column}
.category-body-surface{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
.category-body-surface ::v-deep .preview-body{flex:1;min-height:0}
</style>

<style scoped>.editor-canvas-stage{position:relative;width:375px;margin:0 auto}@media(max-width:1400px){.module-panel{width:180px}.module-grid{grid-template-columns:repeat(2,minmax(70px,1fr))}}</style>
