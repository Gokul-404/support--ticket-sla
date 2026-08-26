# Known Limitations

Documented honestly, per the assignment's request for candour over false completeness.

- **"Waiting on customer" SLA pause is not implemented.** Real support tools typically pause
  the SLA clock while waiting on the customer for more information. This system's SLA clock
  runs continuously from `createdAt` to completion/now — it does not pause. Adding this would
  require a new ticket state (or a separate pause-interval log) and subtracting paused
  business-minutes from `businessMinutesBetween`.

- **Recurring holidays are not implemented.** Holidays are exact one-off dates in the
  `Holiday` table (e.g. `2026-01-26`), not recurring rules (e.g. "every January 26th" or
  "every Diwali"). Each year's holidays must be seeded individually.

- **Email notifications are omitted.** No notification is sent when a ticket becomes
  `AT_RISK` or `BREACHED`, or when a ticket is assigned/commented on. SLA state is only
  visible when the dashboard/ticket is actively viewed.

- **Escalation rules are omitted.** There is no automatic reassignment, priority bump, or
  manager notification when a ticket breaches its SLA.

- **Audit trail is omitted.** Status changes, assignments, and priority changes are not
  logged with a history/timeline — only the current state is stored. `updatedAt` reflects the
  most recent change but not what changed or who changed it (beyond what can be inferred from
  comments).

- **SLA-state filtering does not scale to very large datasets.** `tickets(slaState: ...)` is
  computed in application code over a page of DB-fetched candidates (SLA state isn't a stored
  column — see `docs/ARCHITECTURE.md`), rather than pushed into a SQL `WHERE` clause. This is
  correct and simple at the dataset sizes this assignment targets, but would need a
  materialized/denormalized SLA-state column (updated by a scheduled job) to scale to a very
  large ticket volume with `slaState` filtering.

- **Single global business calendar.** One timezone, one 09:00–18:00 window, one holiday list
  applies to every ticket — there's no per-team, per-region, or per-customer SLA calendar.

- **SLA policy is priority-only.** The first-response/resolution targets are keyed solely by
  `Priority`; there's no per-customer-tier or per-category override.

- **No rate limiting or brute-force protection** on `login`/`register` beyond standard
  password hashing — a production deployment would add this at the API gateway or middleware
  layer.

- **Integration tests require a live Postgres instance** (`docker compose up -d postgres`) and
  were written and type-checked in this environment, but not executed here, since no Postgres
  server was reachable in the authoring sandbox. Unit tests (43/43) were executed and verified
  passing.
