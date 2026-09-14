<template>
  <common-wrapper v-if="!config.isHide && list.length" :config="config"
    ><ranking-detail-display :config="config" :rows="list" @open="open"
  /></common-wrapper>
</template>
<script>
import commonWrapper from "./commonWrapper.vue";
import RankingDetailDisplay from "./rankingDetailDisplay.vue";
import { rankingComponent } from "../../../shared/rankingComponent";
import { getProductRankings } from "@/api/ranking";
import { highestProductRanking } from "../../../shared/productRankingInfo";
export default {
  components: { commonWrapper, RankingDetailDisplay },
  props: {
    dataConfig: { type: Object, default: () => ({}) },
    productId: { type: [Number, String], default: 0 },
  },
  data() {
    return { list: [], requestId: 0 };
  },
  computed: {
    config() {
      return rankingComponent(
        this.dataConfig.name === "productRank"
          ? "productRank"
          : "marketingRankInfo",
        this.dataConfig
      );
    },
    queryKey() {
      const app=this.$store&&this.$store.state.app||{};
      return [this.productId, this.config.isHide,app.uid,app.token].join(":");
    },
  },
  watch: {
    queryKey: {
      immediate: true,
      handler() {
        this.load();
      },
    },
  },
  beforeDestroy() {
    this.requestId++;
  },
  methods: {
    async load() {
      const id = ++this.requestId;
      this.list = [];
      if (!Number(this.productId) || this.config.isHide) return;
      try {
        const res = await getProductRankings(this.productId, 1);
        if (id === this.requestId) {
          const best = highestProductRanking(res.data.list || []);
          this.list = best ? [best] : [];
        }
      } catch (_) {
        /* A badge failure must not block purchasing. */
      }
    },
    open(item) {
      if (item.page_url) uni.navigateTo({ url: item.page_url });
    },
  },
};
</script>
