# Commerce regression tests

Run from PowerShell with Docker and Node.js available:

```powershell
./tests/regression/run.ps1
```

The runner mounts the current checkout read-only and uses PHP 7.4. It creates its own MySQL container, without host ports or external networking, and removes it on completion. It never uses the running mall's database, Redis, payment gateway or credentials. The fixed database name/password are disposable test fixtures only.

The default images match this repository's local development stack. Pass `-PhpImage` / `-MysqlImage` to select compatible images. PHP needs the repository's usual extensions, including PDO MySQL, BCMath and OpenSSL; the mounted repository needs its existing `crmeb/vendor` dependencies.

| Test | Evidence |
| --- | --- |
| `invoice_ownership.php` | Actual controllers/services with in-memory DAO/provider boundaries; own/foreign records, positive UID, macro propagation, downloads and admin compatibility |
| `apple_auth.php` | Actual controller and verifier; synthetic RSA keys and signed tokens, untrusted/missing/expired/wrong-issuer/audience/subject credentials, SMS binding |
| `apple_client.cjs` | Actual Vue method bodies in a VM; credential sources, fresh native authorization and recovery after token failure |
| `request_completion.cjs` | Actual request wrapper with synthetic responses; Promise settlement on 402 and other response modes |
| `payment_database.php` | Real MySQL + ThinkPHP ORM; concurrent debits/credits, duplicate payments/callbacks, business rollback, payer refund/ledger consistency and rollback, immutable paid-order identity and delivery retry |
| `payment_dispatch.php` | Outermost commit visibility on a separate worker connection, rollback, pending-stage recovery and status-log isolation |
| `payment_nested_dispatch.php` | Real group-purchase and virtual-fulfillment methods against MySQL; rollback prevents premature notices, jobs and lottery grants |
| `payment_transport.php` | Real ThinkQueue Redis connector with an isolated Redis test double; rejected immediate/delayed writes remain failures rather than truthy job IDs |
| `lint_php.php` | Syntax checks for changed and new PHP files selected by the runner |

Concurrency tests run separate PHP processes with deliberate short delays around original race windows. They assert balances, order states, ledger counts and event counts rather than only checking generated SQL. Synthetic event listeners isolate financial database behavior from real suppliers; payment delivery tests must not be interpreted as full Redis/third-party integration coverage.

Delayed jobs still require the existing `queue_open=1` configuration and Redis cache driver. Pending stages retry on a later payment callback or payment attempt; this patch does not add a scheduled reconciliation worker. Queue acceptance is separate from successful job execution. A crash between external delivery and database acknowledgement, or partial success within a notification stage, can produce duplicate notifications on retry; receivers still need idempotence.

Before correction, the initial MySQL suite reproduced seven failed invariants and one successful legacy behavior. The original PHP audit also reproduced invoice ownership bypasses and missing Apple proof; JavaScript tests demonstrated the unresolved 402 Promise. Permanent tests assert the corrected behavior, not the existence of vulnerabilities.

Verification on 2026-09-08: the complete PowerShell runner and final focused group-flow regression passed invoice ownership (34 cases), Apple credentials (22), Redis transport boundary (4), financial database invariants (15), payment dispatch (22), group/virtual/lottery scenarios (18, plus 4 shared transaction checks), both frontend scripts, and syntax checks for all 35 changed/new PHP files. The final group service/test changes were syntax-checked again. `git diff --check` also passed. The Redis tests exercise the installed connector with a rejecting Redis double; they do not connect to a real Redis server.

Apple deployment needs `.env` configuration:

```ini
[APPLE]
CLIENT_ID = com.yourcompany.your-signed-ios-app
```

Use the real Apple Bundle ID. The UniApp `__UNI__...` project ID is not valid here. Without the value, Apple login deliberately fails closed. Rebuild the UniApp native client to transmit identityToken. Live iOS authorization, Apple key transport, all HTTP routes and all payment channels still need deployment/sandbox verification.

The runtime Docker stack on this machine points at a separate WSL checkout. Passing these tests does not deploy the Windows checkout to that stack. See `docs/reviews/2026-09-08-commerce-audit.md` for the architecture review, corrected defects and remaining audit scope.
