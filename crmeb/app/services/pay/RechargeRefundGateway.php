<?php
namespace app\services\pay;

use crmeb\services\pay\Pay;

/** Only explicit, matching provider outcomes are authoritative. Exceptions stay unknown. */
class RechargeRefundGateway
{
    protected function client(array $attempt) { return app()->make(Pay::class,[$attempt['driver']]); }
    public function send(array $attempt, array $order): void
    {
        $options=['pay_price'=>$order['price'],'refund_price'=>$attempt['principal'],
            'refund_id'=>$attempt['refund_no'],'refund_no'=>$attempt['refund_no'],
            'order_id'=>$attempt['refund_no'],'totalAmount'=>$attempt['principal'],
            'type'=>'out_trade_no','wechat'=>true];
        $reference=$attempt['driver']==='wechat_pay'||$attempt['driver']==='ali_pay' ? $order['order_id'] : $order['trade_no'];
        if (!$reference) throw new \RuntimeException('Original payment reference is missing');
        $this->client($attempt)->refund($reference,$options);
    }

    public function query(array $attempt, array $order): array
    {
        $reference=$attempt['driver']==='ali_pay'?$order['order_id']:$attempt['refund_no'];
        $result=$this->client($attempt)->queryRefund($reference,$attempt['refund_no'],['type'=>'out_refund_no']);
        return self::interpret($attempt,$result);
    }

    public static function interpret(array $attempt, $result): array
    {
        if (is_object($result)) $result=method_exists($result,'toArray')?$result->toArray():get_object_vars($result);
        if (!is_array($result)) return ['state'=>'unknown'];
        $no=$attempt['refund_no']; $amount=$attempt['principal'];
        switch($attempt['driver']) {
            case 'v3_wechat_pay':
                if (($result['code']??'')==='RESOURCE_NOT_EXISTS') return ['state'=>'not_found'];
                if (($result['out_refund_no']??'')!==$no) return ['state'=>'unknown'];
                if ((string)($result['amount']['refund']??'')!==bcmul($amount,'100',0)) return ['state'=>'unknown'];
                $status=$result['status']??'';
                return ['state'=>$status==='SUCCESS'?'succeeded':($status==='CLOSED'?'failed':'unknown'),'reference'=>$result['refund_id']??''];
            case 'wechat_pay':
                if (($result['return_code']??'')!=='SUCCESS') return ['state'=>'unknown'];
                if (($result['err_code']??'')==='REFUNDNOTEXIST') return ['state'=>'not_found'];
                if (($result['result_code']??'')!=='SUCCESS') return ['state'=>'unknown'];
                for($i=0;$i<(int)($result['refund_count']??0);$i++) {
                    if (($result['out_refund_no_'.$i]??'')!==$no || (string)($result['refund_fee_'.$i]??'')!==bcmul($amount,'100',0)) continue;
                    $status=$result['refund_status_'.$i]??'';
                    return ['state'=>$status==='SUCCESS'?'succeeded':($status==='REFUNDCLOSE'?'failed':'unknown'),'reference'=>$result['refund_id_'.$i]??''];
                }
                return ['state'=>'unknown'];
            case 'ali_pay':
                $requestNo=$result['outRequestNo']??$result['out_request_no']??'';
                $refundAmount=$result['refundAmount']??$result['refund_amount']??null;
                $status=$result['refundStatus']??$result['refund_status']??'';
                if (($result['code']??'')!=='10000' || $requestNo!==$no) return ['state'=>'unknown'];
                if ($refundAmount!==null && is_numeric($refundAmount) && bccomp((string)$refundAmount,$amount,2)===0 && ($status==='REFUND_SUCCESS' || !empty($result['gmtRefundPay']) || !empty($result['gmt_refund_pay']))) return ['state'=>'succeeded','reference'=>$result['tradeNo']??$result['trade_no']??''];
                return ['state'=>'unknown'];
            case 'allin_pay':
                if (($result['retcode']??'')==='SUCCESS' && ($result['reqsn']??'')===$no && ($result['trxstatus']??'')==='0000' && (string)($result['trxamt']??'')===bcmul($amount,'100',0)) return ['state'=>'succeeded','reference'=>$result['trxid']??''];
                return ['state'=>'unknown'];
        }
        return ['state'=>'unknown'];
    }
}
