<?php
namespace app\api\controller\v1;
use app\Request;
use app\services\activity\ranking\RankingServices;

class MarketingRanking
{
    public function detail(Request $request, RankingServices $services, int $id) { return app('json')->success($services->publicRanking($id,(int)$request->uid()))->header(['Cache-Control'=>'private, no-store']); }
    public function product(Request $request, RankingServices $services, int $id) { return app('json')->success(['list'=>$services->productRankings($id,(int)$request->get('limit',1),(int)$request->uid())])->header(['Cache-Control'=>'private, no-store']); }
}
