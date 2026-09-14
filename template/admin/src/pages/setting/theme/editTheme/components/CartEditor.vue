<template>
  <div class="cart-editor" v-loading="loading || saving">
    <aside class="cart-library">
      <h3>基础组件</h3>
      <button v-for="item in modules" :key="item.key" :class="{active:panel === item.key}" @click="addModule(item.key)"><component-library-icon :name="item.icon" />{{ item.label }}</button>
      <p>服务保障支持多个，可复制并拖拽排序。页面标题、购物车商品、结算栏和导航栏只能各添加一个。</p>
    </aside>
    <main class="cart-canvas">
      <div class="editor-canvas-stage">
      <div class="cart-preview" :style="{...styles.page, '--view-theme':themeColor}">
        <div class="cart-status"><img src="@/assets/images/electric.png" alt="" /></div>
        <editor-module-frame v-if="config.show_title" name="页面标题" :selected="panel === 'title'" :hidden="!!config.title_component.isHide" @select="panel = 'title';tab = 'content'" @toggle="config.title_component.isHide = !config.title_component.isHide" @remove="removeModule('title')" @copy="singleModule('title')" moveHint="页面标题固定在顶部"><page-title-preview class="cart-title" :dataConfig="config.title_component" /></editor-module-frame>
        <draggable v-model="contentModules" class="cart-preview-scroll" data-editor-scroll :animation="200" handle=".module-name" @start="dragging = true" @end="dragging = false">
          <editor-module-frame v-for="(module,index) in contentModules" :key="module.id" :name="module.type === 'service' ? '服务保障' : '购物车商品'" :selected="panel === module.type && selectedContent === module.id" :hidden="module.type === 'service' ? !!module.config.service_hidden : !!config.list_hidden" :canMoveUp="index > 0" :canMoveDown="index < contentModules.length - 1" @select="selectContent(module)" @toggle="toggleContent(module)" @remove="removeContent(module)" @copy="copyContent(module)" @move="moveContent(module,$event)" :style="module.type === 'service' ? serviceStyles(module.config).outer : {}">
            <div v-if="module.type === 'service'" class="cart-service" :style="serviceStyles(module.config).inner"><span v-for="(text,i) in module.config.service_labels" :key="i">✓ {{ text }}</span></div>
            <template v-else>
              <div class="cart-list-heading"><span>购物数量 2</span><button type="button" class="cart-list-manage">管理</button></div>
              <div v-for="(picture,i) in pictures" :key="i" :style="styles.list.outer">
                <div class="cart-product" :style="styles.list.inner"><span class="cart-check">✓</span><img :src="picture" alt="商品效果示意" /><div class="cart-product-info"><div>品质生活精选商品</div><small>属性：默认款</small><strong :style="styles.price">¥ 99.00</strong><span class="cart-quantity">−　1　+</span></div></div>
              </div>
            </template>
          </editor-module-frame>
          <div slot="footer" v-if="emptyPreview" class="cart-empty" @click="selectModule('page')"><i class="el-icon-shopping-cart-2"></i><p>{{config.empty_text}}</p><p v-if="config.show_recommend">为你推荐</p></div>
        </draggable>
        <editor-module-frame v-if="!emptyPreview && config.show_checkout" name="购物车结算栏" :selected="panel === 'checkout'" :hidden="config.checkout_hidden" @select="panel = 'checkout';tab = 'content'" @toggle="config.checkout_hidden = !config.checkout_hidden" @remove="removeModule('checkout')" @copy="singleModule('checkout')" moveHint="结算栏固定在底部" :style="styles.checkout.outer"><div class="cart-checkout" :style="styles.checkout.inner"><span>✓ 全选(2)</span><strong :style="styles.price">¥ 198.00</strong><button :style="styles.button">{{config.checkout_text}}</button></div></editor-module-frame>
        <editor-module-frame v-if="hasNavigation" name="导航栏" :selected="panel === 'navigation'" :hidden="config.navigation.isHide" @select="panel = 'navigation'" @toggle="toggleNavigation" @remove="removeNavigation" @copy="singleModule('navigation')" moveHint="导航栏固定在底部"><navigation-preview :config="config.navigation" :themeColor="themeColor" activePath="/pages/order_addcart/order_addcart" /></editor-module-frame>
      </div>
      <page-editor-actions pageType="cart" :config="config" :disabled="loading || saving || !!loadError" :savePage="saveOnly" :reloadPage="getInfo" :getPreview="getPreviewElement" @settings="selectModule('page')" />
      </div>
      <el-radio-group v-model="emptyPreview" size="small" class="cart-preview-mode"><el-radio-button :label="false">有商品</el-radio-button><el-radio-button :label="true">空购物车</el-radio-button></el-radio-group>
    </main>
    <aside class="cart-settings">
      <template v-if="panel === 'navigation' && hasNavigation">
        <el-form label-position="top" size="small" class="cart-form"><el-form-item label="导航来源"><el-select v-model="config.navigation_source" @change="setNavigationSource"><el-option label="跟随首页" value="home" /><el-option label="单独配置" value="custom" /><el-option label="不显示" value="none" /></el-select></el-form-item></el-form>
        <navigation-settings v-if="config.navigation_source === 'custom'" :configObj="config.navigation" />
        <p v-else class="cart-form">使用首页当前的导航配置。</p>
      </template>
      <page-title-settings v-else-if="panel === 'title'" :dataConfig="config.title_component" :allowCartManage="true" />
      <template v-else>
        <h3>{{ currentModule.label }}</h3>
        <el-tabs v-model="tab"><el-tab-pane label="内容设置" name="content" /><el-tab-pane v-if="!['page','title'].includes(panel)" label="样式设置" name="style" /></el-tabs>
        <common-style v-if="tab === 'style' && !['page','title'].includes(panel)" :configObj="panel === 'service' ? selectedService.service_style : config[panel + '_style']" />
        <el-form v-else label-position="top" size="small" class="cart-form">
          <template v-if="panel === 'page'">
            <el-form-item label="底部导航"><el-select v-model="config.navigation_source" @change="setNavigationSource"><el-option label="跟随首页" value="home" /><el-option label="单独配置" value="custom" /><el-option label="不显示" value="none" /></el-select></el-form-item>
            <el-form-item label="页面背景色"><el-color-picker :value="config.background_color" @change="setPageBackground" /><div class="page-background-help">用于商品列表、空购物车和底部留白。组件背景可单独设置。</div></el-form-item>
            <el-form-item label="空购物车提示"><el-input v-model="config.empty_text" maxlength="30" /></el-form-item>
            <el-form-item label="空购物车推荐商品"><el-switch v-model="config.show_recommend" /></el-form-item>
          </template>
          <template v-else-if="panel === 'service'">
            <el-form-item v-for="(_,i) in selectedService.service_labels" :key="i" :label="'服务文案' + (i+1)"><el-input v-model="selectedService.service_labels[i]" maxlength="16" /></el-form-item>
          </template>
          <template v-else-if="panel === 'checkout'">
            <el-form-item label="结算按钮文字"><el-input v-model="config.checkout_text" maxlength="8" /></el-form-item>
            <el-form-item label="金额颜色"><el-color-picker v-model="config.price_color" /><span>留空跟随主题</span></el-form-item>
            <el-form-item label="按钮背景"><el-color-picker v-model="config.button_color" /></el-form-item>
            <el-form-item label="按钮文字色"><el-color-picker v-model="config.button_text_color" /></el-form-item>
            <el-form-item label="按钮圆角"><el-slider v-model="config.button_radius" :max="40" show-input /></el-form-item>
          </template>
          <p v-else>商品名称、规格、数量与价格来自用户购物车；在样式设置中调整卡片背景、圆角、间距、边框及阴影。</p>
        </el-form>
      </template>
      <div class="cart-save"><el-alert v-if="loadError" :title="loadError" type="error" :closable="false" /><el-button type="primary" :disabled="loading || !!loadError" :loading="saving" @click="saveOnly">保存购物车页</el-button></div>
    </aside>
  </div>
