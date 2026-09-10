<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;
use think\facade\Db;

/** Merchant records have no upstream/downstream role. Workflow is versioned independently. */
class MerchantServices
{
    private $eventKey = '';
    private $requestHash = '';

    public function __construct() { MerchantInstaller::ensure(); }

    private function mutate(array $actor, string $key, array $request, callable $operation): array
    {
        if (!preg_match('/^[a-zA-Z0-9_-]{16,80}$/D', $key)) throw new AdminException('缺少有效操作标识，请刷新后重试');
        $this->eventKey = $actor['kind'] . ':' . $actor['id'] . ':' . $key;
        $this->requestHash = hash('sha256', json_encode($request, JSON_UNESCAPED_UNICODE));
        $replay = function () {
            $row = Db::name('merchant_history')->where('event_key',$this->eventKey)->find();
            if (!$row) return null;
            $payload = MerchantVault::decrypt($row['payload']);
            if (($payload['request_hash'] ?? '') !== $this->requestHash) throw new AdminException('操作标识已用于其他内容，请重新保存');
            return $payload['result'] ?? ['id'=>(int)$row['shop_id']];
        };
        if (($result = $replay()) !== null) return $result;
        try { return Db::transaction($operation); }
        catch (\Throwable $e) {
            if (($result = $replay()) !== null) return $result;
            if (strpos($e->getMessage(),'1062') !== false) throw new AdminException('资料已存在或发生并发修改，请刷新重试');
            throw $e;
        }
    }

    private function history(int $shopId, int $applicationId, string $type, string $stage, array $before, array $after, array $actor, array $result, array $scope = [], array $extra = []): void
    {
        $changes = MerchantData::diff($before,$after);
        foreach ($changes as &$change) {
            if ($change['field'] === 'type_id') foreach (['before','after'] as $side) $change[$side . '_label'] = Db::name('merchant_type')->where('id',(int)$change[$side])->value('name') ?: '';
            if ($change['field'] === 'tag_ids') foreach (['before','after'] as $side) $change[$side . '_label'] = $change[$side] ? Db::name('merchant_tag')->whereIn('id',$change[$side])->order('id')->column('name') : [];
        }
        unset($change);
        $payload = ['before'=>$before,'after'=>$after,'changes'=>$changes,'result'=>$result,'request_hash'=>$this->requestHash] + $extra;
        $summary = $extra['summary'] ?? implode('、', array_column($changes,'label'));
        $id = Db::name('merchant_history')->insertGetId(['shop_id'=>$shopId,'application_id'=>$applicationId,'event_key'=>$this->eventKey,'event_type'=>$type,'stage'=>$stage,'actor_id'=>$actor['id'],'actor_kind'=>$actor['kind'],'actor_name'=>$actor['name'],'source'=>$actor['source'],'summary'=>mb_substr($summary,0,500),'payload'=>MerchantVault::encrypt($payload),'created_at'=>time()]);
        $scope = array_values(array_unique(array_filter(array_merge($scope,[$shopId]))));
        if ($scope) Db::name('merchant_history_scope')->insertAll(array_map(function ($idShop) use ($id) { return ['history_id'=>$id,'shop_id'=>$idShop]; },$scope));
        foreach (array_unique(array_merge($before['document_ids'] ?? [],$after['document_ids'] ?? [])) as $doc) $this->documentLink((int)$doc,'history',(int)$id);
    }

    public function rawShop(int $id, bool $lock = false): array
    {
        $row = Db::name('merchant_shop')->where('id',$id)->lock($lock)->find();
        if (!$row) throw new AdminException('商户不存在');
        return $row;
    }

    private function profile(array $row): array
    {
        $data = MerchantVault::decrypt($row['profile']);
        if ($row['subject_id']) {
            $subject = Db::name('merchant_subject')->where('id',$row['subject_id'])->find();
            if ($subject) $data = array_replace($data,MerchantVault::decrypt($subject['profile']));
        }
        $data['name'] = $row['name']; $data['type_id'] = (int)$row['type_id'];
        $data['tag_ids'] = array_map('intval',Db::name('merchant_shop_tag')->where('shop_id',$row['id'])->order('tag_id')->column('tag_id'));
        return $data;
    }

    private function pending(int $id, bool $lock = false): ?array
    {
        return Db::name('merchant_application')->where('shop_id',$id)->whereIn('status',['draft','submitted','supplement','rejected','withdrawn'])->order('id desc')->lock($lock)->find();
    }

    public function info(int $id, bool $sensitive = false): array
    {
        $row = $this->rawShop($id);
        $data = $this->profile($row);
        $pending = $this->pending($id);
        unset($row['profile']);
        foreach (['id','subject_id','type_id','is_platform','owner_uid','version','created_at','updated_at'] as $field) $row[$field]=(int)$row[$field];
        $row['profile'] = $sensitive ? $data : MerchantData::redact($data);
        $row['type_name'] = Db::name('merchant_type')->where('id',$row['type_id'])->value('name') ?: '已删除类型';
        $row['tags'] = $data['tag_ids'] ? Db::name('merchant_tag')->whereIn('id',$data['tag_ids'])->select()->toArray() : [];
        $row['pending'] = null;
        if ($pending) {
            $profile = MerchantVault::decrypt($pending['data']);
            $row['pending'] = ['id'=>(int)$pending['id'],'status'=>$pending['status'],'version'=>(int)$pending['version'],'opinion'=>$pending['opinion'],'profile'=>$sensitive?$profile:MerchantData::redact($profile)];
        }
        $row['documents'] = $this->documentMetadata(array_unique(array_merge($data['document_ids'] ?? [],$pending ? (MerchantVault::decrypt($pending['data'])['document_ids'] ?? []) : [])));
        $row['available'] = $this->available($row,$data);
        $row['unavailable_reason'] = $row['available'] ? '' : ($row['audit_status'] !== 'approved' ? '资料审核未通过' : ($row['state'] !== 'open' ? '商户未营业' : '主体证件已过期'));
        return $row;
    }

