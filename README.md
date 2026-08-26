# Support Ticket & SLA Tracker

A full-stack Support Ticket & SLA (Service Level Agreement) Tracker built for the BurdenOff
Full Stack Product Engineering Internship take-home assignment.

Reporters file tickets, agents manage and resolve them, and the backend computes SLA
deadlines using **business hours only** — nights, weekends, and configured holidays never
count toward SLA time. The frontend only ever renders backend-computed SLA data; it never
performs SLA math itself.

## 1. Project Overview

- Reporters create tickets and track their own tickets.
- Agents view all tickets, assign them, move them through a status lifecycle, and resolve them.
- Every ticket has two SLA clocks: **first response** and **resolution**, each with its own
  due date, state (`ON_TRACK` / `AT_RISK` / `BREACHED`), and remaining-time countdown.
- SLA math is 100% server-side, isolated in a dedicated SLA engine, and covered by unit tests.

## 2. Tech Stack

**Backend:** Bun, TypeScript (strict), GraphQL Yoga (schema-first), Prisma ORM, PostgreSQL,
Docker Compose, JWT auth, bcrypt, Zod.

**Frontend:** React, Vite, TypeScript, Tailwind CSS, Apollo Client, React Router.

**Testing:** Vitest — unit tests for business logic, integration tests against a real
PostgreSQL instance (no mocked database).

## 3. Architecture Overview

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full breakdown. In short:

```text
GraphQL resolver (thin) → Service (business logic) → Repository (Prisma) → PostgreSQL
```

Resolvers never contain business logic. All SLA math lives in `src/services/sla/`, isolated
from the rest of the app. Validation is centralized with Zod schemas. Authorization is
enforced inside services, never left to the client.

## 4. Folder Structure

```text
support-ticket-sla/
  server/
    src/
      graphql/
        schema/schema.graphql       # schema-first GraphQL types
        resolvers/                  # thin resolvers + context
      services/
        auth/                       # JWT + bcrypt + register/login
        ticket/                     # ticket business rules, lifecycle
        sla/                        # business-hour calendar + SLA state engine
        holiday/                    # holiday calendar loader
      repositories/                 # Prisma data access
      validation/                   # Zod schemas
      utils/                        # errors, prisma client singleton
      server.ts                     # Yoga HTTP entrypoint
    prisma/
      schema.prisma
      seed.ts
    tests/
      unit/                         # SLA engine + business logic
      integration/                  # full-flow tests against real Postgres
  client/
    src/
      pages/                        # Login, Register, Dashboard, Ticket Details, Create Ticket
      components/                   # TicketTable, SLABadge, CommentTimeline, etc.
      graphql/                      # Apollo client, queries/mutations, fragments
      context/                      # AuthContext
      types/                        # shared TS types mirroring the GraphQL schema
  docs/                              # this documentation set
  docker-compose.yml
  .env.example
```

## 5. Database Schema

- **User** — `id, name, email (unique), passwordHash, role (REPORTER|AGENT), createdAt`
- **Ticket** — `id, title, description, priority, status, reporterId, assigneeId, createdAt,
  updatedAt, firstResponseAt, resolvedAt`
- **Comment** — `id, content, ticketId, authorId, createdAt`
- **Holiday** — `id, date (unique), name`

Indexes on `Ticket.priority`, `Ticket.status`, `Ticket.reporterId`, `Ticket.assigneeId`,
`Ticket.createdAt`, plus `User.role`, `Comment.ticketId`, and `Comment.authorId`.

All schema changes go through Prisma Migrate — the schema is never edited by hand in the
database.

## 6. GraphQL Schema

Schema-first, defined in `server/src/graphql/schema/schema.graphql`. Key types: `User`,
`Ticket`, `Comment`, `Holiday`, `SLAInfo`, `TicketDashboard`, `TicketConnection`, `PageInfo`,
`AuthPayload`. See [`docs/API_EXAMPLES.md`](docs/API_EXAMPLES.md) for ready-to-run
queries/mutations.

## 7. Authentication Flow

1. `register(input)` — validates input with Zod, hashes the password with bcrypt, creates the
   user, returns a signed JWT + user.
2. `login(input)` — verifies email/password, returns a signed JWT + user.
3. Every subsequent request sends `Authorization: Bearer <token>`.
4. `createContext` verifies the JWT server-side on every request and loads the current user
   from the database (not just trusting the token payload) before resolvers run.

## 8. Authorization Rules

| Action               | REPORTER         | AGENT       |
| -------------------- | ---------------- | ----------- |
| Create ticket        | Allowed (own)    | Denied      |
| View ticket          | Own tickets only | All tickets |
| List tickets         | Own tickets only | All tickets |
| Comment              | Own tickets only | All tickets |
| Assign ticket        | Denied           | Allowed     |
| Change ticket status | Denied           | Allowed     |
| Resolve ticket       | Denied           | Allowed     |

