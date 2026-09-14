#!/bin/sh
set -eu
cd /var/www
mkdir -p runtime backup public/uploads public/theme
touch .env .constant
chown 33:33 .env .constant .version public
chmod 640 .env .constant
chown -R 33:33 runtime backup public/uploads public/theme
if [ -f public/install.lock ]; then
  # Required backend schema is applied as part of the versioned application restart.
  php think commerce:install
fi
exec docker-php-entrypoint "$@"
