<template>
  <section class="rank-condition-group" :class="{'is-nested':depth>0}" :data-depth="depth">
    <div class="group-heading">
      <b>{{ group.scope==='product' ? '同一在售商品满足' : depth ? '条件组' : '入榜条件' }}</b>
      <el-radio-group v-model="group.mode" size="mini"><el-radio-button label="all">且</el-radio-button><el-radio-button label="any">或</el-radio-button><el-radio-button label="none">均不满足</el-radio-button></el-radio-group>
      <el-button v-if="depth" type="text" class="remove-group" @click="$emit('remove')">删除组</el-button>
    </div>
    <div class="condition-branches">
      <div v-for="(child,index) in group.children" :key="child._key" class="condition-branch">
        <condition-group v-if="child.type==='group'" :group="child" :entity="entity" :fields="fields" :depth="depth+1" :scope="effectiveScope" :root="root" @remove="group.children.splice(index,1)" />
        <div v-else class="tree-condition">
          <div class="tree-condition-heading">
            <el-cascader :value="child.field" :options="fieldOptions" :props="{emitPath:false}" filterable size="small" placeholder="选择条件字段" @change="setField(child,$event)" />
            <el-select v-model="child.op" size="small" @change="setValue(child)"><el-option v-for="op in definition(child).operators" :key="op" :value="op" :label="operatorNames[op]" /></el-select>
            <el-button type="text" class="danger" @click="group.children.splice(index,1)">删除</el-button>
          </div>
          <div class="condition-value">
            <template v-if="definition(child).kind==='pair'"><el-input v-model="child.value.key" size="small" placeholder="名称，如颜色 / 材质" maxlength="100" /><el-input v-if="needsValue(child)" v-model="child.value.value" size="small" placeholder="对应的值，如红色 / 棉" maxlength="100" /></template>
            <template v-else-if="needsValue(child)">
              <reference-selector v-if="definition(child).kind==='reference'" v-model="child.value" :type="definition(child).reference" :label="definition(child).label" />
              <el-select v-else-if="definition(child).kind==='enum'" v-model="child.value" multiple size="small" placeholder="选择值"><el-option v-for="(label,key) in definition(child).options" :key="key" :label="label" :value="String(key)" /></el-select>
              <el-input v-else-if="definition(child).kind==='text'" v-model="child.value" size="small" maxlength="100" placeholder="输入匹配文字" />
              <el-date-picker v-else-if="definition(child).kind==='date'" :value="dateValue(child)" :type="child.op==='between'?'datetimerange':'datetime'" value-format="timestamp" size="small" range-separator="至" placeholder="选择时间" @input="setDate(child,$event)" />
              <template v-else-if="child.op==='between'"><el-input-number v-model="child.value[0]" :min="0" :max="4102444800" size="small" /><span>至</span><el-input-number v-model="child.value[1]" :min="0" :max="4102444800" size="small" /></template>
              <el-input-number v-else v-model="child.value" :min="0" :max="4102444800" size="small" />
            </template>
            <span v-else class="condition-note">无需填写比较值</span>
          </div>
        </div>
      </div>
      <p v-if="!group.children.length" class="condition-note">{{ depth ? '请添加条件，或删除此空组' : '未配置条件时，全部有效对象均可参与排行' }}</p>
      <div class="condition-add"><el-button size="mini" :disabled="full" @click="add(false)">添加条件</el-button><el-button size="mini" :disabled="full||depth>=5" @click="add(true)">添加条件组</el-button><el-button v-if="entity==='shop'&&effectiveScope!=='product'" size="mini" :disabled="full||depth>=5" @click="add(true,'product')">添加关联商品组</el-button></div>
    </div>
  </section>
</template>
<script>
import ReferenceSelector from './ReferenceSelector';
import { conditionKey, conditionNodeCount } from './conditionTree';
export default {
  name:'ConditionGroup', components:{ReferenceSelector}, props:{group:Object,root:Object,fields:Array,entity:String,depth:{type:Number,default:0},scope:{type:String,default:'item'}},
  data(){return {operatorNames:{eq:'等于',neq:'不等于',gt:'大于',gte:'大于等于',lt:'小于',lte:'小于等于',between:'介于（含边界）',contains:'包含',not_contains:'不包含',in:'属于任一',not_in:'不属于',all_in:'包含全部',empty:'为空',not_empty:'不为空'}};},
  computed:{
    effectiveScope(){return this.group.scope==='product'?'product':this.scope;},
    full(){return this.group.children.length>=20||conditionNodeCount(this.root)>=100;},
    available(){return this.fields.filter(f=>!(this.entity==='shop'&&this.effectiveScope!=='product'&&f.key.startsWith('product.'))).filter(f=>this.entity==='shop'?!['price','stock'].includes(f.key):f.key!=='product_count');},
    fieldOptions(){const result=[];this.available.forEach(field=>{let list=result;field.group.forEach(label=>{let branch=list.find(b=>b.label===label);if(!branch){branch={value:'group:'+label,label,children:[]};list.push(branch);}list=branch.children;});list.push({value:field.key,label:field.label});});return result;},
  },
  methods:{
    definition(child){const field=this.fields.find(f=>f.key===child.field)||{kind:'number',operators:['gte']};return {...field,reference:field.reference==='entity'?this.entity:field.reference};},
    needsValue(child){return !['empty','not_empty'].includes(child.op);},
    setField(child,field){child.field=field;child.op=this.definition(child).operators[0];this.setValue(child);},
    setValue(child){const kind=this.definition(child).kind;child.value=kind==='pair'?{key:child.value&&child.value.key||'',value:''}:!this.needsValue(child)?null:['reference','enum'].includes(kind)?[]:kind==='text'?'':child.op==='between'?[0,0]:0;},
    add(group,scope='item'){this.group.children.push(group?{_key:conditionKey(),type:'group',mode:'all',scope,children:[]}:{_key:conditionKey(),type:'condition',field:this.effectiveScope==='product'?'product.sales':'sales',op:'gte',value:1});},
    dateValue(child){return Array.isArray(child.value)?child.value.map(n=>n*1000):child.value?child.value*1000:null;},
    setDate(child,value){child.value=Array.isArray(value)?value.map(n=>Math.floor(n/1000)):value?Math.floor(value/1000):null;},
  },
};
</script>
<style scoped>
.rank-condition-group{margin:16px 0;background:#fff}.rank-condition-group.is-nested{margin:0;padding:12px;border:1px solid #e5e9f0;border-radius:6px;background:#fafbfc}.group-heading{display:flex;align-items:center;gap:12px;font-size:13px}.remove-group{margin-left:auto;color:#e45b5b}.condition-branches{margin:12px 0 0 8px;padding-left:18px;border-left:2px solid #d9e1ed}.condition-branch{position:relative;margin-bottom:12px}.condition-branch:before{content:'';position:absolute;top:18px;left:-20px;width:17px;border-top:1px solid #d9e1ed}.tree-condition{padding:10px;border:1px solid #e9edf3;border-radius:5px;background:#fff}.tree-condition-heading{display:flex;align-items:center;gap:8px}.tree-condition-heading>.el-cascader{flex:1;min-width:100px}.tree-condition-heading>.el-select{width:135px}.condition-value{display:flex;align-items:center;gap:8px;margin-top:8px}.condition-value>.el-input{flex:1}.condition-note{font-size:12px;color:#909399}.condition-add{display:flex;gap:8px;flex-wrap:wrap}.condition-add .el-button{margin:0}.danger{color:#e45b5b}
</style>
