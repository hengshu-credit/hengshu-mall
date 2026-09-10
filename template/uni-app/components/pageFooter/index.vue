<template>
  <!-- 底部导航 -->
  <view v-if="renderNavigation" :class="{ 'managed-navigation': managed, 'configured-navigation': !!newData.mainNavigation }">
    <view class="footer-dock fixed-lb w-full pb-safe z-999" :class="{ 'is-collapsed': isCollapsed }" :style="[bgColor]" :aria-hidden="isCollapsed ? 'true' : 'false'">
      <view class="page-footer-wrapper">
        <view
          class="page-footer"
          :class="{
            'page-footer2': newData.navStyleConfig.tabVal == 1,
            'page-footer3': newData.navStyleConfig.tabVal == 2,
          }"
          id="target"
          :style="[componentStyle]"
        >
          <view
            class="foot-item flex-1 flex-col flex-center h-96 relative"
            v-for="(item, index) in newData.menuList"
            :key="index"
            :aria-current="index === activeIndex ? 'page' : null"
            @click="goRouter(item)"
          >
            <template v-if="index === activeIndex">
              <image mode="aspectFit"
                v-if="newData.navStyleConfig.tabVal != 1"
                :src="iconUrl(item.imgList[0])"
              ></image>
              <view
                v-if="newData.navStyleConfig.tabVal != 2"
                class="txt active"
                :style="[txtActiveColor]"
                >{{ item.name }}</view
              >
            </template>
            <template v-else>
              <image mode="aspectFit"
                v-if="newData.navStyleConfig.tabVal != 1"
                :src="iconUrl(item.imgList[1])"
              ></image>
              <view
                v-if="newData.navStyleConfig.tabVal != 2"
                class="txt"
                :style="[txtColor]"
                >{{ item.name }}</view
              >
            </template>
            <BaseBadge
              v-if="
                item.link === '/pages/order_addcart/order_addcart' &&
                cartNum > 0
              "
              class="uni-badge-left-margin"
              :text="cartNum"
              absolute="rightTop"
            ></BaseBadge>
          </view>
        </view>
      </view>
    </view>
    <view v-if="!managed" :style="{ height: `${footerHeight}px` }"></view>
    <view v-if="!managed && !newData.mainNavigation" class="safe-area-inset-bottom"></view>
  </view>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { getNavigation } from "@/api/public.js";