</template>
<script>
import draggable from 'vuedraggable';
import { pageContentModules } from '../../../../../../../shared/pageModuleOrder';
import { componentStyle } from '../../../../../../../shared/componentStyle';
import { themeInfo, themeSave } from '@/api/diy';
import setting from '@/setting';
import { normalizeCartPage, cartPageStyles } from '../../../../../../../shared/cartPageConfig';
import { navigationComponent } from '../../../../../../../shared/navigationComponent';
import ComponentLibraryIcon from '@/components/themeActions/ComponentLibraryIcon';
import NavigationPreview from '@/components/themeNavigation/NavigationPreview';
import NavigationSettings from '@/components/themeNavigation/NavigationSettings';
import CommonStyle from '@/components/mobileConfigRight/c_common_style';
import EditorModuleFrame from '@/components/themeActions/EditorModuleFrame';
import PageEditorActions from '@/components/themeActions/PageEditorActions';
import PageTitlePreview from '@/components/mobilePage/page_title_bar';
import PageTitleSettings from '@/components/mobileConfig/c_page_title_bar';
import { headerActions } from '../../../../../../../shared/pageActions';
export default {
  name: 'CartEditor',
  components: { draggable, ComponentLibraryIcon, NavigationPreview, NavigationSettings, CommonStyle, EditorModuleFrame, PageEditorActions, PageTitlePreview, PageTitleSettings },
  inject: { setDirty: { default: () => () => {} } },
  data() { return { config:normalizeCartPage(), loading:true, saving:false, loadError:'', themeColor:'#E93323', panel:'page', tab:'content', emptyPreview:false, selectedContent:'', dragging:false, moduleSequence:0,
    pictures:[require('@/assets/images/product-diy.png'),require('@/assets/images/product-diy.png')],
    modules:[{key:'title',label:'页面标题',icon:'#iconzujian-biaoti'},{key:'service',label:'服务保障',icon:'#iconzujian-shangpinfuwu'},{key:'list',label:'购物车商品',icon:'#iconzujian-shangpinliebiao'},{key:'checkout',label:'购物车结算栏',icon:'#iconzujian-dibucaidan1'},{key:'navigation',label:'导航栏',icon:'#iconzujian-dibucaidan'}] }; },
  computed: {
    contentModules: {
      get() { return pageContentModules(this.config,'cart').filter(item => !this.emptyPreview || item.type !== 'list'); },
      set(modules) {
        const order = modules.map(item => item.id);
        const remaining = order.slice();
        this.config.content_order = this.config.content_order.map(id => order.includes(id) ? remaining.shift() : id).concat(remaining);
      },
    },
    selectedService() { return this.selectedContent === 'service' ? this.config : (this.config.extra_modules.find(item => item.id === this.selectedContent) || {}).config; },
    styles() { return cartPageStyles(this.config,'px',this.assetUrl); },
    hasNavigation() { return !!(this.config.navigation && this.config.navigation.menuList); },
    currentModule() { return this.modules.find(item=>item.key===this.panel) || {label:'页面设置'}; },
  },
  watch: { config:{deep:true,handler(){if(!this.loading)this.setDirty(true);}} },
  created() { this.getInfo(); },
  methods: {
    singleModule(key) { this.$message.warning(this.modules.find(item => item.key === key).label + '只能添加一个'); },
    addModule(key) {
      if(key === 'service' && this.config.show_service) return this.copyContent({type:'service',id:this.selectedContent,config:normalizeCartPage()});
      if(key !== 'service' && ((key === 'navigation' && this.hasNavigation) || this.config['show_' + key])) this.singleModule(key);
      this.selectModule(key);
    },
    serviceStyles(config) { return componentStyle(config.service_style, 'px', this.assetUrl); },
    selectContent(module) { if(this.dragging)return; this.selectedContent = module.id; this.panel = module.type; this.tab = 'content'; },
    toggleContent(module) { if(module.type === 'service') module.config.service_hidden = !module.config.service_hidden; else this.config.list_hidden = !this.config.list_hidden; },
    removeContent(module) {
      if(['service','list'].includes(module.id)) this.config['show_' + module.id] = false;
      else this.config.extra_modules = this.config.extra_modules.filter(item => item.id !== module.id);
      this.config.content_order = this.config.content_order.filter(id => id !== module.id); this.panel = 'page';
    },
    copyContent(module) {
      if(module.type !== 'service') return this.singleModule('list');
      const id = 'service_' + Date.now() + '_' + (++this.moduleSequence);
      const source = module.config;
      const copy = {id, config:JSON.parse(JSON.stringify({service_labels:source.service_labels,service_style:source.service_style,service_hidden:source.service_hidden}))};
      const order = this.contentModules.map(item => item.id); order.splice(Math.max(0,order.indexOf(module.id) + 1),0,id);
      this.config.extra_modules.push(copy); this.config.content_order = order; this.selectContent({...copy,type:'service'});
    },
    moveContent(module, step) {
      const modules = this.contentModules.slice(), index = modules.findIndex(item => item.id === module.id), next = index + step;
      if(next < 0 || next >= modules.length)return;
      modules.splice(next,0,modules.splice(index,1)[0]); this.contentModules = modules; this.selectContent(module);
    },
    assetUrl(url) { return url && url.startsWith('/') ? setting.apiBaseURL.replace(/\/(adminapi|api)\/?$/, '').replace(/\/$/, '')+url : url; },
    setPageBackground(color) { this.config.background_color = color || normalizeCartPage().background_color; },
    selectModule(key) {
      if(['title','service','list','checkout'].includes(key)){this.config['show_'+key]=true;}
      if(key==='navigation'&&!this.hasNavigation)this.setNavigationSource('custom');
      this.panel=key;this.selectedContent=key;this.tab='content';
      if(key==='page')this.$nextTick(()=>{const panel=this.$el.querySelector('.cart-settings');if(panel)panel.scrollTop=0;});
    },
    removeModule(key) { this.config['show_'+key]=false;this.panel='page';this.tab='content'; },
    setNavigationSource(source) {
      this.config.navigation_source = source;
      const nav = source === 'home' ? this.homeNavigation : source === 'custom' ? this.config.navigation && this.config.navigation.menuList ? this.config.navigation : this.homeNavigation || navigationComponent() : null;
      this.$set(this.config, 'navigation', nav && nav.menuList ? navigationComponent(nav) : []);
      if(source === 'none') this.panel='page';
    },
    toggleNavigation() { this.setNavigationSource('custom'); this.config.navigation.isHide = !this.config.navigation.isHide; },
    removeNavigation() { this.setNavigationSource('none');this.panel='page'; },
    async getInfo() {
      this.loading=true;this.loadError='';
      try {
        const id=this.$route.query.tid||this.$route.query.id||0;
        const [cart,theme,home]=await Promise.all([themeInfo(id,'cart'),themeInfo(id,'theme'),themeInfo(id,'home')]);
        if(this._isDestroyed)return;
        this.config=normalizeCartPage(cart.data);
        this.$set(this.config,'title_actions',headerActions(this.config.title_actions || {left:[],right:[]}));
        const legacy=Object.values(home.data.value||{}).find(item=>['mainNavigation','pageFoot'].includes(item.name));
        this.homeNavigation = legacy;
        this.setNavigationSource(this.config.navigation_source);
        this.$set(this.config,'navigation_mode','page');
        this.themeColor=theme.data.theme_color||'#E93323';
        await this.$nextTick();this.setDirty(false);
      } catch(error) { this.loadError=error.msg||'购物车配置读取失败，请刷新重试'; }
      finally { this.loading=false; }
    },
    getPreviewElement() { return this.$el.querySelector('.cart-preview'); },
    async saveOnly() {
      if(this.loading||this.saving||this.loadError)return false;
      const snapshot=normalizeCartPage(this.config);this.saving=true;
      try {
        const res=await themeSave(this.$route.query.id||0,{type:'cart',value:snapshot,tid:Number(this.$route.query.tid)||0});
        if(!Number(this.$route.query.id)){const query={...this.$route.query,id:res.data.id};delete query.tid;await this.$router.replace({query});}
        this.setDirty(JSON.stringify(snapshot)!==JSON.stringify(normalizeCartPage(this.config)));this.$message.success(res.msg||'保存成功');return true;
      }catch(error){this.$message.error(error.msg||'保存失败');return false;}
      finally{this.saving=false;}
    },
    async saveAndClose(){if(await this.saveOnly())this.$router.push(`${setting.routePre}/setting/my_theme`);},
    preview(){this.$el.querySelector('.cart-preview').scrollIntoView({block:'nearest'});},
  },
};
</script>
<style scoped lang="scss">
.cart-editor{display:flex;height:100%;min-width:0;overflow:auto;background:#f5f5f5;color:#303133}.cart-library{width:220px;flex-shrink:0;background:white;padding:20px 15px;overflow:auto;h3{font-size:14px;font-weight:normal}button{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:80px;height:82px;background:white;border:1px solid transparent;border-radius:6px;cursor:pointer;font-size:12px;i{font-size:24px;color:#1890ff}&.active{background:#f8fcff;border-color:#dbeeff}}p{font-size:12px;color:#999;line-height:1.8;margin-top:25px}}.cart-canvas{flex:1;min-width:640px;overflow:auto;padding:24px 154px 24px 110px;text-align:center;scrollbar-width:none}.cart-preview{width:375px;margin:auto;display:flex;flex-direction:column;height:660px;min-height:520px!important;text-align:left}.cart-title{text-align:center;cursor:pointer}.cart-preview-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;margin-left:-110px;margin-right:-52px;padding:2px 52px 2px 110px;scrollbar-width:none}.cart-preview-scroll ::v-deep .module-name{cursor:grab}.cart-preview-scroll::-webkit-scrollbar,.cart-canvas::-webkit-scrollbar{display:none}.cart-module{position:relative;cursor:pointer;outline:1px solid transparent;&.selected,&:hover{outline-color:#1890ff}}.cart-service{min-height:38px;display:flex;align-items:center;justify-content:space-around;font-size:11px;color:#8c8c8c;gap:4px}.cart-list-heading{display:flex;justify-content:space-between;align-items:center;height:40px;background:transparent;padding:0 15px;font-size:14px;margin-bottom:8px}.cart-product{display:flex;align-items:center;gap:10px;img{width:80px;height:80px;object-fit:contain;border-radius:3px}}.cart-check{color:var(--view-theme)}.cart-product-info{flex:1;min-width:0;font-size:14px;small{display:block;color:#999;margin:8px 0;font-size:12px}strong{display:inline-block;font-weight:normal}.cart-quantity{float:right;font-size:12px;border:1px solid #eee}}.cart-checkout{display:flex;align-items:center;gap:8px;min-height:48px;font-size:13px;strong{margin-left:auto;font-size:15px;font-weight:normal}button{border:0;height:35px;min-width:100px;padding:0 12px;font-size:15px;cursor:pointer}}.cart-empty{text-align:center;padding:70px 0;color:#999;i{font-size:60px}}.cart-settings{width:340px;flex-shrink:0;background:white;overflow:auto;h3{font-size:14px;font-weight:normal;padding:18px 15px;border-bottom:1px solid #eee;margin:0}.el-tabs{padding:0 15px}}.cart-form,.cart-save{padding:15px}.page-background-help{font-size:12px;color:#909399;line-height:1.7;margin-top:4px}.cart-form p,.cart-form span{color:#909399;font-size:12px;line-height:1.8}.cart-save{border-top:1px solid #eee}.cart-preview-mode{margin-top:20px}.cart-nav-module.hidden{opacity:.4}.cart-module-tools{display:none;position:absolute;left:100%;top:0;background:#fff;button{border:0;background:white;white-space:nowrap;padding:6px;cursor:pointer}}.cart-nav-module:hover .cart-module-tools,.cart-nav-module.selected .cart-module-tools{display:block}
</style>

<style scoped>.cart-status{height:30px;flex-shrink:0;background:#fff}.cart-status img{display:block;width:100%;height:30px;object-fit:contain}</style>


<style scoped>.cart-list-manage{border:0;background:transparent;color:inherit;padding:0;font-size:14px;cursor:pointer}</style>

<style scoped>.editor-canvas-stage{position:relative;width:375px;margin:0 auto}@media(max-width:1400px){.cart-library{width:180px}.cart-library button{width:70px}}</style>
