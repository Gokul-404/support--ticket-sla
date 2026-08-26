# Testing Report

## Summary

- **43 unit tests**, all passing, requiring no database.
- **3 integration test scenarios** (one full multi-step lifecycle + two authorization/validation
  scenarios) against a **real PostgreSQL** instance — no mocked database, per the spec.
- Both suites run via Vitest (`bun run test`, or `test:unit` / `test:integration` individually).

Unit tests were executed in this environment and confirmed passing (43/43). Integration tests
require a live Postgres instance (`docker compose up -d postgres`) which is not available in
the authoring sandbox; they are written and structurally type-checked, and are designed to run
via `bun run test:integration` once Postgres is reachable.

## Unit Tests

### `tests/unit/businessCalendar.test.ts` — 26 tests

| Test | Purpose | Expected output |
|---|---|---|
| Monday is a business day | Weekday classification | `true` |
| Saturday / Sunday are not business days | Weekend classification | `false` |
| Configured holiday weekday is not a business day | Holiday overrides weekday | `false` |
| Business hour at 09:00 exactly | Inclusive start boundary | `true` |
| Not business hour at 18:00 exactly | Exclusive end boundary | `false` |
| Not business hour before 09:00 | Before-hours classification | `false` |
| Not business hour on weekend during 9–18 | Weekend overrides hour-of-day | `false` |
| `nextBusinessStart` no-op when already in business hours | Idempotence | same instant |
| Rolls forward to 09:00 same day (before hours) | Before-hours rollover | 09:00 same day |
| Friday 17:59 returns itself (still business hours) | Boundary precision | same instant |
| Friday 18:30 rolls to Monday 09:00 | Weekend skip | Monday 09:00 |
| Saturday rolls to Monday 09:00 | Weekend skip | Monday 09:00 |
| Sunday rolls to Monday 09:00 | Weekend skip | Monday 09:00 |
| Holiday Tuesday rolls to Wednesday 09:00 | Holiday skip | Wednesday 09:00 |
| `addBusinessMinutes` within same day | Simple addition | exact same-day time |
| `addBusinessHours` rolls to next business day, skipping a holiday | Day rollover + holiday skip | Wednesday time |
| Crosses a weekend (Friday 17:00 + 4h) | Weekend-spanning SLA | Monday 12:00 |
| Crosses multiple business days (24h SLA with a holiday) | Multi-day SLA + holiday skip | Thursday 15:00 |
| Rolls forward before adding when created outside hours | Compound rollover | Monday 10:00 |
| `businessMinutesBetween` same instant | Zero-length range | `0` |
| `businessMinutesBetween` full business day | Simple full-day span | `540` (9×60) |
| Excludes weekend time from count | Weekend exclusion | `120` |
| Excludes holiday time from count | Holiday exclusion | `120` |
| `remainingBusinessMinutes` negative once passed | Overdue detection | negative value |
| `remainingBusinessMinutes` positive before due | Time-left detection | positive value |

### `tests/unit/slaService.test.ts` — 9 tests

| Test | Purpose | Expected output |
|---|---|---|
| ON_TRACK when little time consumed | Low-consumption classification | `ON_TRACK` |
| AT_RISK at ≥75% consumed | Risk threshold (inclusive) | `AT_RISK` |
| ON_TRACK just under 75% | Risk threshold (exclusive below) | `ON_TRACK` |
| BREACHED once due date passed | Breach detection | `BREACHED`, negative remaining minutes |
| Multi-day resolution deadline (MEDIUM, 48h) | Sanity check on a large policy window | due date beyond that week's Friday |
| Freezes first-response state after `firstResponseAt`, even far in the future | Freeze rule (on-time case) | `ON_TRACK` forever |
| Keeps a genuinely late first response frozen as BREACHED | Freeze rule (already-breached case) | `BREACHED`, does not un-breach |
| Freezes resolution state after `resolvedAt` | Freeze rule applies independently to resolution | `ON_TRACK` forever |
| First-response and resolution evaluated independently | Two SLA clocks don't interfere | one frozen `ON_TRACK`, other live `BREACHED` |

### `tests/unit/ticketLifecycle.test.ts` — 8 tests

| Test | Purpose | Expected output |
|---|---|---|
| OPEN → IN_PROGRESS allowed | Forward transition | `true` |
| IN_PROGRESS → RESOLVED allowed | Forward transition | `true` |
| RESOLVED → CLOSED allowed | Forward transition | `true` |
| OPEN → CLOSED rejected | Skipping stages | `false` / throws |
| CLOSED → IN_PROGRESS rejected | Moving backwards | `false` |
| RESOLVED → OPEN rejected | Moving backwards | `false` |
| Same-status no-op rejected | No-op transition | `false` |
| Any transition out of CLOSED rejected | Terminal state | `false` |

