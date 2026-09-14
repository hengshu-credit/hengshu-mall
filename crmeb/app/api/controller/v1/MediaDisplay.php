<?php
namespace app\api\controller\v1;

use app\Request;
use app\services\product\product\MediaDisplayService;
use think\Response;

class MediaDisplay
{
    public function image(Request $request, MediaDisplayService $images)
    {
        try {
            $bytes = $images->image((string)$request->get('path', ''));
            return Response::create($bytes, 'html')->header([
                'Content-Type'=>'image/png', 'X-Content-Type-Options'=>'nosniff',
                'Cache-Control'=>'public, max-age=86400', 'ETag'=>'"'.hash('sha256', $bytes).'"',
            ]);
        } catch (\InvalidArgumentException $e) {
            return Response::create('', 'html', 404)->header(['Cache-Control'=>'no-store']);
        } catch (\RuntimeException $e) {
            return Response::create('', 'html', 502)->header(['Cache-Control'=>'no-store']);
        }
    }
}
