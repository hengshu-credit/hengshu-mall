<template>
  <div
    :class="getThemeConfig.layout === 'columns' || getThemeConfig.isCollapse ? 'layout-logo-size' : 'layout-logo'"
    v-db-click
    @click="onThemeConfigChange"
  >
    <img class="layout-logo-img" width="40" height="40" :src="logoSrc" alt="衡枢真信" @error="onLogoError" />
    <div v-if="getThemeConfig.layout !== 'columns' && !getThemeConfig.isCollapse" class="layout-logo-text">
      <div class="layout-logo-company">上海衡枢真信科技有限公司</div>
      <div class="layout-logo-slogan">鉴真伪，铸信用，衡风险，枢定策</div>
    </div>
  </div>
</template>

<script>
import { getLogo } from '@/api/common';
import hscreditLogo from '@/assets/images/hscredit.svg';

export default {
  name: 'layoutLogo',
  data() {
    return {
      logoSrc: hscreditLogo,
    };
  },
  computed: {
    // 获取布局配置信息
    getThemeConfig() {
      return this.$store.state.themeConfig.themeConfig;
    },
    // 设置 logo 是否显示
    setShowLogo() {
      let { isCollapse, layout } = this.$store.state.themeConfig.themeConfig;
      return !isCollapse || layout === 'classic' || document.body.clientWidth < 1000;
    },
  },
  mounted() {
    this.getLogo();
  },
  methods: {
    onLogoError() {
      this.logoSrc = hscreditLogo;
    },
    getLogo() {
      return getLogo()
        .then((res) => {
          this.logoSrc = res.data.logo_square || res.data.logo || hscreditLogo;
        })
        .catch(() => {
          this.logoSrc = hscreditLogo;
        });
    },
    // logo 点击实现菜单展开/收起
    onThemeConfigChange() {
      if (
        this.$store.state.themeConfig.themeConfig.layout == 'columns' &&
        !this.$store.state.menus.childMenuList.length &&
        this.$store.state.themeConfig.themeConfig.isCollapse
      )
        return;
      if (
        this.$store.state.themeConfig.themeConfig.layout === 'transverse' ||
        this.$store.state.themeConfig.themeConfig.layout === 'classic'
      )
        return false;
      this.$store.state.themeConfig.themeConfig.isCollapse = !this.$store.state.themeConfig.themeConfig.isCollapse;
    },
  },
};
</script>

<style scoped lang="scss">
.layout-logo,
.layout-logo-size {
  height: 50px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  overflow: hidden;
  animation: none;
  transition: none;
}
.layout-logo { width: 300px; }
.layout-logo-size { width: 64px; }
.layout-logo-img {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  margin-left: 12px;
  object-fit: contain;
  animation: none;
  transition: none;
}
.layout-logo-text {
  margin-left: 7px;
  white-space: nowrap;
}
.layout-logo-company {
  color: var(--prev-bg-menuBarColor);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
.layout-logo-slogan {
  color: #55d9ee;
  font-size: 10px;
  line-height: 16px;
}
.layout-header .layout-logo-company,
.layout-header .layout-logo-slogan {
  color: #ffffff;
}
</style>