    public function available(array $row, ?array $data = null): bool
    {
        return $row['state']==='open' && $row['audit_status']==='approved' && MerchantData::valid($data ?? $this->profile($row));
    }

    public function list(array $filters, int $page = 1, int $limit = 20): array
    {
        $query = Db::name('merchant_shop')->alias('m')->leftJoin('merchant_subject s','s.id=m.subject_id');
        foreach (['state','audit_status','type_id'] as $field) if (($filters[$field] ?? '') !== '') $query->where('m.'.$field,$filters[$field]);
        $keyword = trim((string)($filters['keyword'] ?? ''));
        if ($keyword !== '') $query->where(function ($q) use ($keyword) { $q->whereLike('m.name','%'.$keyword.'%')->whereLike('m.code','%'.$keyword.'%','OR')->whereLike('s.name','%'.$keyword.'%','OR'); });
        $tags = MerchantData::ids($filters['tag_ids'] ?? []);
        if ($tags) $query->whereIn('m.id',function ($subquery) use ($tags) { $subquery->name('merchant_shop_tag')->whereIn('tag_id',$tags)->field('shop_id'); });
        $count = (clone $query)->count();
        $rows = $query->field('m.*,s.profile AS subject_profile')->order('m.id desc')->page(max(1,$page),min(100,max(1,$limit)))->select()->toArray();
        $ids = array_column($rows,'id');
        if (!$ids) return ['list'=>[],'count'=>$count];
        $typeNames = Db::name('merchant_type')->whereIn('id',array_unique(array_column($rows,'type_id')))->column('name','id');
        $tagMap=[];
        foreach (Db::name('merchant_shop_tag')->alias('mt')->join('merchant_tag t','t.id=mt.tag_id')->whereIn('mt.shop_id',$ids)->field('mt.shop_id,t.*')->order('t.id')->select()->toArray() as $tag) {
            $shopId=$tag['shop_id']; unset($tag['shop_id']); $tagMap[$shopId][]=$tag;
        }
        $pendingMap=[];
        foreach (Db::name('merchant_application')->whereIn('shop_id',$ids)->whereIn('status',['draft','submitted','supplement','rejected','withdrawn'])->order('id desc')->field('shop_id,status')->select()->toArray() as $pending) if (!isset($pendingMap[$pending['shop_id']])) $pendingMap[$pending['shop_id']]=$pending['status'];
        $productCounts=Db::name('store_product')->whereIn('seller_shop_id',$ids)->where('is_del',0)->group('seller_shop_id')->column('COUNT(*) AS total','seller_shop_id');
        $list=[];
        foreach ($rows as $row) {
            $profile=MerchantVault::decrypt($row['profile']);
            if ($row['subject_profile']) $profile=array_replace($profile,MerchantVault::decrypt($row['subject_profile']));
            $list[]=['id'=>(int)$row['id'],'code'=>$row['code'],'name'=>$row['name'],'logo'=>$profile['logo'] ?? '',
                'subject_name'=>$profile['subject_name'] ?? '','contact_name'=>$profile['contact_name'] ?? '',
                'contact_phone'=>MerchantData::maskValue($profile['contact_phone'] ?? ''),'type_id'=>(int)$row['type_id'],
                'type_name'=>$typeNames[$row['type_id']] ?? '已删除类型','tags'=>$tagMap[$row['id']] ?? [],
                'state'=>$row['state'],'audit_status'=>$row['audit_status'],'version'=>(int)$row['version'],'is_platform'=>(int)$row['is_platform'],
                'pending_status'=>$pendingMap[$row['id']] ?? '','product_count'=>(int)($productCounts[$row['id']] ?? 0),'created_at'=>(int)$row['created_at']];
        }
        return ['list'=>$list,'count'=>$count];
    }

    public function options(string $keyword = '', array $selected = []): array
    {
        $query=Db::name('merchant_shop')->alias('m')->leftJoin('merchant_subject s','s.id=m.subject_id');
        if ($keyword !== '') $query->where(function ($q) use ($keyword) { $q->whereLike('m.name','%'.$keyword.'%')->whereLike('m.code','%'.$keyword.'%','OR')->whereLike('s.name','%'.$keyword.'%','OR'); });
        $rows=$query->field('m.*')->order('m.is_platform desc,m.id desc')->limit(100)->select()->toArray();
        if ($selected) $rows=array_merge($rows,Db::name('merchant_shop')->whereIn('id',$selected)->select()->toArray());
        $out=[];
        foreach ($rows as $row) {
            $profile=$this->profile($row); $available=$this->available($row,$profile);
            $out[$row['id']]=['id'=>(int)$row['id'],'name'=>$row['name'],'is_platform'=>(bool)$row['is_platform'],'subject_name'=>$profile['subject_name'] ?? '',
                'type_name'=>Db::name('merchant_type')->where('id',$row['type_id'])->value('name'),'available'=>$available,
                'draft_available'=>in_array($row['state'],['preparing','open','paused']),
                'reason'=>$available?'':($row['audit_status']!=='approved'?'资料未通过审核':($row['state']!=='open'?'商户未营业':'证件已过期'))];
        }
        foreach ($selected as $id) if (!isset($out[$id])) $out[$id]=['id'=>$id,'name'=>'未知商户 #'.$id,'subject_name'=>'','type_name'=>'','available'=>false,'draft_available'=>false,'reason'=>'商户不存在'];
        return array_values($out);
    }

