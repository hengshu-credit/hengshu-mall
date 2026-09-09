#!/bin/sh
set -eu

: "${JD_CRAWLER_TOKEN:?JD_CRAWLER_TOKEN is required}"
: "${JD_VNC_PASSWORD:?JD_VNC_PASSWORD is required}"
[ "${#JD_CRAWLER_TOKEN}" -ge 32 ] || { echo 'JD_CRAWLER_TOKEN must have at least 32 characters' >&2; exit 1; }
[ "${#JD_VNC_PASSWORD}" -eq 8 ] || { echo 'JD_VNC_PASSWORD must have exactly 8 characters' >&2; exit 1; }
umask 077
mkdir -p /data/chromium
pids=''
cleanup() {
    trap - EXIT INT TERM
    for child in $pids; do kill "$child" 2>/dev/null || true; done
    wait || true
}
trap cleanup EXIT INT TERM

Xvfb :99 -screen 0 1440x1000x24 -nolisten tcp >/tmp/xvfb.log 2>&1 &
pids="$pids $!"
attempt=0
until xdpyinfo -display :99 >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 30 ] || { echo 'Display could not start' >&2; exit 1; }
    sleep 1
done

# The dedicated profile is never shared with a personal or mall-admin browser.
chromium --no-sandbox --disable-dev-shm-usage --no-first-run --no-default-browser-check \
    --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
    --user-data-dir=/data/chromium --window-size=1440,1000 https://www.jd.com/ \
    >/tmp/chromium.log 2>&1 &
pids="$pids $!"

x11vnc -storepasswd "$JD_VNC_PASSWORD" /tmp/jd-vnc.pass >/dev/null 2>&1
x11vnc -display :99 -rfbauth /tmp/jd-vnc.pass -localhost -rfbport 5900 \
    -forever -shared -noxdamage >/tmp/x11vnc.log 2>&1 &
pids="$pids $!"
websockify --web=/usr/share/novnc/ 0.0.0.0:6080 127.0.0.1:5900 >/tmp/novnc.log 2>&1 &
pids="$pids $!"

python -m jd_crawler &
api_pid=$!
pids="$pids $api_pid"
wait "$api_pid"
