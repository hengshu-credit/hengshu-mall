<?php
namespace app\services\diy;
class ThemeColorConfig
{
    public static function valid($value): bool
    {
        if(!is_string($value))return false;
        if(in_array($value,['var(--view-theme)','var(--view-gradient)','var(--view-minorColor)','var(--view-minorColorT)','var(--view-priceColor)'],true))return true;
        if($value==='transparent'||preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/iD',$value))return true;
        if(!preg_match('/^(rgb|rgba)\(([0-9.,\s]+)\)$/iD',$value,$match))return false;
        $parts=array_map('trim',explode(',',$match[2]));
        if(count($parts)!==(strtolower($match[1])==='rgba'?4:3))return false;
        foreach($parts as $index=>$part)if(!is_numeric($part)||!is_finite((float)$part)||$part<0||$part>($index===3?1:255))return false;
        return true;
    }
}
