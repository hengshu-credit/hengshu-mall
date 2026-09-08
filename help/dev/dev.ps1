param([ValidateSet('Start', 'Stop', 'Status', 'RestartPhp')][string]$Action = 'Start')

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$stateDir = Join-Path $PSScriptRoot '.state'
$hxRoot = Join-Path $projectRoot 'HBuilderX'
$hxCli = Join-Path $hxRoot 'cli.exe'
$nodeExe = Join-Path $hxRoot 'plugins/node/node.exe'
$adminRoot = Join-Path $projectRoot 'template/admin'
$uniRoot = Join-Path $projectRoot 'template/uni-app'
$composeArgs = @('compose', '-p', 'crmeb', '-f', (Join-Path $projectRoot 'help/docker/docker-compose.yml'), '-f', (Join-Path $PSScriptRoot 'compose.yml'))

function Invoke-Compose {
    & docker @composeArgs @args
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose failed.' }
}

function Get-DevListener([int]$Port, [string]$ExpectedCommand) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if (!$listener) { return $null }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if (!$process.CommandLine -or $process.CommandLine -notlike $ExpectedCommand) {
        throw "Port $Port is occupied by another process (PID $($listener.OwningProcess))."
    }
    return $process
}

function Save-ProcessOwner($Process, [string]$Name) {
    [pscustomobject]@{
        ProcessId = $Process.ProcessId
        CreatedTicks = $Process.CreationDate.ToUniversalTime().Ticks.ToString()
        ExecutablePath = $Process.ExecutablePath
    } | ConvertTo-Json | Set-Content (Join-Path $stateDir "$Name.process.json")
}

function Assert-ProcessOwner($Process, [string]$Name) {
    if (!$Process) { return }
    $ownerPath = Join-Path $stateDir "$Name.process.json"
    if (!(Test-Path -LiteralPath $ownerPath)) { throw "Unmanaged $Name process on the development port. Stop it manually before using this script." }
    $owner = Get-Content -LiteralPath $ownerPath -Raw | ConvertFrom-Json
    if ($Process.ProcessId -ne $owner.ProcessId -or $Process.CreationDate.ToUniversalTime().Ticks.ToString() -ne $owner.CreatedTicks -or $Process.ExecutablePath -ne $owner.ExecutablePath) {
        throw "The $Name development port belongs to a different process; it will not be stopped or reused."
    }
}

function Show-Status {
    Invoke-Compose ps
    Get-NetTCPConnection -State Listen -LocalPort 1617,8080 -ErrorAction SilentlyContinue |
        Select-Object LocalPort, OwningProcess
    Write-Host 'Admin: http://localhost:8011/admin/ (direct: http://localhost:1617/admin/)'
    Write-Host 'H5:    http://localhost:8011/       (direct: http://localhost:8080/)'
}

if ($Action -eq 'Status') { Show-Status; return }
if ($Action -eq 'RestartPhp') { Invoke-Compose restart phpfpm; return }
if ($Action -eq 'Stop') {
    $admin = Get-DevListener 1617 '*vue-cli-service.js*serve*'
    Assert-ProcessOwner $admin 'admin'
    if ($admin -and $admin.ExecutablePath -eq $nodeExe) { Stop-Process -Id $admin.ProcessId }
    # Ask HBuilderX to close only this project so it owns compiler cleanup.
    $h5 = Get-DevListener 8080 '*uniapp-cli*'
    Assert-ProcessOwner $h5 'h5'
    if ($h5) {
        & $hxCli project close --path $uniRoot
        if ($LASTEXITCODE -ne 0) { throw 'Could not close the UniApp development project.' }
        # HBuilderX may keep its compiler alive after closing the project.
        $remainingH5 = Get-DevListener 8080 '*uniapp-cli*'
        if ($remainingH5 -and $remainingH5.ProcessId -eq $h5.ProcessId -and $remainingH5.ExecutablePath.StartsWith($hxRoot, [StringComparison]::OrdinalIgnoreCase)) {
            Stop-Process -Id $remainingH5.ProcessId
        }
    }
    Invoke-Compose stop
    return
}

if (!(Test-Path -LiteralPath $hxCli) -or !(Test-Path -LiteralPath $nodeExe)) {
    throw "HBuilderX and its Node runtime are required at $hxRoot."
}
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
Invoke-Compose config --quiet
Invoke-Compose up -d

$existingAdmin = Get-DevListener 1617 '*vue-cli-service.js*serve*'
Assert-ProcessOwner $existingAdmin 'admin'
if (!$existingAdmin) {
    if (!(Test-Path (Join-Path $adminRoot 'node_modules/@vue/cli-service/bin/vue-cli-service.js'))) {
        $previousPath = $env:PATH
        try {
            $env:PATH = (Split-Path $nodeExe) + ';' + $previousPath
            Push-Location $adminRoot
            try {
                & $nodeExe (Join-Path $hxRoot 'plugins/npm/node_modules/npm/bin/npm-cli.js') ci --legacy-peer-deps --no-audit --no-fund
                if ($LASTEXITCODE -ne 0) { throw 'Admin dependency installation failed.' }
            } finally { Pop-Location }
        } finally { $env:PATH = $previousPath }
    }
    $previousOptions = $env:NODE_OPTIONS
    try {
        $env:NODE_OPTIONS = '--openssl-legacy-provider'
        $admin = Start-Process -FilePath $nodeExe -ArgumentList 'node_modules/@vue/cli-service/bin/vue-cli-service.js serve --mode=dev' -WorkingDirectory $adminRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateDir 'admin.log') -RedirectStandardError (Join-Path $stateDir 'admin.err.log') -PassThru
        $admin.Id | Set-Content (Join-Path $stateDir 'admin.pid')
        Save-ProcessOwner (Get-CimInstance Win32_Process -Filter "ProcessId=$($admin.Id)") 'admin'
    } finally { $env:NODE_OPTIONS = $previousOptions }
}

$existingH5 = Get-DevListener 8080 '*uniapp-cli*'
Assert-ProcessOwner $existingH5 'h5'
if (!$existingH5) {
    if (!(Get-Process HBuilderX -ErrorAction SilentlyContinue)) {
        Start-Process -FilePath (Join-Path $hxRoot 'HBuilderX.exe') -ArgumentList ('"' + $uniRoot + '"')
        Start-Sleep -Seconds 3
    }
    & $hxCli project open --path $uniRoot
    if ($LASTEXITCODE -ne 0) { throw 'HBuilderX could not open the UniApp project.' }
    & $hxCli launch web --project $uniRoot --ui true --browser Chrome
    if ($LASTEXITCODE -ne 0) { throw 'HBuilderX could not launch H5.' }
    $h5Deadline = (Get-Date).AddSeconds(60)
    do {
        $startedH5 = Get-DevListener 8080 '*uniapp-cli*'
        if ($startedH5) { Save-ProcessOwner $startedH5 'h5'; break }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $h5Deadline)
    if (!$startedH5) { throw 'HBuilderX did not start the H5 listener within 60 seconds. Check its compilation console.' }
}
Write-Host 'Development services started. First compilation may take a minute; check admin.log and HBuilderX for compilation errors.'
Show-Status
