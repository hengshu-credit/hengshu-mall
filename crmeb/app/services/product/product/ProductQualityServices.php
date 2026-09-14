<?php
namespace app\services\product\product;
use think\facade\Db;
use crmeb\exceptions\AdminException;

/** Publication review is tied to the current business snapshot, never to client reviewer IDs. */
class ProductQualityServices
{
    const CHECKS=['price','crossed_price','media','sku','stock','shipping','responsibility','service'];
    private function snapshot(int $id): array
    {
        $product=Db::name('store_product')->where('id',$id)->find();
        if(!$product)throw new AdminException('商品不存在');
        $keys=['store_name','store_info','cate_id','unit_name','price','ot_price','vip_price','image','slider_image','video_link','soure_link','spec_type','virtual_type','freight','postage','temp_id','logistics','protection_list','seller_shop_id'];
        $data=array_intersect_key($product,array_flip($keys));
        $data['skus']=Db::name('store_product_attr_value')->where('product_id',$id)->where('type',0)->order('suk,id')->field('suk,price,ot_price,vip_price,image,is_show')->select()->toArray();
        $data['description']=Db::name('store_product_description')->where('product_id',$id)->where('type',0)->value('description')??'';
        return $data;
    }
    private function fingerprint(array $snapshot,array $profile):string {return hash('sha256',json_encode([$snapshot,$profile],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));}
    private function profile(array $input):array
    {
        $out=[];
        foreach(['source_note','shipping_origin','sales_subject','after_sales_subject','service_note','promotion_note']as $field){
            $value=$input[$field]??'';
            if(!is_string($value)||mb_strlen($value)>500)throw new AdminException('商品经营核对内容格式不正确');
            $out[$field]=trim($value);
        }
        return $out;
    }
    private function validate(int $id,array $snapshot,array $profile):void
    {
        if(!$profile['source_note']&&!$snapshot['soure_link'])throw new AdminException('请填写商品来源链接或来源说明');
        foreach(['sales_subject'=>'销售主体','after_sales_subject'=>'售后主体','service_note'=>'服务承诺','promotion_note'=>'促销素材核对说明']as $key=>$label)if(!$profile[$key])throw new AdminException('请填写'.$label);
        if(!$snapshot['store_name']||!$snapshot['cate_id']||!$snapshot['unit_name'])throw new AdminException('请补全商品名称、分类和单位');
        if(!$snapshot['image']||!json_decode($snapshot['slider_image'],true)||!trim($snapshot['description']))throw new AdminException('请补全商品图片和详情');
        if((new JdVideoImportServices)->isRemoteVideo((string)$snapshot['video_link']))throw new AdminException('采集视频尚未转存完成，请稍后审核');
        if(!$snapshot['virtual_type']){
            if(!$profile['shipping_origin']||!$snapshot['logistics'])throw new AdminException('请补全发货地和配送方式');
            if((int)$snapshot['freight']===3&&!Db::name('shipping_templates')->where('id',$snapshot['temp_id'])->count())throw new AdminException('请选择有效运费模板');
        }
        $skus=Db::name('store_product_attr_value')->where('product_id',$id)->where('type',0)->select()->toArray();
        $stock=0;$visible=0;
        foreach($skus as $sku){
            if(empty($sku['is_show']))continue;
            $visible++;
            if(!trim($sku['suk'])||!$sku['image'])throw new AdminException('请补全在售规格名称和图片');
            foreach(['price','ot_price','vip_price']as $field)if(!is_numeric($sku[$field])||bccomp((string)$sku[$field],'0',2)<0)throw new AdminException('规格价格格式不正确');
            if(bccomp((string)$sku['price'],'0',2)<=0)throw new AdminException('在售规格价格必须大于零');
            if(bccomp((string)$sku['ot_price'],'0',2)>0&&bccomp((string)$sku['ot_price'],(string)$sku['price'],2)<0)throw new AdminException('划线价不能低于售价');
            $stock+=(int)$sku['stock'];
        }
        if(!$visible||$stock<=0)throw new AdminException('请配置有库存的在售规格');
    }
    public function save(int $id,?array $input,int $adminId):void
    {
        if($input===null)return;
        Db::transaction(function()use($id,$input,$adminId){
            Db::name('store_product')->where('id',$id)->lock(true)->find();
            $profile=$this->profile($input['profile']??$input);$snapshot=$this->snapshot($id);
            $confirmed=($input['confirm']??false)===true;
            $old=Db::name('store_product_quality')->where('product_id',$id)->find();
            if(!$confirmed&&$old&&$old['status']==='approved'&&hash_equals($old['snapshot_hash'],$this->fingerprint($snapshot,$profile)))return;
            $data=['product_id'=>$id,'status'=>'pending','profile'=>json_encode($profile,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),'snapshot_hash'=>'','reviewer_id'=>0,'reviewed_at'=>0,'updated_at'=>time()];
            if($confirmed){
                if($adminId<=0||!Db::name('system_admin')->where('id',$adminId)->where('status',1)->where('is_del',0)->count())throw new AdminException('商品审核需要有效后台管理员');
                if(array_diff(self::CHECKS,(array)($input['checks']??[])))throw new AdminException('请完成全部商品经营核对项');
                $this->validate($id,$snapshot,$profile);
                $data['status']='approved';$data['snapshot_hash']=$this->fingerprint($snapshot,$profile);$data['reviewer_id']=$adminId;$data['reviewed_at']=time();
                Db::name('store_product_quality_history')->insert(['product_id'=>$id,'reviewer_id'=>$adminId,'snapshot_hash'=>$data['snapshot_hash'],'snapshot'=>json_encode(['product'=>$snapshot,'profile'=>$profile,'checks'=>self::CHECKS],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),'created_at'=>time()]);
            }
            if(Db::name('store_product_quality')->where('product_id',$id)->find())Db::name('store_product_quality')->where('product_id',$id)->update($data);
            else Db::name('store_product_quality')->insert($data);
        });
    }
    public function get(int $id):array
    {
        $row=Db::name('store_product_quality')->where('product_id',$id)->find();
        if(!$row)return ['status'=>'pending','profile'=>[],'reviewer_id'=>0,'reviewed_at'=>0];
        $row['profile']=json_decode($row['profile'],true)?:[];
        if($row['status']==='approved'&&!hash_equals($row['snapshot_hash'],$this->fingerprint($this->snapshot($id),$row['profile'])))$row['status']='stale';
        unset($row['snapshot_hash']);return $row;
    }
    public function assertPublish(int $id):void
    {
        $review=$this->get($id);
        if($review['status']!=='approved')throw new AdminException('商品尚未完成经营核对或信息已变化，请编辑商品重新审核后上架');
        $this->validate($id,$this->snapshot($id),$review['profile']);
    }
}
