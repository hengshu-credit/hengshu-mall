#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [ "${1:-}" != '' ] && [ "${1:-}" != '--info' ]; then
  echo 'Usage: bash start.sh [--info]' >&2
  exit 2
fi
if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(docker-compose)
fi
if [ "${1:-}" = '--info' ]; then
  "${compose[@]}" exec -T jd-crawler python -m jd_crawler.bootstrap show
  exit
fi
if [ ! -f .env ]; then
  if [ -f .update-only ]; then
    echo 'This is an update package. Extract it over the existing mall directory with its original .env.' >&2
    exit 1
  fi
  if [ -f crmeb/public/install.lock ] || [ -n "$(find data/mysql data/redis -type f -print -quit 2>/dev/null || true)" ]; then
    echo 'Existing installation/data found but .env is missing. Restore the original .env before starting.' >&2
    exit 1
  fi
  command -v openssl >/dev/null
  umask 077
  printf 'MYSQL_ROOT_PASSWORD=%s\nMYSQL_PASSWORD=%s\nREDIS_PASSWORD=%s\nBIND_IP=0.0.0.0\nHTTP_PORT=8011\n' \
    "$(openssl rand -hex 24)" "$(openssl rand -hex 24)" "$(openssl rand -hex 24)" > .env
fi
mkdir -p data/mysql data/redis
"${compose[@]}" config --quiet
"${compose[@]}" up -d --build
if [ -f crmeb/public/install.lock ]; then
  "${compose[@]}" exec -T --user 0 phpfpm sh -c 'chown 33:33 /var/www/.env /var/www/.constant; chmod 640 /var/www/.env /var/www/.constant'
  echo 'Admin: https://mall.hengshucredit.com/admin/'
else
  echo 'Install: https://mall.hengshucredit.com/install/index.php'
  echo 'Database host/user/name: mysql / crmeb / crmeb; Redis host: redis'
  echo 'Use MYSQL_PASSWORD and REDIS_PASSWORD from .env in the installer.'
  echo 'Workers will start automatically after installation. Run bash start.sh again to finalize file permissions.'
fi
"${compose[@]}" ps
echo 'After jd-crawler becomes healthy: bash start.sh --info'
echo 'On your local computer: ssh -N -L 6080:127.0.0.1:6080 root@SERVER_IP'
echo 'Then open http://127.0.0.1:6080/vnc.html and log in to JD.'
