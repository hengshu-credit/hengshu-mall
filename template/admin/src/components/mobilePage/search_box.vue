<template>
  <common_wrapper :config="configObj">
    <div class="search-box" :style="[searchBoxStyle]">
      <div class="search acea-row row-middle" :style="[txtPosition]">
        <action-buttons-preview :buttons="actions.left" :config="actions" />
        <img :src="logoUrl" alt="" v-if="logoUrl && styleConfig == 0 && styleTypeConfig == 1" />
        <div
          class="title"
          :style="[txtStyle]"
          v-if="titleConfig && (styleConfig == 1 || (styleConfig == 0 && styleTypeConfig == 0))"
        >
          {{ titleConfig }}
        </div>
        <div v-if="styleConfig === 0" class="box" :style="[searchStyle]">
          <span
            class="iconfont iconsousuo1"
            :style="{
              color: tipColor,
            }"
          ></span>
          <span
            class="hotWords"
            :style="{
              color: hotWordsColor,
            }"
            v-if="hotWords"
            >{{ hotWords }}</span
          >
          <span
            v-else
            :style="{
              color: tipColor,
            }"
            >{{ tipConfig }}</span
          >
        </div>
        <action-buttons-preview :buttons="actions.right" :config="actions" />
      </div>
    </div>
  </common_wrapper>
</template>

<script>
import { mapState } from 'vuex';
import { searchBoxComponent } from '../../../../shared/searchBoxComponent';
import { headerActions } from '../../../../shared/pageActions';
import ActionButtonsPreview from '@/components/themeActions/ActionButtonsPreview';
// import theme from "@/mixins/theme";
export default {
  name: 'search_box',
  cname: '搜索框',
  icon: '#iconzujian-sousuokuang',
  configName: 'c_search_box',
  type: 0, // 0 基础组件 1 营销组件 2工具组件
  defaultName: 'headerSerch', // 外面匹配名称
  components: { ActionButtonsPreview },
  props: {
    dataConfig: { type: Object, default: null },
    index: {
      type: null,
    },
    num: {
      type: null,
    },
    colorStyle: {
      type: null,
    },
  },
  computed: {
    actions() { return headerActions(this.configObj && this.configObj.headerActions); },
    ...mapState('mobildConfig', ['defaultArray']),
    txtStyle() {
      let num = 0;
      if (this.styleConfig == 0 && this.styleTypeConfig != 1) {
        num = 15;
      }
      return {
        color: `${this.txtColor}`,
        fontStyle: `${this.txtStyleConfig != 'bold' ? this.txtStyleConfig : ''}`,
        fontWeight: `${this.txtStyleConfig == 'bold' ? this.txtStyleConfig : ''}`,
        fontSize: `${this.txtSize}px`,
        marginRight: `${num}px`,
      };
    },
    txtPosition() {
      return {
        justifyContent:
          this.styleConfig != 0 && this.txtFixConfig === 1
            ? 'center'
            : this.styleConfig != 0 && this.txtFixConfig === 2
            ? 'flex-end'
            : 'flex-start',
      };
    },
    searchStyle() {
      return {
        textAlign: this.txtFixConfig == 0 ? 'left' : this.txtFixConfig == 2 ? 'right' : 'center',
        background: this.searchBoxColor,
      };
    },
    searchBoxStyle() {
      if (this.configObj && this.configObj.moduleColor) {
        return {
          background: `linear-gradient(90deg, ${this.configObj.moduleColor.color[0].item} 0%, ${this.configObj.moduleColor.color[1].item} 100%)`,
        };
      }
    },
  },
  watch: {
    dataConfig: { deep: true, immediate: true, handler(value) { if(value) this.setConfig(value); } },
    pageData: {
      handler(nVal, oVal) {
        this.setConfig(nVal);
      },
      deep: true,
    },
    num: {
      handler(nVal, oVal) {
        if (this.dataConfig) return;
        let data = this.$store.state.mobildConfig.defaultArray[nVal];
        this.setConfig(data);
      },
      deep: true,
    },
    defaultArray: {
      handler(nVal, oVal) {
        if (this.dataConfig) return;
        let data = this.$store.state.mobildConfig.defaultArray[this.num];
        this.setConfig(data);
      },
      deep: true,
    },
  },
  // mixins: [theme],
  data() {
    return {
      // 默认初始化数据禁止修改
      defaultConfig: searchBoxComponent({}, this.num),
      pageData: {},
      logoUrl: '',
      styleConfig: 0,
      titleConfig: '',
      searchBoxColor: '',
      tipConfig: '',
      hotWords: '',
      tipColor: '',
      hotWordsColor: '',
      styleTypeConfig: 0,
      fixConfig: 0,
      txtFixConfig: 0,
      txtColor: '',
      txtStyleConfig: '',
      txtSize: 0,
      paddingConfig: null,
      marginConfig: null,
      borderConfig: null,
      shadowConfig: null,
      componentBgConfig: null,
      configObj: null,
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.pageData = this.dataConfig || this.$store.state.mobildConfig.defaultArray[this.num];
      this.setConfig(this.pageData);
    });
  },
  methods: {
    setConfig(data) {
      if (!data) return;
      let dataClone = JSON.parse(JSON.stringify(data));
      for (let key in this.defaultConfig) {
        if (dataClone[key] === undefined) {
          this.$set(dataClone, key, JSON.parse(JSON.stringify(this.defaultConfig[key])));
        }
      }
      this.configObj = dataClone;

      this.paddingConfig = dataClone.paddingConfig;
      this.marginConfig = dataClone.marginConfig;
      this.borderConfig = dataClone.borderConfig;
      this.shadowConfig = dataClone.shadowConfig;
      this.componentBgConfig = dataClone.componentBgConfig;

      this.logoUrl = dataClone.logoConfig.url;
      this.styleConfig = dataClone.styleConfig.tabVal;
      this.styleTypeConfig = dataClone.styleTypeConfig.tabVal;
      this.txtFixConfig = dataClone.txtFixConfig.tabVal;
      this.txtStyleConfig = dataClone.txtStyleConfig.tabList[dataClone.txtStyleConfig.tabVal].style;
      this.txtSize = dataClone.txtSize.val;
      this.txtColor = dataClone.txtColor.color[0].item;
      this.titleConfig = dataClone.titleConfig.value;
      this.searchBoxColor = dataClone.searchBoxColor.color[0].item;
      this.tipConfig = dataClone.tipConfig.value;
      this.hotWords = dataClone.hotWords.list.length ? dataClone.hotWords.list[0].val : '';
      this.tipColor = dataClone.tipColor.color[0].item;
      this.hotWordsColor = dataClone.hotWordsColor.color[0].item;
    },
  },
};
</script>

