<?php
require dirname(__DIR__,2).'/crmeb/vendor/autoload.php';
function getLang($value,$replace=[]) {return $value;}
$body=json_decode(stream_get_contents(STDIN),true);
$value=$body['value'];
switch($body['type']) {
    case 'category': $value=app\services\diy\CategoryPageConfig::validate($value); break;
    case 'cart': $value=app\services\diy\CartPageConfig::validate($value); break;
    case 'theme': $value=app\services\diy\ThemePaletteConfig::validate($value); break;
    default:
        $value=app\services\diy\MerchantDecorationConfig::validatePage($value);
        $value=app\services\diy\RankingDecorationConfig::validatePage($value);
        foreach(($value['value']??[]) as $component) app\services\diy\ComponentStyleConfig::validate($component);
}
echo json_encode($value,JSON_UNESCAPED_UNICODE);
