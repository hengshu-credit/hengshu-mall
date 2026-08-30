# CRMEB WSL Docker Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the running CRMEB Docker Compose project from Windows bind mounts to the Ubuntu-26.04 ext4 filesystem without losing the installed application data.

**Architecture:** Preserve the Windows checkout as rollback state, create a WSL ext4 copy, and cut over only after database and cache backups exist. Reuse the same images, ports, and Compose project name so application URLs remain unchanged.

**Tech Stack:** Docker Desktop 4.80+, Docker Engine 29.6.1, Docker Compose 5.3.0, WSL2 Ubuntu-26.04, MySQL 8.0.45, Redis 8.6.1, PHP 7.4, Nginx 1.29.6.

**Spec:** `docs/superpowers/specs/2026-08-30-wsl-docker-migration-design.md`

## Global Constraints

- Do not delete or move `E:\workspace\CRMEB`.
- Preserve all 157 CRMEB MySQL tables and the installed administrator row.
- Keep the external Web port at `8011` and PHP-FPM host port at `9003` because `9000` is already occupied.
- Keep MySQL and Redis configured to restart automatically.
- Do not remove the Windows database directory during cutover.

---

### Task 1: Create recovery backups and baseline evidence

**Files:**
- Create: `/home/administrator/workspace/CRMEB-backups/pre-wsl-migration.sql.gz`
- Create: `/home/administrator/workspace/CRMEB-backups/baseline.txt`

**Interfaces:**
- Consumes: running `crmeb_mysql` and `crmeb_redis` containers.
- Produces: a restorable MySQL dump and recorded table/admin/Redis counts.

- [ ] **Step 1: Record database and Redis baselines**

Run queries that record the CRMEB table count, administrator count, and Redis key count. Expected values before cutover are 157 tables, 1 administrator, and a non-negative Redis database size.

- [ ] **Step 2: Create a compressed logical MySQL backup**

Run `mysqldump` inside `crmeb_mysql` and stream it into `/home/administrator/workspace/CRMEB-backups/pre-wsl-migration.sql.gz`.

- [ ] **Step 3: Validate the backup**

Run `gzip -t` and confirm the dump contains `CREATE TABLE` statements for the `crmeb` schema.

### Task 2: Copy the checkout to WSL ext4

**Files:**
- Create: `/home/administrator/workspace/CRMEB/**`

**Interfaces:**
- Consumes: the complete Windows checkout at `E:\workspace\CRMEB`.
- Produces: a WSL ext4 checkout with the same Git HEAD and installed `.env`/`.constant` files.

- [ ] **Step 1: Copy the checkout**

Use a tar stream from `/mnt/e/workspace/CRMEB` to `/home/administrator/workspace/CRMEB`, excluding the live MySQL data and log directories until the database is stopped.

- [ ] **Step 2: Verify source parity**

Compare Git HEAD, tracked-file status, critical configuration hashes, and application file counts between Windows and WSL.

### Task 3: Cut over persistent data and containers

**Files:**
- Create: `/home/administrator/workspace/CRMEB/help/docker/mysql/data/**`
- Create: `/home/administrator/workspace/CRMEB/help/docker/mysql/log/**`
- Create: `/home/administrator/workspace/CRMEB/help/docker/redis/data/**`
- Modify: `/home/administrator/workspace/CRMEB/help/docker/docker-compose.yml`
- Modify: `/home/administrator/workspace/CRMEB/help/docker/nginx/vhost.conf`

**Interfaces:**
- Consumes: stopped Windows-backed CRMEB containers and the WSL checkout from Task 2.
- Produces: WSL-backed CRMEB containers with preserved persistent data.

- [ ] **Step 1: Save Redis and stop the old stack**

Run Redis `SAVE`, stop the Windows-backed Compose project cleanly, and confirm all four CRMEB containers are stopped before copying physical data.

- [ ] **Step 2: Copy quiesced persistent data**

Copy MySQL data/log files and Redis `/data` files into their WSL ext4 directories, preserving file content.

- [ ] **Step 3: Apply WSL Compose adjustments**

Set PHP-FPM host port to `9003`, add automatic restart policies for MySQL and Redis, persist Redis `/data`, and configure Nginx to use relative redirects so `/admin` retains port `8011`.

- [ ] **Step 4: Start from WSL**

Run `docker compose -p crmeb up -d` from `/home/administrator/workspace/CRMEB/help/docker` and wait for MySQL, Redis, PHP-FPM, and Nginx readiness.

### Task 4: Verify correctness and performance

**Files:**
- Test: runtime container state and local HTTP endpoints.

**Interfaces:**
- Consumes: the WSL-backed stack from Task 3.
- Produces: evidence that data is intact and dynamic requests no longer block on Windows 9P I/O.

- [ ] **Step 1: Verify persistence and service health**

Confirm 157 MySQL tables, 1 administrator, Redis `PONG`, Nginx configuration success, and zero container restart loops.

- [ ] **Step 2: Verify URLs**

Confirm `/`, `/pages/index/index`, `/api/basic_config`, `/admin`, and `/admin/` return successful responses while `/admin` preserves port `8011` in its redirect.

- [ ] **Step 3: Verify latency and mount sources**

Measure dynamic endpoint latency and inspect container mounts. PHP and MySQL sources must resolve under `/home/administrator/workspace/CRMEB`, and PHP-FPM processes must not wait in `p9_client_rpc`.

- [ ] **Step 4: Record rollback command**

Document that rollback is performed by stopping the WSL stack and starting the original Compose project from `E:\workspace\CRMEB\help\docker`.

