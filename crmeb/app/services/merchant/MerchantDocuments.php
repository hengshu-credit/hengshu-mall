<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;
use think\facade\Db;

class MerchantDocuments
{
    public const MAX_SIZE = 20971520;

    public function upload($file, string $kind, int $shopId, array $actor): array
    {
        MerchantInstaller::ensure();
        if (!in_array($kind,['contract','license','identity','qualification'],true)) throw new AdminException('请选择文件类别');
        if (!$file || !$file->isValid()) throw new AdminException('请选择有效文件');
        if ($shopId) {
            $shop=(new MerchantServices())->rawShop($shopId);
            if ($actor['kind']==='user' && !Db::name('merchant_account_shop')->where(['uid'=>$actor['id'],'shop_id'=>$shopId])->find()) throw new AdminException('无权上传其他商户资料');
        }
        $size=$file->getSize();
        if ($size<1 || $size>self::MAX_SIZE) throw new AdminException('文件大小须在20MB以内');
        $mime=(new \finfo(FILEINFO_MIME_TYPE))->file($file->getPathname());
        $extensions=['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
        if (!isset($extensions[$mime])) throw new AdminException('仅支持PDF、JPG、PNG和WebP文件');
        $original=$file->getOriginalName();
        if (!is_string($original) || !mb_check_encoding($original,'UTF-8')) throw new AdminException('文件名编码不正确');
        $name=mb_substr(preg_replace('/[\x00-\x1f\x7f\\\\\/]/u','_',basename($original)),0,220);
        $originalExt=strtolower(pathinfo($original,PATHINFO_EXTENSION));
        if (!in_array($originalExt,['pdf','jpg','jpeg','png','webp'],true) || ($mime==='application/pdf' && $originalExt!=='pdf') || ($mime!=='application/pdf' && $originalExt==='pdf')) throw new AdminException('文件后缀与内容不匹配');
        if ($mime==='application/pdf' && file_get_contents($file->getPathname(),false,null,0,5)!=='%PDF-') throw new AdminException('PDF文件内容不正确');
        if ($mime!=='application/pdf' && !@getimagesize($file->getPathname())) throw new AdminException('图片文件内容不正确');
        $storage=bin2hex(random_bytes(24)).'.'.$extensions[$mime];
        $directory=MerchantVault::directory().'documents/';
        if (!is_dir($directory) && !mkdir($directory,0700,true) && !is_dir($directory)) throw new AdminException('无法保存私有文件');
        $destination=$directory.$storage;
        if (!copy($file->getPathname(),$destination)) throw new AdminException('文件保存失败');
        chmod($destination,0600);
        try {
            $id=Db::name('merchant_document')->insertGetId(['shop_id'=>$shopId,'owner_id'=>$actor['id'],'owner_kind'=>$actor['kind'],'kind'=>$kind,'name'=>$name,'storage_name'=>$storage,'mime'=>$mime,'size'=>$size,'sha256'=>hash_file('sha256',$destination),'created_at'=>time()]);
        } catch (\Throwable $e) { unlink($destination); throw $e; }
        return (new MerchantServices())->documentMetadata([(int)$id])[0];
    }

    public function get(int $id, array $actor): array
    {
        MerchantInstaller::ensure();
        $doc=Db::name('merchant_document')->where('id',$id)->find();
        if (!$doc) throw new AdminException('资料文件不存在');
        if ($actor['kind']==='user') {
            $owned=$doc['owner_kind']==='user' && (int)$doc['owner_id']===(int)$actor['id'];
            if (!$owned && (!$doc['shop_id'] || !Db::name('merchant_account_shop')->where(['uid'=>$actor['id'],'shop_id'=>$doc['shop_id']])->find())) throw new AdminException('没有访问资料文件的权限');
        }
        if (!preg_match('/^[a-f0-9]{48}\.(pdf|jpg|png|webp)$/D',$doc['storage_name'])) throw new AdminException('资料存储引用不正确');
        $path=MerchantVault::directory().'documents/'.$doc['storage_name'];
        if (!is_file($path)) throw new AdminException('原文件缺失，请检查备份');
        if (!hash_equals($doc['sha256'],hash_file('sha256',$path))) throw new AdminException('资料文件校验失败');
        return ['path'=>$path,'name'=>$doc['name'],'mime'=>$doc['mime'],'sha256'=>$doc['sha256']];
    }

    public function response(int $id, array $actor, bool $preview = false)
    {
        $file=$this->get($id,$actor);
        return response(file_get_contents($file['path']),200)->header(['Content-Type'=>$file['mime'],'Content-Disposition'=>($preview?'inline':'attachment')."; filename*=UTF-8''".rawurlencode($file['name']),'Cache-Control'=>'private, no-store','Pragma'=>'no-cache','X-Content-Type-Options'=>'nosniff','Content-Security-Policy'=>"sandbox; default-src 'none'"]);
    }

    public function export(int $shopId, array $actor)
    {
        $service=new MerchantServices();
        [$info,$history]=Db::transaction(function () use ($service,$shopId,$actor) {
            $info=$service->info($shopId,$actor['sensitive'] ?? false);
            $history=[];
            for ($page=1;;$page++) { $batch=$service->histories($shopId,[],$actor['sensitive'] ?? false,$page,200); $history=array_merge($history,$batch['list']); if (count($history)>=$batch['count']) break; }
            return [$info,$history];
        });
        $docIds=array_column($info['documents'],'id');
        foreach ($history as $event) foreach ($event['documents'] as $doc) $docIds[]=$doc['id'];
        $docIds=array_values(array_unique($docIds));
        if ($docIds && Db::name('merchant_document')->whereIn('id',$docIds)->sum('size')>41943040) throw new AdminException('原文件合计超过40MB，请在文件列表分批下载');
        $temp=tempnam(MerchantVault::directory(),'export-');
        $zip=new \ZipArchive();
        if ($zip->open($temp,\ZipArchive::OVERWRITE)!==true) throw new AdminException('无法生成资料包');
        try {
            $zip->addFromString('商户资料.json',json_encode($info,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
            $zip->addFromString('历史记录.json',json_encode($history,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
            $cutoff=$history?(int)$history[0]['id']:0;
            $manifest=['exported_at'=>date(DATE_ATOM),'merchant_id'=>$shopId,'cutoff_history_id'=>$cutoff,'actor'=>$actor['name'],'files'=>[],'missing'=>[]];
            foreach ($docIds as $id) {
                try { $file=$this->get((int)$id,$actor); } catch (AdminException $e) { $manifest['missing'][]=['id'=>$id,'reason'=>$e->getMessage()]; continue; }
                $entry='files/'.$id.'-'.preg_replace('/[\\\\\/\x00-\x1f]/u','_',$file['name']);
                $zip->addFile($file['path'],$entry);
                $manifest['files'][]=['id'=>$id,'name'=>$entry,'sha256'=>$file['sha256']];
            }
            $zip->addFromString('资料目录.json',json_encode($manifest,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
            $zip->close();
            $bytes=file_get_contents($temp);
        } finally { if (is_file($temp)) unlink($temp); }
        $service->recordExport($shopId,$actor,$cutoff,count($manifest['files']));
        return response($bytes,200)->header(['Content-Type'=>'application/zip','Content-Disposition'=>"attachment; filename*=UTF-8''".rawurlencode('商户-'.$shopId.'-资料包.zip'),'Cache-Control'=>'private, no-store','X-Content-Type-Options'=>'nosniff']);
    }
}
