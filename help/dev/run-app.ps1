param(
    [string]$ApiBase = '',
    [string]$DeviceId = '',
    [string]$PagePath = '',
    [switch]$CleanCache
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$cli = Join-Path $root 'HBuilderX/cli.exe'
$project = (Resolve-Path (Join-Path $root 'template/uni-app')).Path
if (!(Test-Path -LiteralPath $cli)) { throw "HBuilderX CLI not found: $cli" }

# Android emulators reach the Windows host through 10.0.2.2.
if ($ApiBase -match '^https?://localhost(?::\d+)?(?:/.*)?$') {
    $ApiBase = $ApiBase -replace '^http://localhost', 'http://10.0.2.2' -replace '^https://localhost', 'https://10.0.2.2'
}

if ($ApiBase) {
    if ($ApiBase -notmatch '^https?://') { throw 'ApiBase must be an http(s) URL.' }
}

& $cli project open --path $project | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'HBuilderX project open failed.' }

Write-Host ('Launching UniApp Android with API base: ' + ($(if ($ApiBase) { $ApiBase } else { 'compiled default' })))
$arguments = @('launch', 'app-android', '--project', $project, '--native-log', 'true')
if ($DeviceId) { $arguments += @('--deviceId', $DeviceId) }
if ($PagePath) { $arguments += @('--pagePath', $PagePath) }
if ($CleanCache) { $arguments += @('--cleanCache', 'true') }

# HBuilderX 5.24 accepts --pagePath/--pageQuery but does not expose the query
# to UniApp's onLoad in the Android debug base. Compile the requested address
# for this one debug run, then restore the production source configuration.
$config = Join-Path $project 'config/app.js'
$buildFile = Join-Path $project 'unpackage/dist/dev/app-plus/app-service.js'
$originalConfig = $null
$launchProcess = $null
$launchLog = Join-Path $env:TEMP ('crmeb-android-launch-' + $PID + '.log')
try {
    if ($ApiBase) {
        $originalConfig = Get-Content -LiteralPath $config -Raw
        $patchedConfig = [regex]::Replace(
            $originalConfig,
            '(?m)(HTTP_REQUEST_URL\s*:\s*`)(https?://[^`]+)(`)',
            { param($match) $match.Groups[1].Value + $ApiBase + $match.Groups[3].Value },
            1
        )
        if ($patchedConfig -eq $originalConfig) { throw 'APP-PLUS HTTP_REQUEST_URL was not found in config/app.js.' }
        Set-Content -LiteralPath $config -Value $patchedConfig -NoNewline
        Remove-Item -LiteralPath $launchLog -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath ($launchLog + '.err') -Force -ErrorAction SilentlyContinue
        $launchProcess = Start-Process -FilePath $cli -ArgumentList $arguments -WorkingDirectory $root -RedirectStandardOutput $launchLog -RedirectStandardError ($launchLog + '.err') -PassThru -WindowStyle Hidden
        $started = $false
        for ($i = 0; $i -lt 60; $i++) {
            if ((Test-Path -LiteralPath $launchLog) -and (Select-String -LiteralPath $launchLog -Pattern '应用【uni-app】已启动|应用.*已启动' -Quiet)) {
                $started = $true
                break
            }
            if ($launchProcess.HasExited) { break }
            Start-Sleep -Seconds 2
        }
        if (!$started) {
            $diagnostic = if (Test-Path -LiteralPath $launchLog) { Get-Content -LiteralPath $launchLog -Tail 20 -ErrorAction SilentlyContinue } else { 'no HBuilderX launch log' }
            throw "HBuilderX Android launch did not start the app.`n$diagnostic"
        }
        if (!(Test-Path -LiteralPath $buildFile) -or !(Get-Content -LiteralPath $buildFile -Raw).Contains($ApiBase)) {
            throw "HBuilderX Android build does not contain API base: $ApiBase"
        }
        Stop-Process -Id $launchProcess.Id -Force -ErrorAction SilentlyContinue
        $launchProcess = $null

        # Stop the project watcher before restoring config. The running debug
        # base keeps the compiled local bundle; reopening here would trigger a
        # production hot reload and replace the local debug bundle.
        & $cli project close --path $project
        if ($LASTEXITCODE -ne 0) { throw 'HBuilderX project close failed.' }
    } else {
        $arguments += @('--ui', 'true')
        & $cli @arguments
        if ($LASTEXITCODE -ne 0) { throw 'HBuilderX Android launch failed.' }
    }
} finally {
    if ($null -ne $launchProcess -and !$launchProcess.HasExited) {
        Stop-Process -Id $launchProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $originalConfig) {
        Set-Content -LiteralPath $config -Value $originalConfig -NoNewline
    }
}
