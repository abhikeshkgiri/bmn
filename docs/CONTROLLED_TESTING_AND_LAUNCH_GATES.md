# Controlled testing and launch gates

This plan is for a later, explicitly approved verification task. It is not evidence
that any database, browser, or provider flow has been tested. No test described
here should be run against production or a database containing real customer
history. Never print, paste, or attach database URIs, credentials, OTPs, payment
signatures, customer contact information, or provider secrets as test evidence.

## Gate status vocabulary

- `PASS — LIVE VERIFIED`: exercised end-to-end in the approved isolated environment.
- `PASS — PURE TEST ONLY`: verified only by database/provider-independent tests.
- `NOT RUN — DATABASE REQUIRED`: requires the approved disposable test database.
- `NOT RUN — PROVIDER SANDBOX REQUIRED`: requires an approved provider sandbox.
- `NOT RUN — BROWSER REQUIRED`: requires an authenticated browser journey.
- `BLOCKED — FIX REQUIRED`: a confirmed defect or unmet prerequisite prevents safe progression.

A static review, test-plan inspection, or pure unit test never qualifies as live
verification. Record date, commit, environment classification (not credentials),
test operator, outcome, and evidence location for every future live result.

## Current launch-gate snapshot

| Gate | Current status | Basis / exit condition |
|---|---|---|
| Pure review validation and rating calculation checks | `PASS — PURE TEST ONLY` | Focused review runner passed; it does not execute the MongoDB aggregation or transaction. |
| TypeScript and targeted lint for the rating-summary changes | `PASS — PURE TEST ONLY` | Static checks passed; these do not establish database behavior. |
| Rating summary stored-field consistency | `BLOCKED — FIX REQUIRED` | Previously stale stored `rating`/`reviewCount` values remain unreconciled. The present database scope and values are unverified because no database inspection was performed; a separately reviewed dry-run and approved reconciliation are required before launch. |
| Database transaction, aggregation, index, and concurrency behavior | `NOT RUN — DATABASE REQUIRED` | No database connection or writes were made. |
| Booking confirmation and demo-record isolation | `NOT RUN — DATABASE REQUIRED` | Guards are code-reviewed but have not been exercised against persisted records and transaction conflicts. |
| OTP, payment, webhook, refund, and push-provider behavior | `NOT RUN — PROVIDER SANDBOX REQUIRED` | No provider operation has been performed. |
| Customer, owner, staff, and admin journeys | `NOT RUN — BROWSER REQUIRED` | No browser journey has been performed. |

These statuses describe only the checks listed above; they are not a claim that
the application is production-ready.

No new code defect was confirmed by this plan. The unreconciled rating-summary
data is a known launch blocker; its current extent is a database-dependent
unknown, not a claim that this task measured specific records.

## A. Database and transaction readiness

