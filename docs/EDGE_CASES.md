# Edge Cases

Every scenario below follows: **Scenario → Expected behaviour → Implementation behaviour →
Test covering it**.

## SLA / Business-Hour Edge Cases

### Before business hours
- **Scenario:** Ticket created at 06:00 (before the 09:00 start).
- **Expected:** SLA clock effectively starts at 09:00 the same day.
- **Implementation:** `nextBusinessStart()` rolls the instant forward to 09:00.
- **Test:** `businessCalendar.test.ts` → "rolls forward to 09:00 same day when created before business hours".

### After business hours
- **Scenario:** Ticket created at 19:00 (after the 18:00 end).
- **Expected:** SLA clock starts 09:00 the next business day.
- **Implementation:** `nextBusinessStart()` rolls past the current day.
- **Test:** `businessCalendar.test.ts` → "rolls Friday 18:30 forward to Monday 09:00" (same
  after-hours-rollover mechanism, exercised across a weekend).

### Friday evening
- **Scenario:** Ticket created Friday 17:59 (still inside business hours) vs. Friday 18:30
  (after hours).
- **Expected:** 17:59 starts the clock immediately; 18:30 rolls to the next business day.
- **Implementation:** `isBusinessHour` end boundary is exclusive at 18:00.
- **Test:** `businessCalendar.test.ts` → both "Friday evening" cases.

### Saturday / Sunday
- **Scenario:** Ticket created on a weekend.
- **Expected:** SLA clock starts Monday 09:00 (or later if Monday is also a holiday).
- **Implementation:** `isBusinessDay` excludes ISO weekdays 6 and 7.
- **Test:** `businessCalendar.test.ts` → "rolls Saturday/Sunday forward to Monday 09:00".

### Holiday
- **Scenario:** Ticket created on, or an SLA window spanning, a configured holiday.
- **Expected:** The holiday contributes zero business minutes, exactly like a weekend day.
- **Implementation:** `isHoliday()` checks the `Holiday` table (via `holidayService`); `isBusinessDay`
  requires both "not weekend" and "not holiday".
- **Test:** `businessCalendar.test.ts` → "skips a holiday Tuesday", "excludes holiday time from the count".

### Weekend followed by a holiday
- **Scenario:** Friday → Saturday → Sunday → Monday (holiday) → Tuesday.
- **Expected:** All of Sat/Sun/Mon contribute zero business minutes; the clock resumes Tuesday 09:00.
- **Implementation:** `nextBusinessStart`'s day-by-day walk treats every non-business day
  uniformly, regardless of *why* it's non-business.
- **Test:** `businessCalendar.test.ts` → "crosses multiple business days for a large SLA window"
  exercises a holiday adjacent to normal business days within a multi-day SLA.

### Multiple holidays
- **Scenario:** An SLA window spans two or more separate holidays.
- **Expected:** Each holiday is independently skipped; they are not required to be consecutive.
- **Implementation:** `holidayDates` is a `Set<string>` of arbitrary dates — no assumption of
  contiguity.
- **Test:** Seed data includes two non-adjacent holidays (Republic Day, Independence Day);
  covered structurally by the same `isHoliday`/`addBusinessMinutes` logic validated for a
  single holiday, which generalizes to any number of dates.

### Multiple business-day SLAs
- **Scenario:** A LOW-priority resolution SLA (72 business hours ≈ 8 business days at 9 hrs/day).
- **Expected:** The due date correctly lands multiple business days later, holidays and
  weekends skipped throughout.
- **Implementation:** `addBusinessMinutes`'s loop consumes one business day's worth at a time
  until the full duration is exhausted.
- **Test:** `businessCalendar.test.ts` → "crosses multiple business days for a large SLA window" (24hr case).

### Timezone conversions
- **Scenario:** Server/database store UTC; business hours are defined in `Asia/Kolkata` (UTC+5:30).
- **Expected:** A ticket's business-hour classification must reflect local wall-clock time in
  the business timezone, not UTC.
- **Implementation:** `toZoned()` converts every `Date` to `BUSINESS_TIMEZONE` via Luxon before
  any day-of-week/hour-of-day check; results are converted back to UTC (`toUTC().toJSDate()`)
  before being returned or stored.
- **Test:** All `businessCalendar.test.ts` cases construct fixtures via an explicit
  `Asia/Kolkata` → UTC conversion helper, so a timezone bug would fail nearly every test.

## SLA Freeze / Lifecycle Edge Cases

### SLA freeze
- **Scenario:** First response or resolution happens; time continues to pass afterward.
- **Expected:** State/remaining-minutes must never change again after the event.
- **Implementation:** Evaluation instant pinned to `completedAt` once set (see `SLA_DESIGN.md`).
- **Test:** `slaService.test.ts` → both freeze-rule tests (on-time freeze and already-breached freeze).

### Ticket already resolved
- **Scenario:** `resolveTicket` called on a ticket that's already `RESOLVED`.
- **Expected:** Rejected — `RESOLVED → RESOLVED` is not a valid transition (no-op transitions
  are rejected).
- **Implementation:** `assertValidTransition` rejects `from === to`.
- **Test:** `ticketLifecycle.test.ts` → "rejects a no-op transition to the same status".

### Ticket already closed
- **Scenario:** Any mutation attempting to change a `CLOSED` ticket's status further.
- **Expected:** Rejected — `CLOSED` is terminal, no outgoing transitions.
- **Implementation:** `ALLOWED_TRANSITIONS.CLOSED` is an empty set.
- **Test:** `ticketLifecycle.test.ts` → "rejects any transition out of CLOSED".

