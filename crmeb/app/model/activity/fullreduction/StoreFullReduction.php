<?php
namespace app\model\activity\fullreduction;

use crmeb\basic\BaseModel;
use crmeb\traits\ModelTrait;

class StoreFullReduction extends BaseModel
{
    use ModelTrait;
    protected $pk = 'id';
    protected $name = 'store_full_reduction';
    // Timestamps are integer seconds written explicitly by the service.
    protected $autoWriteTimestamp = false;
    protected $createTime = false;
    protected $updateTime = false;
}
