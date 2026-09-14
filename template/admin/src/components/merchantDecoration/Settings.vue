<template>
  <div v-if="config" :style="decorationThemeVariables">
    <c-set-up :configObj="config" configNme="setUp" />
    <el-form v-if="config.setUp.tabVal === 0" label-position="top" size="small" class="merchant-settings">
      <el-form-item v-if="config.name === 'shopHeader'" label="店铺首页 / 分类导航"
        ><el-switch v-model="config.showNavigation"
      /></el-form-item>
      <template v-if="config.name === 'shopHeader'"
        ><el-form-item label="页头样式"
          ><el-radio-group v-model="config.headerLayout"
            ><el-radio-button :label="0">左右布局</el-radio-button><el-radio-button :label="1">居中布局</el-radio-button
            ><el-radio-button :label="2">反向布局</el-radio-button></el-radio-group
          ></el-form-item
        ><el-form-item label="店内搜索"><el-switch v-model="config.showSearch" /></el-form-item
        ><el-form-item v-if="config.showSearch" label="搜索提示"
          ><el-input v-model="config.searchPlaceholder" maxlength="30" /></el-form-item
        ><el-form-item label="关注按钮"><el-switch v-model="config.showFollow" /></el-form-item
      ></template>
      <template v-if="config.name === 'shopFollow' || config.name === 'shopHeader' && config.showFollow"
        ><el-form-item label="关注人数"><el-switch v-model="config.showFollowers" /></el-form-item
        ><el-form-item label="关注前文字"><el-input v-model="config.followText" maxlength="12" /></el-form-item
        ><el-form-item label="关注后文字"><el-input v-model="config.followedText" maxlength="12" /></el-form-item>
        <p class="help">关注保存到会员账号，可在个人中心的“已关注店铺”查看。</p></template
      >
      <template v-if="!['productRank', 'shopInfo', 'recommendGroup', 'shopHeader'].includes(config.name)"
        ><el-form-item label="标题"><el-input v-model="config.title" maxlength="30" /></el-form-item
        ><el-form-item label="显示标题"><el-switch v-model="config.showTitle" /></el-form-item
      ></template>
      <template v-if="!['productRank', 'recommendGroup', 'shopHeader', 'shopFollow'].includes(config.name)"
        ><el-form-item label="显示更多 / 进店"><el-switch v-model="config.showMore" /></el-form-item
        ><el-form-item label="更多文字" v-if="config.name !== 'shopInfo' && config.showMore"
          ><el-input v-model="config.moreText" maxlength="12" /></el-form-item
      ></template>
      <template v-if="config.name === 'shopStreet'">
        <el-form-item label="店铺来源"
          ><el-radio-group v-model="manualShops"
            ><el-radio :label="false">自动选取</el-radio><el-radio :label="true">指定店铺</el-radio></el-radio-group
          ></el-form-item
        >
        <template v-if="manualShops"
          ><el-form-item label="添加店铺"
            ><merchant-select :value="selectedShop" clearable @input="addShop"
          /></el-form-item>
          <div v-for="(id, index) in config.shopIds" :key="id" class="selected-shop">
            <merchant-select :value="id" disabled /><el-button
              icon="el-icon-top"
              :disabled="index === 0"
              @click="moveShop(index)"
            /><el-button icon="el-icon-delete" @click="config.shopIds.splice(index, 1)" /></div
        ></template>
      </template>
      <el-form-item
        v-if="['productRanking', 'recommendGroup', 'shopProducts'].includes(config.name) && !isShopPage"
        label="所属店铺（留空为全部）"
        ><merchant-select v-model="config.shopId" clearable :emptyValue="0"
      /></el-form-item>
      <p class="help" v-if="isShopPage">自动使用当前访问店铺的商品，切换店铺无需单独装修。</p>
      <el-form-item
        v-if="['productRanking', 'shopProducts', 'productRank'].includes(config.name)"
        label="商品分类（留空为全部）"
        ><el-cascader
          v-model="config.categoryId"
          :options="categories"
          :props="{ emitPath: false, checkStrictly: true, value: 'id', label: 'label' }"
          clearable
          @change="config.categoryId = config.categoryId || 0"
      /></el-form-item>
      <el-form-item v-if="config.name === 'productRanking'" label="榜单类型"
        ><el-checkbox-group v-model="config.rankTypes" :min="1"
          ><el-checkbox label="sales">销量榜</el-checkbox
          ><el-checkbox label="rating">好评榜</el-checkbox></el-checkbox-group
        ></el-form-item
      >
      <template v-if="config.name === 'productRank'"
        ><el-form-item label="榜单类型"
          ><el-radio-group v-model="config.rankType"
            ><el-radio label="sales">销量榜</el-radio><el-radio label="rating">好评榜</el-radio></el-radio-group
          ></el-form-item
        ><el-form-item label="榜单范围"
          ><el-select v-model="config.rankScope"
            ><el-option label="商品所属分类" value="category" /><el-option
              label="商品所属店铺"
              value="shop" /><el-option label="全商城" value="all" /></el-select></el-form-item
      ></template>
      <el-form-item v-if="['productRank', 'productRanking'].includes(config.name)" label="榜单入选数量"
        ><el-input-number v-model="config.topN" :min="1" :max="100"
      /></el-form-item>
      <p v-if="['productRank', 'productRanking'].includes(config.name)" class="help">
        销量按实际销量排序；好评按已展示评价的好评率、评价数排序。未入榜商品不展示上榜条。
      </p>
      <template v-if="config.name === 'recommendGroup'">
        <div v-for="(group, index) in config.groups" :key="index" class="group-card">
          <div class="group-heading">
            <b>推荐项 {{ index + 1 }}</b
            ><el-button type="text" :disabled="index === 0" @click="moveGroup(index)">上移</el-button
            ><el-button type="text" :disabled="config.groups.length === 1" @click="config.groups.splice(index, 1)"
              >删除</el-button
            >
          </div>
          <el-form-item label="标题 / 副标题"
            ><el-input v-model="group.title" maxlength="12" /><el-input v-model="group.subtitle" maxlength="20"
          /></el-form-item>
          <el-form-item label="推荐商品"
            ><el-select v-model="group.type"
              ><el-option
                v-for="item in recommendationTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value" /></el-select
          ></el-form-item>
          <el-form-item label="商品分类"
            ><el-cascader
              v-model="group.categoryId"
              :options="categories"
              :props="{ emitPath: false, checkStrictly: true, value: 'id', label: 'label' }"
              clearable
              @change="group.categoryId = group.categoryId || 0"
          /></el-form-item>
          <c-upload-img :configObj="group" configNme="image" />
          <el-form-item label="点击跳转"><el-select :value="linkType(group)" @change="changeLinkType(group,$event)"><el-option value="auto" label="对应推荐商品" /><el-option value="page" label="商城页面" /><el-option value="url" label="URL网址" /></el-select></el-form-item>
          <el-form-item v-if="linkType(group)==='page'" label="目标页面"><el-input :value="group.link" readonly placeholder="请选择页面" @click.native="chooseLink(group)"><el-button slot="append" @click="chooseLink(group)">选择页面</el-button></el-input></el-form-item>
          <el-form-item v-if="linkType(group)==='url'" label="目标网址"><el-input v-model.trim="group.link" maxlength="1000" placeholder="https://example.com/page" /></el-form-item>
        </div>
        <el-button :disabled="config.groups.length >= 8" @click="addGroup">添加推荐项</el-button>
      </template>
      <template v-if="['shopStreet', 'shopInfo', 'shopHeader'].includes(config.name)"
        ><el-form-item label="店铺展示信息"
          ><div>Logo <el-switch v-model="config.showLogo" /></div>
          <div>店铺简介 <el-switch v-model="config.showDescription" /></div>
          <div v-if="config.name === 'shopInfo'">店铺评分 <el-switch v-model="config.showScores" /></div></el-form-item
        ><el-form-item v-if="config.name !== 'shopHeader' && (config.name !== 'shopInfo' || config.showMore)" label="进店按钮文字"><el-input v-model="config.buttonText" maxlength="12" /></el-form-item
      ></template>
      <template v-if="config.name === 'shopInfo'"
        ><el-form-item label="展示店铺推荐商品"><el-switch v-model="config.showProducts" /></el-form-item
        ><el-form-item v-if="config.showProducts" label="推荐标题"
          ><el-input v-model="config.productTitle" maxlength="30" /></el-form-item
      ></template>
      <template v-if="config.name === 'shopProducts'"
        ><el-form-item label="商品搜索"><el-switch v-model="config.showSearch" /></el-form-item
        ><el-form-item label="排序切换"><el-switch v-model="config.showSort" /></el-form-item
      ></template>
      <el-form-item v-if="config.name === 'shopProducts' || config.name === 'shopInfo' && config.showProducts" label="商品排序"
        ><el-select v-model="config.sort"
          ><el-option label="综合" value="default" /><el-option label="销量" value="sales" /><el-option
            label="新品"
            value="new" /><el-option label="价格从低到高" value="price_asc" /><el-option
            label="价格从高到低"
            value="price_desc" /></el-select
      ></el-form-item>
      <el-form-item
        v-if="!['productRank', 'recommendGroup', 'shopHeader', 'shopFollow'].includes(config.name) && (config.name !== 'shopInfo' || config.showProducts)"
        label="展示数量"
        ><el-input-number
          v-model="config.limit"
          :min="1"
          :max="config.name === 'productRanking' ? Math.min(10, config.topN) : 50"
      /></el-form-item>
      <el-form-item v-if="['shopProducts', 'recommendGroup'].includes(config.name) || config.name === 'shopInfo' && config.showProducts" label="每行列数"
        ><el-radio-group v-model="config.columns"
          ><el-radio-button v-for="n in [1, 2, 3, 4]" :key="n" :label="n">{{ n }}列</el-radio-button></el-radio-group
        ></el-form-item
      >
      <el-form-item
        v-if="['shopProducts', 'productRanking'].includes(config.name) || config.name === 'shopInfo' && config.showProducts"
        label="商品展示商户店铺名称"
        ><el-switch v-model="config.showMerchantName"
      /></el-form-item>
    </el-form>
    <template v-else><ranking-fields v-if="config.name==='recommendGroup'" class="merchant-settings" :value="config" :fields="recommendColors" /><c-common-style allow-theme :configObj="config" /></template>
    <linkaddress ref="links" @linkUrl="selectedLink" />
  </div>