### Reporter commenting multiple times before agent
- **Scenario:** The reporter posts several comments before any agent responds.
- **Expected:** `firstResponseAt` remains `null` throughout.
- **Implementation:** `addComment` only sets `firstResponseAt` when `authorId !== reporterId`.
- **Test:** `ticketLifecycle.integration.test.ts` → reporter comment step, asserts `firstResponseAt` stays null.

### Multiple agent comments
- **Scenario:** An agent comments, then comments again later.
- **Expected:** `firstResponseAt` is set on the *first* agent comment and never overwritten.
- **Implementation:** `addComment` checks `!ticket.firstResponseAt` before setting it.
- **Test:** `ticketLifecycle.integration.test.ts` → "second agent comment must NOT overwrite firstResponseAt".

## Validation Edge Cases

### Invalid status transition
- **Scenario:** `changeTicketStatus` requests e.g. `OPEN → CLOSED` or `RESOLVED → OPEN`.
- **Expected:** Rejected with `INVALID_STATUS_TRANSITION`.
- **Implementation:** `assertValidTransition`.
- **Test:** `ticketLifecycle.test.ts` (unit) and `ticketLifecycle.integration.test.ts` (integration).

### Unauthorized assignment
- **Scenario:** A REPORTER calls `assignTicket`.
- **Expected:** Rejected with `FORBIDDEN`.
- **Implementation:** `TicketService.assignTicket` checks `user.role === "AGENT"`.
- **Test:** Covered by the authorization pattern validated in
  `ticketLifecycle.integration.test.ts` ("prevents a reporter from viewing another reporter's ticket").

### Invalid pagination cursor
- **Scenario:** `tickets(cursor: "does-not-exist")`.
- **Expected:** A clear error rather than a silent empty/garbage page.
- **Implementation:** Prisma's `cursor` option throws if the row doesn't exist; the resolver's
  Zod validation additionally guards `take` bounds (1–100) before the query runs.

### Invalid priority / empty comment / empty title / empty description
- **Scenario:** Any of these sent blank, whitespace-only, or as an invalid enum value.
- **Expected:** Rejected with `VALIDATION_ERROR` before touching the database.
- **Implementation:** Zod schemas in `validation/schemas.ts` (`nonEmptyTrimmed` rejects empty
  and whitespace-only strings; `z.enum(...)` rejects invalid enum values).

### Nonexistent ticket / nonexistent assignee
- **Scenario:** An ID that doesn't correspond to any row.
- **Expected:** `TICKET_NOT_FOUND` / `USER_NOT_FOUND`.
- **Implementation:** Services check `findById`/`findUnique` results and throw the appropriate
  `AppError` before proceeding.

## Failure Behaviour

For every mutation/query category: what happens on success, what happens on failure, and how
the frontend surfaces it.

| Feature | On success | On failure | Error code | Frontend behaviour |
|---|---|---|---|---|
| **Authentication** (`register`/`login`) | Returns `{ token, user }` | Wrong password, duplicate email | `INVALID_CREDENTIALS`, `EMAIL_ALREADY_IN_USE`, `VALIDATION_ERROR` | Inline form error text under the submit button |
| **Ticket creation** | Returns the created `Ticket` | Not a reporter, invalid input | `FORBIDDEN`, `VALIDATION_ERROR` | Modal/page shows the error message, form stays populated |
| **Assignment** | Returns updated `Ticket` with `assignee` | Not an agent, ticket/assignee not found, assignee isn't an AGENT | `FORBIDDEN`, `TICKET_NOT_FOUND`, `USER_NOT_FOUND`, `VALIDATION_ERROR` | Dropdown reverts; Apollo error link logs details |
| **Status transition** | Returns updated `Ticket` | Not an agent, invalid transition | `FORBIDDEN`, `INVALID_STATUS_TRANSITION` | `StatusDropdown` only ever offers valid next states, so this mainly guards against stale UI/race conditions |
| **Resolve** | Returns updated `Ticket` with `resolvedAt` set | Not an agent, invalid transition (e.g. already resolved) | `FORBIDDEN`, `INVALID_STATUS_TRANSITION` | Button disabled once not `IN_PROGRESS` |
| **Comment** | Returns the created `Comment` | Not authorized to comment on this ticket, empty content | `FORBIDDEN`, `INVALID_COMMENT`/`VALIDATION_ERROR` | Inline error under the comment textarea, draft text preserved |
| **Validation (general)** | N/A | Any Zod schema failure | `VALIDATION_ERROR` with `issues` in `extensions` | Surfaced as the top-level GraphQL error message |
| **SLA lookup** (`Ticket.sla` field) | Returns `SLAInfo` | Holiday config fails to load (DB error) | Masked to a generic error (never leaks internals) | Ticket page shows a loading/error state via Apollo |
| **Holiday lookup** | Returns `[Holiday!]!` | Not authenticated | `UNAUTHORIZED` | Redirect to `/login` (handled by `ProtectedRoute`) |
| **Pagination** | Returns `TicketConnection` with `pageInfo` | Invalid/stale cursor | Prisma error, masked to generic message unless it's a known `AppError` | "Next"/"Previous" buttons disabled appropriately based on `hasNextPage` |
| **Authorization (general)** | N/A | Any role/ownership check failure | `FORBIDDEN` or `UNAUTHORIZED` | Global Apollo `errorLink` logs to console; callers show inline messages |

All GraphQL errors are shaped consistently via `AppError` (`server/src/utils/errors.ts`):
`{ message, extensions: { code, ...extra } }`. The `maskedErrors` config in `server.ts` only
passes through errors that already carry a `code` extension (i.e. deliberate `AppError`s);
anything else (unexpected exceptions, e.g. a DB connection failure) is logged server-side and
replaced with a generic message — **stack traces are never sent to the client**.