    private function validateDictionary(array $data, array $old = [], bool $public = false): void
    {
        $type=Db::name('merchant_type')->where('id',$data['type_id'])->lock(true)->find();
        if (!$type || (!$type['status'] && $data['type_id']!==($old['type_id'] ?? 0)) || ($public && !$type['apply_selectable'])) throw new AdminException('所选商户类型不可用');
        foreach ($data['tag_ids'] as $id) {
            $tag=Db::name('merchant_tag')->where('id',$id)->lock(true)->find();
            if (!$tag || (!$tag['status'] && !in_array($id,$old['tag_ids'] ?? [],true))) throw new AdminException('所选商户标签不可用');
        }
    }

    private function syncTags(int $id, array $ids): void
    {
        Db::name('merchant_shop_tag')->where('shop_id',$id)->delete();
        if ($ids) Db::name('merchant_shop_tag')->insertAll(array_map(function ($tag) use ($id) { return ['shop_id'=>$id,'tag_id'=>$tag]; },$ids));
    }

    public function documentLink(int $id, string $type, int $target): void
    {
        if (!Db::name('merchant_document_relation')->where(['document_id'=>$id,'target_type'=>$type,'target_id'=>$target])->find()) Db::name('merchant_document_relation')->insert(['document_id'=>$id,'target_type'=>$type,'target_id'=>$target]);
    }

    public function documentMetadata(array $ids): array
    {
        return $ids ? Db::name('merchant_document')->whereIn('id',$ids)->field('id,shop_id,kind,name,mime,size,created_at')->order('id')->select()->toArray() : [];
    }

    private function checkDocuments(array $ids, int $shopId, array $actor, bool $required = false): void
    {
        $docs=$ids ? Db::name('merchant_document')->whereIn('id',$ids)->lock(true)->select()->toArray() : [];
        if (count($docs)!==count($ids)) throw new AdminException('部分资料文件不存在');
        foreach ($docs as $doc) if (!($shopId && (int)$doc['shop_id']===$shopId) && !((int)$doc['shop_id']===0 && $doc['owner_kind']===$actor['kind'] && (int)$doc['owner_id']===(int)$actor['id'])) throw new AdminException('无权关联其他商户或账号的文件');
        if ($required && (!in_array('contract',array_column($docs,'kind')) || !array_intersect(['license','identity'],array_column($docs,'kind')))) throw new AdminException('请上传电子合同和主体证照');
    }

    public function saveShop(int $id, array $input, int $version, array $actor, string $key): array
    {
        return $this->mutate($actor,$key,['save',$id,$version,$input],function () use ($id,$input,$version,$actor) {
            $row=$id?$this->rawShop($id,true):null;
            if ($row && (int)$row['version']!==$version) throw new AdminException('商户资料已被修改，请刷新后重试');
            $pending=$row?$this->pending($id,true):null;
            if ($pending && $pending['status']==='submitted') throw new AdminException('资料正在审核，请先撤回再修改');
            $effective=$row?$this->profile($row):[];
            $before=$pending?MerchantVault::decrypt($pending['data']):$effective;
            $data=MerchantData::normalize($input,$before,$actor['sensitive'] ?? false);
            $this->validateDictionary($data,$before);
            $this->checkDocuments($data['document_ids'],$id,$actor);
            if ($row && !MerchantData::diff($before,$data)) return ['id'=>$id,'version'=>$version,'changed'=>false];
            $time=time();
            if (!$row) {
                $id=(int)Db::name('merchant_shop')->insertGetId(['code'=>'M'.date('ymd').strtoupper(bin2hex(random_bytes(5))),'name'=>$data['name'],'type_id'=>$data['type_id'],'profile'=>MerchantVault::encrypt($data),'created_at'=>$time,'updated_at'=>$time]);
                $this->syncTags($id,$data['tag_ids']);
                $result=['id'=>$id,'version'=>1,'changed'=>true];
                foreach ($data['document_ids'] as $doc) { Db::name('merchant_document')->where('id',$doc)->update(['shop_id'=>$id]); $this->documentLink($doc,'shop',$id); }
                $this->history($id,0,'create','draft',[],$data,$actor,$result);
                return $result;
            }
            $next=$version+1;
            $coreChanged=false;
            $coreFields=array_unique(array_merge(MerchantData::CORE,MerchantData::SUBJECT));
            foreach ($coreFields as $field) if (($data[$field] ?? null)!==($effective[$field] ?? null)) $coreChanged=true;
            $needsReview=$row['audit_status']==='approved' && $coreChanged;
            $applied=$data;
            if ($needsReview) foreach ($coreFields as $field) $applied[$field]=$effective[$field] ?? '';
            // Shared subject fields only change when a submitted snapshot is approved.
            if ($row['subject_id']) foreach (MerchantData::SUBJECT as $field) $applied[$field]=$effective[$field] ?? '';
            Db::name('merchant_shop')->where('id',$id)->update(['name'=>$applied['name'],'type_id'=>$applied['type_id'],'profile'=>MerchantVault::encrypt($applied),'version'=>$next,'updated_at'=>$time]);
            $this->syncTags($id,$applied['tag_ids']);
            $appId=0;
            if ($needsReview) {
                $subjectVersion=$row['subject_id']?(int)Db::name('merchant_subject')->where('id',$row['subject_id'])->value('version'):0;
                $app=['shop_id'=>$id,'uid'=>$row['owner_uid'],'kind'=>'profile_change','status'=>'draft','data'=>MerchantVault::encrypt($data),'base_version'=>$next,'subject_version'=>$subjectVersion,'updated_at'=>$time];
                if ($pending) { $appId=(int)$pending['id']; $app['version']=(int)$pending['version']+1; Db::name('merchant_application')->where('id',$appId)->update($app); }
                else $appId=(int)Db::name('merchant_application')->insertGetId($app+['created_at'=>$time]);
            } elseif ($pending) Db::name('merchant_application')->where('id',$pending['id'])->update(['status'=>'cancelled','updated_at'=>$time]);
            foreach ($data['document_ids'] as $doc) { Db::name('merchant_document')->where('id',$doc)->update(['shop_id'=>$id]); $this->documentLink($doc,'shop',$id); }
            $result=['id'=>$id,'version'=>$next,'changed'=>true,'application_id'=>$appId];
            $this->history($id,$appId,'change',($needsReview || $row['audit_status']!=='approved')?'draft':'effective',$before,$data,$actor,$result,[],['effective_changes'=>MerchantData::diff($effective,$applied)]);
            return $result;
        });
    }

