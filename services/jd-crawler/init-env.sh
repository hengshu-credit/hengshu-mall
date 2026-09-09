#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -e .env ]; then
    echo '.env already exists; existing credentials were preserved.'
    exit 0
fi
command -v openssl >/dev/null 2>&1 || { echo 'Install openssl or fill .env.example manually.' >&2; exit 1; }
umask 077
{
    printf 'MALL_NETWORK=%s\n' "${MALL_NETWORK:-crmeb-mall_default}"
    printf 'JD_CRAWLER_TOKEN=%s\n' "$(openssl rand -hex 32)"
    printf 'JD_VNC_PASSWORD=%s\n' "$(openssl rand -hex 4)"
    printf 'JD_LOGIN_PORT=6080\nJD_CRAWLER_JOB_TIMEOUT=240\n'
} > .env
echo 'Created .env with private credentials. Set MALL_NETWORK to the mall network before starting.'
