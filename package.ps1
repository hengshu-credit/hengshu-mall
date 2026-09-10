param([switch]$Verify, [switch]$Update)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$buildRoot = Join-Path $projectRoot '.build'
$stageParent = Join-Path $buildRoot ('package-' + [guid]::NewGuid().ToString('N'))
$lockPath = Join-Path $buildRoot 'package.lock'
$oldNodeOptions = $env:NODE_OPTIONS
$oldVerifyRoot = $env:CRMEB_VERIFY_ROOT
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
$lock = [IO.File]::Open($lockPath, 'CreateNew', 'Write', 'None')
try {
    $bundledNode = Join-Path $projectRoot 'HBuilderX/plugins/node/node.exe'
    $node = if (Test-Path -LiteralPath $bundledNode) { $bundledNode } else { (Get-Command node -ErrorAction Stop).Source }
    $adminRoot = Join-Path $projectRoot 'template/admin'
    Push-Location $adminRoot
    try {
        if (!(Test-Path -LiteralPath 'node_modules/@vue/cli-service/bin/vue-cli-service.js')) {
            & npm.cmd ci --legacy-peer-deps
            if ($LASTEXITCODE -ne 0) { throw 'Installing admin dependencies failed.' }
        }
        $major = [int]((& $node -p 'parseInt(process.versions.node)').Trim())
        if ($major -ge 17 -and $env:NODE_OPTIONS -notmatch 'openssl-legacy-provider') {
            $env:NODE_OPTIONS = "$oldNodeOptions --openssl-legacy-provider".Trim()
        }
        & $node node_modules/@vue/cli-service/bin/vue-cli-service.js build --mode=production
        if ($LASTEXITCODE -ne 0) { throw 'Admin production build failed.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Path $stageParent -Force | Out-Null
    $h5Output = Join-Path $stageParent 'h5'
    & (Join-Path $projectRoot 'help/release/build-h5.ps1') -OutputPath $h5Output
    $packageArgs = @((Join-Path $projectRoot 'help/release/package.cjs'), $stageParent)
    $packageArgs += @('--h5', $h5Output)
    if ($Update) { $packageArgs += '--update' }
    & $node @packageArgs
    if ($LASTEXITCODE -ne 0) { throw 'Packaging failed.' }
    if ($Verify) {
        $env:CRMEB_VERIFY_ROOT = Join-Path $stageParent 'verification'
        $verifyScript = if ($Update) { 'help/release/verify-update.cjs' } else { 'help/release/verify.cjs' }
        & $node (Join-Path $projectRoot $verifyScript)
        if ($LASTEXITCODE -ne 0) { throw 'Release verification failed.' }
    }
    $archiveName = if ($Update) { 'hengshu-mall-update.tar.gz' } else { 'hengshu-mall.tar.gz' }
    Write-Host "Ready: dist/$archiveName"
} finally {
    $env:NODE_OPTIONS = $oldNodeOptions
    $env:CRMEB_VERIFY_ROOT = $oldVerifyRoot
    # Delete only this invocation's generated staging tree inside .build.
    $resolvedStage = [IO.Path]::GetFullPath($stageParent)
    $resolvedBuild = [IO.Path]::GetFullPath($buildRoot).TrimEnd('\') + '\'
    if (!$resolvedStage.StartsWith($resolvedBuild, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe staging path.' }
    if (Test-Path -LiteralPath $resolvedStage) { Remove-Item -LiteralPath $resolvedStage -Recurse -Force }
    $lock.Dispose()
    Remove-Item -LiteralPath $lockPath -Force
}
