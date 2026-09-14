param(
    [string]$NodePath,
    [string]$PythonPath = 'python',
    [switch]$SkipBrowsers,
    [switch]$SkipAdmin
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (!$NodePath) { $NodePath = Join-Path $repoRoot 'HBuilderX/plugins/node/node.exe' }
if (!(Test-Path -LiteralPath $NodePath)) { throw 'Provide -NodePath pointing to Node 22 (prefer HBuilderX/plugins/node/node.exe).' }
if ((& $NodePath -p 'process.versions.node.split(".")[0]') -ne '22') { throw 'Regression tooling requires Node 22.' }
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$npmCli = Join-Path (Split-Path $npmCommand) 'node_modules/npm/bin/npm-cli.js'
if (!(Test-Path -LiteralPath $npmCli)) { throw 'npm CLI not found next to npm.cmd.' }
function Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}
$oldBrowserPath = $env:PLAYWRIGHT_BROWSERS_PATH
try {
    Checked $NodePath @($npmCli, 'ci', '--prefix', $PSScriptRoot, '--no-audit', '--no-fund')
    if (!$SkipAdmin) {
        # Existing component harnesses intentionally use the application's Vue/Babel versions.
        Checked $NodePath @($npmCli, 'ci', '--prefix', (Join-Path $repoRoot 'template/admin'), '--legacy-peer-deps', '--no-audit', '--no-fund')
    }
    $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PSScriptRoot '.browsers'
    if (!$SkipBrowsers) { Checked $NodePath @((Join-Path $PSScriptRoot 'node_modules/playwright/cli.js'), 'install', 'chromium') }
    $venv = Join-Path $PSScriptRoot '.venv'
    if (!(Test-Path -LiteralPath (Join-Path $venv 'Scripts/python.exe'))) { Checked $PythonPath @('-m', 'venv', $venv) }
    $python = Join-Path $venv 'Scripts/python.exe'
    Checked $python @('-m', 'pip', 'install', '--require-hashes', '-r', (Join-Path $PSScriptRoot 'requirements.lock'))
    Checked $python @('-c', 'from PIL import Image, features; import PIL; assert PIL.__version__ == "12.3.0"; assert features.check("avif"), "Pillow wheel lacks AVIF"')
    Write-Output 'Regression dependencies installed from lockfiles. Browser/application services and native evidence remain separate prerequisites.'
} finally { $env:PLAYWRIGHT_BROWSERS_PATH = $oldBrowserPath }
