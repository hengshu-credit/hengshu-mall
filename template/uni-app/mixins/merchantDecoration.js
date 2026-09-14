export default {
  data: () => ({ merchantPalette: null }),
  provide() {
    return { merchantDisplay: () => this.merchantPalette ? !!this.merchantPalette.show_merchant_name : undefined };
  },
};
