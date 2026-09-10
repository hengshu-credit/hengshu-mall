<?php
require __DIR__ . '/main_navigation.php';
use app\services\diy\ThemePaletteConfig;
$input=['theme_color'=>'#123','gradient_color'=>'#abcdef','sub_color'=>'#456789','palette_mode'=>'preset','palette_id'=>'sky-blue','light_color'=>'not-a-color'];
$value=ThemePaletteConfig::validate($input);
navCheck($value['theme_color']==='#112233' && $value['gradient_color']==='#ABCDEF','palette HEX colors normalize for both clients');
navCheck($value['light_color']==='rgba(17, 34, 51, 0.1)','light accents derive from the primary color');
foreach(['url(javascript:x)','',null,'#12345','red'] as $color){$bad=$input;$bad['theme_color']=$color;try{ThemePaletteConfig::validate($bad);throw new RuntimeException('invalid color accepted');}catch(crmeb\exceptions\AdminException $e){}}
$legacy=$input;unset($legacy['palette_mode'],$legacy['palette_id']);
navCheck(ThemePaletteConfig::validate($legacy)['palette_mode']==='custom','legacy custom palettes remain saveable');
