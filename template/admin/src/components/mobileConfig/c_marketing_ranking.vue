<template><ranking-settings :num="num" /></template>
<script>
import RankingSettings from '@/components/themeActions/RankingSettings';
export default { name: 'c_marketing_ranking', componentsName: 'home_marketing_ranking', cname: '营销排行榜', components: { RankingSettings }, props: ['num', 'activeIndex'] };
</script>