| Risk / test | Preconditions and isolated environment | Exact actions | Expected result / failure condition | Evidence and cleanup | Status |
|---|---|---|---|---|---|
| Wrong-database or production targeting | Explicit approval for a disposable development/test database; isolated credentials; no production/customer data; operator can verify cluster and database identity through an approved administrative control plane. | Before any test, independently verify the database alias, cluster classification, and database name in the approved control plane. Compare the non-secret target classification with the repository's isolated-database guard. Keep the URI and credentials private; do not echo them in a terminal, report, screenshot, or log. Abort if identity is uncertain or the target is not disposable. | Testing is allowed only when the approved control-plane identity and local guard agree. Any ambiguity, production indicator, or real customer data means stop. | Store a redacted environment classification, approver, date, and guard result. No data cleanup is needed because no test data has been written. | `NOT RUN — DATABASE REQUIRED` |
| Transaction support and rollback | Same approved disposable database; deployment configuration and permission known. | Verify the deployed MongoDB topology supports transactions. In a dedicated disposable namespace, execute one controlled transaction that creates a uniquely tagged test record and deliberately aborts; read afterward and confirm the record is absent. Then run the committed control case only after abort behavior is confirmed. | Abort leaves no partial changes; committed control is visible. Unsupported transactions or partial writes block transaction-dependent suites. | Capture sanitized transaction result and test-record tag. Remove only the exact test record after confirming it is test-owned; verify removal. | `NOT RUN — DATABASE REQUIRED` |
| Deployed indexes and uniqueness | Same isolated database; read-only index inspection permission. | Inspect actual deployed indexes (not only Mongoose declarations). Confirm the unique review-per-booking constraint and all payment/provider-event and booking concurrency constraints required by the code. Attempt duplicate operations only in a disposable namespace after confirming exact index state. | Required unique constraints exist and reject duplicates. Missing, non-unique, or conflicting indexes block duplicate/concurrency testing until separately approved index remediation. | Save sanitized index names/key patterns and duplicate-rejection outcomes; do not export documents. No cleanup beyond test-owned records. | `NOT RUN — DATABASE REQUIRED` |
| Concurrent writes | Transaction-ready disposable database and isolated test fixtures. | Run two controlled writers against the same booking and separately against the same review target. Coordinate barriers so operations overlap. Verify serialization/conflict handling, retry behavior, and final persisted state; do not use real provider calls. | Exactly one valid transition wins where state is exclusive; no lost updates, double confirmation, duplicate review, or stale aggregate. Any write skew or unhandled transaction retry blocks launch. | Record request IDs, sanitized before/after state, transaction outcome, and retry count. Delete only owned fixtures after dependent records are removed/verified. | `NOT RUN — DATABASE REQUIRED` |
| Existing database safety runner | An approved test environment only if a future task explicitly needs the runner. | Review the runner before invocation: it reads `.env.local` to load the URI and target name, then validates target classification; it does not itself establish that the database has no customer data. Never print that file or its values. Prefer an approved secret manager / control-plane verification rather than copying secrets to output. | Guard passes only for its configured isolated target; it is not a substitute for operator verification or access controls. | Keep all URI values redacted. Do not run this runner as part of the current task. | `NOT RUN — DATABASE REQUIRED` |

## B. Booking lifecycle and payment gating

Run these only after section A passes. Use database fixtures with synthetic,
non-login customer/staff identities. Payment-state cases must use persisted
records constructed in the isolated database; never accept client-supplied
payment values as test setup. Provider-backed cases belong to section F.

| Risk / test | Preconditions and isolated environment | Exact actions | Expected result / failure condition | Evidence and cleanup | Status |
|---|---|---|---|---|---|
| Staff confirms unpaid booking | Disposable database; an authorized staff user scoped to the fixture salon; pending booking with no paid/captured payment. | Call the staff status endpoint requesting confirmation. Repeat with client-supplied `paymentStatus`, amount, role, or confirmation fields forged to paid/authorized values. | Every attempt is rejected; booking and payment records remain unchanged. Any confirmation or partial mutation is a blocker. | Save sanitized request/result and before/after status. Remove fixture only after verifying no payment/provider object exists. | `NOT RUN — DATABASE REQUIRED` |
| Missing or expired hold | Same setup; pending booking with a missing hold, then a separately prepared expired hold. | Attempt staff confirmation for each booking using otherwise valid persisted payment state where possible. | Both are rejected and no status/payment mutation occurs. A stale hold accepted for confirmation is a blocker. | Record hold category and response, never customer details. Remove only owned fixtures. | `NOT RUN — DATABASE REQUIRED` |
| Persisted paid confirmation | Disposable database; a controlled payment record and booking with captured/paid authoritative state, matching amount/currency and provider payment ID, valid hold, and no pending refund. Use a provider sandbox only for actual capture; otherwise mark this as a database fixture test and do not claim provider verification. | Request permitted confirmation, then replay it and try conflicting/stale statuses. | Valid state confirms once; replay is idempotent or rejected without changing the result. Invalid or pending refund state cannot confirm. | Capture sanitized state transition and idempotency outcome. Reconcile or remove all synthetic payment fixtures; never issue a real refund. | `NOT RUN — DATABASE REQUIRED` |
| Concurrent confirmation, capture, cancellation, refund | Isolated database; approved sandbox needed for real capture/refund calls; coordinated test barrier. | Race staff confirmation with payment capture, cancellation, and refund paths one pair at a time. Repeat with stale versions and duplicate request IDs. | Only a legal lifecycle outcome commits; no double transition, capture/confirmation after terminal cancellation, or refund misreported as complete. Conflicts must return a clear failure or follow the documented retry/reconciliation path. | Preserve redacted event order, final state, request IDs, and provider sandbox references. Reconcile sandbox funds/events before fixture cleanup. | `NOT RUN — DATABASE REQUIRED` |
| Late capture / uncertain outcomes | Provider sandbox plus isolated database; reconciliation access. | Simulate or use the sandbox's supported late-capture and timeout scenario. Redeliver the same event and then reconcile the authoritative provider state. | A late or uncertain result is not represented as a completed booking/refund without authoritative confirmation; duplicate events do not duplicate state changes. | Keep provider event identifiers redacted where sensitive; reconcile all sandbox records before cleanup. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |

