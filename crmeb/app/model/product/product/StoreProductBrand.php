<?php
namespace app\model\product\product;

use crmeb\basic\BaseModel;
use crmeb\traits\ModelTrait;

class StoreProductBrand extends BaseModel
{
    use ModelTrait;
    protected $pk = 'id';
    protected $name = 'store_product_brand';
}
