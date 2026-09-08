param(
    [string]$PhpImage = 'ccr.ccs.tencentyun.com/crmebky_php/php:v7.4',
    [string]$MysqlImage = 'ccr.ccs.tencentyun.com/crmebky_php/mysql:v8.0.45'
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$mount = "type=bind,source=$repoRoot,target=/var/audit,readonly"
$databaseContainer = 'crmeb-regression-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$databaseStarted = $false
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable exited with code $LASTEXITCODE" }
}
Push-Location $repoRoot
try {
    foreach ($test in @('invoice_ownership.php', 'apple_auth.php', 'payment_transport.php')) {
        Invoke-Checked docker @('run', '--rm', '--network', 'none', '--entrypoint', 'php', '--mount', $mount, $PhpImage, "/var/audit/tests/regression/$test")
    }
    foreach ($test in @('request_completion.cjs', 'apple_client.cjs')) {
        Invoke-Checked node @("tests/regression/$test")
    }
    Invoke-Checked docker @('run', '-d', '--rm', '--name', $databaseContainer, '--network', 'none', '-e', 'MYSQL_ROOT_PASSWORD=audit-only-password', '-e', 'MYSQL_DATABASE=crmeb_audit', $MysqlImage)
    $databaseStarted = $true
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        & docker @('exec', $databaseContainer, 'mysql', '--protocol=tcp', '--host=127.0.0.1', '--user=root', '--password=audit-only-password', 'crmeb_audit', '--execute=SELECT 1') 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) {
        & docker logs --tail 40 $databaseContainer
        throw 'Disposable MySQL did not become ready'
    }
    foreach ($test in @('payment_database.php', 'payment_dispatch.php', 'payment_nested_dispatch.php')) {
        Invoke-Checked docker @('run', '--rm', '--network', "container:$databaseContainer", '-e', 'CRMEB_AUDIT_DATABASE=crmeb_audit', '--entrypoint', 'php', '--mount', $mount, $PhpImage, "/var/audit/tests/regression/$test")
    }
    $changed = @(& git -c core.quotepath=false -c core.safecrlf=false diff --name-only HEAD -- '*.php')
    $added = @(& git -c core.quotepath=false ls-files --others --exclude-standard -- '*.php')
    $phpFiles = @($changed + $added | Sort-Object -Unique)
    if ($phpFiles.Count -gt 0) {
        Invoke-Checked docker (@('run', '--rm', '--network', 'none', '--entrypoint', 'php', '--mount', $mount, $PhpImage, '/var/audit/tests/regression/lint_php.php') + $phpFiles)
    }
    Invoke-Checked git @('-c', 'core.safecrlf=false', 'diff', '--check')
    Write-Output 'All regression checks passed.'
} finally {
    if ($databaseStarted) { & docker stop $databaseContainer | Out-Null }
    Pop-Location
}