    private function scopeFor(array $data): array
    {
        $identity=MerchantVault::identity($data['subject_kind'],$data['identity_number']);
        $subject=Db::name('merchant_subject')->where('identity_key',$identity)->lock(true)->find();
        $shops=$subject?Db::name('merchant_shop')->where('subject_id',$subject['id'])->order('id')->column('id'):[];
        return ['subject_id'=>$subject?(int)$subject['id']:0,'subject_version'=>$subject?(int)$subject['version']:0,'shop_ids'=>array_map('intval',$shops)];
    }

    private function submitApplicationRow(array $app, array $data, array $actor): int
    {
        if ($app['status']==='submitted' || $app['status']==='approved') throw new AdminException('当前申请状态不能再次提交');
        $scope=$this->scopeFor($data);
        $submission=(int)Db::name('merchant_submission')->insertGetId(['application_id'=>$app['id'],'version'=>(int)$app['version']+1,'data'=>MerchantVault::encrypt($data),'scope'=>json_encode($scope),'created_at'=>time()]);
        Db::name('merchant_application')->where('id',$app['id'])->update(['status'=>'submitted','version'=>(int)$app['version']+1,'submission_id'=>$submission,'data'=>MerchantVault::encrypt($data),'updated_at'=>time(),'opinion'=>'']);
        foreach ($data['document_ids'] as $doc) $this->documentLink($doc,'submission',$submission);
        return $submission;
    }

    public function submitShop(int $id, int $version, array $actor, string $key): array
    {
        return $this->mutate($actor,$key,['submit',$id,$version],function () use ($id,$version,$actor) {
            $row=$this->rawShop($id,true);
            if ((int)$row['version']!==$version) throw new AdminException('商户资料已变更，请刷新');
            $app=$this->pending($id,true);
            $data=$app?MerchantVault::decrypt($app['data']):$this->profile($row);
            if (!$app && $row['audit_status']==='approved') throw new AdminException('没有需要提交的资料修改');
            MerchantData::validateSubmission($data,(bool)$row['is_platform']);
            $this->validateDictionary($data,$this->profile($row));
            $this->checkDocuments($data['document_ids'],$id,$actor,!$row['is_platform']);
            if (!$app) {
                $appId=Db::name('merchant_application')->insertGetId(['shop_id'=>$id,'uid'=>$row['owner_uid'],'kind'=>'onboarding','data'=>MerchantVault::encrypt($data),'base_version'=>$version,'created_at'=>time(),'updated_at'=>time()]);
                $app=Db::name('merchant_application')->where('id',$appId)->find();
            }
            $submission=$this->submitApplicationRow($app,$data,$actor);
            $next=$version+1;
            $update=['version'=>$next,'updated_at'=>time()];
            if ($row['audit_status']!=='approved') $update['audit_status']='submitted';
            Db::name('merchant_shop')->where('id',$id)->update($update);
            Db::name('merchant_application')->where('id',$app['id'])->update(['base_version'=>$next]);
            $result=['id'=>$id,'version'=>$next,'application_id'=>(int)$app['id'],'submission_id'=>$submission];
            $this->history($id,(int)$app['id'],'submit','submitted',$data,$data,$actor,$result,[],['summary'=>'提交商户资料审核']);
            return $result;
        });
    }

