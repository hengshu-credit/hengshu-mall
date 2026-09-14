export default {
  inject:{decorationProduct:{default:null}},
  computed:{
    liveProductPreview(){return !!this.decorationProduct;},
    previewDetail(){return this.decorationProduct && this.decorationProduct() || {};},
    previewStore(){return this.previewDetail.storeInfo || (this.liveProductPreview?{}:{store_name:'示例商品',price:'199.00',ot_price:'299.00',vip_price:'26.00',stock:1000,sales:1000,merchant_name:'商户店铺名称',seller_shop_id:1});},
    previewSpecs(){const rows=Object.values(this.previewDetail.productValue||{});return this.liveProductPreview?rows:this.mockSpecList||[];},
    previewSlides(){return this.previewStore.slider_image || (this.previewStore.image?[this.previewStore.image]:[]);},
  },
};
