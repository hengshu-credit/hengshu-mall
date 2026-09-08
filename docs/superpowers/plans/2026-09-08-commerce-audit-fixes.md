# Commerce audit fixes implementation plan

> Execute with superpowers:subagent-driven-development. User explicitly requested fixing the bugs found in the preceding audit; proceed without another approval gate.

**Goal:** Correct the eight audited categories while retaining existing invoice, Apple login, friend-payment and callback functionality.

**Architecture:** Preserve Controller / Service / DAO boundaries. Authenticate Apple identities using signed credentials; require positive authenticated ownership in consumer invoice flows; serialize money/order transitions in database transactions; ensure frontend requests settle on every response.

**Tech stack:** PHP 7.4 / ThinkPHP 6.1 / MySQL 8 / Redis, Vue 2 and UniApp.

**Spec / evidence:** `docs/research/audit-2026-09-08/reproduce.php`, `php-probe-results.json`, `request-probe.cjs`. These are isolated audit artifacts (the user independently added docs/research to .gitignore). Permanent regression tests belong under `tests/`.

## Constraints

- Keep all edits in this checkout on `codex/fix-commerce-audit`; do not edit the user's .gitignore change or existing research artifacts.
- No dependency upgrades, live payment/invoice requests, shared-database writes, deployments, commits or pushes.
- Tests run against this exact checkout mounted read-only in a temporary PHP container; pure mocks must be clearly distinguished from database integration tests.
- Preserve valid own-invoice use, own payments and friend payments, and legacy refund records with no pay_uid.

## Task 1: Invoice ownership and request completion

- [x] Write failing tests under `tests/regression/invoice_*` and `tests/regression/request_*` for foreign invoice read/write, foreign-order invoice application, uid macro propagation, electronic invoice download ownership, and response status 402 rejection.
- [x] Modify consumer invoice controllers and UserInvoiceServices/StoreOrderInvoiceServices to require owner checks before writes, while keeping administrative service use explicit and valid.
- [x] Settle the UniApp request promise after the 402 modal. Preserve ordinary success/error behavior.
- [x] Run the targeted tests and review the diff.

## Task 2: Apple identity verification

- [x] Read Apple and UniApp primary documentation for identityToken/authorizationCode; identify the existing iOS bundle identifier source.
- [x] Write failing tests under `tests/regression/apple_*` for absent/forged token, issuer/audience/expiry, wrong subject and valid signed credential.
- [x] Add a narrowly scoped verifier using existing libraries and trusted Apple key retrieval. Bind the server-selected subject to the verified token; fail closed when configuration or proof is absent.
- [x] Update the UniApp Apple login call to submit the credential without removing phone binding.
- [x] Run isolated signing/verification tests and document deployment configuration if required.

## Task 3: Money and payment consistency

- [x] Write failing tests under `tests/regression/payment_*` for lost balance updates, repeated payment requests, friend refund recipient, concurrent callbacks and listener failure/retry.
- [x] Replace read-modify-save balance arithmetic with a safe database operation (or transaction row lock preserving exact arithmetic). Recheck order paid state under the same transaction used for balance deduction.
- [x] Refund the actual balance payer with compatibility fallback to order uid.
- [x] Make order payment-success processing serializable and retryable. Distinguish transactional business effects from external delivery; do not claim external exactly-once guarantees.
- [x] Run regression and applicable database checks.

## Task 4: Whole-change review and handoff

- [x] Dispatch an independent reviewer with the plan and diff; resolve actionable findings.
- [x] Run all permanent regression tests, PHP syntax checks for changed/new files, and git diff checks.
- [x] Write the requested architecture/function/audit report with corrected issues, tests, remaining limits and runtime-copy caveat. Deliver a concise user summary.

## Progress and rulings

- Audit: 1,099 PHP application/support/config/route files passed PHP 7.4 syntax checks. Nine PHP probes and one JS probe reproduced eight issue categories; no live financial operations were executed.
- Ruling: the user's follow-up authorizes implementation of the already described findings; additional design confirmation is unnecessary.
- Ruling: separate independent implementation modules and tests; shared financial changes remain coordinated by the primary agent.
- Completed: invoice 34, Apple 22, Redis connector boundary 4, real MySQL money 15, delivery 22, nested group/virtual/lottery 18 cases and both frontend scripts passed. Full runner plus focused final group rerun; 35 changed/new PHP files and the final group changes passed syntax checks, with a clean diff check.
- Independent review closed all raised blockers, including late payer mutation, premature queue publication, nested group fulfillment exceptions, pending record visibility/copying, and swallowed transport failures.
- CodeRabbit's uncommitted review failed with `Connection failed: WebSocket closed`; it is not counted as a successful review. Retry when its service connection is available.
- Handoff: no production deployment or live provider calls; configure the real Apple CLIENT_ID and rebuild UniApp. Delayed jobs require Redis/queue configuration. Pending recovery uses later callbacks/payment retries; no automatic reconciliation worker or external exactly-once guarantee was added.
