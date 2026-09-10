param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$cliRoot = Join-Path $projectRoot 'HBuilderX/plugins/uniapp-cli'
$nodePath = Join-Path $projectRoot 'HBuilderX/plugins/node/node.exe'
if (!(Test-Path -LiteralPath (Join-Path $cliRoot 'bin/uniapp-cli.js')) -or !(Test-Path -LiteralPath $nodePath)) {
    throw 'Install HBuilderX with its uni-app compiler in the project HBuilderX folder before packaging.'
}
$output = [IO.Path]::GetFullPath($OutputPath)
$buildRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.build')).TrimEnd('\') + '\'
if (!$output.StartsWith($buildRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'H5 output must be inside .build.' }
$savedEnv = @{}
foreach ($key in @('NODE_ENV', 'NODE_OPTIONS', 'UNI_PLATFORM', 'UNI_INPUT_DIR', 'UNI_OUTPUT_DIR', 'UNI_MINIMIZE')) {
    $savedEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
Push-Location $cliRoot
try {
    $env:NODE_ENV = 'production'
    $env:UNI_PLATFORM = 'h5'
    $env:UNI_INPUT_DIR = (Join-Path $projectRoot 'template/uni-app').Replace('\', '/')
    $env:UNI_OUTPUT_DIR = $output.Replace('\', '/')
    $env:UNI_MINIMIZE = 'true'
    $major = [int]((& $nodePath -p 'parseInt(process.versions.node)').Trim())
    if ($major -ge 17 -and $env:NODE_OPTIONS -notmatch 'openssl-legacy-provider') {
        $env:NODE_OPTIONS = "$($savedEnv['NODE_OPTIONS']) --openssl-legacy-provider".Trim()
    }
    & $nodePath bin/uniapp-cli.js
    if ($LASTEXITCODE -ne 0) { throw 'H5 production build failed.' }
    # Webpack can retain index.html when only lazy-loaded pages change.
    # Record this successful build so the package freshness guard can accept it.
    (Get-Item -LiteralPath (Join-Path $output 'index.html')).LastWriteTime = Get-Date
} finally {
    Pop-Location
    foreach ($key in $savedEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnv[$key], 'Process') }
}
