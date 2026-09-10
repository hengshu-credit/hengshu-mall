param(
    [string]$PhpImage = 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4',
    [string]$MysqlImage = 'ccr.ccs.tencentyun.com/crmebky_php/mysql:v8.0.45'
)
$ErrorActionPreference = 'Stop'
$brandRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$brandContainer = 'crmeb-brand-test-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
try {
    docker run -d --rm --name $brandContainer --network none -e MYSQL_ROOT_PASSWORD=brand-audit-only -e MYSQL_DATABASE=crmeb_brand_audit $MysqlImage | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start isolated MySQL' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        docker exec $brandContainer mysql --protocol=tcp --host=127.0.0.1 --user=root --password=brand-audit-only crmeb_brand_audit '--execute=SELECT 1' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Isolated MySQL did not become ready' }
    docker run --rm --network "container:$brandContainer" -e CRMEB_AUDIT_DATABASE=crmeb_brand_audit --entrypoint php --mount "type=bind,source=$brandRoot,target=/var/test,readonly" -v crmeb_php_vendor:/var/test/crmeb/vendor:ro $PhpImage /var/test/tests/regression/product_brands.php
    if ($LASTEXITCODE -ne 0) { throw 'Brand regressions failed' }
} finally {
    docker stop $brandContainer | Out-Null
}