## Integration Tests

`tests/integration/ticketLifecycle.integration.test.ts`, executed against a real Postgres
database via Prisma (schema reset between tests with `resetDatabase()`), calling the actual
GraphQL schema's `execute()` directly (no mocked resolvers, no mocked database):

**Complete flow:**
1. Register reporter.
2. Register agent.
3. Login as reporter (verifies bcrypt hash write/compare and JWT round-trip for real).
4. Create ticket as reporter.
5. Reporter comments — assert `firstResponseAt` stays `null` in the database.
6. Agent comments — assert `firstResponseAt` becomes non-null in the database.
7. Second agent comment — assert `firstResponseAt` is unchanged (not overwritten).
8. Assign ticket to the agent.
9. Transition to `IN_PROGRESS`.
10. Resolve the ticket.
11. Verify `resolvedAt` is persisted in the database (queried directly via Prisma, not just
    the mutation's response).
12. Verify the `sla` field resolves to valid states.

**Additional integration scenarios:**
- A reporter cannot view another reporter's ticket (`FORBIDDEN`).
- `OPEN → CLOSED` is rejected end-to-end through the real GraphQL/DB stack
  (`INVALID_STATUS_TRANSITION`).

## Manual End-to-End Test Checklist

### Reporter flow
- [ ] Register as a reporter.
- [ ] Log in.
- [ ] Create a ticket with each priority level.
- [ ] View own ticket list and detail page.
- [ ] Attempt to view another reporter's ticket directly by URL — confirm it's blocked.
- [ ] Post a comment.
- [ ] Log out.

### Agent flow
- [ ] Log in as agent.
- [ ] View all tickets (across reporters).
- [ ] Filter by status, priority, SLA state, assignee.
- [ ] Assign a ticket to self.
- [ ] Move a ticket OPEN → IN_PROGRESS.
- [ ] Post a comment (verify `firstResponseAt` sets on first agent comment only).
- [ ] Resolve the ticket.
- [ ] Close the ticket.
- [ ] Attempt `OPEN → CLOSED` directly — confirm rejection.

### Validation flow
- [ ] Submit a ticket with an empty title/description — confirm inline validation error.
- [ ] Submit a comment with whitespace-only content — confirm rejection.
- [ ] Register with an already-used email — confirm `EMAIL_ALREADY_IN_USE`.
- [ ] Log in with a wrong password — confirm `INVALID_CREDENTIALS`.

### Authorization flow
- [ ] Reporter attempts `assignTicket` — confirm `FORBIDDEN`.
- [ ] Reporter attempts `changeTicketStatus` — confirm `FORBIDDEN`.
- [ ] Unauthenticated request to any query/mutation requiring a user — confirm `UNAUTHORIZED`.
- [ ] Tamper with/expire a JWT — confirm the request is treated as unauthenticated.

### SLA flow
- [ ] Create an URGENT ticket, observe `ON_TRACK` immediately.
- [ ] Wait (or seed a ticket with a past `createdAt`) past 75% of the first-response window —
      observe `AT_RISK`.
- [ ] Wait past the due date — observe `BREACHED`.
- [ ] Respond on a breached ticket — observe the state stays `BREACHED` (frozen, not un-breached).
- [ ] Create a ticket just before a configured holiday — observe the due date skips the holiday.
- [ ] Create a ticket Friday evening — observe the due date correctly skips the weekend.

## Test Matrix

| Feature | Test Name | Pass Criteria |
|---|---|---|
| Business-hour classification | `isBusinessDay / isBusinessHour / isHoliday` suite | All boundary cases match spec exactly |
| SLA due-date computation | `addBusinessMinutes / addBusinessHours` suite | Due dates skip nights/weekends/holidays correctly |
| SLA state classification | `computeTicketSLAInfo — state classification` suite | Correct `ON_TRACK`/`AT_RISK`/`BREACHED` at each threshold |
| SLA freeze rule | `computeTicketSLAInfo — freeze rules` suite | State/remaining-minutes never change after completion |
| Ticket lifecycle | `ticket lifecycle transitions` suite | Only forward, single-step transitions allowed |
| End-to-end ticket flow | `Full ticket lifecycle (real Postgres)` | All steps succeed; `firstResponseAt`/`resolvedAt` persisted correctly |
| Authorization | `prevents a reporter from viewing another reporter's ticket` | `FORBIDDEN` returned |
| Status-transition guard | `rejects an invalid status transition` | `INVALID_STATUS_TRANSITION` returned |
