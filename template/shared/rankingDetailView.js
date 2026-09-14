import { normalizePresentation, dimension } from "./rankingPresentation";
import { highestProductRanking } from "./productRankingInfo";
export function rankingDetailView(unit) {
  return {
    props: {
      config: { type: Object, default: () => ({}) },
      rows: { type: Array, default: () => [] },
    },
    computed: {
      p() {
        return normalizePresentation(this.config.appearance);
      },
      items() {
        const item = highestProductRanking(this.rows);
        return item
          ? [
              {
                item,
                style: { minHeight: this.px(20), color:this.p.detail.textColor },
                body: { marginLeft: this.px(8) },
                title: {
                  fontSize: this.px(this.p.detail.fontSize),
                  fontWeight: this.p.detail.bold ? "700" : "400",
                },
                position: { fontSize: this.px(this.p.detail.fontSize) },
                label: this.p.detail.rankText.replace(
                  /\{rank\}/g,
                  String(item.rank)
                ),
              },
            ]
          : [];
      },
      badgeStyle(){return {color:this.p.detail.badgeColor,backgroundColor:this.p.detail.badgeBackground};},
      arrowStyle() {
        return {
          color: this.p.detail.arrowColor,
          marginLeft: this.px(8),
          width: this.px(this.p.detail.arrowSize),
          height: this.px(this.p.detail.arrowSize),
          fontSize: this.px(this.p.detail.arrowSize),
        };
      },
    },
    methods: {
      px(value) {
        return dimension(value, unit);
      },
    },
  };
}