## C. Feature 22 demo-record isolation

Do not seed fixtures as part of this plan. A future task must obtain separate
approval, use a separately approved disposable database, and verify its identity
before invoking the Feature 22 seed command. Do not infer demo identity from
image URLs, names, or descriptions; use persisted Feature 22 markers.

| Risk / test | Preconditions and isolated environment | Exact actions | Expected result / failure condition | Evidence and cleanup | Status |
|---|---|---|---|---|---|
| Seed and marker integrity | Future explicit seed approval; empty disposable database reserved only for demo integration tests. | Inspect current seed/cleanup source and confirmation prompts. In a later approved task, seed only after independent target verification and explicit confirmation. Read back marker presence for each seeded salon, barber, service, and linked account. | All demo records are marked consistently; no real customer, booking, payment, review, notification, or login-capable verified account is created. Any missing marker or unexpected record blocks testing. | Record counts and marker categories only, no contact data. Use the marker-scoped cleanup procedure only after dependent-record checks pass. | `NOT RUN — DATABASE REQUIRED` |
| Demo booking and rescheduling | Marked demo salon/service/barber records, synthetic customer, isolated database. | Attempt salon booking, barber booking, home-service booking, and rescheduling through every applicable API, including alternate paths. | Server rejects all demo-linked transactions based on persisted markers; no booking/history/hold is created or changed. | Save sanitized route/outcome and verify no new booking/payment records. Do not delete records outside the exact test namespace. | `NOT RUN — DATABASE REQUIRED` |
| Demo payment, refund, and historical capture | Marked records; payment sandbox only for provider interactions. | Attempt payment-order creation and refund on demo-linked booking. For a separately prepared historical capture fixture, exercise verification and webhook paths including redelivery. | New payment/refund flows are blocked. Historical captures enter the defined reconciliation-required route (including `DEMO_RECORD_PAYMENT` where applicable), without confirming or marking a demo booking paid. No refund is claimed without provider confirmation. | Reconcile every sandbox capture; record reconciliation case identifiers, not customer data. Cleanup must remain blocked while any protected financial or booking reference exists. | `NOT RUN — DATABASE REQUIRED` / `NOT RUN — PROVIDER SANDBOX REQUIRED` |
| Demo review and public summary exclusion | Marked demo records and a completed synthetic booking fixture if needed. | Attempt review create/edit/delete and verify demo-linked review exclusion from public review lists, salon/barber summary aggregates, customer history, and revenue-related summaries. | Review writes are rejected; demo-linked content contributes no real rating/count, customer history, or revenue. Any leak or aggregate contribution is a blocker. | Capture sanitized counts and route outcomes only. Remove only test-owned records after dependency checks. | `NOT RUN — DATABASE REQUIRED` |
| Non-demo eligibility control | Approved real-like synthetic salon/barber/service records with no demo marker and otherwise valid public eligibility. | Repeat equivalent booking/review eligibility requests for the non-demo controls. | Eligible non-demo records remain eligible; no broad rejection based on placeholder imagery or illustrative copy. | Preserve only synthetic record IDs and results. Clean up test-owned records after confirming no dependencies. | `NOT RUN — DATABASE REQUIRED` |
| Cleanup safeguards and dependencies | Seeded isolated demo dataset; all traffic quiesced; no provider calls in flight. | Review the current cleanup target filters and dependent-record preflight. First create a protected dependent test relationship and verify cleanup refuses deletion; remove only that owned relationship; recheck; only then may a separate authorized task perform marker-scoped cleanup. | Cleanup targets only exact Feature 22 markers and refuses the entire delete if protected relationships exist. Its dependency preflight and deletes are non-atomic; concurrent use is prohibited. | Preserve dry-run/preflight output and exact counts. Verify every targeted record's removal and all non-target records' survival. Never manually remove retained financial/history records. | `NOT RUN — DATABASE REQUIRED` |

