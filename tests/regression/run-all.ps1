param([ValidateSet('method','database','http','browser','native')][string]$Group='method')
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$node=Join-Path $root 'HBuilderX/plugins/node/node.exe'
if(!$env:PHP_BINARY){$env:PHP_BINARY=Join-Path $root '.build/php74/php.exe'}
if(!$env:PHPRC -and (Test-Path -LiteralPath (Join-Path $root '.build/commerce-hardening-20260914/php-audit.ini'))){$env:PHPRC=Join-Path $root '.build/commerce-hardening-20260914/php-audit.ini'}
if(!$env:OPENSSL_CONF){$env:OPENSSL_CONF=Join-Path (Split-Path $env:PHP_BINARY) 'extras/ssl/openssl.cnf'}
& $node (Join-Path $PSScriptRoot 'run-all.cjs') $Group
exit $LASTEXITCODE
