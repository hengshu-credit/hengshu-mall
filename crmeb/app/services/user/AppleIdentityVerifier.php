<?php

namespace app\services\user;

use Firebase\JWT\JWT;
use GuzzleHttp\Client;
use UnexpectedValueException;

/** Verify native Sign in with Apple credentials before selecting a local user. */
class AppleIdentityVerifier
{
    public function verify(string $identityToken, string $openId = ''): array
    {
        $audience = config('apple.client_id', '');
        if (!is_string($audience) || trim($audience) === '' || $identityToken === '' || strlen($identityToken) > 16384) {
            throw new UnexpectedValueException('Apple credential or client configuration missing');
        }
        $parts = explode('.', $identityToken);
        if (count($parts) !== 3) {
            throw new UnexpectedValueException('Invalid Apple credential');
        }
        $header = json_decode(JWT::urlsafeB64Decode($parts[0]), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'RS256'
            || !is_string($header['kid'] ?? null) || $header['kid'] === '' || !empty($header['crit'])) {
            throw new UnexpectedValueException('Invalid Apple signing algorithm or key identifier');
        }
        // Only keys from Apple's fixed HTTPS endpoint are trusted; token URLs/keys are ignored.
        $publicKey = null;
        foreach ($this->fetchKeys() as $key) {
            if (is_array($key) && ($key['kid'] ?? null) === $header['kid']
                && ($key['kty'] ?? '') === 'RSA' && ($key['alg'] ?? '') === 'RS256'
                && ($key['use'] ?? '') === 'sig') {
                $publicKey = $this->rsaPublicKey($key);
                break;
            }
        }
        if ($publicKey === null) {
            throw new UnexpectedValueException('Unknown Apple signing key');
        }
        $claims = (array)JWT::decode($identityToken, $publicKey, ['RS256']);
        $now = time();
        if (($claims['iss'] ?? null) !== 'https://appleid.apple.com'
            || ($claims['aud'] ?? null) !== $audience
            || !is_int($claims['exp'] ?? null) || $claims['exp'] <= $now
            || !is_int($claims['iat'] ?? null) || $claims['iat'] > $now
            || !is_string($claims['sub'] ?? null) || $claims['sub'] === ''
            || ($openId !== '' && !hash_equals($claims['sub'], $openId))) {
            throw new UnexpectedValueException('Invalid Apple identity claims');
        }
        return $claims;
    }

    protected function fetchKeys(): array
    {
        $response = (new Client())->get('https://appleid.apple.com/auth/keys', [
            'verify' => true,
            'allow_redirects' => false,
            'connect_timeout' => 3,
            'timeout' => 5,
            'headers' => ['Accept' => 'application/json'],
        ]);
        if ($response->getStatusCode() !== 200) {
            throw new UnexpectedValueException('Apple public keys unavailable');
        }
        $data = json_decode((string)$response->getBody(), true);
        if (!is_array($data) || !isset($data['keys']) || !is_array($data['keys'])) {
            throw new UnexpectedValueException('Invalid Apple public keys');
        }
        return $data['keys'];
    }

    /** The installed php-jwt 5.0 has no JWK parser; encode RSA n/e as SubjectPublicKeyInfo. */
    private function rsaPublicKey(array $key): string
    {
        $integers = '';
        foreach (['n', 'e'] as $field) {
            if (!isset($key[$field]) || !is_string($key[$field]) || !preg_match('/^[A-Za-z0-9_-]+$/D', $key[$field])) {
                throw new UnexpectedValueException('Invalid Apple RSA key');
            }
            $value = ltrim(JWT::urlsafeB64Decode($key[$field]), "\x00");
            if ($value === '') {
                throw new UnexpectedValueException('Empty Apple RSA key parameter');
            }
            if (ord($value[0]) > 127) $value = "\x00" . $value;
            $integers .= "\x02" . $this->derLength(strlen($value)) . $value;
        }
        $der = "\x30" . $this->derLength(strlen($integers)) . $integers;
        $bitString = "\x03" . $this->derLength(strlen($der) + 1) . "\x00" . $der;
        $algorithm = hex2bin('300d06092a864886f70d0101010500');
        $der = "\x30" . $this->derLength(strlen($algorithm . $bitString)) . $algorithm . $bitString;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private function derLength(int $length): string
    {
        if ($length < 128) return chr($length);
        $bytes = ltrim(pack('N', $length), "\x00");
        return chr(128 | strlen($bytes)) . $bytes;
    }
}
