param(
    [string]$PhpImage = 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4',
    [string]$MysqlImage = 'ccr.ccs.tencentyun.com/crmebky_php/mysql:v8.0.45'
)
$ErrorActionPreference = 'Stop'
$merchantRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$merchantContainer = 'crmeb-merchant-test-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
try {
    docker run -d --rm --name $merchantContainer --network none -e MYSQL_ROOT_PASSWORD=merchant-test-only -e MYSQL_DATABASE=crmeb_merchant_test $MysqlImage | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start isolated MySQL' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $ErrorActionPreference = 'Continue'
        docker exec -e MYSQL_PWD=merchant-test-only $merchantContainer mysql --protocol=tcp --host=127.0.0.1 --user=root crmeb_merchant_test '--execute=SELECT 1' 2>&1 | Out-Null
        $ErrorActionPreference = 'Stop'
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Isolated MySQL did not become ready' }
    docker run --rm --network "container:$merchantContainer" -e CRMEB_AUDIT_DATABASE=crmeb_merchant_test -e CRMEB_MERCHANT_STORAGE=/tmp/merchant-private -e CRMEB_MERCHANT_KEY=1111111111111111111111111111111111111111111111111111111111111111 --entrypoint php --mount "type=bind,source=$merchantRoot,target=/var/test,readonly" -v crmeb_php_vendor:/var/test/crmeb/vendor:ro $PhpImage /var/test/tests/regression/merchants.php
    if ($LASTEXITCODE -ne 0) { throw 'Merchant regressions failed' }
} finally {
    docker stop $merchantContainer | Out-Null
}
