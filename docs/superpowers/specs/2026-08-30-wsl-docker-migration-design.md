# CRMEB WSL Docker Migration Design

## Goal

Run CRMEB from the Ubuntu-26.04 ext4 filesystem instead of Windows `E:` bind mounts, while preserving the installed MySQL data and retaining the Windows checkout as a rollback source.

## Target layout

- WSL distro: `Ubuntu-26.04`
- WSL checkout: `/home/administrator/workspace/CRMEB`
- Web URL: `http://localhost:8011/`
- Admin URL: `http://localhost:8011/admin/`
- Compose project: `crmeb`

## Migration approach

1. Enable Docker Desktop integration for `Ubuntu-26.04`.
2. Record the installed database and Redis baselines and create a logical MySQL backup.
3. Copy the repository into WSL ext4 without deleting or moving the Windows checkout.
4. Stop the Windows-backed CRMEB stack, copy the quiesced MySQL and Redis data, and start the same Compose project from WSL.
5. Verify container state, data counts, HTTP behavior, and dynamic-request latency.

## Rollback

Stop the WSL-backed stack and start the Compose stack from `E:\workspace\CRMEB\help\docker`. The original Windows checkout and database directory remain untouched.

