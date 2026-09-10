<?php
namespace app\model\activity\style;
use crmeb\basic\BaseModel;
use crmeb\traits\ModelTrait;
class MarketingStyle extends BaseModel
{
    use ModelTrait;
    protected $pk = 'id';
    protected $name = 'marketing_style';
    protected $autoWriteTimestamp = false;
    protected $createTime = false;
    protected $updateTime = false;
}
