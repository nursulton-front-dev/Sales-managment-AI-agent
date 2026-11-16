# Calendar reservation implementation status

Status: incomplete, not deployed. The current gateway still has the reproduced race.

## Implemented foundation

`scripts/migrations/calendar-reservations.sql` adds resource rows, reservations and a serialized admission function. Resource identity is scoped by workspace. Half-open intervals allow adjacent bookings and reject overlapping reservations. Reusing a request key with different times is rejected. Unknown outcomes retain their interval until reconciliation; they must never expire solely because a lease expired.

`node tests/calendar-reservations.cjs` applies the SQL to an isolated in-memory PGlite database and checks ten submitted reservations, overlap, adjacency, replay, tenant separation and review state. PGlite serializes queries; this does NOT prove behavior across independent PostgreSQL connections. A separate multi-connection PostgreSQL test remains required.

## Required before integration or deployment

1. Review actual canonical Google calendar/resource identity. Current Google helper targets `primary`; do not silently use a different resource ID for locking.
2. Bind request keys to verified channel event IDs and customer-confirmed booking proposals, not arbitrary model arguments. Validate explicit customer consent server-side.
3. Add repository code calling admission under READ COMMITTED; fail closed when database or migration is unavailable. Do not fall back to process-local files for reservations.
4. Add atomic state transitions, worker lease and fencing. Before external creation persist `creating` and an immutable Google event ID. A stale worker must not regain authority to mutate local state.
5. Resolve retries by querying the same provider event ID. Verify provider ID semantics against current Google documentation before relying on duplicate rejection. Timeout, conflict, malformed response and unknown result require reconciliation, never a new event ID.
6. Atomically associate the confirmed provider result, lead and reservation before telling the customer booking succeeded. Recover failed local persistence without recreating the event.
7. Add reconciliation for expired workers: release only requests known not to have created an event; keep uncertain outcomes in review until checked. Add an operator view and actionable alerts so these are not abandoned indefinite holds.
8. Test separate PostgreSQL connections, crash boundaries, timeouts before/after provider commit, local persistence failure, takeover and repeated webhooks. Then test a dedicated real Google calendar.

## Deployment and rollback

No migration has been applied to production. This is additive SQL but lacks integration, lifecycle and PostgreSQL concurrency verification; do not deploy it yet. Before application, verify permissions to create tables/functions, schema compatibility, backups and restore procedure. Deploy only after all application writers use the admission protocol.

Rollback must first stop new automated bookings and drain/reconcile all in-flight requests. Preserve reservation records and provider IDs for reconciliation; reverting to the previous uncoordinated gateway is unsafe. Drop tables/function only on a disposable test database or after proving there are no unresolved/active reservations and retaining an export.

## Guarantee boundary

Admission can coordinate this application's writers to one shared database. Google Calendar allows overlapping events and external edits are outside that transaction. Do not promise protection against concurrent external calendar writers. A fresh free/busy check remains necessary but cannot make external Google edits atomic with application reservations.
