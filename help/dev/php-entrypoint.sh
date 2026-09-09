#!/bin/sh
set -eu

# The runtime volume outlives the container's PID namespace. An old PID can
# otherwise match an unrelated new process and prevent Workerman from starting.
# Run only at container startup, before any application workers are launched.
rm -f /var/www/runtime/workerman.pid /var/www/runtime/timer.pid
exec docker-php-entrypoint "$@"
