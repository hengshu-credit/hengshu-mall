param(
    [string]$PhpImage = 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4',
    [string]$MysqlImage = 'ccr.ccs.tencentyun.com/crmebky_php/mysql:v8.0.45'
)
$ErrorActionPreference = 'Stop'
$marketing_styleRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$marketing_styleContainer = 'crmeb-marketing_style-test-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
try {
    docker run -d --rm --name $marketing_styleContainer --network none -e MYSQL_ROOT_PASSWORD=marketing_style-audit-only -e MYSQL_DATABASE=crmeb_marketing_style_audit $MysqlImage | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start isolated MySQL' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        docker exec $marketing_styleContainer mysql --protocol=tcp --host=127.0.0.1 --user=root --password=marketing_style-audit-only crmeb_marketing_style_audit '--execute=SELECT 1' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Isolated MySQL did not become ready' }
    docker run --rm --network "container:$marketing_styleContainer" -e CRMEB_AUDIT_DATABASE=crmeb_marketing_style_audit --entrypoint php --mount "type=bind,source=$marketing_styleRoot,target=/var/test,readonly" -v crmeb_php_vendor:/var/test/crmeb/vendor:ro $PhpImage /var/test/tests/regression/marketing_style.php
    if ($LASTEXITCODE -ne 0) { throw 'Marketing style regressions failed' }
} finally {
    docker stop $marketing_styleContainer | Out-Null
}