All of the above is enforced **inside the service layer**, server-side — never left to the
frontend. Violations return `FORBIDDEN` or `UNAUTHORIZED` GraphQL errors with machine-readable
`extensions.code`.

## 9. SLA Calculation Algorithm

Full detail in [`docs/SLA_DESIGN.md`](docs/SLA_DESIGN.md). Summary:

- Business week: Monday–Friday, `BUSINESS_START_HOUR`–`BUSINESS_END_HOUR` (default 09:00–18:00).
- Configured holidays are excluded even on weekdays.
- SLA policy table (priority → first response / resolution, in **business hours**):

  | Priority | First Response | Resolution |
  | -------- | -------------- | ---------- |
  | URGENT   | 1 hour         | 4 hours    |
  | HIGH     | 4 hours        | 24 hours   |
  | MEDIUM   | 8 hours        | 48 hours   |
  | LOW      | 24 hours       | 72 hours   |

- SLA state: `0–75%` of the window consumed → `ON_TRACK`; `75–99%` → `AT_RISK`; deadline
  passed → `BREACHED`.
- **Freeze rule:** once `firstResponseAt` is set, the first-response SLA is evaluated at that
  fixed instant forever (never later flips to `BREACHED`). Same for `resolvedAt` and the
  resolution SLA.
- Reporter comments never set `firstResponseAt`. The first comment by anyone else does, and it
  is never overwritten.

## 10. Business-Hour, Holiday & Timezone Handling

All calculation happens in a configurable timezone (`BUSINESS_TIMEZONE`, default
`Asia/Kolkata`). Timestamps are stored in UTC and converted to the business timezone only for
SLA math; all API responses return ISO-8601 UTC timestamps. Holidays are stored in the
database (`Holiday` model) and loaded per-request into the SLA engine's calendar config.

## 11. Ticket Lifecycle Rules

```text
OPEN → IN_PROGRESS → RESOLVED → CLOSED
```

No skipping stages, no moving backwards. Invalid transitions (e.g. `OPEN → CLOSED`,
`CLOSED → IN_PROGRESS`) are rejected with `INVALID_STATUS_TRANSITION`. Full list of edge cases
in [`docs/EDGE_CASES.md`](docs/EDGE_CASES.md).

## 12. Environment Variables

See [`.env.example`](.env.example) for the full list (`DATABASE_URL`, `JWT_SECRET`,
`BUSINESS_TIMEZONE`, `BUSINESS_START_HOUR`, `BUSINESS_END_HOUR`, etc.).

## 13. Docker Setup

```bash
cp .env.example .env
docker compose up --build
```

This starts `postgres`, `server` (runs migrations + seed automatically, then serves GraphQL
on `:4000/graphql`), and `client` (Vite dev server on `:5173`).

## 14. Prisma Migration Setup

```bash
cd server
bunx prisma migrate dev --name init
```

## 15. Seed Setup

```bash
cd server
bun run seed
```

Seeds one reporter (`reporter@example.com` / `Reporter@123`), one agent
(`agent@example.com` / `Agent@123`), two holidays, and one sample ticket.

## 16. Backend Setup (local, without Docker)

```bash
cd server
bun install
bunx prisma generate
bunx prisma migrate dev
bun run seed
bun run dev
```

## 17. Frontend Setup (local, without Docker)

```bash
cd client
npm install   # or bun install
npm run dev
```

Visit `http://localhost:5173`.

## 18. Running Tests

```bash
cd server
bun run test:unit          # SLA engine + business logic, no database required
docker compose up -d postgres
bun run test:integration   # full-flow tests against real Postgres
bun run test               # everything
```

## 19. GraphQL Playground Examples

Ready-to-run queries and mutations are in [`docs/API_EXAMPLES.md`](docs/API_EXAMPLES.md).
Open `http://localhost:4000/graphql` for the interactive GraphiQL/Yoga playground.

## 20. Known Limitations

See [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md).

## 21. How I'd Extend This (Future Improvements)

- **SLA Pause State ("Waiting on Customer"):** Introduce a `WAITING_ON_CUSTOMER` status that pauses the SLA clock accumulator so customer response delays do not penalize support agents.
- **Per-Team & Custom Calendars:** Allow different departments or customer Tiers (e.g. 24/7 Premium vs 9-5 Standard) to define custom working windows and timezones.
- **Escalation Rules & Notifications:** Implement background workers (e.g. BullMQ/Redis) to automatically trigger webhooks, Slack alerts, or auto-reassignments when a ticket transitions to `AT_RISK` or `BREACHED`.
- **Audit Logs:** Maintain a dedicated `TicketAuditLog` model to track every field change, status transition, and assignment with timestamps and acting user ID.
- **Materialized SLA Column:** Compute and persist `slaState` in PostgreSQL (or update via a lightweight cron/worker) to allow direct database-indexed filtering and high-performance pagination at scale.
- **Recurring Holiday Rules:** Support recurring holiday definitions (e.g., "Every Jan 26") alongside fixed single-date holiday entries.
