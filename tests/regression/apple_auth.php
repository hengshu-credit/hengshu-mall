<?php
require __DIR__ . '/apple_bootstrap.php';
$login = (new ReflectionClass(app\api\controller\v1\LoginController::class))->newInstanceWithoutConstructor();
$auth = new AppleAuthSpy;
$missing = $login->appleLogin(new AppleRequest(['openId' => 'victim-subject']), $auth);
appleCheck('openId alone cannot authenticate', $missing['status'] !== 200 && count($auth->calls) === 0);

class AppleFixtureVerifier extends app\services\user\AppleIdentityVerifier {
    public $keys;
    public $failFetch = false;
    protected function fetchKeys(): array {
        if ($this->failFetch) throw new RuntimeException('network unavailable');
        return $this->keys;
    }
}
$verifier = new AppleFixtureVerifier;
$appleContainer->instances[app\services\user\AppleIdentityVerifier::class] = $verifier;
$privateKey = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
$rsa = openssl_pkey_get_details($privateKey)['rsa'];
$verifier->keys = [['kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'test-key',
    'n' => Firebase\JWT\JWT::urlsafeB64Encode($rsa['n']), 'e' => Firebase\JWT\JWT::urlsafeB64Encode($rsa['e'])]];
$claims = ['iss' => 'https://appleid.apple.com', 'aud' => 'com.example.regression',
    'sub' => 'verified-subject', 'iat' => time() - 10, 'exp' => time() + 300, 'email' => 'verified@example.test'];
function appleToken(array $claims, $key, $kid = 'test-key', $alg = 'RS256') {
    return Firebase\JWT\JWT::encode($claims, $key, $alg, $kid);
}
$token = appleToken($claims, $privateKey);
$valid = $login->appleLogin(new AppleRequest(['identityToken' => $token, 'email' => 'untrusted@example.test']), $auth);
appleCheck('signed Apple subject selects account without client openId', $valid['status'] === 200 && $auth->calls[0]['data']['openId'] === 'verified-subject');
appleCheck('profile email comes from signed claims', $auth->calls[0]['data']['nickName'] === 'verified@example.test');
$invalid = [
    'forged signature' => appleToken($claims, openssl_pkey_new(['private_key_bits' => 2048])),
    'wrong issuer' => appleToken(array_replace($claims, ['iss' => 'https://attacker.test']), $privateKey),
    'wrong audience' => appleToken(array_replace($claims, ['aud' => 'com.other.app']), $privateKey),
    'array audience' => appleToken(array_replace($claims, ['aud' => ['com.example.regression']]), $privateKey),
    'expired token' => appleToken(array_replace($claims, ['exp' => time() - 1]), $privateKey),
    'missing expiry' => appleToken(array_diff_key($claims, ['exp' => true]), $privateKey),
    'string expiry' => appleToken(array_replace($claims, ['exp' => '99999999999']), $privateKey),
    'future issued token' => appleToken(array_replace($claims, ['iat' => time() + 300]), $privateKey),
    'missing subject' => appleToken(array_diff_key($claims, ['sub' => true]), $privateKey),
    'empty subject' => appleToken(array_replace($claims, ['sub' => '']), $privateKey),
    'unknown key' => appleToken($claims, $privateKey, 'unknown'),
    'algorithm confusion' => appleToken($claims, openssl_pkey_get_details($privateKey)['key'], 'test-key', 'HS256'),
    'malformed token' => 'not.a.token',
];
foreach ($invalid as $name => $badToken) {
    $count = count($auth->calls);
    $result = $login->appleLogin(new AppleRequest(['identityToken' => $badToken, 'openId' => 'verified-subject']), $auth);
    appleCheck($name . ' cannot authenticate', $result['status'] !== 200 && count($auth->calls) === $count);
}
$count = count($auth->calls);
$wrongSubject = $login->appleLogin(new AppleRequest(['identityToken' => $token, 'openId' => 'victim-subject']), $auth);
appleCheck('client cannot substitute another subject', $wrongSubject['status'] !== 200 && count($auth->calls) === $count);
$appleClientId = '';
$noConfig = $login->appleLogin(new AppleRequest(['identityToken' => $token]), $auth);
appleCheck('missing audience configuration fails closed', $noConfig['status'] !== 200 && count($auth->calls) === $count);
$appleClientId = 'com.example.regression';
$verifier->failFetch = true;
$outage = $login->appleLogin(new AppleRequest(['identityToken' => $token]), $auth);
appleCheck('key retrieval outage fails closed', $outage['status'] !== 200 && count($auth->calls) === $count);
$verifier->failFetch = false;
$auth->result = false;
$bind = $login->appleLogin(new AppleRequest(['identityToken' => $token]), $auth);
appleCheck('valid credential preserves phone binding prompt', $bind['data']['isbind'] === true);
$count = count($auth->calls);
$badSms = $login->appleLogin(new AppleRequest(['identityToken' => $token, 'phone' => '13800000000', 'captcha' => '123456']), $auth);
appleCheck('binding still requires SMS proof', $badSms['status'] !== 200 && count($auth->calls) === $count);
AppleCache::$values['code_13800000000'] = '123456';
$auth->result = ['token' => 'synthetic-session'];
$bound = $login->appleLogin(new AppleRequest(['identityToken' => $token, 'phone' => '13800000000', 'captcha' => '123456']), $auth);
appleCheck('signed credential and SMS proof preserve binding', $bound['status'] === 200 && end($auth->calls)['phone'] === '13800000000');
