<template>
  <div class="edit-theme-layout">
    <!-- 左侧导航 -->
    <div class="layout-sidebar" :class="{ collapsed }" v-if="!isMicroPage">
      <sidebar
        :active-menu="activeMenu"
        :collapsed="collapsed"
        :unsaved="isDirty"
        :merchant="isMerchantTheme"
        @change="handleMenuChange"
        @save="handleSidebarSave"
        @toggle="collapsed = !collapsed"
      ></sidebar>
    </div>

    <!-- 右侧主体 -->
    <div class="layout-main">
      <!-- 顶部栏 -->
      <page-header
        :theme-name="themeName"
        :theme-info="themeInfo"
        :isMicroPage="isMicroPage"
        @preview="onPreview"
        @save="onSave"
        @save-close="onSaveClose"
        @save-template="onSaveTemplate"
        @update-info="handleUpdateInfo"
      ></page-header>

      <!-- 内容区域 -->
      <div v-if="activeMenu === 'detail'" style="padding:12px 20px;background:white;display:flex;gap:12px;align-items:center">
        <span>预览商品</span><el-select v-model="previewProductId" filterable placeholder="选择当前在售商品" @change="loadPreviewProduct"><el-option v-for="product in previewProducts" :key="product.id" :label="product.store_name" :value="Number(product.id)" /></el-select>
        <span style="color:#909399;font-size:12px">{{previewProductError || '商品、规格、服务和介绍使用当前数据'}}</span>
      </div>
      <div v-if="isMerchantTheme" class="merchant-preview-selector" style="padding:12px 20px;background:white;display:flex;align-items:center;gap:12px">
        <span>预览店铺</span><merchant-select v-model="previewShopId" clearable :emptyValue="0" />
        <span style="font-size:12px;color:#909399">用于读取当前店铺内容，不改变主题绑定</span>
      </div>
      <div class="layout-content">
        <style-config ref="styleConfig" v-if="activeMenu === 'theme'"></style-config>
        <home-editor ref="homeEditor" v-else-if="activeMenu === 'home'" key="home"></home-editor>
        <home-editor ref="shopEditor" v-else-if="activeMenu === 'shop'" key="shop"></home-editor>
        <category-editor ref="categoryEditor" v-else-if="activeMenu === 'category'"></category-editor>
        <detail-editor ref="detailEditor" v-else-if="activeMenu === 'detail'"></detail-editor>
        <cart-editor ref="cartEditor" v-else-if="activeMenu === 'cart'"></cart-editor>
        <user-editor ref="userEditor" v-else-if="activeMenu === 'user'"></user-editor>
      </div>
    </div>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue';
import PageHeader from './components/Header.vue';
import StyleConfig from './components/StyleConfig.vue';
import HomeEditor from './components/HomeEditor.vue';
import CategoryEditor from './components/CategoryEditor.vue';
import DetailEditor from './components/DetailEditor.vue';
import UserEditor from './components/UserEditor.vue';
import CartEditor from './components/CartEditor.vue';
import { saveThemeTitle, themeInfo, getProProduct, getDecorationProductDetail } from '@/api/diy';
import MerchantSelect from '@/components/merchantSelect';

