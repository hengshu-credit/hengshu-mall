<template>
  <div class="list">
    <vuedraggable
      class="flex"
      group="label"
      :disabled="labelList.length < 2"
      :list="labelList"
      handle=".label"
      @end="onMoveSpec"
      animation="300"
    >
      <div
        class="label"
        v-for="(label, j) in labelList"
        :key="j"
        v-dragging="{
          list: activeId,
        }"
      >
        <div
          class="label-item"
          :style="{
            backgroundColor: label.bg_color,
            color: label.font_color,
            border: label.border_color ? '1px solid ' + label.border_color : 'none',
          }"
          v-if="!label.image"
        >
          {{ label.name }}
        </div>
        <img :src="label.image" class="img-tag" v-else />
        <i class="el-icon-error" @click="close(label)"></i>
      </div>
    </vuedraggable>
  </div>
</template>

<script>
import { productLabelUseListApi } from '@/api/product';
import vuedraggable from 'vuedraggable';

export default {
  name: 'userLabel',
  components: { vuedraggable },
  props: {
    activeId: {
      type: Array,
      default: () => {
        [];
      },
    },
    listData: {
      type: Array,
      default: () => {
        [];
      },
    },
  },
  data() {
    return {
      labelList: [],
    };
  },
  watch: {
    activeId: {
      handler(nVal, oVal) {
        if (nVal != oVal) {
          if (nVal.length) {
            this.labelList = [];
            // 根据nVal 去listData 中查找 不改变查找出来的顺序
            nVal.forEach((item) => {
              this.listData.forEach((item2) => {
                if (item == item2.id) {
                  this.labelList.push(item2);
                }
              });
            });
          }
        }
      },
      deep: true,
      immediate: true,
    },
  },
  mounted() {},
  methods: {
    async onMoveSpec(event) {
      const { newIndex, oldIndex } = event;
      const label = this.activeId[oldIndex];
      const newLabelList = [...this.activeId];
      newLabelList.splice(oldIndex, 1);
      newLabelList.splice(newIndex, 0, label);
      this.$emit('update:activeId', newLabelList);
    },
    close(label) {
      let index = this.labelList.indexOf(label);
      this.labelList.splice(index, 1);
      let activeIndex = this.activeId.findIndex((item) => item == label.id);
      this.activeId.splice(activeIndex, 1);
      this.$emit('activeData', JSON.parse(JSON.stringify(this.labelList)));
      const newLabelList = [...this.activeId];
      this.$emit('update:activeId', newLabelList);
    },
  },
};
</script>

<style lang="scss" scoped>
.list {
  display: flex;
  flex-wrap: wrap;
  .label {
    padding: 2px;
    border-radius: 4px;
    margin: 0 8px 0px 0;
    cursor: move;
    display: flex;
    align-items: center;
    position: relative;
  }
  .label-item {
    height: 22px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0px 8px;

    background: #eeeeee;
    color: #333333;
    border-radius: 2px;
    cursor: pointer;
    font-size: 12px;
  }
  .el-icon-error {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 14px;
    color: #333333;
    cursor: pointer;
  }

  .img-tag {
    height: 22px;
    border-radius: 2px;
  }
}
</style>
