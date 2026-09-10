<?php
namespace app\services\product\product;

use crmeb\exceptions\AdminException;

/** Shared category rules for brand editing, product options and saving. */
class ProductBrandScope
{
    public static function ids($values): array
    {
        if (!is_array($values) || count($values) > 1000) throw new AdminException('请选择有效的品牌或分类');
        $ids = [];
        foreach ($values as $value) {
            if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]*$/D', (string)$value) || (float)$value > 2147483647) {
                throw new AdminException('品牌或分类编号不正确');
            }
            $ids[] = (int)$value;
        }
        return array_values(array_unique($ids));
    }

    public static function ancestors(array $ids, array $categories): array
    {
        $result = [];
        foreach ($ids as $id) {
            if (!isset($categories[$id])) throw new AdminException('所选商品分类不存在，请重新选择');
            $visited = [];
            while ($id && isset($categories[$id]) && !isset($visited[$id])) {
                $visited[$id] = true;
                $result[$id] = $id;
                $id = (int)$categories[$id]['pid'];
            }
        }
        return array_values($result);
    }
}