export default {
  name: 'EditTheme',
  components: {
    MerchantSelect,
    Sidebar,
    PageHeader,
    StyleConfig,
    HomeEditor,
    CategoryEditor,
    DetailEditor,
    UserEditor,
    CartEditor,
  },
  data() {
    return {
      themeName: '请设置页面名称',
      themeInfo: '',
      activeMenu: 'home', // 默认选中商城首页
      collapsed: false,
      isDirty: false, // 是否有未保存的修改
      previewShopId: 0,
      previewProducts: [], previewProductId:null, previewProduct:null, previewProductError:'',
    };
  },
  provide() {
    return {
      decorationPreview: () => ({shopId:Number(this.previewShopId) || 0, requiresShop:this.isMerchantTheme}),
      decorationProduct: () => this.previewProduct,
      setDirty: (dirty) => {
        this.isDirty = dirty;
      },
    };
  },
  watch: {
    previewShopId() { if(this.activeMenu==='detail')this.loadPreviewProducts(); },
    '$route.query.type': {
      handler(val) {
        if (val) {
          this.activeMenu = val;
          if(val==='detail')this.loadPreviewProducts();
        }
      },
      immediate: true,
    },
  },
  computed: {
    isMerchantTheme() { return this.$route.query.page_type === 'merchant'; },
    isMicroPage() {
      return ['micro', 'shop'].includes(this.$route.query.page_type);
    },
  },
  mounted() {
    if (this.$route.query.id != 0) this.getThemeBaseInfo();
  },
  methods: {
    async loadPreviewProducts() {
      const seq=this._previewListRequest=(this._previewListRequest||0)+1;
      this._previewDetailRequest=(this._previewDetailRequest||0)+1;
      this.previewProducts=[];
      this.previewProduct=null;this.previewProductError='';
      if(this.isMerchantTheme&&!this.previewShopId){this.previewProducts=[];this.previewProductId=null;return;}
      try {
        const res=await getProProduct({seller_shop_id:this.previewShopId||0,limit:50});
        if(this._isDestroyed||seq!==this._previewListRequest)return;
        this.previewProducts=Array.isArray(res.data)?res.data:[];
        if(!this.previewProducts.some(p=>Number(p.id)===this.previewProductId))this.previewProductId=Number((this.previewProducts[0]||{}).id)||null;
        this.loadPreviewProduct();
      }catch(error){if(seq===this._previewListRequest)this.previewProductError=error.msg||error.message;}
    },
    async loadPreviewProduct() {
      const seq=this._previewDetailRequest=(this._previewDetailRequest||0)+1;
      this.previewProduct=null;if(!this.previewProductId)return;
      try { const detail=await getDecorationProductDetail(this.previewProductId);if(!this._isDestroyed&&seq===this._previewDetailRequest)this.previewProduct=detail; }
      catch(error){if(seq===this._previewDetailRequest)this.previewProductError=error.msg||error.message;}
    },
    getThemeBaseInfo() {
      const id = this.$route.query.id || 0;
      if (!id) {
        this.themeName = '请设置页面名称';
        return;
      }
      themeInfo(id, 'base')
        .then((res) => {
          this.themeName = res.data.title || '请设置页面名称';
          this.themeInfo = res.data.info;
        })
        .catch((err) => {
          this.$message.error(err.msg);
        });
    },
    async handleMenuChange(menuKey) {
      if (this.isDirty) {
        this.isDirty = false;
      }
      if (this.$route.query.type !== menuKey) {
        await this.$router.replace({ query: { ...this.$route.query, type: menuKey } });
      }
      this.activeMenu = menuKey;
    },
    async handleSidebarSave(key) {
      if (await this.onSave()) {
        if (this.isDirty) return;
        if (key === 'back') this.$router.back();
        else this.handleMenuChange(key);
      }
    },
    handleUpdateInfo(data) {
      this.themeName = data.title;
      this.themeInfo = data.info;
      let id = this.$route.query.id || 0;
      saveThemeTitle(id, data)
        .then((res) => {
          this.$message.success('保存成功');
          if (id == 0) {
            let query = { ...this.$route.query, id: res.data.id };
            if (query.tid) {
              delete query.tid; // 保存后移除 tid
            }
            this.$router.replace({ query });
            // Update active component's pageId
            const refName = this.getRefName();
            if (refName && this.$refs[refName] && this.$refs[refName].$refs.diy) {
              this.$refs[refName].$refs.diy.pageId = res.data.id;
            }
          }
        })
        .catch((err) => {
          this.$message.error(err.msg);
        });
    },
    getRefName() {
      switch (this.activeMenu) {
        case 'theme':
          return 'styleConfig';
        case 'home':
          return 'homeEditor';
        case 'shop':
          return 'shopEditor';
        case 'category':
          return 'categoryEditor';
        case 'detail':
          return 'detailEditor';
        case 'user':
          return 'userEditor';
        case 'cart':
          return 'cartEditor';
        default:
          return '';
      }
    },
    onPreview() {
      const refName = this.getRefName();
      if (refName && this.$refs[refName] && this.$refs[refName].preview) {
        this.$refs[refName].preview();
      }
    },
    onSave() {
      const refName = this.getRefName();
      if (refName && this.$refs[refName] && this.$refs[refName].saveOnly) {
        return this.$refs[refName].saveOnly();
      }
    },
    onSaveClose() {
      const refName = this.getRefName();
      if (refName && this.$refs[refName] && this.$refs[refName].saveAndClose) {
        this.$refs[refName].saveAndClose();
      }
    },
    onSaveTemplate() {
      const refName = this.getRefName();
      if (refName && this.$refs[refName] && this.$refs[refName].saveTemplate) {
        this.$refs[refName].saveTemplate();
      }
    },
  },
};
</script>
<style>
.el-main {
  padding: 0;
}
</style>
<style lang="scss" scoped>
.edit-theme-layout {
  display: flex;
  height: 100vh;
  background-color: #f5f7fa;
  overflow: hidden;

  .layout-sidebar {
    width: 120px;
    background: #fff;
    height: 100%;
    flex-shrink: 0;
    transition: width 0.2s ease;
    &.collapsed {
      width: 70px;
    }
  }

  .layout-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    .layout-content {
      flex: 1;
      overflow: hidden;
      position: relative;
      background: #fff;
    }
  }
}
</style>