    public function applicationInfo(int $id, bool $sensitive = false, int $uid = 0): array
    {
        $app=Db::name('merchant_application')->where('id',$id)->find();
        if (!$app || ($uid && (int)$app['uid']!==$uid)) throw new AdminException('申请不存在或无权访问');
        $data=MerchantVault::decrypt($app['data']);
        unset($app['data']);
        $app['profile']=$sensitive?$data:MerchantData::redact($data);
        $app['documents']=$this->documentMetadata($data['document_ids'] ?? []);
        $app['affected_shops']=[];
        if (!$uid && $app['submission_id']) {
            $scope=json_decode((string)Db::name('merchant_submission')->where('id',$app['submission_id'])->value('scope'),true) ?: [];
            if (!empty($scope['shop_ids'])) $app['affected_shops']=Db::name('merchant_shop')->whereIn('id',$scope['shop_ids'])->field('id,name,version')->select()->toArray();
        }
        return $app;
    }

    public function applications(array $filters, int $page = 1, int $limit = 20, int $uid = 0): array
    {
        $query=Db::name('merchant_application');
        if ($uid) $query->where('uid',$uid);
        foreach (['status','kind'] as $field) if (($filters[$field] ?? '')!=='') $query->where($field,$filters[$field]);
        $count=(clone $query)->count();
        $rows=$query->order('id desc')->page(max(1,$page),min(100,max(1,$limit)))->select()->toArray();
        $list=[];
        foreach ($rows as $row) {
            $data=MerchantVault::decrypt($row['data']);
            unset($row['data']);
            $list[]=$row+['name'=>$data['name'],'subject_name'=>$data['subject_name'],'contact_name'=>$data['contact_name'],'type_name'=>Db::name('merchant_type')->where('id',$data['type_id'])->value('name')];
        }
        return ['list'=>$list,'count'=>$count];
    }

    public function review(int $id, int $version, string $decision, string $opinion, array $actor, string $key): array
    {
        if (!in_array($decision,['approved','rejected','supplement'],true)) throw new AdminException('审核结果不正确');
        $opinion=trim($opinion);
        if (mb_strlen($opinion)>2000 || ($decision!=='approved' && $opinion==='')) throw new AdminException('请填写审核意见（最多2000字）');
        return $this->mutate($actor,$key,['review',$id,$version,$decision,$opinion],function () use ($id,$version,$decision,$opinion,$actor) {
            $app=Db::name('merchant_application')->where('id',$id)->lock(true)->find();
            if (!$app || $app['status']!=='submitted' || (int)$app['version']!==$version) throw new AdminException('申请状态或版本已变化，请刷新');
            $submission=Db::name('merchant_submission')->where('id',$app['submission_id'])->find();
            if (!$submission) throw new AdminException('提交快照不存在');
            $data=MerchantVault::decrypt($submission['data']);
            $shopId=(int)$app['shop_id'];
            $row=$shopId?$this->rawShop($shopId,true):null;
            if ($row && (int)$row['version']!==(int)$app['base_version']) throw new AdminException('商户资料已变化，请撤回重新提交');
            $before=$row?$this->profile($row):[];
            $scope=json_decode($submission['scope'],true);
            $affected=[];
            if ($decision==='approved') {
                MerchantData::validateSubmission($data,$row && $row['is_platform']);
                $this->validateDictionary($data,$before);
                $ownerActor=$row?$actor:['id'=>(int)$app['uid'],'kind'=>'user'];
                $this->checkDocuments($data['document_ids'],$shopId,$ownerActor,!($row && $row['is_platform']));
                $current=$this->scopeFor($data);
                if ($current!==$scope) throw new AdminException('共享主体资料或影响范围已变化，请重新提交');
                $subjectId=$scope['subject_id'];
                if ($row && $row['subject_id'] && (int)$row['subject_id']!==$subjectId) throw new AdminException('不能将已开通商户改为另一法律主体，请新增商户');
                $subjectData=array_intersect_key($data,array_flip(MerchantData::SUBJECT));
                if (!$subjectId) $subjectId=(int)Db::name('merchant_subject')->insertGetId(['identity_key'=>MerchantVault::identity($data['subject_kind'],$data['identity_number']),'name'=>$data['subject_name'],'profile'=>MerchantVault::encrypt($subjectData)]);
                else {
                    $oldSubject=MerchantVault::decrypt((string)Db::name('merchant_subject')->where('id',$subjectId)->value('profile'));
                    if ($oldSubject!==$subjectData) {
                        $affected=$scope['shop_ids'];
                        Db::name('merchant_subject')->where('id',$subjectId)->update(['name'=>$data['subject_name'],'profile'=>MerchantVault::encrypt($subjectData),'version'=>$scope['subject_version']+1]);
                        if ($affected) Db::name('merchant_shop')->whereIn('id',$affected)->where('id','<>',$shopId)->inc('version')->update();
                    }
                }
                $updates=['name'=>$data['name'],'subject_id'=>$subjectId,'type_id'=>$data['type_id'],'profile'=>MerchantVault::encrypt($data),'audit_status'=>'approved','updated_at'=>time()];
                if ($row) { $updates['version']=(int)$row['version']+1; Db::name('merchant_shop')->where('id',$shopId)->update($updates); }
                else {
                    $shopId=(int)Db::name('merchant_shop')->insertGetId($updates+['code'=>'M'.date('ymd').strtoupper(bin2hex(random_bytes(5))),'owner_uid'=>(int)$app['uid'],'created_at'=>time()]);
                    if ($app['uid']) Db::name('merchant_account_shop')->insert(['uid'=>$app['uid'],'shop_id'=>$shopId]);
                    // Connect pre-opening application history without changing those immutable events.
                    foreach (Db::name('merchant_history')->where('application_id',$id)->column('id') as $history) Db::name('merchant_history_scope')->insert(['history_id'=>$history,'shop_id'=>$shopId]);
                }
                $this->syncTags($shopId,$data['tag_ids']);
                foreach ($data['document_ids'] as $doc) { Db::name('merchant_document')->where('id',$doc)->update(['shop_id'=>$shopId]); $this->documentLink($doc,'shop',$shopId); }
            } elseif ($row) {
                $update=['version'=>(int)$row['version']+1,'updated_at'=>time()];
                if ($row['audit_status']!=='approved') $update['audit_status']=$decision;
                Db::name('merchant_shop')->where('id',$shopId)->update($update);
            }
            Db::name('merchant_application')->where('id',$id)->update(['shop_id'=>$shopId,'status'=>$decision,'version'=>$version+1,'reviewer_id'=>$actor['id'],'reviewer_name'=>$actor['name'],'reviewed_at'=>time(),'opinion'=>$opinion,'updated_at'=>time()]);
            $result=['id'=>$shopId,'application_id'=>$id,'status'=>$decision];
            $this->history($shopId,$id,'audit',$decision==='approved'?'effective':$decision,$before,$decision==='approved'?$data:$before,$actor,$result,$affected,['summary'=>['approved'=>'审核通过','rejected'=>'审核驳回','supplement'=>'要求补充'][$decision],'decision'=>$decision,'opinion'=>$opinion,'submission_id'=>(int)$app['submission_id'],'submitted'=>$data]);
            return $result;
        });
    }

