#!/bin/sh
set -eu

# Only dependencies and generated runtime files live here; application code stays
# on the Windows bind mount. A marker is written only after a complete copy.
test -f /source/vendor/autoload.php
fingerprint=$(cat /source/composer.json /source/composer.lock | sha256sum | cut -d ' ' -f 1)
if [ -f /vendor/.source-dev-ready ]; then
    if [ "$(cat /vendor/.source-dev-ready)" != "$fingerprint" ]; then
        echo 'Composer files changed. Run help/dev/dev.ps1 SyncVendor first.' >&2
        exit 1
    fi
else
    echo 'Initializing PHP vendor volume from Windows dependencies (first run only)...'
    cp -a /source/vendor/. /vendor/
    printf '%s\n' "$fingerprint" > /vendor/.source-dev-ready
fi

if [ ! -f /runtime/.source-dev-ready ]; then
    echo 'Initializing PHP runtime volume, preserving existing logs and sessions...'
    if [ -d /source/runtime ]; then
        cp -a /source/runtime/. /runtime/
    fi
    # Process IDs refer to the retired container and must not be carried over.
    rm -f /runtime/workerman.pid /runtime/timer.pid
    chown -R www-data:www-data /runtime
    touch /runtime/.source-dev-ready
fi
echo 'PHP storage volumes ready.'
