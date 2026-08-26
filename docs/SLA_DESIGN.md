# SLA Engine Design

## Goal

Compute two SLA clocks per ticket — **first response** and **resolution** — using *business
time only*. A minute outside business hours (nights, weekends, holidays) never counts against
either deadline.

## Configuration

| Setting | Env var | Default |
|---|---|---|
| Timezone | `BUSINESS_TIMEZONE` | `Asia/Kolkata` |
| Business day start | `BUSINESS_START_HOUR` | `9` |
| Business day end (exclusive) | `BUSINESS_END_HOUR` | `18` |
| Business week | (fixed) | Monday–Friday |
| Holidays | `Holiday` table | seeded, extensible via the `holidays` query/table |

All ticket timestamps (`createdAt`, `firstResponseAt`, `resolvedAt`) are stored as UTC in
Postgres. The SLA engine converts to `BUSINESS_TIMEZONE` internally for all wall-clock
comparisons (day-of-week, hour-of-day), then converts results back to UTC before returning
them, so the rest of the app — and every API response — only ever deals in UTC / ISO-8601.

## Core Algorithm

The engine lives in `server/src/services/sla/`:

- **`businessCalendar.ts`** — pure calendar math: `isBusinessDay`, `isBusinessHour`,
  `isHoliday`, `nextBusinessStart`, `addBusinessMinutes`/`addBusinessHours`,
  `businessMinutesBetween`, `remainingBusinessMinutes`. No knowledge of tickets, priorities,
  or GraphQL — just "given this business calendar, how much business time is between two
  instants, or what instant is N business-minutes after this one."
- **`slaPolicy.ts`** — the exact priority → hours table from the spec.
- **`slaService.ts`** — combines the two: given a ticket's `createdAt` + `priority` +
  optional `completedAt`, compute `{ dueAt, state, remainingMinutes }` for one SLA target,
  and `computeTicketSLAInfo()` does this for both first-response and resolution at once.

### `addBusinessMinutes` — computing a due date

1. If `date` isn't already inside business hours, roll forward to the next business start
   (`nextBusinessStart`) — e.g. a ticket created Saturday effectively starts its SLA clock
   Monday 09:00.
2. Consume minutes against the remaining time in the current business day.
3. If minutes remain, roll to the next business day's 09:00 and repeat.
4. Repeat until the full duration has been consumed, skipping weekends and holidays entirely.

### `businessMinutesBetween` — measuring elapsed business time

Walks day-by-day between two instants, and for each business day adds
`min(dayEnd, rangeEnd) − max(dayStart, rangeStart)` (clamped to ≥ 0), skipping weekends and
holidays. This is used both to compute the *total SLA budget* (business minutes between
`createdAt` and the due date) and the *time consumed so far* (business minutes between
`createdAt` and now/completion).

## Worked Examples

**Example 1 — Friday 17:00 → Monday 12:00 (crossing a weekend)**

Ticket created Friday 17:00, priority URGENT (4 business-hour resolution SLA).
- Friday: 1 business hour available (17:00–18:00) → 3 hours remain.
- Saturday/Sunday: skipped entirely.
- Monday: due date = 09:00 + 3 hours = **Monday 12:00**.

**Example 2 — Holiday Monday**

Ticket created the Friday before a Monday holiday, priority LOW (24-hour first response).
- Friday: 9 hours available → 15 hours remain.
- Saturday/Sunday: skipped.
- Monday (holiday): skipped entirely, as if it doesn't exist on the calendar.
- Tuesday: 9 hours available → 6 hours remain.
- Wednesday: due date = 09:00 + 6 hours = **Wednesday 15:00**.

**Example 3 — Weekend example (already-elapsed business time)**

`businessMinutesBetween(Fri 17:00, Mon 10:00)` = 60 min (Friday 17:00–18:00) + 0 (weekend) +
60 min (Monday 09:00–10:00) = **120 minutes**, even though ~65 wall-clock hours passed.

## SLA Freeze Rule

Once an event happens (`firstResponseAt` or `resolvedAt` is set), that SLA target's state and
remaining-time value must never change again — in particular, it must never *later* flip to
`BREACHED` just because time keeps passing after the event.

**Implementation:** the evaluation instant for a target is
`completedAt ?? now`. Once `completedAt` is set, every future call to `computeTicketSLAInfo`
re-evaluates at that same fixed instant, so the result is stable forever. This has two
correct, intentional consequences:

- If the response/resolution happened **on time**, the state is frozen as whatever it was at
  that moment (`ON_TRACK` or `AT_RISK`) — it can never become `BREACHED` afterward.
- If the response/resolution happened **after the deadline had already passed**, the state is
  correctly frozen as `BREACHED` — freezing does not retroactively "forgive" a real breach,
  it only stops the state from *changing after the fact*.

## Remaining-Minutes Calculation

`remainingBusinessMinutes(evaluationInstant, dueAt)` returns business minutes until the
deadline (positive), or business minutes past the deadline (negative, once breached). Because
the evaluation instant is frozen post-completion, this value also stops changing once the
event has happened — it reports "how much time was left (or how overdue it was) at the moment
of response/resolution," which is exactly what a QA/reporting view would want.

## ON_TRACK / AT_RISK / BREACHED Logic

```
if evaluationInstant >= dueAt:              BREACHED
else if consumed / totalBudget >= 0.75:      AT_RISK
else:                                         ON_TRACK
```

`totalBudget` and `consumed` are both measured in business minutes via
`businessMinutesBetween`, so the 75% threshold is a percentage of *business* time, not
wall-clock time — a ticket sitting untouched over a weekend does not silently creep toward
`AT_RISK` just because two calendar days passed.

### Boundary Behaviour

- Exactly 75.00% consumed → `AT_RISK` (the threshold is inclusive on the risk side).
- Exactly at the due-date instant → `BREACHED` (the deadline instant itself counts as
  breached, not the last `ON_TRACK`/`AT_RISK` moment).
- Business-hour window boundaries: `09:00` is business time (inclusive start); `18:00` is not
  (exclusive end) — so a ticket created at exactly 18:00 is treated as created after hours.

## Assumptions

- A single global business calendar (one timezone, one 09:00–18:00 window, one holiday list)
  applies to all tickets — no per-team or per-customer calendars.
- Holidays are exact calendar dates, not recurring rules (see Known Limitations).
- SLA policy is keyed purely by priority, not by ticket category or customer tier.
