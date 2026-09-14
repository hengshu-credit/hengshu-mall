param(
    [string]$PhpImage = 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4',
    [string]$MysqlImage = 'ccr.ccs.tencentyun.com/crmebky_php/mysql:v8.0.45'
)
$ErrorActionPreference = 'Stop'
$rankingRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$rankingNodePath = Join-Path $rankingRoot 'HBuilderX/plugins/node/node.exe'
if (!(Test-Path -LiteralPath $rankingNodePath)) { $rankingNodePath = (Get-Command node -ErrorAction Stop).Source }
& $rankingNodePath (Join-Path $PSScriptRoot 'ranking_canvas_fixtures.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Cannot generate ranking canvas fixtures; install admin dependencies first.' }
$rankingContainer = 'crmeb-ranking-test-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
try {
    docker run -d --rm --name $rankingContainer --network none -e MYSQL_ROOT_PASSWORD=ranking-audit-only -e MYSQL_DATABASE=crmeb_ranking_audit $MysqlImage | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start isolated MySQL' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        docker exec $rankingContainer mysql --protocol=tcp --host=127.0.0.1 --user=root --password=ranking-audit-only crmeb_ranking_audit '--execute=SELECT 1' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Isolated MySQL did not become ready' }
    docker run --rm --network "container:$rankingContainer" -e CRMEB_AUDIT_DATABASE=crmeb_ranking_audit -e CRMEB_MERCHANT_STORAGE=/tmp/ranking-merchant --entrypoint php --mount "type=bind,source=$rankingRoot,target=/var/test,readonly" -v crmeb_php_vendor:/var/test/crmeb/vendor:ro $PhpImage /var/test/tests/regression/rankings.php
    if ($LASTEXITCODE -ne 0) { throw 'Ranking regressions failed' }
} finally {
    docker stop $rankingContainer | Out-Null
}
