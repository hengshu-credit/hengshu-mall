<?php
namespace app\services\merchant;

use crmeb\exceptions\AdminException;

class MerchantData
{
    public const SUBJECT = ['subject_kind', 'subject_name', 'identity_number', 'representative', 'representative_title', 'representative_phone', 'registered_address', 'business_scope', 'registration_authority', 'established_date', 'valid_until'];
    public const SENSITIVE = ['identity_number', 'bank_account'];
    public const CORE = ['subject_kind', 'subject_name', 'identity_number', 'representative', 'registered_address', 'valid_until', 'bank_name', 'bank_branch', 'bank_account', 'bank_holder', 'bank_kind', 'document_ids'];
    public const LABELS = ['name'=>'商户名称','type_id'=>'商户类型','tag_ids'=>'商户标签','logo'=>'Logo','description'=>'简介','remark'=>'备注','subject_kind'=>'主体类别','subject_name'=>'主体名称','identity_number'=>'身份号码／信用代码','representative'=>'法定代表人／经营者','representative_title'=>'职务','representative_phone'=>'代表人联系电话','registered_address'=>'注册地址','business_address'=>'经营地址','contact_name'=>'联系人','contact_phone'=>'联系电话','contact_email'=>'邮箱','contact_address'=>'联系地址','postal_code'=>'邮编','service_phone'=>'客服电话','business_scope'=>'经营范围','registration_authority'=>'登记机关','established_date'=>'成立日期','valid_until'=>'证件有效期','bank_name'=>'开户银行','bank_branch'=>'开户支行','bank_account'=>'银行账号','bank_holder'=>'账户户名','bank_kind'=>'账户类型','document_ids'=>'电子合同／资质附件','state'=>'经营状态','audit_status'=>'审核状态'];

    public static function ids($value): array
    {
        if (!is_array($value) || count($value) > 100) throw new AdminException('关联选项格式不正确');
        $ids = [];
        foreach ($value as $id) {
            if (is_bool($id) || filter_var($id, FILTER_VALIDATE_INT) === false || (int)$id < 1) throw new AdminException('关联选项格式不正确');
            $ids[] = (int)$id;
        }
        $ids = array_values(array_unique($ids)); sort($ids); return $ids;
    }

    public static function normalize(array $input, array $old = [], bool $sensitive = true): array
    {
        $data = $old;
        foreach (self::LABELS as $field => $label) {
            if (in_array($field, ['state', 'audit_status'], true)) continue;
            if (!array_key_exists($field, $input)) {
                if (!array_key_exists($field, $data)) $data[$field] = in_array($field, ['tag_ids', 'document_ids']) ? [] : ($field === 'type_id' ? 0 : '');
                continue;
            }
            $value = $input[$field];
            if (in_array($field, self::SENSITIVE, true) && !$sensitive) {
                if ($value === self::maskValue((string)($old[$field] ?? ''))) continue;
                throw new AdminException('没有修改敏感资料的权限');
            }
            if (in_array($field, ['tag_ids', 'document_ids'], true)) $data[$field] = self::ids($value);
            elseif ($field === 'type_id') {
                if (is_bool($value) || filter_var($value, FILTER_VALIDATE_INT) === false || (int)$value < 1) throw new AdminException('请选择商户类型');
                $data[$field] = (int)$value;
            } else {
                if (!is_string($value) || mb_strlen($value) > (in_array($field, ['description','remark','business_scope']) ? 2000 : 250)) throw new AdminException($label . '格式或长度不正确');
                $data[$field] = trim($value);
            }
        }
        if ($data['name'] === '' || mb_strlen($data['name']) > 120) throw new AdminException('商户名称需为1至120个字符');
        if (!in_array($data['subject_kind'], ['company','organization','individual','person'], true)) throw new AdminException('请选择主体类别');
        if ($data['contact_email'] !== '' && !filter_var($data['contact_email'], FILTER_VALIDATE_EMAIL)) throw new AdminException('邮箱格式不正确');
        foreach (['contact_phone','representative_phone','service_phone'] as $field) if ($data[$field] !== '' && !preg_match('/^[+0-9()\- ]{5,40}$/D', $data[$field])) throw new AdminException(self::LABELS[$field] . '格式不正确');
        foreach (['valid_until','established_date'] as $field) if ($data[$field] !== '' && $data[$field] !== '长期') {
            $date = \DateTime::createFromFormat('!Y-m-d', $data[$field]);
            if (!$date || $date->format('Y-m-d') !== $data[$field]) throw new AdminException(self::LABELS[$field] . '格式不正确');
        }
        if ($data['logo'] !== '' && !preg_match('#^(https?://[^\s]+|/(?!/)[^\s]*)$#D', $data['logo'])) throw new AdminException('Logo 地址不正确');
        return $data;
    }

    public static function validateSubmission(array $data, bool $platform = false): void
    {
        foreach (['name','type_id','subject_name','identity_number','representative','registered_address','business_address','contact_name','contact_phone'] as $field) if (empty($data[$field])) throw new AdminException('请填写' . self::LABELS[$field]);
        if (!$platform && empty($data['document_ids'])) throw new AdminException('请上传电子合同及主体证照');
        if (!self::valid($data)) throw new AdminException('主体证件已过期，请更新资料');
    }

    public static function valid(array $data): bool
    {
        $date = $data['valid_until'] ?? '';
        return $date === '' || $date === '长期' || $date >= date('Y-m-d');
    }

    public static function maskValue(string $value): string
    {
        return $value === '' ? '' : (mb_strlen($value) <= 4 ? str_repeat('*', mb_strlen($value)) : mb_substr($value, 0, 2) . '****' . mb_substr($value, -4));
    }

    public static function redact(array $data): array
    {
        foreach (self::SENSITIVE as $key) if (isset($data[$key])) $data[$key] = self::maskValue((string)$data[$key]);
        return $data;
    }

    public static function diff(array $before, array $after): array
    {
        $diff = [];
        foreach (self::LABELS as $field => $label) if (($before[$field] ?? null) !== ($after[$field] ?? null)) $diff[] = ['field'=>$field,'label'=>$label,'before'=>$before[$field] ?? null,'after'=>$after[$field] ?? null];
        return $diff;
    }
}
