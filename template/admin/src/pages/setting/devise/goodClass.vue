<template>
  <div class="goodClass">
    <el-card class="h100" :bordered="false" shadow="never">
      <!-- <div class="title">页面设置</div> -->
      <div class="list acea-row row-top">
        <div
          class="item"
          :class="activeStyle == index ? 'on' : ''"
          v-for="(item, index) in classList"
          :key="index"
          v-db-click
          @click="selectTap(index)"
        >
          <div class="pictrue"><img :src="item.image" /></div>
          <div class="name">{{ item.name }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { colorChange, getColorChange, themeInfo, themeSave } from '@/api/diy';
import { normalizeCategoryPage } from '../../../../../shared/categoryPageConfig';
export default {
  name: 'goodClass',
  props: {},
  data() {
    return {
      classList: [
        { image: require('@/assets/images/sort01.jpg'), name: '样式1' },
        { image: require('@/assets/images/sort02.jpg'), name: '样式2' },
        { image: require('@/assets/images/sort03.png'), name: '样式3' },
      ],
      activeStyle: '-1',
      themeId: 0,
      categoryConfig: null,
    };
  },
  created() {
    this.getInfo();
  },
  methods: {
    getInfo() {
      Promise.all([themeInfo(0, 'all'), themeInfo(0, 'category')]).then(([theme, category]) => {
        this.themeId = Number(theme.data && theme.data.id) || 0;
        this.categoryConfig = normalizeCategoryPage(category.data);
        this.activeStyle = this.categoryConfig.status - 1;
      }).catch(() => {
        // Keep old installations usable until a theme record exists.
        return getColorChange('category').then((res) => {
          this.activeStyle = res.data.status ? res.data.status - 1 : 0;
        });
      });
    },
    selectTap(index) {
      this.activeStyle = index;
    },
    onSubmit(num) {
      this.$emit('parentFun', true);
      this.activeStyle = num == 1 ? 0 : this.activeStyle;
      const status = num == 1 ? 1 : this.activeStyle + 1;
      const save = this.themeId && this.categoryConfig
        ? themeSave(this.themeId, { type: 'category', value: { ...this.categoryConfig, status }, tid: 0 })
        : colorChange(status, 'category');
      save
        .then((res) => {
          if (this.categoryConfig) this.categoryConfig.status = status;
          this.$emit('parentFun', false);
          this.$message.success(res.msg);
        })
        .catch((err) => {
          this.$message.error(err.msg);
          this.$emit('parentFun', false);
        });
    },
  },
};
</script>
<style lang="scss" scoped>
.goodClass {
  .title {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.85);
    position: relative;
    padding-left: 11px;
    font-weight: bold;
    &:after {
      position: absolute;
      content: ' ';
      width: 2px;
      height: 14px;
      background-color: var(--prev-color-primary);
      left: 0;
      top: 3px;
    }
  }
  .list {
    .item {
      width: 264px;
      margin: 0px 30px 0 0;
      cursor: pointer;
      .pictrue {
        width: 100%;
        height: 496px;
        border: 1px solid #eeeeee;
        border-radius: 10px;
        img {
          width: 100%;
          height: 100%;
          border-radius: 10px;
        }
      }
      .name {
        font-size: 13px;
        color: rgba(0, 0, 0, 0.85);
        margin-top: 16px;
        text-align: center;
      }
      &.on {
        .pictrue {
          border: 2px solid var(--prev-color-primary);
        }
        .name {
          color: var(--prev-color-primary);
        }
      }
    }
  }
}
</style>
