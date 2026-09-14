<template>
  <div class="commerce-health" v-loading="loading">
    <el-card>
      <div slot="header"><span>交易异常监控</span><el-button class="refresh" size="small" @click="load">刷新</el-button></div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <template v-if="health">
        <el-alert v-for="message in health.alerts" :key="message" :title="message" type="warning" :closable="false" />
        <p>待确认退款：{{ health.refund_unknown }}　队列任务：{{ health.queue.available ? health.queue.size : '暂不可用' }}　检查时间：{{ new Date(health.checked_at * 1000).toLocaleString() }}</p>
        <p>退款结果未知时先核对渠道记录。队列数量包含延迟和执行中任务；待办完成表示已执行对应投递步骤，具体履约仍需核对订单。</p>
      </template>
      <el-tabs v-model="tab" @tab-click="changeTab">
        <el-tab-pane label="支付与履约待办" name="tasks" />
        <el-tab-pane label="充值退款" name="refunds" />
      </el-tabs>
      <el-table :data="rows" border>
        <el-table-column prop="id" label="记录ID" width="90" />
        <el-table-column v-if="tab==='tasks'" prop="kind" label="业务类型" width="130" />
        <el-table-column :prop="tab==='tasks' ? 'business_id' : 'recharge_id'" label="业务ID" width="100" />
        <el-table-column v-if="tab==='tasks'" prop="step" label="步骤" width="160" />
        <el-table-column v-else prop="refund_no" label="退款单号" min-width="200" />
        <el-table-column prop="state" label="状态" width="120" :formatter="stateLabel" />
        <el-table-column v-if="tab==='tasks'" prop="attempts" label="尝试次数" width="100" />
        <el-table-column v-else prop="principal" label="原路退本金" width="120" />
        <el-table-column prop="last_error" label="最近异常" min-width="260" show-overflow-tooltip />
      </el-table>
      <el-pagination :current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="changePage" />
    </el-card>
  </div>
</template>
<script>
import request from '@/libs/request';
export default {
  data: () => ({ health: null, rows: [], total: 0, tab: 'tasks', page: 1, loading: false, error: '', sequence: 0 }),
  mounted() { this.load(); },
  beforeDestroy() { this.sequence++; },
  methods: {
    stateLabel(row) { return { pending:'待处理', retry:'等待重试', running:'处理中', done:'已完成', dead:'需人工处理', prepared:'已预留退款', unknown:'渠道待确认', succeeded:'退款成功', failed:'退款关闭' }[row.state] || row.state; },
    changeTab() { this.page = 1; this.load(); },
    changePage(page) { this.page = page; this.load(); },
    async load() {
      const seq = ++this.sequence; this.loading = true; this.error = '';
      try {
        const [health, list] = await Promise.all([
          request({ url: 'finance/commerce/health', method: 'get' }),
          request({ url: 'finance/commerce/' + this.tab, method: 'get', params: { page: this.page, limit: 20 } }),
        ]);
        if (seq === this.sequence) { this.health = health.data; this.rows = list.data.list; this.total = list.data.count; }
      } catch (e) { if (seq === this.sequence) { this.error = e.msg || e.message || '交易监控读取失败，请重试'; this.rows = []; } }
      finally { if (seq === this.sequence) this.loading = false; }
    },
  },
};
</script>
<style scoped>
.commerce-health { padding: 16px; }
.refresh { float: right; }
.el-alert { margin-bottom: 10px; }
.el-pagination { margin-top: 16px; }
</style>
