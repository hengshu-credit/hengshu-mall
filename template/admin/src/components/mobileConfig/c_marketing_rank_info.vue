<template><ranking-settings :num="num" detail /></template>
<script>
import RankingSettings from '@/components/themeActions/RankingSettings';
export default { name: 'c_marketing_rank_info', componentsName: 'home_marketing_rank_info', cname: '商品上榜信息', components: { RankingSettings }, props: ['num', 'activeIndex'] };
</script>