// import {getCartCounts} from '@/api/order.js';
import { activeNavigationIndex, navigationVisible, navigationPage, navigationPath, navigationScroll } from '../../../shared/mainNavigation';
import { componentStyle as commonComponentStyle } from '../../../shared/componentStyle';
import { HTTP_REQUEST_URL } from "@/config/app.js";
import BaseBadge from "@/components/BaseBadge/index.vue";
export default {
  name: "pageFooter",
  components: { BaseBadge },
  props: {
    mainNavigationOnly: { type: Boolean, default: false },
    managed: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    activePath: { type: String, default: '' },
    isTabBar: {
      type: Boolean,
      default: true,
    },
    configData: {
      type: Object,
      default: () => {},
    },
  },
  computed: {
    isCollapsed() { return this.managed ? this.collapsed : this.scrollCollapsed; },
    activeIndex() { return activeNavigationIndex(this.newData.menuList, this.activeRouter); },
    renderNavigation() {
      // #ifdef H5
      if (!this.managed) return false;
      // #endif
      return this.isTabBar && navigationVisible(this.newData, this.activeRouter, !this.mainNavigationOnly);
    },
    ...mapGetters(["isLogin", "cartNum"]),
    txtActiveColor() {
      let styleObject = {};
      if (this.newData.toneConfig && this.newData.toneConfig.tabVal) {
        styleObject["color"] = this.newData.activeTxtColor.color[0].item;
      }
      return styleObject;
    },
    txtColor() {
      let styleObject = {};
      if (this.newData.toneConfig && this.newData.toneConfig.tabVal) {
        styleObject["color"] = this.newData.txtColor.color[0].item;
      }
      return styleObject;
    },
    bgColor() {
      let styleObject = {};
      if (this.newData.name === 'mainNavigation') return commonComponentStyle(this.newData, 'rpx', this.iconUrl).outer;
      if (!this.newData.name) {
        return styleObject;
      }
      if (!this.newData.navConfig.tabVal) {
        styleObject["background"] = this.newData.bgColor.color[0].item;
      }
      if (this.newData.mainNavigation) {
        if (this.newData.mainNavigation.backgroundMode === 'system' && !this.newData.navConfig.tabVal) styleObject.background = '#FFFFFF';
        styleObject.borderRadius = `${this.newData.mainNavigation.corner}px ${this.newData.mainNavigation.corner}px 0 0`;
      }
      return styleObject;
    },
    componentStyle() {
      if (this.newData.name === 'mainNavigation') return commonComponentStyle(this.newData, 'rpx', this.iconUrl).inner;
      let styleObject = {};
      let borderRadius = ``;
      if (!this.newData.name) {
        return styleObject;
      }
      if (this.newData.navConfig.tabVal) {
        borderRadius = `${this.newData.fillet.val * 2}rpx`;
        if (this.newData.fillet.type) {
          borderRadius = `${this.newData.fillet.valList[0].val * 2}rpx ${this.newData.fillet.valList[1].val * 2}rpx ${this.newData.fillet.valList[3].val * 2}rpx ${
            this.newData.fillet.valList[2].val * 2
          }rpx`;
        }
        styleObject["right"] = `${this.newData.prConfig.val * 2}rpx`;
        styleObject["bottom"] = `${this.newData.mbConfig.val * 2}rpx`;
        styleObject["left"] = `${this.newData.prConfig.val * 2}rpx`;
        styleObject["padding-top"] = `${this.newData.topConfig.val * 2}rpx`;
        styleObject["padding-bottom"] =
          `${this.newData.bottomConfig.val * 2}rpx`;
        styleObject["border-radius"] = borderRadius;
        styleObject["background"] = this.newData.bgColor2.color[0].item;
      } else {
        styleObject["padding-top"] = `${this.newData.topConfig.val * 2}rpx`;
        styleObject["padding-bottom"] =
          `${this.newData.bottomConfig.val * 2}rpx`;
        styleObject["background"] = this.newData.bgColor.color[0].item;
      }
      if (this.newData.mainNavigation) {
        if (this.newData.mainNavigation.backgroundMode === 'system') styleObject.background = '#FFFFFF';
        styleObject['border-radius'] = `${this.newData.mainNavigation.corner}px`;
      }
      if ((this.managed || this.newData.mainNavigation) && this.newData.navConfig.tabVal) {
        styleObject['margin-left'] = styleObject.left;
        styleObject['margin-right'] = styleObject.right;
        styleObject['margin-bottom'] = styleObject.bottom;
        delete styleObject.left;
        delete styleObject.right;
        delete styleObject.bottom;
      }
      return styleObject;
    },
  },
  watch: {
    isCollapsed() { this.$nextTick(this.measureFooter); },
    'newData.scrollMode'() { this.resetScroll(); },
    renderNavigation() { this.$nextTick(this.measureFooter); },
    newData: { deep: true, handler() { this.$nextTick(this.measureFooter); } },
    activePath: { immediate: true, handler(path) { if (path) this.activeRouter = path; this.resetScroll(); } },
    configData: {
      handler(newVal) {
        if (newVal) {
          let configData = newVal;
          this.newData = configData;
          this.showTabBar = !!(configData.effectConfig && Number(configData.effectConfig.tabVal));
        }
      },
      deep: true,
      immediate: true,
    },
  },
  created() {
    let routes = getCurrentPages(); //获取当前打开过的页面路由数组
    let curRoute = routes.length ? routes[routes.length - 1].route : '';
    const current = routes[routes.length - 1];
    this.activeRouter = this.activePath || (current && current.$page && current.$page.fullPath) || '/' + curRoute;
  },
  mounted() {
    // #ifdef H5
    return;
    // #endif
    this.navigationInfo();
    uni.$on('uploadFooter', this.navigationInfo);
    uni.$on('theme-page-scroll', this.onContentScroll);
    uni.$on('theme-page-show', this.handleThemePageShow);
    // if (this.isLogin) {
    // 	this.getCartNum()
    // }
  },
  beforeDestroy() {
    clearTimeout(this._footerMeasureTimer);
    // #ifndef H5
    uni.$off('uploadFooter', this.navigationInfo);
    uni.$off('theme-page-scroll', this.onContentScroll);
    uni.$off('theme-page-show', this.handleThemePageShow);
    // #endif
  },
  data() {
    return {
      newData: {},
      activeRouter: "",
      showTabBar: false,
      footerHeight: 0,
      scrollCollapsed: false,
    };
  },
  methods: {
    handleThemePageShow(event) {
      const pages = getCurrentPages(), current = pages[pages.length - 1];
      const path = event && event.path || (current ? '/' + current.route : '');
      if (navigationPath(path) !== navigationPath(this.activeRouter)) return;
      this.resetScroll();
      this.navigationInfo();
    },
    resetScroll() { this._scrollPosition = {}; this.scrollCollapsed = false; },
    onContentScroll(event) {
      if (!event || !this.renderNavigation || navigationPath(event.path) !== navigationPath(this.activeRouter)) return;
      this._scrollPosition = navigationScroll(this.newData, this._scrollPosition, event.top);
      this.scrollCollapsed = this._scrollPosition.collapsed;
    },
    iconUrl(url) { return url && url.startsWith('/') && !url.startsWith('/static/') ? HTTP_REQUEST_URL + url : url; },
    measureFooter() {
      // #ifndef H5
      if (this._isDestroyed || this.managed) return;
      if (!this.renderNavigation || !this.newData.mainNavigation) {
        clearTimeout(this._footerMeasureTimer);
        this._footerMeasureRetries = 0;
        this.footerHeight = 0; this.$emit('heightChange', 0); return;
      }
      uni.createSelectorQuery().in(this).select('.footer-dock').boundingClientRect(rect => {
        if (this._isDestroyed) return;
        // Native view updates arrive after the service-side nextTick. A transient
        // missing node must not collapse the space reserved above the navigation.
        if (!rect && this.renderNavigation) {
          if (!this._footerMeasureTimer && (this._footerMeasureRetries || 0) < 3) {
            this._footerMeasureRetries = (this._footerMeasureRetries || 0) + 1;
            this._footerMeasureTimer = setTimeout(() => { this._footerMeasureTimer = null; this.measureFooter(); }, 60);
          }
          return;
        }
        clearTimeout(this._footerMeasureTimer);
        this._footerMeasureTimer = null;
        this._footerMeasureRetries = 0;
        this.footerHeight = this.renderNavigation && rect ? rect.height : 0;
        this.$emit('heightChange', this.isCollapsed ? 0 : this.footerHeight);
      }).exec();
      // #endif
    },
    setNavigationInfo(data) {
      if (!this.isTabBar) return;
      if (!data || !data.effectConfig) {
        this.newData = {}; this.showTabBar = false;
        this.$emit('configuration', {}); this.$emit('newDataStatus', 0, 0, 0);
        this.$nextTick(this.measureFooter); return;
      }
      this.newData = data;
      this.$emit('configuration', data);
      this.showTabBar = this.renderNavigation;
      this.$emit('newDataStatus', this.renderNavigation ? 1 : 0, (data.topConfig.val || 0) + (data.bottomConfig.val || 0), data.mbConfig.val);
      if (data.mainNavigation || this.renderNavigation || this.mainNavigationOnly) uni.hideTabBar();
      else uni.showTabBar();
      this.$nextTick(this.measureFooter);
    },
    navigationInfo() {
      if (this.configData && this.configData.mainNavigation && this.configData.mainNavigation.pageScoped) {
        this.setNavigationInfo(this.configData); return Promise.resolve();
      }
      if (this._request) return this._request;
      const key = navigationPage(this.activeRouter) + ':' + (uni.getStorageSync('previewThemeId') || 0);
      this._request = getNavigation({ page: navigationPage(this.activeRouter), theme_id: uni.getStorageSync('previewThemeId') || 0 }).then(res => {
        if (this._isDestroyed) return;
        uni.setStorageSync('footerNavigation:' + key, res.data);
        this.setNavigationInfo(res.data);
      }).catch(() => {
        if (!this._isDestroyed) this.setNavigationInfo(uni.getStorageSync('footerNavigation:' + key));
      }).finally(() => { this._request = null; });
      return this._request;
    },
    goRouter(item) {
      var pages = getCurrentPages();
      var page = this.activeRouter;
      if (item.link == page) return;
      // #ifdef H5
      const tabPages = ['/pages/index/index', '/pages/goods_cate/goods_cate', '/pages/order_addcart/order_addcart', '/pages/user/index'];
      if (tabPages.includes(item.link.split('?')[0])) {
        return getApp().$router.push({ type: 'switchTab', path: item.link });
      }
      return this.$util.JumpPath(item.link);
      // #endif
      if (item.link.split('?')[0] === '/pages/goods_cate/goods_cate') {
        return this.$util.JumpPath(item.link);
      }
      if (
        item.link == "/pages/short_video/appSwiper/index" ||
        item.link == "/pages/short_video/nvueSwiper/index"
      ) {
        //#ifdef APP
        item.link = "/pages/short_video/appSwiper/index";
        //#endif
        //#ifndef APP
        item.link = "/pages/short_video/nvueSwiper/index";
        //#endif
      }
      uni.switchTab({
        url: item.link,
        fail(err) {
          uni.redirectTo({
            url: item.link,
          });
        },
      });
    },
    // getCartNum: function() {
    // 	getCartCounts().then(res => {
    // 		this.$store.commit('indexData/setCartNum', res.data.count + '')
    // 	}).catch(err=>{
    // 		return this.$util.Tips({
    // 			title: err.msg
    // 		});
    // 	})
    // },
  },
};
</script>

