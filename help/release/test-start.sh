#!/usr/bin/env bash
set -euo pipefail
fixture="$(mktemp -d)"
cd "$fixture"
mkdir -p bin crmeb/public
cp /fixture/start.sh ./start.sh
cat > bin/docker <<'SH'
#!/bin/sh
if [ "${NO_COMPOSE_PLUGIN:-0}" = 1 ] && [ "$*" = 'compose version' ]; then exit 1; fi
printf '%s\n' "$*" >> "$BOOTSTRAP_CALLS"
SH
cp bin/docker bin/docker-compose
chmod +x bin/docker bin/docker-compose
export PATH="$fixture/bin:$PATH"
export BOOTSTRAP_CALLS="$fixture/calls"
bash start.sh >/dev/null
test -d data/mysql && test -d data/redis
test "$(grep -Ec '^(MYSQL_ROOT_PASSWORD|MYSQL_PASSWORD|REDIS_PASSWORD)=[a-f0-9]{48}$' .env)" = 3
test "$(grep 'PASSWORD=' .env | cut -d= -f2 | sort -u | wc -l)" = 3
grep -q '^HTTP_PORT=8011$' .env
before="$(sha256sum .env)"
touch crmeb/public/install.lock
bash start.sh >/dev/null
test "$before" = "$(sha256sum .env)"
grep -q -- '^compose up -d --build$' calls
NO_COMPOSE_PLUGIN=1 bash start.sh >/dev/null
test "$before" = "$(sha256sum .env)"
grep -q -- '^up -d --build$' calls
bash start.sh --info >/dev/null
test "$before" = "$(sha256sum .env)"
grep -q 'exec -T jd-crawler python -m jd_crawler.bootstrap show' calls
mv .env original.env
if bash start.sh >/dev/null 2>&1; then
  echo 'FAIL: missing credentials accepted for installed site' >&2
  exit 1
fi
test ! -f .env
rm crmeb/public/install.lock
touch data/mysql/existing-data
if bash start.sh >/dev/null 2>&1; then
  echo 'FAIL: existing data accepted without original credentials' >&2
  exit 1
fi
test ! -f .env
rm data/mysql/existing-data
touch .update-only
if bash start.sh >/dev/null 2>&1; then
  echo 'FAIL: update package initialized a new installation' >&2
  exit 1
fi
test ! -f .env
echo 'PASS startup password generation, preservation and existing-data protection'
