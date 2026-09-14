<template>
  <el-card shadow="never" class="quality-review">
    <div slot="header">商品经营核对 <el-tag size="small" :type="value && value.status==='approved'?'success':'warning'">{{ statusText }}</el-tag></div>
    <p>上架前请核对本店实际经营信息。采集图片中的补贴、优惠和服务承诺不能自动作为本店承诺。</p>
    <p v-if="value && value.reviewer_id">最近审核：管理员 {{ value.reviewer_id }}，{{ new Date(value.reviewed_at * 1000).toLocaleString() }}</p>
    <el-form-item v-for="field in fields" :key="field.key" :label="field.label">
      <el-input v-model="profile[field.key]" :maxlength="500" @input="change" />
    </el-form-item>
    <el-form-item label="逐项核对">
      <el-checkbox-group v-model="checks" @change="change">
        <el-checkbox v-for="item in checklist" :key="item.key" :label="item.key">{{ item.label }}</el-checkbox>
      </el-checkbox-group>
    </el-form-item>
    <el-form-item label="确认审核"><el-checkbox v-model="confirm" @change="change">以上内容符合本店实际情况，保存时记录本次审核</el-checkbox></el-form-item>
    <p>价格、规格、图片或物流信息变化后需要重新核对。保存草稿无需完成审核；库存正常扣减不会使已有审核失效。</p>
  </el-card>
</template>
<script>
const fields = [
  {key:'source_note',label:'来源说明'}, {key:'shipping_origin',label:'发货地（实体商品）'},
  {key:'sales_subject',label:'销售主体'}, {key:'after_sales_subject',label:'售后主体'},
  {key:'service_note',label:'服务承诺'}, {key:'promotion_note',label:'促销素材核对说明'},
];
const checklist = [
  {key:'price',label:'售价'}, {key:'crossed_price',label:'划线价依据'}, {key:'media',label:'图片和促销条件'},
  {key:'sku',label:'规格'}, {key:'stock',label:'可售库存'}, {key:'shipping',label:'运费和发货地'},
  {key:'responsibility',label:'销售及售后主体'}, {key:'service',label:'服务承诺'},
];
export default {
  props: { value: {type:Object, default:()=>({})} },
  data: () => ({ fields, checklist, profile:{}, checks:[], confirm:false }),
  computed: { statusText() { return {approved:'已审核',stale:'信息已变化',pending:'待核对'}[(this.value||{}).status] || '待核对'; } },
  watch: {value:{immediate:true,handler(value){const input=(value&&value.profile)||value||{};this.profile=Object.fromEntries(fields.map(field=>[field.key,input[field.key]||'']));this.checks=(value&&value.checks)||[];this.confirm=!!(value&&value.confirm);}}},
  methods: { change(){this.$emit('input',{...this.profile,checks:[...this.checks],confirm:this.confirm});} },
};
</script>
<style scoped>
.quality-review { margin: 20px 0; }
.quality-review p { color: #606266; line-height: 1.6; margin-bottom: 12px; }
</style>
