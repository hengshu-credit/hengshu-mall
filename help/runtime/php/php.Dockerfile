# Keep the established extension ABI while applying PHP's official EOL backport.
FROM ccr.ccs.tencentyun.com/crmebky_php/php:v7.4@sha256:ddd1edd3677b763a5fefbfd22098de504701c60ebcf78b68d0f835397acaff21 AS build
ARG DEBIAN_MIRROR=https://archive.debian.org/debian
ARG DEBIAN_SECURITY_MIRROR=https://archive.debian.org/debian-security
# Bullseye moved to Debian's archive in 2026. Verify its signatures and package
# hashes normally; only the archived Release metadata's expiry is inapplicable.
RUN printf 'deb [check-valid-until=no] %s bullseye main\ndeb [check-valid-until=no] %s bullseye-updates main\ndeb [check-valid-until=no] %s bullseye-security main\n' \
      "$DEBIAN_MIRROR" "$DEBIAN_MIRROR" "$DEBIAN_SECURITY_MIRROR" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
      libargon2-dev libcurl4-openssl-dev libonig-dev libreadline-dev libsodium-dev \
      libsqlite3-dev libssl-dev libxml2-dev zlib1g-dev \
      libfreetype6-dev libjpeg62-turbo-dev libpng-dev libzip-dev \
    && rm -rf /var/lib/apt/lists/*
COPY php-security.patch build.sh /security/
RUN sh /security/build.sh

FROM ccr.ccs.tencentyun.com/crmebky_php/php:v7.4@sha256:ddd1edd3677b763a5fefbfd22098de504701c60ebcf78b68d0f835397acaff21
COPY --from=build /usr/local/ /usr/local/
COPY security.ini /usr/local/etc/php/conf.d/zz-php-security.ini
COPY verify.php /usr/local/lib/php-security/verify.php
LABEL org.opencontainers.image.title="Hengshu PHP 7.4.33 security backport" \
      com.hengshu.php.security.source="712e60f9edfd03f0960fc4fc3c2c375f42b90aa2" \
      com.hengshu.php.security.cves="CVE-2026-109618,CVE-2026-109619"
RUN php -d open_basedir=/usr/local /usr/local/lib/php-security/verify.php && php-fpm -t
