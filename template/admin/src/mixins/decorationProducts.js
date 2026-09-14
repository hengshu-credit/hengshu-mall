import { getProProduct } from '@/api/diy';
import { decorationProductQuery, decorationProductIds, orderedDecorationProducts } from '../../../shared/decorationProducts';

// Saved products contain selection IDs; names, images, availability and prices may change.
export default {
  inject: {decorationPreview:{default:null},decorationProduct:{default:null}},
  data: () => ({ productPreviewMessage: '' }),
  computed: { productPreviewScope() { return this.decorationPreview ? this.decorationPreview() : {shopId:0}; }, productPreviewDetail(){return this.decorationProduct?this.decorationProduct():null;} },
  watch: { productPreviewScope: {deep:true,handler() { if(this._previewConfig)this.refreshPreviewProducts(this._previewConfig); }}, productPreviewDetail(){this._previewQuery='';if(this._previewConfig)this.refreshPreviewProducts(this._previewConfig);} },
  methods: {
    refreshPreviewProducts(config) {
      const type = Number(config.typeConfig.activeValue);
      this._previewConfig = config;
      const scope = this.productPreviewScope || {shopId:0};
      const ids = decorationProductIds(config);
      const query = decorationProductQuery(config, scope.shopId);
      if (scope.requiresShop && !scope.shopId) {
        this._previewQuery = ''; this.list = []; this.productPreviewMessage = '请选择预览店铺'; return;
      }
      const key = JSON.stringify(query);
      if (this._previewQuery === key) {
        if (this._previewProducts) this.list = this._previewProducts;
        return;
      }
      this._previewQuery = key;
      this._previewProducts = [];
      this.list = [];
      if (type === 1 && !ids.length) {
        if(config.name==='goodRecommend' && this.productPreviewDetail){
          this.list=(this.productPreviewDetail.good_list||[]).filter(item=>!scope.shopId||Number(item.seller_shop_id)===Number(scope.shopId));
          this._previewProducts=this.list;this.productPreviewMessage=this.list.length?'':'当前商品暂无推荐商品';return;
        }
        this.productPreviewMessage = config.name === 'goodRecommend' ? '未指定商品时，详情页使用当前商品的推荐列表' : '请选择要展示的商品';
        return;
      }
      this.productPreviewMessage = '正在读取商品';
      Promise.resolve().then(() => getProProduct(query)).then(res => {
        if (this._isDestroyed || this._previewQuery !== key) return;
        const list = orderedDecorationProducts(res.data, config);
        this._previewProducts = list;
        this.list = list;
        this.productPreviewMessage = type === 1 && list.length < ids.length ? '部分已选商品已下架或删除，请重新选择；APP仅展示可售商品' : list.length ? '' : '暂无符合条件的商品';
      }).catch(() => {
        if (this._previewQuery === key) this.productPreviewMessage = '商品预览加载失败，请重新打开配置';
      });
    },
  },
};
