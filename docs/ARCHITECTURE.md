# Architecture

## Overall Architecture

The backend follows a classic layered architecture, chosen specifically so that the SLA
engine — the highest-risk, most business-critical part of the system — can be developed,
tested, and reasoned about in complete isolation from GraphQL, HTTP, or the database.

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React + Apollo)                                     │
│  - Renders backend-computed SLA data only                    │
│  - Never calculates SLA state itself                         │
└───────────────────────────┬───────────────────────────────────┘
                            │ GraphQL over HTTP (JWT in Authorization header)
┌───────────────────────────▼───────────────────────────────────┐
│  GraphQL Yoga (schema-first)                                  │
│  - createContext(): verifies JWT, loads current user          │
│  - Resolvers: THIN. Parse input (Zod) → call a service         │
└───────────────────────────┬───────────────────────────────────┘
┌───────────────────────────▼───────────────────────────────────┐
│  Services (business logic)                                    │
│  - AccountService: register/login                              │
│  - TicketService: CRUD, authorization, first-response rule     │
│  - ticketLifecycle: status transition state machine            │
│  - SLA engine (businessCalendar.ts + slaService.ts + policy)   │
│  - holidayService: builds the SLA engine's calendar config     │
└───────────────────────────┬───────────────────────────────────┘
┌───────────────────────────▼───────────────────────────────────┐
│  Repositories (Prisma data access only, no business rules)     │
└───────────────────────────┬───────────────────────────────────┘
┌───────────────────────────▼───────────────────────────────────┐
│  PostgreSQL                                                    │
└─────────────────────────────────────────────────────────────┘
```

## Why This Architecture

- **Resolvers stay thin.** A resolver's job is: validate input shape (Zod), call exactly one
  service method, return its result. This makes resolvers trivially easy to read and means
  business logic is never duplicated between two resolvers that touch the same entity.
- **The SLA engine has zero dependencies on GraphQL or Prisma.** `businessCalendar.ts` and
  `slaService.ts` operate purely on `Date` objects and plain data (`TicketForSLA`). This is
  what makes it possible to unit test every calendar edge case (holidays, weekends, timezone
  crossings) in milliseconds, with no database, no GraphQL server, and no mocking.
- **Repositories isolate Prisma.** If the ORM or database ever changed, only the repository
  layer would need to change — services and resolvers are written against plain TypeScript
  interfaces, not Prisma's generated types directly (with the narrow exception of passing
  Prisma's own input types through `update()` for type safety).
- **Authorization lives in services, not resolvers or the client.** A malicious or buggy
  client can send any request it wants; the service layer is the actual security boundary.

## Request Flow: GraphQL → Service → Prisma

Example: `changeTicketStatus` mutation.

```
1. Client sends: mutation { changeTicketStatus(ticketId: "...", status: RESOLVED) { ... } }
2. Yoga verifies JWT in createContext(), attaches currentUser to context
3. Resolver (graphql/resolvers/index.ts):
     - Zod-validates { ticketId, status } via ChangeTicketStatusInputSchema
     - Calls new TicketService(ctx.prisma).changeTicketStatus({ user, ticketId, status })
4. TicketService.changeTicketStatus():
     - requireAuth(user) — throws UNAUTHORIZED if not logged in
     - Checks user.role === "AGENT" — throws FORBIDDEN otherwise
     - Loads the ticket via TicketRepository.findById()
     - assertValidTransition(ticket.status, status) — throws INVALID_STATUS_TRANSITION
       if the transition isn't allowed
     - Sets resolvedAt if transitioning into RESOLVED
     - Calls TicketRepository.update()
5. TicketRepository.update() issues the actual Prisma `ticket.update(...)` call
6. Result flows back up through the service, resolver, and GraphQL response
```

The `Ticket.sla` field is resolved lazily and separately (see `Ticket.sla` field resolver in
`resolvers/index.ts`): it loads the holiday calendar and calls `computeTicketSLAInfo()` on
whatever ticket data was already fetched. This keeps SLA computation out of the main
create/update code paths — SLA is *read-time derived*, never stored, so it's always
consistent with the latest configuration (business hours, holidays) even for old tickets.

## Authentication Flow

```
register/login
    → AccountService (bcrypt hash/compare, Prisma User lookup)
    → signToken({ sub, role, email }) via jsonwebtoken
    → client stores token, sends `Authorization: Bearer <token>` on every request
    → createContext() verifies token signature + expiry, then RE-LOADS the user from
      the database (not just decoding the JWT payload) so that a user's role/existence
      is always checked against current DB state, not a stale token claim
```

## Why Schema-First GraphQL

The spec mandates schema-first GraphQL. This was also the right call independent of the
mandate: the `.graphql` SDL file is the single source of truth for the API contract, is
trivially diffable in code review, and lets the frontend's TypeScript types
(`client/src/types/index.ts`) be written directly against a document both frontend and backend
engineers can read without touching TypeScript decorators or code-first builder APIs.

## Why SLA Is Computed at Read-Time, Not Stored

Storing `firstResponseState`/`resolutionState` as columns would require a background job to
keep them current (a ticket can flip from `ON_TRACK` to `AT_RISK` to `BREACHED` purely from
time passing, with no write to the ticket). Computing them on read means:
- No cron/worker needed to keep state fresh.
- SLA state is always correct relative to the *current* holiday calendar, even for old tickets.
- The only genuine persistence need is the two freeze timestamps (`firstResponseAt`,
  `resolvedAt`), which are already columns on `Ticket`.

The tradeoff — documented in `docs/KNOWN_LIMITATIONS.md` — is that filtering `tickets(slaState:
...)` at scale requires computing SLA for a page of candidates in application code rather than
in a SQL `WHERE` clause, since SLA state isn't a stored column.
