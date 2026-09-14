<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function getLang($value,$replace=[]) {return $value;}
$value=json_decode(stream_get_contents(STDIN),true);
echo json_encode(app\services\diy\CartPageConfig::validate($value),JSON_UNESCAPED_UNICODE);
