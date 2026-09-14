import { normalizePresentation, headerStyles, itemStyles, rankingMetrics, presentationRows, rankAppearance, dimension, surfaceStyle, rankingHighlight } from './rankingPresentation';
export function rankingView(unit, imageUrl = url => url) {
  return {
    props: { config: { type: Object, default: () => ({}) }, ranking: { type: Object, default: () => ({}) }, rows: { type: Array, default: () => [] }, activeBoardId:Number, loading: Boolean, error: String },
    computed: {
      p() { return normalizePresentation(this.config.appearance); },
      header() { return headerStyles(this.p, unit, imageUrl); },
      panelStyle() { return { ...surfaceStyle(this.p.panel,unit,imageUrl), padding: this.px(this.p.panelPadding) }; },
      cardLayout() { return this.p.layout === 'list' ? this.p.cardLayout : 'standard'; },
      purchaseSeparate() { return ['commerce','retail'].includes(this.cardLayout); },
      visible() { return !this.config.isHide && !(this.p.empty.hide && !this.loading && !this.error && !this.rows.length); },
      showHeader() { return this.p.header.showOverline || this.config.showTitle || this.config.showDescription || this.config.showMore || !!this.p.header.icon; },
      groups() { return presentationRows(this.rows, this.p, this.config.limit || 10).map(group => ({
        ...group,
        style: { gap: this.px(this.p.gap), marginTop: this.px(this.p.gap), gridTemplateColumns: group.variant === 'podium' ? `repeat(${Math.max(1, group.rows.length)}, minmax(0, 1fr))` : `repeat(${this.p.columns}, minmax(0, 1fr))`, alignItems: group.variant === 'list' ? 'stretch' : 'start' },
        rows: group.rows.map(item => {
          const styles = itemStyles(this.p, item, group.variant, unit, imageUrl);
          styles.card.flexDirection = 'column';
          if (this.cardLayout === 'retail') styles.commerce = { ...styles.commerce, margin: this.px(this.p.content.gap)+' 0 0', padding: '0', backgroundColor: 'transparent' };
          if (group.variant === 'podium' && Number(item.rank) !== 1) styles.card.marginTop = this.px(this.p.podiumLift);
          const metricsContent={...this.p.content};
          if (metricsContent.highlightMetric==='sales') metricsContent.showSales=false;
          if (metricsContent.highlightMetric==='reviews') metricsContent.showReviews=false;
          if (metricsContent.highlightMetric==='rating') metricsContent.showRating=false;
          return { item, styles, rankStyle: rankAppearance(this.p, Number(item.rank)), metrics: rankingMetrics({...this.p,content:metricsContent}, item, this.config.showScore && this.p.content.highlightMetric!=='score'), highlight: rankingHighlight(this.p.content,item), starPercent: Math.max(0,Math.min(100,Number(item.rating_score||0)*20)) };
        }),
      })); },
      footerStyle() { const f = this.p.footer; return { color: f.color, fontSize: this.px(f.fontSize), textAlign: f.align, padding: this.px(f.padding) }; },
      emptyStyle() { const e = this.p.empty; return { color: e.color, fontSize: this.px(e.fontSize), padding: this.px(e.padding) }; },
      badgePosition() { return this.p.badgePosition === 'image' && !this.p.content.showImage ? 'corner' : this.p.badgePosition; },
    },
    methods: { px(value) { return dimension(value, unit); }, imageUrl, open(item) { this.$emit('open', item); } },
  };
}
