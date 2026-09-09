<template>
  <div class="layout-navbars-breadcrumb">
    <i
      v-if="collapseShow"
      class="layout-navbars-breadcrumb-icon"
      :class="getThemeConfig.isCollapse ? 'el-icon-s-unfold' : 'el-icon-s-fold'"
      v-db-click
      @click="onThemeConfigChange"
    ></i>
    <el-breadcrumb class="layout-navbars-breadcrumb-hide" v-if="isShowcrumb" :style="{ display: isShowBreadcrumb }">
      <transition-group name="breadcrumb" mode="out-in">
        <el-breadcrumb-item v-for="(v, k) in breadcrumbItems" :key="v.path">
          <span v-if="k === breadcrumbItems.length - 1" class="layout-navbars-breadcrumb-span">
            <Icon
              :type="v.icon"
              class="ivu-icon layout-navbars-breadcrumb-iconfont"
              v-if="getThemeConfig.isBreadcrumbIcon"
            />{{ $t(v.title) }}
          </span>
          <a v-else v-db-click @click.prevent="onBreadcrumbClick(v)">
            <Icon
              :type="v.icon"
              class="ivu-icon layout-navbars-breadcrumb-iconfont"
              v-if="getThemeConfig.isBreadcrumbIcon"
            />{{ $t(v.title) }}
          </a>
        </el-breadcrumb-item>
      </transition-group>
    </el-breadcrumb>
  </div>
</template>

<script>
import { Local } from '@/utils/storage.js';

export default {
  name: 'layoutBreadcrumb',
  computed: {
    breadcrumbItems() {
      const findBranch = (menus) => {
        for (const menu of menus) {
          const children = findBranch(menu.children || []);
          if (children.length) return [menu, ...children];
          if (menu.path === this.$route.path) return [menu];
        }
        return [];
      };
      const branch = findBranch(this.$store.state.menus.menusName || []);
      // 同一路径可同时出现在分组和叶子菜单中，保留叶子菜单的标题。
      return branch.filter((menu, index) => !branch.slice(index + 1).some((item) => item.path === menu.path));
    },
    // 获取布局配置信息
    getThemeConfig() {
      return this.$store.state.themeConfig.themeConfig;
    },
    // 动态设置经典、横向布局不显示
    isShowBreadcrumb() {
      const { layout, isBreadcrumb } = this.$store.state.themeConfig.themeConfig;
      if (layout === 'transverse' || layout === 'classic') {
        return 'none';
      } else {
        return isBreadcrumb ? '' : 'none';
      }
    },
    isShowcrumb() {
      const { layout } = this.$store.state.themeConfig.themeConfig;
      if (layout === 'transverse' || layout === 'classic') {
        return false;
      } else {
        return true;
      }
    },
    collapseShow() {
      return ['defaults', 'columns'].includes(this.$store.state.themeConfig.themeConfig.layout);
    },
  },
  methods: {
    // breadcrumb 当前项点击时
    onBreadcrumbClick(v) {
      const { redirect, path } = v;
      if (redirect) this.$router.push(redirect);
      else this.$router.push(path);
    },
    // breadcrumb icon 点击菜单展开与收起
    onThemeConfigChange() {
      if (
        this.$store.state.themeConfig.themeConfig.layout == 'columns' &&
        !this.$store.state.menus.childMenuList.length &&
        this.$store.state.themeConfig.themeConfig.isCollapse
      ) {
        return;
      }
      this.$store.state.themeConfig.themeConfig.isCollapse = !this.$store.state.themeConfig.themeConfig.isCollapse;
      this.setLocalThemeConfig();
    },
    // 存储布局配置
    setLocalThemeConfig() {
      Local.remove('themeConfigPrev');
      Local.set('themeConfigPrev', this.$store.state.themeConfig.themeConfig);
    },
  },
};
</script>

<style scoped lang="scss">
.layout-navbars-breadcrumb {
  // flex: 1;
  height: inherit;
  display: flex;
  align-items: center;
  padding-left: 15px;
  .layout-navbars-breadcrumb-icon {
    cursor: pointer;
    font-size: 18px;
    margin-right: 15px;
    color: var(--prev-bg-topBarColor);
    opacity: 0.8;
    &:hover {
      opacity: 1;
    }
  }
  .layout-navbars-breadcrumb-span {
    opacity: 0.7;
    color: var(--prev-bg-topBarColor);
  }
  .layout-navbars-breadcrumb-iconfont {
    font-size: 14px;
    margin-right: 5px;
  }
}
</style>
