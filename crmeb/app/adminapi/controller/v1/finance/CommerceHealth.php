<?php
namespace app\adminapi\controller\v1\finance;
use app\Request;
use app\services\system\CommerceHealthServices;
class CommerceHealth
{
    public function health(CommerceHealthServices $service){return app('json')->success($service->summary());}
    public function tasks(Request $request,CommerceHealthServices $service){return app('json')->success($service->listing('tasks',(int)$request->get('page',1),(int)$request->get('limit',20)));}
    public function refunds(Request $request,CommerceHealthServices $service){return app('json')->success($service->listing('refunds',(int)$request->get('page',1),(int)$request->get('limit',20)));}
}
