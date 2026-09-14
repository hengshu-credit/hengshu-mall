<?php
// Loopback-only fixture exposes the real PHP image controller with a local converter.
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
$request=new app\Request;$request->withGet($_GET);
$images=new app\services\product\product\MediaDisplayService(getenv('AUDIT_MEDIA_ORIGIN')?:'http://127.0.0.1:18129');
(new app\api\controller\v1\MediaDisplay)->image($request,$images)->send();