## D. Review-summary consistency

The current implementation recalculates a target summary in the review mutation
transaction and filters its aggregate by published status, completed and
reference-matching booking, and non-demo linked records. These semantics and
transaction behavior remain unverified against MongoDB. Existing stored
summaries that are never touched by a later review mutation can remain stale.

| Risk / test | Preconditions and isolated environment | Exact actions | Expected result / failure condition | Evidence and cleanup | Status |
|---|---|---|---|---|---|
| Review lifecycle contribution | Transaction-ready disposable database; synthetic completed booking and eligible salon/barber/service; no external providers. | Create a published review; edit its rating; unpublish, publish, reject/hide, and delete in separate cases. After each operation compare persisted summary with an independent aggregate of eligible published reviews. | Average/count match the eligible published set after every committed transition. Pending/hidden/removed reviews contribute zero; editing recalculates the average; deletion/unpublishing removes the contribution. Any mismatch or partial mutation is a blocker. | Capture synthetic target ID, rating histogram/count, stored summary, and transaction result. Remove exact test reviews/bookings and re-verify summary. | `NOT RUN — DATABASE REQUIRED` |
| Eligibility and demo exclusions | Synthetic data with demo-linked records, mismatched booking/customer/salon/barber/service references, incomplete booking, and ineligible targets. | Insert fixtures only through an approved isolated test harness; invoke public review and summary paths. Compare result to a manually reviewed eligible set. | Ineligible, mismatched, unpublished, or demo-linked reviews are excluded from lists, statistics, stored summaries, and sorting. No private customer fields appear in evidence or public response. | Retain only safe aggregate counts and redacted target IDs. Clean up exact fixtures and verify no remaining references. | `NOT RUN — DATABASE REQUIRED` |
| Salon/barber response and rating sort agreement | Same database with multiple synthetic targets and controlled rating distributions. | Query public listing/detail responses and rating sort; compare displayed summary and ordering against the independently computed eligible aggregates. Include an untouched target with a deliberately known stale summary only if data is wholly synthetic. | Displayed values and sort semantics agree. Existing untouched stale records demonstrate the known reconciliation gap and must not be represented as consistent. | Save sanitized values/order and calculations. Remove only synthetic fixtures. | `NOT RUN — DATABASE REQUIRED` |
| Concurrent review mutations and transaction retries | Transaction-ready database and two or more eligible synthetic reviews targeting the same salon/barber. | Synchronize create/edit/delete/moderation operations so their aggregate+summary writes overlap; induce only documented retryable conflicts in disposable data. Recompute independently after settlement. | Final stored summary equals the committed eligible set; transaction retries do not lose updates or expose partial writes. Any stale aggregate, uncaught retry exhaustion without visible error, or partial mutation blocks launch. | Record operation order, transaction outcomes/retry counts, and final aggregate without customer details. Clean up after verifying restored baseline. | `NOT RUN — DATABASE REQUIRED` |

### Rating reconciliation: dry-run first, separate approval required

Do not create or run a reconciliation script under this plan.

1. **Read-only inventory:** for every salon and barber, read `_id`, stored `rating`,
   stored `reviewCount`, and the demo marker only. Do not export owner, barber-user,
   reviewer, booking, or contact fields.
