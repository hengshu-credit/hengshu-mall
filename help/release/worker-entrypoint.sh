#!/bin/sh
set -eu
cd /var/www
while [ ! -f public/install.lock ]; do sleep 3; done
case "${3:-}" in
  timer) rm -f runtime/timer.pid ;;
  workerman) rm -f runtime/workerman.pid ;;
esac
exec "$@"