    public function withdraw(int $id, int $version, array $actor, string $key): array
    {
        return $this->mutate($actor,$key,['withdraw',$id,$version],function () use ($id,$version,$actor) {
            $app=Db::name('merchant_application')->where('id',$id)->lock(true)->find();
            if (!$app || ($actor['kind']==='user' && (int)$app['uid']!==(int)$actor['id'])) throw new AdminException('申请不存在或无权访问');
            if ($app['status']!=='submitted' || (int)$app['version']!==$version) throw new AdminException('申请状态已变化');
            Db::name('merchant_application')->where('id',$id)->update(['status'=>'withdrawn','version'=>$version+1,'updated_at'=>time()]);
            if ($app['shop_id']) {
                $row=$this->rawShop((int)$app['shop_id'],true);
                $update=['version'=>(int)$row['version']+1,'updated_at'=>time()];
                if ($row['audit_status']!=='approved') $update['audit_status']='draft';
                Db::name('merchant_shop')->where('id',$row['id'])->update($update);
            }
            $result=['id'=>(int)$app['shop_id'],'application_id'=>$id];
            $data=MerchantVault::decrypt($app['data']);
            $this->history((int)$app['shop_id'],$id,'withdraw','withdrawn',$data,$data,$actor,$result,[],['summary'=>'撤回资料申请']);
            return $result;
        });
    }

    public function setState(int $id, int $version, string $state, array $actor, string $key): array
    {
        if (!in_array($state,['open','paused','closed'],true)) throw new AdminException('经营状态不正确');
        return $this->mutate($actor,$key,['state',$id,$version,$state],function () use ($id,$version,$state,$actor) {
            $row=$this->rawShop($id,true);
            if ((int)$row['version']!==$version) throw new AdminException('商户已被修改，请刷新');
            if ($row['is_platform'] && $state!=='open') throw new AdminException('默认平台商户不能停用或关闭');
            if ($state==='open' && ($row['audit_status']!=='approved' || !MerchantData::valid($this->profile($row)))) throw new AdminException('资料审核未通过或证件已过期');
            if ($row['state']===$state) return ['id'=>$id,'version'=>$version,'changed'=>false];
            Db::name('merchant_shop')->where('id',$id)->update(['state'=>$state,'version'=>$version+1,'updated_at'=>time()]);
            $result=['id'=>$id,'version'=>$version+1,'changed'=>true];
            $this->history($id,0,'state','effective',['state'=>$row['state']],['state'=>$state],$actor,$result);
            return $result;
        });
    }

    public function dictionary(string $kind, bool $public = false): array
    {
        if (!in_array($kind,['type','tag'],true)) throw new AdminException('字典类别不正确');
        $query=Db::name('merchant_'.$kind);
        if ($public) { $query->where('status',1); if ($kind==='type') $query->where('apply_selectable',1); }
        $rows=$query->order('sort desc,id desc')->select()->toArray();
        foreach ($rows as &$row) {
            foreach (['id','status','sort','version','apply_selectable'] as $field) if (isset($row[$field])) $row[$field]=(int)$row[$field];
            $row['merchant_count']=$kind==='type'?(int)Db::name('merchant_shop')->where('type_id',$row['id'])->count():(int)Db::name('merchant_shop_tag')->where('tag_id',$row['id'])->count();
        }
        return $rows;
    }

