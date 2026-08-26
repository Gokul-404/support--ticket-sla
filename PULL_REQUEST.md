# Pull Request: Full Stack Support Ticket & Business-Hour SLA Tracker

## 📋 Implementation Summary

This PR delivers a complete, production-ready, full-stack **Support Ticket & Service Level Agreement (SLA) Tracker** for the BurdenOff Full Stack Product Engineering Internship assignment.

The platform allows **Reporters** to file support tickets and monitor real-time SLA countdowns, and **Agents** to manage queues, assign tickets, progress statuses, resolve issues, and export audit-ready reports to Excel and PDF.

### Key Capabilities Built:
- **Backend:** Schema-First GraphQL Yoga server running on Bun runtime with strict TypeScript.
- **Database & ORM:** PostgreSQL managed via Prisma ORM with automated migrations and seed scripts.
- **Pure SLA Engine:** Server-side business-hour calendar calculator with weekend rollovers, holiday skipping, and state freeze rules.
- **Security:** JWT authentication with bcrypt hashing, Zod schema validation, and server-enforced Role-Based Access Control (RBAC).
- **Frontend UI:** Modern SaaS web app built with React, Vite, Tailwind CSS, Apollo Client, live circular SVG gauges, and Excel report export.
- **Containerization:** One-command setup using Docker and Docker Compose.
- **Quality Assurance:** 49 automated unit and PostgreSQL integration tests (100% pass rate).

---

## 🏛️ Architecture Decisions

The system follows a strict **Layered Separation of Concerns**:

```
GraphQL Resolvers (Thin) ──► Service Layer (Business Rules) ──► Repositories (Prisma) ──► PostgreSQL
```

1. **Thin Resolvers:** Resolvers do not contain business logic; they validate input shapes with Zod, extract the authenticated user, and delegate directly to the service layer.
2. **Pure & Isolated SLA Engine (`services/sla/`):** The calendar math (`businessCalendar.ts`) and SLA engine (`slaService.ts`) operate strictly on standard JavaScript `Date` objects and plain data structures with zero dependencies on GraphQL or Prisma.
3. **Read-Time Computed SLA:** SLA states (`ON_TRACK`, `AT_RISK`, `BREACHED`) are computed at query time rather than stored as rigid database columns. This eliminates the need for polling background worker cron jobs and ensures that if holiday schedules update, all ticket SLAs adjust instantly.
4. **Strict Authorization in Services:** Role checks (`AGENT` vs `REPORTER`) are enforced inside services, making the API tamper-proof against client-side bypasses.

---

## ⏱️ SLA Calculation Approach

Every ticket tracks two independent SLA clocks:
1. **First Response SLA:** Evaluated until an agent posts the first comment.
2. **Resolution SLA:** Evaluated until the ticket status is updated to `RESOLVED`.

### Policy Matrix (in Business Hours):
| Priority | First Response Target | Resolution Target |
| :--- | :--- | :--- |
| **URGENT** | 1 business hour | 4 business hours |
| **HIGH** | 4 business hours | 24 business hours |
| **MEDIUM** | 8 business hours | 48 business hours |
| **LOW** | 24 business hours | 72 business hours |

### Calculation Algorithm:
1. **Operating Hours:** Monday–Friday, 09:00 to 18:00 (9 working hours/day) in `BUSINESS_TIMEZONE` (`Asia/Kolkata`, UTC+5:30).
2. **Non-Working Exclusions:** Nights, weekends, and configured public holidays contribute **0 minutes**.
3. **Due Date Computation (`addBusinessMinutes`):**
   - If created outside business hours, the start pointer rolls forward to 09:00 AM on the next business day.
   - It consumes available hours in the current day; if the duration exceeds 18:00, it rolls to 09:00 AM the next business day (skipping weekends and holidays).
4. **The SLA Freeze Rule:**
   - Once `firstResponseAt` or `resolvedAt` is saved, the evaluation instant is fixed at `completedAt ?? now()`.
   - An on-time response remains `ON_TRACK` permanently and will **never** flip to `BREACHED` after the deadline passes.
   - Late responses freeze permanently as `BREACHED`.
5. **State Thresholds:**
   - `0% – 74.99%` consumed: `ON_TRACK`
   - `75% – 99.99%` consumed: `AT_RISK`
   - `100%+` (past due): `BREACHED`

---

## ⚖️ Tradeoffs

1. **Read-Time SLA Calculation vs. Stored Columns:**
   - *Choice:* Compute SLA dynamically at read time via field resolvers.
   - *Advantage:* Always 100% accurate; no background cron jobs required; automatically adapts to holiday updates.
   - *Tradeoff:* In-memory filtering is performed when paginating by SLA state.
2. **Cursor-Based vs. Offset-Based Pagination:**
   - *Choice:* Implemented cursor-based pagination (`cursor: ID`, `take: Int`).
   - *Advantage:* Consistent performance and avoids missed or duplicate rows when new tickets are created in real time.
   - *Tradeoff:* Cannot jump directly to arbitrary page numbers.
3. **Single Global Business Calendar:**
   - *Choice:* Configured single business schedule across all tickets.
   - *Advantage:* High performance, clear operational expectations.
   - *Tradeoff:* Per-client or tiered SLA schedules are not yet isolated.

---

## ⚠️ Known Limitations

1. **Global Calendar Configuration:** Supports a single global business calendar and timezone (`Asia/Kolkata`) for all tickets.
2. **Static Holiday Entries:** Holidays are specific calendar dates in the database rather than recurring rule formulas (e.g. "every 4th Thursday of November").

---

## 🚀 What Would Be Improved with More Time

1. **Multi-Calendar & Tiered SLA Support:** Allow different SLA schedules per customer tier (e.g., Enterprise 24/7 vs. Standard 9-5) and custom regional timezones.
2. **Real-Time Subscriptions:** Integrate GraphQL Subscriptions via WebSockets for instant live updates across agent dashboards when tickets are assigned or commented on.
3. **Custom Holiday Rule Engine:** Implement support for recurring holiday rule definitions (e.g., Easter or floating holidays).
4. **Automated Escalation Triggers:** Webhook and email notifications when a ticket transitions into the `AT_RISK` or `BREACHED` state.
