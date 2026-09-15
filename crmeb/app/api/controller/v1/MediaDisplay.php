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
            $bytes = $images->image((string)$request->get('path', ''), (string)$request->get('format', 'png'), (string)$request->header('accept', ''));
            $etag = '"'.hash('sha256', $bytes).'"';
            $unchanged = $request->header('if-none-match') === $etag;
            return Response::create($unchanged ? '' : $bytes, 'html', $unchanged ? 304 : 200)->header([
                'Content-Type'=>substr($bytes, 4, 4) === 'ftyp' ? 'image/avif' : (substr($bytes, 0, 3) === "\xff\xd8\xff" ? 'image/jpeg' : 'image/png'),
                'X-Content-Type-Options'=>'nosniff',
                'Vary'=>'Accept',
                'Cache-Control'=>'public, max-age=86400', 'ETag'=>$etag,
            ]);
        } catch (\InvalidArgumentException $e) {
            return Response::create('', 'html', 404)->header(['Cache-Control'=>'no-store']);
        } catch (\RuntimeException $e) {
            return Response::create('', 'html', 502)->header(['Cache-Control'=>'no-store']);
        }
    }
}