</template>
<script>
import {decorationThemeMixin} from '../../../../shared/themeColors';
import cSetUp from '@/components/mobileConfigRight/c_set_up';
import cCommonStyle from '@/components/mobileConfigRight/c_common_style';
import cUploadImg from '@/components/mobileConfigRight/c_upload_img';
import MerchantSelect from '@/components/merchantSelect';
import { getCategory } from '@/api/diy';
import { recommendationTypes, merchantComponent } from '../../../../shared/merchantDecoration';
import RankingFields from '@/components/themeActions/RankingFields';
import linkaddress from '@/components/linkaddress';
import {recommendationLinkType} from '../../../../shared/recommendationLinks';
import {actionLink} from '../../../../shared/pageActions';
export default {mixins:[decorationThemeMixin],
  props: { config: Object },
  components: { cSetUp, cCommonStyle, cUploadImg, MerchantSelect,linkaddress,RankingFields },
  data: () => ({ categories: [], recommendationTypes, selectedShop: 0, manualShops: false,selectedGroup:null,recommendColors:[{key:'recommendTitleColor',label:'推荐标题颜色',type:'color'},{key:'recommendSubtitleColor',label:'推荐副标题颜色',type:'color'}] }),
  computed: {
    isShopPage() {
      return this.$route.query.type === 'shop' || this.$route.query.page_type === 'merchant';
    },
  },
  watch: {
    manualShops(value) {
      if (!value) this.config.shopIds = [];
    },
    config: {
      handler(value) {
        this.manualShops = !!(value.shopIds || []).length;
      },
      immediate: true,
    },
  },
  created() {
    if(this.config.name==='recommendGroup'){if(this.config.recommendTitleColor===undefined)this.$set(this.config,'recommendTitleColor','#333333');if(this.config.recommendSubtitleColor===undefined)this.$set(this.config,'recommendSubtitleColor','var(--view-theme)');}
    getCategory()
      .then((res) => {
        this.categories = res.data || [];
      })
      .catch(() => {});
  },
  methods: {
    linkType:recommendationLinkType,
    changeLinkType(group,type){this.$set(group,'linkType',type);group.link='';},
    chooseLink(group){this.selectedGroup=group;this.$refs.links.modals=true;},
    selectedLink(link){if(!this.selectedGroup||!this.config.groups.includes(this.selectedGroup))return;const type=actionLink({type:'url',link})?'url':'page';if(!actionLink({type:type==='url'?'url':'link',link}))return this.$message.warning('请选择商城页面或 HTTP(S) 网址');this.$set(this.selectedGroup,'linkType',type);this.selectedGroup.link=link;},
    addShop(id) {
      if (id && !this.config.shopIds.includes(id) && this.config.shopIds.length < 50) this.config.shopIds.push(id);
      this.selectedShop = 0;
    },
    moveShop(index) {
      const item = this.config.shopIds.splice(index, 1)[0];
      this.config.shopIds.splice(index - 1, 0, item);
    },
    moveGroup(index) {
      const item = this.config.groups.splice(index, 1)[0];
      this.config.groups.splice(index - 1, 0, item);
    },
    addGroup() {
      this.config.groups.push(merchantComponent('recommendGroup').groups[0]);
    },
  },
};
</script>
<style scoped>
.merchant-settings {
  padding: 16px;
}
.merchant-settings .el-input,
.merchant-settings .el-cascader,
.merchant-settings .el-select {
  width: 100%;
}
.help {
  font-size: 12px;
  line-height: 1.7;
  color: #909399;
}
.group-card {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 14px;
}
.group-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.group-heading b {
  margin-right: auto;
}
.group-card .el-input + .el-input {
  margin-top: 8px;
}
.selected-shop {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.selected-shop .merchant-select {
  flex: 1;
  min-width: 0;
}
</style>
