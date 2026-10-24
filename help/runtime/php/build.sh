#!/bin/sh
set -eu
# Exact upstream patch, applied to the newer 7.4.33 release rather than downgrading
# to the old source base used by PHP's emergency branch.
echo '5fe57ca6ee96d59b36c6e0ca842843c50884f177bef1e85234cf669b577f5e48  /security/php-security.patch' | sha256sum -c -
echo '924846abf93bc613815c55dd3f5809377813ac62a9ec4eb3778675b82a27b927  /usr/src/php.tar.xz' | sha256sum -c -
configure_options="$(php-config --configure-options)"
docker-php-source extract
cd /usr/src/php
patch --batch --fuzz=0 -p1 < /security/php-security.patch
export CFLAGS="$PHP_CFLAGS" CPPFLAGS="$PHP_CPPFLAGS" LDFLAGS="$PHP_LDFLAGS"
# Options originate from the pinned base image; no user-provided shell code.
# shellcheck disable=SC2086
./configure $configure_options --without-pear
make -j2
make install
# Rebuild bundled shared extensions against the patched engine; Redis retains
# PHP 7.4's unchanged module ABI and is exercised by the runtime regression.
docker-php-ext-configure gd --with-freetype --with-jpeg
docker-php-ext-install -j2 bcmath gd mysqli pcntl pdo_mysql zip
mkdir -p /usr/local/share/php-security
printf '%s\n' '712e60f9edfd03f0960fc4fc3c2c375f42b90aa2' > /usr/local/share/php-security/upstream-commit
sha256sum /usr/local/bin/php /usr/local/sbin/php-fpm > /usr/local/share/php-security/binaries.sha256