2. **Independent eligible aggregate:** compute the published review set with the
   same policy as the application: valid review target, published status,
   completed booking whose customer/salon/barber/service references match the
   review, and no Feature 22 marker on the target or linked salon/barber/service.
   Apply the documented public eligibility rules when deciding whether a target
   is eligible. Compare the resulting count and one-decimal average with stored
   values. For an empty eligible set, expected average and count are both zero.
3. **Private, reviewable discrepancy report:** include internal target ID, target
   type, stored and expected rating/count, discrepancy reason, and run timestamp.
   Exclude customer names/IDs, review text, phone/email, booking IDs, and any
   credentials. Store the report only in an access-controlled operations location.
4. **Review before writes:** compare totals, sample selected discrepancies using
   synthetic or access-controlled records, verify demo exclusion, and obtain
   explicit data-owner approval. A dry-run report must not mutate records.
5. **Future approved backfill:** take and verify a restorable database backup;
   pause review create/edit/delete/moderation writes or use an approved
   serialization mechanism; process a bounded, deterministic batch of target IDs;
   recompute from source reviews at write time; update only `rating` and
   `reviewCount`; and condition the write on the previously read summary/version
   so concurrent changes abort/retry rather than being overwritten. Use
   transactions where supported and record each batch's counts and outcome.
6. **Post-write verification and rollback:** rerun the read-only comparison,
   require zero unexplained discrepancies, compare all target counts, inspect
   audit records, and restore from the verified backup or apply an audited
   compensating update if verification fails. Preserve old values and the report
   under the approved retention policy.

If review writes cannot be paused or safely serialized, do not run a bulk
backfill. Resolve the concurrency plan first. No deployed index, migration,
backfill, or transaction behavior has been verified by this document.

## E. Authentication and browser journeys

Use a browser against the isolated environment only. Use synthetic accounts and
non-deliverable credentials unless the approved sandbox requires controlled OTP
delivery. Do not use actual customers or production accounts.

| Risk / test | Preconditions and isolated environment | Exact actions | Expected result / failure condition | Evidence and cleanup | Status |
|---|---|---|---|---|---|
| Customer OTP and ownership | Browser environment with approved OTP test configuration; synthetic customer and second synthetic customer. | Sign in, expire/reuse OTP, sign out, then try to read/change the other customer's favorites, bookings, reviews, profile, and history using altered IDs. | OTP/session expiry and role boundaries work; cross-customer access is denied with no data leak. | Capture redacted route/status and screenshots with all PII removed. Revoke test sessions and remove owned accounts under test policy. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |
| Owner onboarding and management | Synthetic owner, pending salon, approved salon controls, synthetic services/barbers. | Complete onboarding; attempt profile/service/barber changes before and after approval; try a foreign salon ID. | Approval/public-eligibility rules and ownership scope are enforced; staff/barber private data is not disclosed. | Screenshots and sanitized request outcomes. Remove owned test data only after dependency review. | `NOT RUN — BROWSER REQUIRED` |
| Staff and admin boundaries | Synthetic staff scoped to one salon and synthetic admin. | Exercise allowed and forbidden booking actions across own and foreign salon; moderate reviews through admin UI; attempt non-admin moderation. | Staff scope is enforced; admin moderation is authorized and summary changes match publication policy. | Redacted audit action and before/after states. Revoke test sessions; retain admin audit trail as policy requires. | `NOT RUN — BROWSER REQUIRED` |
| Customer end-to-end journey | Synthetic customer and eligible synthetic non-demo salon; section B/D database readiness; sandbox only for payment. | Discover/search supported city; favorite/unfavorite; book; pay sandbox; cancel/reschedule; review completed booking; inspect history. Repeat loading/error/empty/retry states and stale navigation. | API-backed discovery, eligibility, ownership, payment gating, review policy, and state messages agree; no unsupported path is presented as complete. | Redacted screenshots, request IDs, and synthetic record state. Refund/reconcile sandbox activity before cleanup. | `NOT RUN — BROWSER REQUIRED` |
| Mobile and accessibility | Same isolated browser deployment, desktop and mobile viewport; keyboard/screen-reader testing tools. | Traverse discovery, favorites, booking, payment, review, owner/staff/admin pages by keyboard; inspect focus, labels, contrast, responsive overflow, loading/error/retry states. | Critical controls are usable and state changes announced; no blocking layout or accessibility regression. | Redacted screenshots and issue log. No data cleanup beyond journey fixtures. | `NOT RUN — BROWSER REQUIRED` |

