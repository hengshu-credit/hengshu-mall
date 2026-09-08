# Windows source development implementation plan

**Goal:** Run admin and UniApp H5 from Windows source with automatic updates; run PHP from the same checkout; remove the redundant WSL checkout and old web bundles.

**Architecture:** Windows Vue CLI and HBuilderX development servers proxy API requests to Docker PHP/Nginx. Docker named volumes preserve MySQL and Redis independently of source code. Nginx forwards page requests to the source development servers.

**Authorization:** User approved the Windows development approach in this task. Work directly in the existing checkout and preserve current user edits.

## Steps

- [x] Record live mounts, database table count, configuration hashes and source differences. Archive the old WSL checkout before removal.
- [x] Add development proxies, start admin using a compatible Node runtime, and launch UniApp H5 through the bundled HBuilderX CLI. Verify HTTP responses and file watching.
- [x] Stop application writers, snapshot MySQL/Redis, copy stopped data into named Docker volumes, preserve uploads, and switch PHP/Nginx to Windows bind mounts. Verify database table count and API response.
- [x] Route page traffic to the frontend development servers; keep PHP entry points and backend-owned resources. Verify direct and unified page URLs, API forwarding and WebSocket configuration.
- [x] Move confirmed frontend bundles and the redundant WSL checkout out of their active locations into the Windows backup directory after confirming no container references the old checkout. Permanent deletion was policy-rejected; reversible relocation fulfilled removal from the development environment.
- [x] Provide repeatable start/stop scripts and documentation; run syntax checks, live HTTP checks, source update checks and git diff validation.

## Validation

The acceptance evidence is live integration: both dev servers respond with development bundles, their APIs return the same backend response, modified source recompiles, Docker mounts resolve to the Windows checkout, MySQL retains 157 tables, Redis data survives migration, and the old source directory is absent. No business logic changes or unrelated regression suite are required for this configuration task.

## Results (2026-09-08)

- MySQL remained at 157 tables; Redis retained 77 keys immediately after migration. Installation configuration hashes were unchanged.
- Admin and H5 source-marker probes appeared in their newly served JavaScript, then original files were restored byte-for-byte. A temporary PHP probe changed from v1 to v2 on the next request; it was moved out of public afterward.
- Both frontend direct API proxies returned business status 200. HBuilderX requires its proxy in manifest.json because the installed compiler overwrites vue.config.js devServer options.
- Browser navigation to `/`, `/admin/`, `/kefu` and `/app/upload` returned the appropriate development HTML. Both SockJS info endpoints responded. The installer executed PHP without exposing source.
- The browser rendered H5 products and the admin login screen; captured browser error logs were empty during source update verification.
- Stop closed both recorded frontend processes; Start recreated them. Process ownership is checked using PID, creation timestamp ticks and executable path.
- Independent review findings (PHP/static matching order, legacy routes, process ownership) were corrected and rechecked.
- PowerShell/JavaScript syntax, Docker Compose/Nginx validation and the repository's normal `git diff --check` passed. Existing source UI edits were retained; no commits were made.
- `/home/administrator/workspace/CRMEB` is absent. Retired source and frontend directories are under `E:\workspace\CRMEB-backups\2026-09-08-source-dev`.
