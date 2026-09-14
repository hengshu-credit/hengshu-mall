<?php
namespace app\api\controller\v1;

use app\Request;
use app\services\merchant\MerchantStorefrontServices;

class MerchantStorefront
{
    public function theme(Request $request, int $id, string $type)
    {
        if (!in_array($type,['home','category','detail','theme'],true)) return app('json')->fail('页面类型不正确');
        return app('json')->success(\app\services\merchant\MerchantThemeServices::resolve($id,$type,(int)$request->get('theme_id',0),(int)$request->get('shop_page_id',0)));
    }
    public function productTheme(Request $request, int $id)
    {
        $product = \app\services\merchant\MerchantProducts::assertPurchasable($id);
        if (!empty($product['id'])) {
            $previewShop = (int)$request->get('preview_shop_id', 0);
            $previewId = !$previewShop || $previewShop === (int)$product['id'] ? (int)$request->get('shop_page_id',0) : 0;
            return app('json')->success(\app\services\merchant\MerchantThemeServices::resolve((int)$product['id'],'detail',(int)$request->get('theme_id',0),$previewId));
        }
        $themes=app()->make(\app\services\diy\ThemeServices::class);
        return app('json')->success(['shop_id'=>0,'theme_id'=>0,'page'=>$themes->getThemeInfo((int)$request->get('theme_id',0),'detail'),'palette'=>$themes->getThemeInfo((int)$request->get('theme_id',0),'theme')]);
    }
    public function followState(Request $request, int $id)
    {
        return app('json')->success((new \app\services\merchant\MerchantFollowServices())->state((int)$request->uid(),$id));
    }
    public function follow(Request $request, int $id)
    {
        $follow=$request->post('follow');
        if (!in_array($follow,[true,false,0,1,'0','1'],true)) return app('json')->fail('关注状态不正确');
        return app('json')->success((new \app\services\merchant\MerchantFollowServices())->set((int)$request->uid(),$id,(bool)$follow));
    }
    public function followed(Request $request)
    {
        return app('json')->success((new \app\services\merchant\MerchantFollowServices())->listing((int)$request->uid(),(int)$request->get('page',1),(int)$request->get('limit',20)));
    }
    private function filters(Request $request): array
    {
        return $request->getMore([['keyword',''],['shop_id',0],['category_id',0],['type_id',0],['ids',[]],
            ['sort','default'],['recommend',''],['type','sales'],['scope','category']]);
    }
    public function shops(Request $request, MerchantStorefrontServices $services)
    {
        return app('json')->success($services->shops($this->filters($request), (int)$request->get('page',1), (int)$request->get('limit',20)));
    }
    public function shop(MerchantStorefrontServices $services, int $id)
    {
        return app('json')->success($services->shop($id));
    }
    public function products(Request $request, MerchantStorefrontServices $services)
    {
        return app('json')->success($services->products($this->filters($request), (int)$request->get('page',1), (int)$request->get('limit',20)));
    }
    public function categories(MerchantStorefrontServices $services, int $id)
    {
        return app('json')->success($services->categories($id));
    }
    public function ranking(Request $request, MerchantStorefrontServices $services)
    {
        return app('json')->success($services->ranking($this->filters($request), (int)$request->get('top',20)));
    }
    public function productRank(Request $request, MerchantStorefrontServices $services, int $id)
    {
        return app('json')->success(['ranking'=>$services->productRank($id, $this->filters($request), (int)$request->get('top',20))]);
    }
}
