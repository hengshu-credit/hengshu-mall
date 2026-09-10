<template>
  <div v-if="configObj" class="navigation-settings">
    <c-set-up :configObj="configObj" configNme="setUp" />
    <template v-if="configObj.setUp.tabVal === 0">
      <div class="navigation-label">导航名称 <el-input v-model="configObj.mainNavigation.title" maxlength="15" /></div>
      <c-radio :configObj="configObj" configNme="navStyleConfig" />
      <div class="navigation-mode">显示方式 <el-radio-group v-model="configObj.scrollMode" size="small">
        <el-radio-button label="always">固定一直展示</el-radio-button><el-radio-button label="smart">智能隐藏</el-radio-button>
      </el-radio-group></div>
      <p class="navigation-note">导航固定在页面底部。智能隐藏时，下滑隐藏、上滑显示，回到顶部自动显示。</p>
      <c-foot :configObj="configObj" configNme="menuList" />
      <p class="navigation-note">当前页面独立使用此导航，最多5项。图标使用素材原文件，点击画布工具可隐藏或删除组件。</p>
    </template>
    <template v-else>
      <c-radio :configObj="configObj" configNme="toneConfig" />
      <template v-if="configObj.toneConfig.tabVal === 1"
        ><c-bg-color :configObj="configObj" configNme="txtColor" /><c-bg-color
          :configObj="configObj"
          configNme="activeTxtColor"
      /></template>
      <c-common-style :configObj="configObj" />
    </template>
  </div>
</template>
<script>
import cSetUp from '@/components/mobileConfigRight/c_set_up';
import cRadio from '@/components/mobileConfigRight/c_radio';
import cFoot from '@/components/mobileConfigRight/c_foot';
import cBgColor from '@/components/mobileConfigRight/c_bg_color';
import cCommonStyle from '@/components/mobileConfigRight/c_common_style';
export default {
  name: 'NavigationSettings',
  components: { cSetUp, cRadio, cFoot, cBgColor, cCommonStyle },
  props: { configObj: Object },
};
</script>
<style scoped>
.navigation-label, .navigation-mode {
  padding: 20px 15px;
  font-size: 12px;
  display: flex;
  gap: 20px;
  align-items: center;
  white-space: nowrap;
}
.navigation-note {
  padding: 0 15px 20px;
  color: #999;
  font-size: 12px;
  line-height: 1.8;
}
</style>