<style scoped lang="scss">
.mobile-page {
  display: inline-block;
  width: -webkit-fill-available;
}
.search-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  padding: 9px 15px;
  cursor: pointer;
  .search {
    width: 100%;
    &.center {
      justify-content: center;
    }
    &.right {
      justify-content: right;
    }
    .hotWords {
      color: rgba(255, 255, 255, 0.8);
    }
  }
  .title {
    font-size: 15px;
    color: #333;
  }
  .map {
    color: #333;
    font-size: 14px;
    .iconfont {
      font-size: 16px;
    }
    .iconyou {
      font-size: 12px;
      opacity: 0.8;
    }
    .icondingwei {
      margin-right: 3px;
    }
  }
  img {
    width: 76px;
    height: 30px;
    margin-right: 11px;
  }
  .box {
    flex: 1;
    height: 30px;
    line-height: 30px;
    color: #ccc;
    font-size: 14px;
    background: #fff;
    border-radius: 15px;
    padding: 0 16px;

    .iconfont {
      margin-right: 5px;
      margin-top: -3px;
      display: inline-block;
      vertical-align: middle;
    }
  }
}
</style>

<style scoped>.search-box .search{gap:6px}.search-box .box{flex:1;min-width:40px}.serch-wrapper{gap:12rpx}.serch-wrapper .input{flex:1;min-width:80rpx}.serch-wrapper .input .search{width:100%;min-width:0}</style>
