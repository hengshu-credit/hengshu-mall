#!/usr/bin/env bash
set -euo pipefail
patch_dir="$(cd -- "$(dirname -- "$0")" && pwd -P)"
cd -- "$patch_dir/.."
if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(docker-compose)
fi
test -f compose.yml && test -f .env

# Refuse a storage switch on an already installed site.
for service in mysql redis; do
  target=/data
  if [ "$service" = mysql ]; then target=/var/lib/mysql; fi
  container_id="$("${compose[@]}" ps -q "$service")"
  if [ -z "$container_id" ]; then
    echo "Cannot check storage: $service is not running. Start it with the existing configuration first." >&2
    exit 1
  fi
  mount_type="$(docker inspect --format "{{range .Mounts}}{{if eq .Destination \"$target\"}}{{.Type}}{{end}}{{end}}" "$container_id")"
  mount_source="$(docker inspect --format "{{range .Mounts}}{{if eq .Destination \"$target\"}}{{.Source}}{{end}}{{end}}" "$container_id")"
  if [ "$mount_type" != bind ] || [ "$(readlink -f -- "$mount_source")" != "$(readlink -f -- "data/$service")" ]; then
    echo "Stopped: $service does not use this project's data/$service bind directory. Preserve and migrate existing data before changing mounts." >&2
    exit 1
  fi
done

(cd -- "$patch_dir" && sha256sum --quiet -c deploy-fix.sha256)
backup="deploy-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$backup" -- compose.yml deploy/nginx.conf crmeb/public/install/templates/step3.php
for file in compose.yml deploy/nginx.conf crmeb/public/install/templates/step3.php; do
  cp -- "$patch_dir/$file" "$file"
done
"${compose[@]}" --profile workers config --quiet
"${compose[@]}" --profile workers up -d --force-recreate phpfpm nginx queue timer workerman
"${compose[@]}" exec -T nginx nginx -t
"${compose[@]}" --profile workers ps
echo "Applied. Existing data and credentials preserved. Previous files: $backup"
