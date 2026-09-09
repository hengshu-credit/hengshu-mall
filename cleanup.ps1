param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$cleanupRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$rootPrefix = $cleanupRoot.TrimEnd('\') + '\'
function Get-SafePath([string]$RelativePath) {
    $absolute = [IO.Path]::GetFullPath((Join-Path $cleanupRoot $RelativePath))
    if (!$absolute.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Path outside project: $absolute" }
    return $absolute
}
function Get-RelativePath([string]$AbsolutePath) {
    $absolute = [IO.Path]::GetFullPath($AbsolutePath)
    if (!$absolute.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Path outside project.' }
    return $absolute.Substring($rootPrefix.Length)
}
$targets = @(
    'help/dev/.state/releases',
    'help/dev/.state/android-verify-20260909-134849',
    'template/admin/dist',
    'template/admin/node_modules/.cache',
    'template/uni-app/unpackage',
    'docs/reviews',
    'docs/superpowers',
    'help/release/apply-deploy-fix.sh'
) | ForEach-Object { Get-SafePath $_ }
$statePath = Get-SafePath 'help/dev/.state'
if (Test-Path -LiteralPath $statePath) {
    # Known historical diagnostics only; leave current Android SDK/emulator state alone.
    $targets += @(Get-ChildItem -LiteralPath $statePath -Force -File | Where-Object {
        $_.Name -match '^(admin-|admin\.|api\.json$|cart-|db-|git-warnings\.log$|h5\.|interaction-|latest-release\.json$|performance-|php-runtime-profile\.json$|product-bottom-navigation\.png$|sign-image-)'
    } | ForEach-Object { Get-SafePath (Get-RelativePath $_.FullName) })
}
$targets = @($targets | Where-Object { Test-Path -LiteralPath $_ } | Sort-Object -Unique)
Write-Output 'Cleanup targets (source, database volumes, credentials and toolchains are excluded):'
$targets | ForEach-Object { Write-Output (Get-RelativePath $_) }
if (!$Apply) {
    Write-Output 'Preview only. Run .\cleanup.ps1 -Apply to delete the listed files.'
    return
}
if (Test-Path -LiteralPath (Get-SafePath '.build/package.lock')) { throw 'Packaging is active (or package.lock needs review). Cleanup stopped.' }
$activeBuild = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'node.exe' -and $_.CommandLine -like "*$cleanupRoot*" -and $_.CommandLine -match 'vue-cli-service|uniapp-cli'
}
if ($activeBuild) { throw 'Frontend build/development processes are active. Stop them before cleanup.' }

# Preserve one copy of the existing APK before removing generated mobile files.
$apkRoot = Get-SafePath 'template/uni-app/unpackage/release/apk'
$apkTarget = Get-SafePath 'dist/hengshu-mall-android.apk'
$apks = @(if (Test-Path -LiteralPath $apkRoot) { Get-ChildItem -LiteralPath $apkRoot -Filter '*.apk' -File })
if ($apks.Count) {
    $hashes = @($apks | ForEach-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash } | Sort-Object -Unique)
    if ($hashes.Count -ne 1) { throw 'Different APK versions found. Preserve the desired APK explicitly before cleanup.' }
    if (Test-Path -LiteralPath $apkTarget) {
        if ((Get-FileHash -LiteralPath $apkTarget -Algorithm SHA256).Hash -ne $hashes[0]) { throw 'Existing output APK differs; cleanup stopped.' }
    } else {
        New-Item -ItemType Directory -Path (Get-SafePath 'dist') -Force | Out-Null
        Copy-Item -LiteralPath $apks[0].FullName -Destination $apkTarget
        if ((Get-FileHash -LiteralPath $apkTarget -Algorithm SHA256).Hash -ne $hashes[0]) { throw 'APK copy verification failed.' }
    }
}
foreach ($target in $targets) {
    $verified = Get-SafePath (Get-RelativePath $target)
    Remove-Item -LiteralPath $verified -Recurse -Force
}
Write-Output ('Removed {0} temporary targets.' -f $targets.Count)
