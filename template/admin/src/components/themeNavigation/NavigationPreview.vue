<template>
  <div :style="styles.outer" class="navigation-preview-component">
    <div :style="styles.inner" class="navigation-preview-menu" :class="{'text-only': Number(config.navStyleConfig.tabVal) === 1}">
      <button
        type="button"
        v-for="(menu, index) in config.menuList"
        :key="index"
        @click="selected = index"
        :style="{ color: textColor(index) }"
      >
        <img
          v-if="config.navStyleConfig.tabVal !== 1"
          :src="imageUrl(menu.imgList[index === activeIndex ? 0 : 1])"
          alt=""
        />
        <span v-if="config.navStyleConfig.tabVal !== 2">{{ menu.name || '菜单' }}</span>
      </button>
    </div>
  </div>
</template>
<script>
import { componentStyle } from '../../../../shared/componentStyle';
import setting from '@/setting';
import { activeNavigationIndex } from '../../../../shared/mainNavigation';
export default {
  name: 'NavigationPreview',
  props: { config: Object, themeColor: { type: String, default: '#E93323' }, activePath: { type: String, default: '' } },
  data() {
    return { selected: null };
  },
  computed: {
    activeIndex() {
      const page = this.$route && this.$route.query.type;
      const path = this.activePath || ({home:'/pages/index/index',category:'/pages/goods_cate/goods_cate',cart:'/pages/order_addcart/order_addcart',user:'/pages/user/index'})[page] || '';
      return this.selected === null ? Math.max(0, activeNavigationIndex(this.config.menuList, path)) : this.selected;
    },
    styles() {
      return componentStyle(this.config, 'px', this.imageUrl);
    },
  },
  methods: {
    imageUrl(url) {
      if (/^\/static\/images\/[1-4]-00[12]\.png$/.test(url)) url = '/statics/mp_view' + url;
      return url && url.startsWith('/') ? setting.apiBaseURL.replace(/adminapi\/?$/, '').replace(/\/$/, '') + url : url;
    },
    textColor(index) {
      return this.config.toneConfig.tabVal
        ? this.config[index === this.activeIndex ? 'activeTxtColor' : 'txtColor'].color[0].item
        : index === this.activeIndex
        ? this.themeColor
        : '#333333';
    },
  },
};
</script>
<style scoped>
.navigation-preview-menu {
  display: flex;
  min-height: 50px;
}
button {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 0;
  background: none;
  border: 0;
  cursor: pointer;
}
img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
span {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.text-only span { font-size: 16px; line-height: 22px; }
</style>
