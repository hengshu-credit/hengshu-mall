import { getStorefrontPreview } from '@/api/diy';

export default {
  inject: {decorationPreview:{default:null},decorationProduct:{default:null}},
  data: () => ({previewShop:null,previewProducts:[],previewShops:[],previewRankings:{},previewGroups:[],previewFollowers:0,previewError:'',previewLoading:false}),
  computed: {
    livePreview() { return !!this.decorationPreview; },
    previewScope() { return this.decorationPreview ? this.decorationPreview() : {}; },
    previewShopId() {
      const product=this.decorationProduct&&this.decorationProduct();
      const owner=['shopInfo','productRank','shopHeader','shopFollow'].includes(this.config.name) ? Number(product&&product.storeInfo&&product.storeInfo.seller_shop_id)||0 : Number(this.config.shopId)||0;
      return Number(this.previewScope.shopId)||owner;
    },
    previewQueryKey() {
      const c=this.config;
      return JSON.stringify([this.livePreview,c.name,this.previewShopId,c.shopIds,c.typeId,c.categoryId,c.limit,c.sort,c.showProducts,c.rankTypes,c.topN,(c.groups||[]).map(g=>[g.type,g.categoryId])]);
    },
  },
  watch: {previewQueryKey:{immediate:true,handler(){this.refreshMerchantPreview();}}},
  beforeDestroy() { this._merchantPreviewRequest=(this._merchantPreviewRequest||0)+1; },
  methods: {
    async refreshMerchantPreview() {
      if(!this.livePreview)return;
      const seq=this._merchantPreviewRequest=(this._merchantPreviewRequest||0)+1,c=this.config,shop_id=this.previewShopId;
      this.previewLoading=true;this.previewError='';this.previewShop=null;this.previewProducts=[];this.previewShops=[];this.previewRankings={};this.previewGroups=[];
      const filters={shop_id,category_id:c.categoryId||0,sort:c.sort,limit:c.limit};
      const read=async(kind,params={})=>(await getStorefrontPreview({kind,...params})).data;
      const assign=(key,value)=>{if(seq===this._merchantPreviewRequest)this[key]=value;};
      try {
        if(this.previewScope.requiresShop && !shop_id && c.name!=='shopStreet'){assign('previewError','请选择预览店铺');return;}
        if(['shopHeader','shopInfo','shopFollow'].includes(c.name)) {
          if(!shop_id){assign('previewError','请选择预览店铺');return;}
          const shop=await read('shop',{shop_id});assign('previewShop',shop);
          if(c.name!=='shopInfo')assign('previewFollowers',(await read('follow',{shop_id})).follower_count||0);
        }
        if(c.name==='shopStreet')assign('previewShops',(await read('shops',{ids:c.shopIds,type_id:c.typeId,limit:c.limit})).list||[]);
        if(c.name==='shopProducts'||c.name==='shopInfo'&&c.showProducts)assign('previewProducts',(await read('products',filters)).list||[]);
        if(c.name==='productRanking') {
          const entries=await Promise.all(c.rankTypes.map(async type=>[type,(await read('ranking',{...filters,type,top:c.topN})).slice(0,c.limit)]));
          assign('previewRankings',Object.fromEntries(entries));
        }
        if(c.name==='recommendGroup')assign('previewGroups',await Promise.all(c.groups.map(async group=>group.image.url ? {} : (await read('products',{shop_id,category_id:group.categoryId,recommend:group.type,sort:group.type==='new'?'new':'sales',limit:1})).list[0]||{})));
      }catch(error){assign('previewError',error.msg||error.message||'预览内容读取失败');}
      finally{assign('previewLoading',false);}
    },
  },
};