    public function recordExport(int $shopId, array $actor, int $cutoff, int $fileCount): void
    {
        $this->mutate($actor,'export_'.bin2hex(random_bytes(12)),['export',$shopId,$cutoff],function () use ($shopId,$actor,$cutoff,$fileCount) {
            $result=['id'=>$shopId,'cutoff_history_id'=>$cutoff,'file_count'=>$fileCount];
            $this->history($shopId,0,'export','effective',[],[],$actor,$result,[],['summary'=>'导出资料包（历史截止 #'.$cutoff.'，文件 '.$fileCount.' 份）']);
            return $result;
        });
    }

    public function saveDictionary(string $kind, int $id, array $input, int $version, array $actor, string $key): array
    {
        if (!in_array($kind,['type','tag'],true)) throw new AdminException('字典类别不正确');
        return $this->mutate($actor,$key,[$kind,$id,$version,$input],function () use ($kind,$id,$input,$version,$actor) {
            $table='merchant_'.$kind;
            $old=$id?Db::name($table)->where('id',$id)->lock(true)->find():[];
            if ($id && (!$old || (int)$old['version']!==$version)) throw new AdminException('字典已被修改，请刷新');
            $data=[];
            foreach (['name'=>80,'description'=>1000] as $field=>$max) {
                $value=$input[$field] ?? ($old[$field] ?? '');
                if (!is_string($value) || mb_strlen($value)>$max) throw new AdminException('名称或说明长度不正确');
                $data[$field]=trim($value);
            }
            if ($data['name']==='') throw new AdminException('请输入名称');
            if (Db::name($table)->where('name',$data['name'])->where('id','<>',$id)->count()) throw new AdminException('名称已存在');
            foreach (['sort'=>999999,'status'=>1] + ($kind==='type'?['apply_selectable'=>1]:[]) as $field=>$max) {
                $value=$input[$field] ?? ($old[$field] ?? ($field==='sort'?0:1));
                if (is_bool($value) || filter_var($value,FILTER_VALIDATE_INT)===false || $value<0 || $value>$max) throw new AdminException('排序或启用状态不正确');
                $data[$field]=(int)$value;
            }
            if ($kind==='tag') { $data['color']=$input['color'] ?? ($old['color'] ?? '#409EFF'); if (!is_string($data['color']) || !preg_match('/^#[0-9a-f]{6}$/iD',$data['color'])) throw new AdminException('标签颜色不正确'); }
            $comparable=array_intersect_key($old,$data);
            foreach (['sort','status','apply_selectable'] as $field) if (isset($comparable[$field])) $comparable[$field]=(int)$comparable[$field];
            if ($id && $data===$comparable) return ['id'=>$id,'version'=>$version,'changed'=>false];
            $scope=$id?($kind==='type'?Db::name('merchant_shop')->where('type_id',$id)->column('id'):Db::name('merchant_shop_tag')->where('tag_id',$id)->column('shop_id')):[];
            if ($id) Db::name($table)->where('id',$id)->update($data+['version'=>$version+1]);
            else $id=(int)Db::name($table)->insertGetId($data);
            $result=['id'=>$id,'version'=>$old?$version+1:1,'changed'=>true];
            $this->history(0,0,'dictionary','effective',[],[],$actor,$result,$scope,['summary'=>($kind==='type'?'商户类型':'商户标签').'：'.$data['name'],'dictionary'=>['kind'=>$kind,'id'=>$id,'before'=>$old,'after'=>$data]]);
            return $result;
        });
    }

    public function deleteDictionary(string $kind, int $id, int $version, array $actor, string $key): array
    {
        if (!in_array($kind,['type','tag'],true)) throw new AdminException('字典类别不正确');
        return $this->mutate($actor,$key,['delete-'.$kind,$id,$version],function () use ($kind,$id,$version,$actor) {
            $table='merchant_'.$kind;
            $old=Db::name($table)->where('id',$id)->lock(true)->find();
            if (!$old || (int)$old['version']!==$version) throw new AdminException('字典不存在或已修改');
            $used=$kind==='type'?Db::name('merchant_shop')->where('type_id',$id)->count():Db::name('merchant_shop_tag')->where('tag_id',$id)->count();
            if ($used) throw new AdminException('已有关联商户，请停用或先解除关联');
            foreach (Db::name('merchant_application')->whereIn('status',['draft','submitted','supplement','rejected','withdrawn'])->column('data') as $value) {
                $profile=MerchantVault::decrypt($value);
                if (($kind==='type' && (int)$profile['type_id']===$id) || ($kind==='tag' && in_array($id,$profile['tag_ids'],true))) throw new AdminException('有未结束申请引用该选项，请先处理申请');
            }
            Db::name($table)->where('id',$id)->delete();
            $result=['id'=>$id];
            $this->history(0,0,'dictionary','effective',[],[],$actor,$result,[],['summary'=>'删除'.($kind==='type'?'商户类型':'商户标签').'：'.$old['name'],'dictionary'=>['kind'=>$kind,'id'=>$id,'before'=>$old,'after'=>null]]);
            return $result;
        });
    }

