<template><div class="ranking-link-list">
  <el-input v-model="keyword" placeholder="搜索榜单名称" clearable size="small" @change="search"><el-button slot="append" icon="el-icon-search" @click="search" /></el-input>
  <p v-if="error" class="error">{{error}} <el-button type="text" @click="load">重试</el-button></p>
  <el-table :data="rows" v-loading="loading" empty-text="暂无对应榜单，请先在营销中创建" @row-click="choose" highlight-current-row max-height="420">
    <el-table-column width="50"><template slot-scope="{row}"><el-radio :disabled="!link(row)" :value="selectedUrl" :label="link(row)" @change="choose(row)">&nbsp;</el-radio></template></el-table-column>
    <el-table-column prop="name" label="榜单名称" /><el-table-column width="110" label="状态"><template slot-scope="{row}">{{statusNames[row.status]||'未启用'}}</template></el-table-column>
    <el-table-column label="对应装修页" width="110"><template slot-scope="{row}">#{{row.page_id}}</template></el-table-column>
  </el-table>
  <el-pagination :current-page="page" :page-size="20" :total="total" layout="prev, pager, next" @current-change="page=$event;load()" />
</div></template>
<script>
import {rankingList} from '@/api/ranking';
export default {props:{entity:String,selectedUrl:String},data:()=>({keyword:'',page:1,total:0,rows:[],loading:false,error:'',sequence:0,statusNames:{running:'进行中',disabled:'未启用',upcoming:'未开始',ended:'已结束'}}),watch:{entity:{immediate:true,handler(){this.page=1;this.rows=[];this.load();}}},beforeDestroy(){this.sequence++;},methods:{link(row){return Number(row.page_id)>0?'/pages/annex/special/index?theme_id='+row.page_id:'';},choose(row){const url=this.link(row);if(url)this.$emit('pick',{id:'ranking-'+row.id,name:row.name,url});},search(){this.page=1;this.load();},async load(){const seq=++this.sequence;this.loading=true;this.error='';try{const r=await rankingList({entity_type:this.entity,keyword:this.keyword,page:this.page,limit:20});if(seq===this.sequence){this.rows=r.data.list;this.total=r.data.count;}}catch(e){if(seq===this.sequence)this.error=e.msg||'榜单读取失败';}finally{if(seq===this.sequence)this.loading=false;}}}};
</script>
<style scoped>.ranking-link-list .el-input{margin-bottom:15px}.error{color:#d55}.el-pagination{margin-top:15px;text-align:right}</style>