## F. Provider sandbox tests

Require explicit provider-side sandbox credentials and verified sandbox mode.
Before every request, independently verify the provider dashboard/environment
label. Never use a live key, real phone, real customer, or real charge.

| Risk / test | Preconditions and isolated environment | Exact actions | Expected result / failure condition | Evidence and cleanup | Status |
|---|---|---|---|---|---|
| OTP delivery | Approved OTP sandbox/test recipient and rate-limited synthetic accounts. | Request OTP, verify correct/incorrect/expired/replayed code, and test delivery timeout. | Only sandbox/test recipient receives messages; errors are surfaced without bypassing auth or leaking codes. | Provider sandbox message IDs and redacted delivery result. Remove test numbers/accounts from allowlists where applicable. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |
| Payment order and signature | Payment provider sandbox and isolated database; synthetic booking. | Create sandbox order; verify valid signature; submit invalid signature, wrong amount/currency/order, duplicate verification, and timeout cases. | Only authoritative matching sandbox payment can mark paid/confirm; invalid/duplicate requests do not mutate state incorrectly. | Redacted provider order/event IDs, status transitions, and reconciliation result. Void/refund sandbox transactions before cleanup. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |
| Webhook delivery and reconciliation | Sandbox webhook endpoint reachable only from provider sandbox; isolated database. | Redeliver duplicate/out-of-order events; test late capture, unmatched capture, refund event, and temporary handler failure; run the approved reconciliation path. | Idempotency holds; failures are visible/reconcilable; no success-shaped response or false completed state. | Redacted event IDs, delivery attempts, handler outcomes, reconciliation case IDs. Clear sandbox queue and reconcile all events. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |
| Refund outcomes | Sandbox payment with refundable synthetic booking. | Test successful refund, provider rejection, timeout/unknown result, duplicate request, and webhook confirmation. | Refund is reported complete only after provider confirmation; uncertain outcomes remain pending/reconciliation-required and do not falsely reverse state. | Provider sandbox refund IDs and final authoritative status. Reconcile all refunds before deleting fixtures. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |
| Push and unsupported channels | Approved push sandbox/device token and channel configuration. | Exercise push success/failure, invalid token, disabled channel, and any unsupported SMS/email delivery path. | Notification failure does not reverse committed booking/payment state; unsupported channels are clearly surfaced as unsupported rather than successful. | Redacted delivery outcomes; revoke test device token and remove sandbox subscriptions. | `NOT RUN — PROVIDER SANDBOX REQUIRED` |

## Required execution order

1. Obtain explicit test-owner approval; verify a disposable target independently
   through the approved control plane without exposing secrets.
2. Verify transaction support, deployed indexes, rollback, and test isolation.
   Stop on any uncertainty or failed prerequisite.
3. Run the existing database/provider-independent validation tests and static
   checks as a separate step; record them only as `PASS — PURE TEST ONLY`.
4. Run booking/payment database tests, first single-request cases and then
   duplicates/concurrency/stale-state cases.
5. Run demo isolation controls only in a separately approved disposable database;
   seed only in a future explicitly authorized task. Verify cleanup refusal
   before any authorized cleanup.
6. Run review lifecycle/aggregate and concurrent tests; produce the read-only
   rating discrepancy report. Do not backfill without separate approval.
7. Complete the required provider-sandbox readiness and provider checks before
   any browser journey that depends on OTP or payment. Then run the browser
   journeys; reconcile/void all sandbox transactions and remove only test-owned
   fixtures after dependency checks.
8. Re-run read-only integrity checks and classify each gate using the exact
   statuses above. Any unexplained state or discrepancy remains a blocker.

## Explicitly not performed

Preparing this plan did not connect to MongoDB, read environment files, perform
database writes, run migrations or backfills, seed or clean Feature 22 records,
call providers, run a production build, or execute the tests described above.
