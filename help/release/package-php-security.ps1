param()
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$stage = Join-Path $repoRoot ('.build/php-security-package-' + [guid]::NewGuid().ToString('N'))
$bundle = Join-Path $stage 'php-security-20261024'
$output = Join-Path $repoRoot 'dist/hengshu-php-security-20261024.tar.gz'
$image = 'hengshu-php:7.4.33-security-20261024'
$node = Join-Path $repoRoot 'HBuilderX/plugins/node/node.exe'
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable exited with code $LASTEXITCODE" }
}
Push-Location $repoRoot
try {
    Invoke-Checked docker @('build', '-f', 'help/runtime/php/php.Dockerfile', '-t', $image, 'help/runtime/php')
    Invoke-Checked $node @('tests/regression/php_security.cjs', $image)
    & (Join-Path $repoRoot 'tests/regression/run.ps1') -PhpImage $image
    if ($LASTEXITCODE -ne 0) { throw 'Commerce regression failed' }
    New-Item -ItemType Directory -Force $bundle, (Split-Path $output) | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot 'help/runtime/php') -Destination (Join-Path $bundle 'php-runtime') -Recurse
    $apply = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'apply-php-security.py')).Replace("`r`n", "`n")
    [IO.File]::WriteAllText((Join-Path $bundle 'apply-php-security.py'), $apply, [Text.UTF8Encoding]::new($false))
    Invoke-Checked docker @('save', '-o', (Join-Path $bundle 'php-image.tar'), $image)
    $imageInfo = (& docker image inspect $image | ConvertFrom-Json)[0]
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect security image' }
    $files = [ordered]@{}
    Get-ChildItem -LiteralPath $bundle -File -Recurse | Sort-Object FullName | ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($bundle, $_.FullName).Replace('\', '/')
        $files[$relative] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $receipt = [ordered]@{image=$image; imageId=$imageInfo.Id; upstreamCommit='712e60f9edfd03f0960fc4fc3c2c375f42b90aa2'; files=$files}
    [IO.File]::WriteAllText((Join-Path $bundle 'runtime.json'), ($receipt | ConvertTo-Json -Depth 5) + "`n", [Text.UTF8Encoding]::new($false))
    Invoke-Checked tar @('-czf', $output, '-C', $stage, 'php-security-20261024')
    $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText($output + '.sha256', "$hash  $([IO.Path]::GetFileName($output))`n", [Text.UTF8Encoding]::new($false))
    Write-Output "Runtime-only package: $output"
    Write-Output "SHA256: $hash"
} finally { Pop-Location }