<style scoped lang="scss">
.footer-dock { position: fixed; left: 0; right: 0; bottom: 0; transition: transform 180ms ease, opacity 180ms ease; }
.footer-dock.is-collapsed { transform: translate3d(0, 110%, 0); opacity: 0; pointer-events: none; }
.configured-navigation {
  .page-footer-wrapper { display: flow-root; }
  .page-footer { position: relative; }
}
.managed-navigation {
  .footer-dock {
    z-index: 90;
    transition: transform 180ms ease, opacity 180ms ease;
    transform: translate3d(0, 0, 0);
  }
  .footer-dock.is-collapsed {
    transform: translate3d(0, 110%, 0);
    opacity: 0;
    pointer-events: none;
  }
  .page-footer-wrapper { display: flow-root; }
  .page-footer { position: relative; }
}

@media (prefers-reduced-motion: reduce) {
  .managed-navigation .footer-dock { transition: none; }
}
.safe-area-inset-bottom {
  height: 0;
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}

.page-footer-wrapper {
  position: relative;
}

.page-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;

  .foot-item { min-width: 0; }

  .foot-item image {
    display: block;
    height: 48rpx;
    width: 48rpx;
    margin: 0 auto;
  }

  .foot-item .txt {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 4rpx;
    font-size: 20rpx;
    line-height: 28rpx;
    color: #333333;

    &.active {
      color: var(--view-theme);
    }
  }
}
.page-footer ::v-deep.uni-badge--x {
  position: absolute !important;
  top: 0rpx;
}
.page-footer .uni-badge-left-margin {
  position: absolute;
  /* #ifdef MP */
  margin-left: 40rpx;
  top: -10rpx;
  /* #endif */
}
.page-footer ::v-deep .uni-badge-left-margin .uni-badge--error {
  color: #fff !important;
  background-color: var(--view-theme) !important;
  z-index: 8;
}
.page-footer ::v-deep .uni-badge {
  right: unset !important;
  top: unset !important;
}
.page-footer2 .foot-item .txt {
  margin-top: 0;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #333333;

  &.active {
    color: var(--view-theme);
  }
}

.page-footer2.float .foot-item::before,
.page-footer3.float .foot-item::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 2rpx;
  height: 32rpx;
  background: #cccccc;
  transform: translateY(-50%);
}

.page-footer2.float .foot-item:first-child::before,
.page-footer3.float .foot-item:first-child::before {
  display: none;
}
</style>