    public function histories(int $shopId, array $filters, bool $sensitive, int $page = 1, int $limit = 20, int $applicationId = 0): array
    {
        if ($shopId) $this->rawShop($shopId);
        $query=Db::name('merchant_history')->alias('h');
        if ($shopId) $query->join('merchant_history_scope hs','hs.history_id=h.id')->where('hs.shop_id',$shopId);
        elseif ($applicationId) $query->where('h.application_id',$applicationId);
        else throw new AdminException('请选择商户或申请');
        if (!empty($filters['event_type'])) $query->where('h.event_type',$filters['event_type']);
        if (!empty($filters['actor_name'])) $query->whereLike('h.actor_name','%'.$filters['actor_name'].'%');
        foreach (['from'=>'>=','to'=>'<='] as $field=>$op) if (!empty($filters[$field])) { $time=strtotime((string)$filters[$field]); if ($time===false) throw new AdminException('时间格式不正确'); $query->where('h.created_at',$op,$time); }
        $count=(clone $query)->count();
        $rows=$query->field('h.*')->order('h.id desc')->page(max(1,$page),min(200,max(1,$limit)))->select()->toArray();
        foreach ($rows as &$row) {
            $payload=MerchantVault::decrypt($row['payload']);
            unset($row['payload'],$row['event_key']);
            foreach (['before','after','submitted'] as $field) if (isset($payload[$field])) {
                $row[$field]=$sensitive?$payload[$field]:MerchantData::redact($payload[$field]);
                if (!$sensitive) foreach (['contact_phone','representative_phone','service_phone'] as $phone) if (isset($row[$field][$phone])) $row[$field][$phone]=MerchantData::maskValue($row[$field][$phone]);
            }
            $changes=$payload['changes'] ?? [];
            foreach ($changes as &$change) if (!$sensitive && in_array($change['field'],array_merge(MerchantData::SENSITIVE,['contact_phone','representative_phone','service_phone']),true)) foreach (['before','after'] as $side) $change[$side]=MerchantData::maskValue((string)$change[$side]);
            unset($change);
            $row['changes']=$changes;
            foreach (['dictionary','decision','opinion','submission_id'] as $field) if (isset($payload[$field])) $row[$field]=$payload[$field];
            if (isset($payload['effective_changes'])) {
                $row['effective_changes']=$payload['effective_changes'];
                if (!$sensitive) foreach ($row['effective_changes'] as &$change) if (in_array($change['field'],array_merge(MerchantData::SENSITIVE,['contact_phone','representative_phone','service_phone']),true)) foreach (['before','after'] as $side) $change[$side]=MerchantData::maskValue((string)$change[$side]);
                unset($change);
            }
            $docs=array_unique(array_merge($payload['before']['document_ids'] ?? [],$payload['after']['document_ids'] ?? [],$payload['submitted']['document_ids'] ?? []));
            $row['documents']=$this->documentMetadata($docs);
        }
        return ['list'=>$rows,'count'=>$count];
    }

    public function saveUserApplication(int $id, array $input, int $version, array $actor, string $key): array
    {
        return $this->mutate($actor,$key,['user-application',$id,$version,$input],function () use ($id,$input,$version,$actor) {
            $app=$id?Db::name('merchant_application')->where('id',$id)->lock(true)->find():null;
            if ($id && (!$app || (int)$app['uid']!==(int)$actor['id'] || $app['shop_id'])) throw new AdminException('申请不存在或不能修改');
            if ($app && ((int)$app['version']!==$version || in_array($app['status'],['submitted','approved'],true))) throw new AdminException('申请正在审核或已变更，请刷新');
            $before=$app?MerchantVault::decrypt($app['data']):[];
            $input['tag_ids']=[];
            $data=MerchantData::normalize($input,$before,true);
            $this->validateDictionary($data,$before,true);
            $this->checkDocuments($data['document_ids'],0,$actor);
            if ($app && !MerchantData::diff($before,$data)) return ['id'=>$id,'version'=>$version,'changed'=>false];
            $values=['uid'=>$actor['id'],'status'=>'draft','data'=>MerchantVault::encrypt($data),'version'=>$app?$version+1:1,'updated_at'=>time()];
            if ($app) Db::name('merchant_application')->where('id',$id)->update($values);
            else $id=(int)Db::name('merchant_application')->insertGetId($values+['created_at'=>time()]);
            $result=['id'=>$id,'version'=>$values['version'],'changed'=>true];
            $this->history(0,$id,$app?'change':'create','draft',$before,$data,$actor,$result);
            return $result;
        });
    }

    public function submitUserApplication(int $id, int $version, array $actor, string $key): array
    {
        return $this->mutate($actor,$key,['user-submit',$id,$version],function () use ($id,$version,$actor) {
            $app=Db::name('merchant_application')->where('id',$id)->lock(true)->find();
            if (!$app || (int)$app['uid']!==(int)$actor['id'] || $app['shop_id']) throw new AdminException('申请不存在或无权提交');
            if ((int)$app['version']!==$version) throw new AdminException('申请已修改，请刷新');
            $data=MerchantVault::decrypt($app['data']);
            MerchantData::validateSubmission($data);
            $this->validateDictionary($data,$data,true);
            $this->checkDocuments($data['document_ids'],0,$actor,true);
            $submission=$this->submitApplicationRow($app,$data,$actor);
            $result=['id'=>$id,'version'=>$version+1,'submission_id'=>$submission];
            $this->history(0,$id,'submit','submitted',$data,$data,$actor,$result,[],['summary'=>'提交入驻申请']);
            return $result;
        });
    }
}
