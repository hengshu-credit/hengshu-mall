param([ValidateSet('storefront.php','merchant_theme.php')][string]$TestFile='storefront.php')
$ErrorActionPreference='Stop'
$storefrontRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$storefrontContainer='crmeb-storefront-test-'+[guid]::NewGuid().ToString('N').Substring(0,10)
$storefrontTestKey='1' * 64
try {
    docker run -d --rm --name $storefrontContainer --network none -e MYSQL_ROOT_PASSWORD=merchant-test-only -e MYSQL_DATABASE=crmeb_merchant_test ccr.ccs.tencentyun.com/crmebky_php/mysql:v8.0.45 | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Cannot start isolated MySQL'}
    $ready=$false
    for($attempt=0;$attempt -lt 60;$attempt++) {
        docker exec -e MYSQL_PWD=merchant-test-only $storefrontContainer mysql --protocol=tcp --host=127.0.0.1 --user=root crmeb_merchant_test '--execute=SELECT 1' 2>&1 | Out-Null
        if($LASTEXITCODE -eq 0){$ready=$true;break}
        Start-Sleep -Seconds 1
    }
    if(!$ready){throw 'Isolated MySQL did not become ready'}
    docker run --rm --network "container:$storefrontContainer" -e CRMEB_AUDIT_DATABASE=crmeb_merchant_test -e CRMEB_MERCHANT_STORAGE=/tmp/merchant-private -e "CRMEB_MERCHANT_KEY=$storefrontTestKey" --entrypoint php --mount "type=bind,source=$storefrontRoot,target=/var/test,readonly" -v crmeb_php_vendor:/var/test/crmeb/vendor:ro ccr.ccs.tencentyun.com/crmebky_php/php:v7.4 "/var/test/tests/regression/$TestFile"
    if($LASTEXITCODE -ne 0){throw 'Storefront regressions failed'}
} finally { docker stop $storefrontContainer | Out-Null }
