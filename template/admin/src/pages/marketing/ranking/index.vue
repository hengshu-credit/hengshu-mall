<template>
  <div class="ranking-page">
    <div class="ranking-hero"><div><h2>排行榜配置</h2><p>配置入榜条件、排序指标和权重。页面样式请到装修中的排行榜组件设置。</p></div><el-button v-auth="['marketing-ranking-save']" type="primary" icon="el-icon-plus" @click="create">创建排行榜</el-button></div>
    <el-card shadow="never">
      <el-form inline size="small" @submit.native.prevent="search"><el-form-item><el-input v-model="filters.keyword" placeholder="搜索榜单名称" clearable @clear="search" /></el-form-item><el-form-item><el-select v-model="filters.entity_type" clearable placeholder="全部排行对象" @change="search"><el-option label="商品榜" value="product" /><el-option label="店铺榜" value="shop" /></el-select></el-form-item><el-form-item><el-select v-model="filters.enabled" clearable placeholder="全部启用状态" @change="search"><el-option label="已启用" :value="1" /><el-option label="已停用" :value="0" /></el-select></el-form-item><el-form-item><el-button type="primary" native-type="submit">查询</el-button></el-form-item></el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <el-table v-loading="loading" :data="list" row-key="id" empty-text="还没有排行榜，创建你的第一个精选榜单">
        <el-table-column label="排行榜" min-width="230"><template slot-scope="{ row }"><strong>{{ row.name }}</strong><div class="muted">#{{ row.id }} · {{ row.entity_type === 'shop' ? '店铺榜' : '商品榜' }} · TOP {{ row.top_n }}</div></template></el-table-column>
        <el-table-column label="排序与周期" min-width="170"><template slot-scope="{ row }">{{ row.sort_mode === 'composite' ? '综合分' : metricLabels[row.metrics[0].field] }}<div class="muted">{{ row.window_days ? '滚动近' + row.window_days + '天' : '全部历史' }} · {{ row.adjustments.length }}项权重调整</div></template></el-table-column>
        <el-table-column label="优先级" prop="priority" width="100" sortable />
        <el-table-column label="状态" width="100"><template slot-scope="{ row }"><el-tag size="small" :type="row.status === 'running' ? 'success' : row.status === 'upcoming' ? 'warning' : 'info'">{{ statusNames[row.status] }}</el-tag></template></el-table-column>
        <el-table-column label="启用" width="85"><template slot-scope="{ row }"><el-switch v-auth="['marketing-ranking-status']" :value="row.enabled" :active-value="1" :inactive-value="0" :disabled="!!busy[row.id]" @change="toggle(row, $event)" /></template></el-table-column>
        <el-table-column label="关联页面" min-width="170"><template slot-scope="{ row }"><el-button type="text" @click="decorate(row)">装修专题页 #{{ row.page_id }}</el-button><div><el-button type="text" size="mini" @click="copyLink(row)">复制页面链接</el-button></div></template></el-table-column>
        <el-table-column label="操作" min-width="160"><template slot-scope="{ row }"><el-button v-auth="['marketing-ranking-save']" type="text" :disabled="!!busy[row.id]" @click="edit(row)">编辑</el-button><el-button v-auth="['marketing-ranking-save']" type="text" @click="duplicate(row)">复制</el-button><el-button v-auth="['marketing-ranking-delete']" type="text" class="danger" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
      <el-pagination class="pagination" :current-page="filters.page" :page-size="20" :total="count" layout="total, prev, pager, next" @current-change="page" />
    </el-card>
    <div class="ranking-guide"><b>让榜单连接商品详情</b><span>在页面装修 → 商品详情中添加“商品上榜信息”组件，自动展示有效榜单中的名次，按优先级从高到低排列。</span></div>
    <ranking-form v-if="form" :initial="form" @close="form = null" @saved="saved" />
  </div>
</template>
<script>
import RankingForm from './RankingForm';
import { defaults, metricLabels } from './form';
import { rankingList, rankingInfo, rankingStatus, rankingDelete } from '@/api/ranking';
export default {
  components: { RankingForm }, data() { return { filters: { keyword: '', entity_type: '', enabled: '', page: 1, limit: 20 }, list: [], count: 0, loading: false, error: '', form: null, busy: {}, requestId: 0, metricLabels, statusNames: { running: '进行中', upcoming: '未开始', ended: '已结束', disabled: '已停用' } }; },
  created() { this.load(); }, beforeDestroy() { this.requestId++; },
  methods: {
    async load() { const id = ++this.requestId; this.loading = true; this.error = ''; try { const res = await rankingList(this.filters); if (id === this.requestId) { this.list = res.data.list; this.count = res.data.count; } } catch (e) { if (id === this.requestId) this.error = e.msg || '排行榜加载失败'; } finally { if (id === this.requestId) this.loading = false; } },
    search() { this.filters.page = 1; this.load(); }, page(value) { this.filters.page = value; this.load(); }, create() { this.form = defaults(); }, saved() { this.form = null; this.load(); },
    async edit(row) { this.$set(this.busy, row.id, true); try { this.form = (await rankingInfo(row.id)).data; } catch (e) { this.$message.error(e.msg || '加载配置失败'); } finally { this.$delete(this.busy, row.id); } },
    async duplicate(row) { try { const data = (await rankingInfo(row.id)).data; this.form = { ...data, id: 0, version: 0, enabled: 0, page_id: 0, name: data.name.slice(0, 54) + '（副本）' }; } catch (e) { this.$message.error(e.msg || '复制失败'); } },
    async toggle(row, enabled) { this.$set(this.busy, row.id, true); try { await rankingStatus(row.id, enabled); await this.load(); } catch (e) { this.$message.error(e.msg || '操作失败'); } finally { this.$delete(this.busy, row.id); } },
    decorate(row) { this.$router.push({ path: this.$routeProStr + '/setting/edit_theme', query: { type: 'home', page_type: 'micro', id: row.page_id } }); },
    copyLink(row) { this.$copyText(row.page_url).then(() => this.$message.success('已复制商城页面链接'), () => this.$message.error('复制失败')); },
    async remove(row) { try { await this.$confirm('删除后商品上榜信息将立即消失，已创建的装修页保留。', '删除“' + row.name + '”', { type: 'warning' }); await rankingDelete(row.id); if (this.list.length === 1 && this.filters.page > 1) this.filters.page--; await this.load(); } catch (e) { if (e !== 'cancel' && e !== 'close') this.$message.error(e.msg || '删除失败'); } },
  },
};
</script>
<style scoped>.ranking-page{padding:0 0 24px}.ranking-hero{display:flex;align-items:center;justify-content:space-between;padding:28px 32px;margin-bottom:16px;background:#fff;border:1px solid #ebeef5;border-radius:6px}.hero-kicker{font-size:11px;letter-spacing:2px;color:#a77b43}.ranking-hero h2{font-size:20px;color:#303133;margin:10px 0}.ranking-hero p{margin:0;font-size:13px;color:#88909c}.ranking-hero>.el-button{height:40px}.muted{font-size:12px;color:#939ba6;margin-top:7px}.pagination{text-align:right;margin-top:22px}.danger{color:#e45555}.ranking-guide{display:flex;gap:20px;align-items:center;padding:22px 24px;background:#f1f5fa;margin-top:16px;border-radius:8px;font-size:13px;color:#8290a0}.ranking-guide b{color:#526077;white-space:nowrap}</style>
