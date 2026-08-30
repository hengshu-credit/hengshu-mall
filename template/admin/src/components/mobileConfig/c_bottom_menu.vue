<template>
  <div class="mobile-config">
    <div v-for="(item, key) in rCom" :key="key">
      <component
        :is="item.components.name"
        :configObj="configObj"
        ref="childData"
        :configNme="item.configNme"
        :key="key"
        :index="activeIndex"
        :number="num"
        :num="item.num"
      ></component>
    </div>
    <rightBtn :activeIndex="activeIndex" :configObj="configObj"></rightBtn>
  </div>
</template>

<script>
import toolCom from '@/components/mobileConfigRight/index.js';
import { mapState, mapMutations, mapActions } from 'vuex';
import rightBtn from '@/components/rightBtn/index.vue';
export default {
  name: 'c_bottom_menu',
  componentsName: 'home_bottom_menu',
  cname: '底部菜单',
  props: {
    activeIndex: {
      type: null,
    },
    num: {
      type: null,
    },
    index: {
      type: null,
    },
  },
  components: {
    ...toolCom,
    rightBtn,
  },
  data() {
    return {
      configObj: {},
      rCom: [],
      setUp: 0,
    };
  },
  watch: {
    num(nVal) {
      let value = JSON.parse(
        JSON.stringify(this.$store.state.mobildConfig[nVal ? 'defaultArray' : 'bottomMenu'][nVal || '']),
      );
      if (!nVal) {
        value = JSON.parse(JSON.stringify(this.$store.state.mobildConfig.bottomMenu));
      }
      this.configObj = value;
      this.setUp = value.setUp.tabVal;
      this.updateRCom();
    },
    configObj: {
      handler(nVal, oVal) {
        if (this.num) {
          this.$store.commit('mobildConfig/UPDATEARR', { num: this.num, val: nVal });
        } else {
          this.$store.commit('mobildConfig/UPBOTTOMMENU', nVal);
        }
      },
      deep: true,
    },
    'configObj.setUp.tabVal': {
      handler(nVal, oVal) {
        this.setUp = nVal;
        this.updateRCom();
      },
      deep: true,
    },
    'configObj.entryConfig.tabVal': {
      handler(nVal, oVal) {
        this.updateRCom();
      },
      deep: true,
    },
    'configObj.menuConfig.listStyle': {
      handler(nVal, oVal) {
        this.updateRCom();
      },
      deep: true,
    },
    'configObj.toneConfig.tabVal': {
      handler(nVal, oVal) {
        this.updateRCom();
      },
      deep: true,
    },
  },
  mounted() {
    this.$nextTick(() => {
      let value;
      if (this.num) {
        value = JSON.parse(JSON.stringify(this.$store.state.mobildConfig.defaultArray[this.num]));
      } else {
        value = JSON.parse(JSON.stringify(this.$store.state.mobildConfig.bottomMenu));
      }
      this.configObj = this.patchConfig(value);
      this.setUp = value.setUp.tabVal;
      this.updateRCom();
    });
  },
  methods: {
    patchConfig(config) {
      if (!config.paddingConfig) {
        config.paddingConfig = {
          isAll: false,
          title: '内边距',
          val: 0,
          min: 0,
          max: 100,
          valList: [
            { val: config.topConfig ? config.topConfig.val : 0 },
            { val: config.prConfig ? config.prConfig.val : 0 },
            { val: config.bottomConfig ? config.bottomConfig.val : 0 },
            { val: config.prConfig ? config.prConfig.val : 0 },
          ],
        };
      }
      if (!config.marginConfig) {
        config.marginConfig = {
          isAll: false,
          title: '外边距',
          val: 0,
          min: 0,
          max: 100,
          valList: [{ val: 0 }, { val: 0 }, { val: config.mbConfig ? config.mbConfig.val : 0 }, { val: 0 }],
        };
      }
      if (!config.c_common_style && config.moduleColor) {
        config.c_common_style = {
          color: config.moduleColor.color,
          color2: config.bottomBgColor.color,
          lr: config.fillet.type ? config.fillet.val : 0,
          type: config.fillet.type,
        };
      }
      return config;
    },
    updateRCom() {
      if (!this.configObj.setUp) return;

      let arr = [
        {
          components: toolCom.c_set_up,
          configNme: 'setUp',
        },
      ];

      if (this.setUp == 0) {
        // Content Config
        let contentArr = [
          {
            components: toolCom.c_title,
            configNme: 'contentConfigTitle',
          },
          {
            components: toolCom.c_radio,
            configNme: 'entryConfig',
          },
        ];

        if (this.configObj.entryConfig && this.configObj.entryConfig.tabVal == 1) {
          contentArr.push(
            {
              components: toolCom.c_menu_list,
              configNme: 'menuConfig',
            },
            {
              components: toolCom.c_radio,
              configNme: 'cartButton',
            },
          );
        } else {
          // Default Mode
          contentArr = contentArr.concat([
            {
              components: toolCom.c_checkbox,
              configNme: 'showContent',
            },
            {
              components: toolCom.c_radio,
              configNme: 'cartButton',
            },
          ]);
        }
        this.rCom = arr.concat(contentArr);
      } else {
        // Style Config
        let styleArr = [];
        if (this.configObj.entryConfig && this.configObj.entryConfig.tabVal == 1) {
          if (this.configObj.menuConfig && this.configObj.menuConfig.listStyle == 0) {
            styleArr.push({
              components: toolCom.c_title,
              configNme: 'styleTitle',
            });
            styleArr.push({
              components: toolCom.c_fillet,
              configNme: 'menuPcFillet',
            });
          } else {
            styleArr.push({
              components: toolCom.c_title,
              configNme: 'styleTitle',
            });
            styleArr.push({
              components: toolCom.c_bg_color,
              configNme: 'iconColor',
            });
            styleArr.push({
              components: toolCom.c_slider,
              configNme: 'iconSize',
            });
            styleArr.push({
              components: toolCom.c_slider,
              configNme: 'iconRotate',
            });
          }
        }

        styleArr = styleArr.concat([
          {
            components: toolCom.c_title,
            configNme: 'buttonStyleTitle',
          },
          {
            components: toolCom.c_radio,
            configNme: 'toneConfig',
          },
        ]);

        if (this.configObj.toneConfig.tabVal == 1) {
          styleArr.push({
            components: toolCom.c_bg_color,
            configNme: 'cartColor',
          });
          styleArr.push({
            components: toolCom.c_bg_color,
            configNme: 'buyColor',
          });
        }

        styleArr = styleArr.concat([
          {
            components: toolCom.c_title,
            configNme: 'generalStyleTitle',
          },
          {
            components: toolCom.c_common_style,
            configNme: 'c_common_style',
          },
        ]);

        this.rCom = arr.concat(styleArr);
      }
    },
    getConfig(data, name) {
      // No external API calls needed for this component usually
    },
  },
};
</script>
