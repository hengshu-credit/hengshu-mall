# Local response performance implementation plan

> Execute inline in the existing Windows checkout, following systematic-debugging and verification-before-completion. Preserve all existing edits.

**Goal:** Reduce storefront and admin waiting time without changing UI, business behavior, API contracts or the authoritative Windows source directories.

**Architecture:** Optimize development transport and generated debugging artifacts first. Measure PHP bootstrap/file checks independently before changing its development configuration. Coalesce only explicitly selected concurrent read requests; never persist business responses or merge writes.

**Tech stack:** Windows HBuilderX/Node, Vue CLI 3 / webpack 4, uni-app, Docker Nginx/PHP 7.4, ThinkPHP.

**Constraints:** Keep `template/admin` and `template/uni-app` live; no second business source checkout; preserve authorization, locale, response isolation, errors, HMR, WebSockets and data freshness. Keep production server configuration unchanged.

## Tasks

- [x] Record cold/warm browser metrics, deterministic public API response hashes and PHP cache status in `help/dev/.state`. Add reusable measurement script under `tests/regression`.
- [x] In `help/dev/nginx.conf` enable compression for text assets and JSON. In `template/admin/vue.config.js` move inline development source maps to separate files while retaining source debugging. Enable direct development-server compression. Check decoded resource equality, content encoding, source maps, HMR and login rendering.
- [x] Measure PHP optimizations against the same requests. Keep timestamp validation and filesystem restrictions. Only retain changes that materially improve requests, preserve fresh source loading and pass API response comparison. Document retained settings in `help/dev/php.ini` / README. Retained file-existence cache override and additional prestarted FPM workers; no stale-data or source timestamp cache introduced.
- [x] Add narrowly scoped in-flight coalescing for repeated configuration reads in frontend API helpers. Regression first: two concurrent reads issue one request, different credentials/locales do not merge, settled or failed requests are not cached, callers receive independent JSON values. Do not change write requests.
- [x] Repeat measurements and existing routes, console, lifecycle, HMR and isolated chat tests. Document before/after timings and known limits in `help/dev/README.md`. Four deterministic API hashes match; login configuration's intentionally new key is validated for freshness instead of byte equality.

No commit or branch change is requested. Service restarts are limited to changed project services and must retain volumes and validated process ownership.
