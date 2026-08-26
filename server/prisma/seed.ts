import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/services/auth/authService.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database (upsert mode — preserves existing data)...");

  // ── Passwords ──────────────────────────────────────────────────────────
  const reporterPassword = await hashPassword("Reporter@123");
  const agentPassword    = await hashPassword("Agent@123");

  // ── Users (upsert — never overwrites existing) ────────────────────────

  // Original demo accounts
  const reporter = await prisma.user.upsert({
    where: { email: "reporter@example.com" },
    update: {},
    create: {
      name: "Riya Sharma",
      email: "reporter@example.com",
      passwordHash: reporterPassword,
      role: "REPORTER",
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {},
    create: {
      name: "Arjun Mehta",
      email: "agent@example.com",
      passwordHash: agentPassword,
      role: "AGENT",
    },
  });

  // Additional demo accounts requested by spec
  const riaReporter = await prisma.user.upsert({
    where: { email: "ria.reporter@example.com" },
    update: {},
    create: {
      name: "Ria Reporter",
      email: "ria.reporter@example.com",
      passwordHash: reporterPassword,   // Reporter@123
      role: "REPORTER",
    },
  });

  await prisma.user.upsert({
    where: { email: "agent.smith@example.com" },
    update: {},
    create: {
      name: "Agent Smith",
      email: "agent.smith@example.com",
      passwordHash: agentPassword,      // Agent@123
      role: "AGENT",
    },
  });

  await prisma.user.upsert({
    where: { email: "agent.jones@example.com" },
    update: {},
    create: {
      name: "Agent Jones",
      email: "agent.jones@example.com",
      passwordHash: agentPassword,      // Agent@123
      role: "AGENT",
    },
  });

  // ── Holidays (upsert by unique date) ──────────────────────────────────
  await prisma.holiday.upsert({
    where: { date: new Date("2026-01-26T00:00:00.000Z") },
    update: {},
    create: { date: new Date("2026-01-26T00:00:00.000Z"), name: "Republic Day" },
  });
  await prisma.holiday.upsert({
    where: { date: new Date("2026-08-15T00:00:00.000Z") },
    update: {},
    create: { date: new Date("2026-08-15T00:00:00.000Z"), name: "Independence Day" },
  });

  // ── Original demo tickets (only if zero tickets exist) ────────────────
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    const now = Date.now();
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    // 1. BREACHED Ticket: Created 5 days ago, never responded (URGENT)
    const breachedTicket = await prisma.ticket.create({
      data: {
        title: "🔥 Production API Gateway Outage",
        description: "API gateway returns 502 Bad Gateway for all incoming authentication requests.",
        priority: "URGENT",
        status: "OPEN",
        reporterId: reporter.id,
        createdAt: new Date(now - 5 * DAY),
      },
    });

    // 2. BREACHED Resolution: Responded on time, resolution deadline passed
    const breachedResTicket = await prisma.ticket.create({
      data: {
        title: "Database Memory Leak on Main Cluster",
        description: "PostgreSQL node memory usage increases steadily under peak traffic loads.",
        priority: "HIGH",
        status: "IN_PROGRESS",
        reporterId: reporter.id,
        assigneeId: agent.id,
        createdAt: new Date(now - 6 * DAY),
        firstResponseAt: new Date(now - 6 * DAY + 1 * HOUR),
      },
    });
    await prisma.comment.create({
      data: {
        ticketId: breachedResTicket.id,
        authorId: agent.id,
        content: "Investigating heap dumps and connection pooling configuration.",
        createdAt: new Date(now - 6 * DAY + 1 * HOUR),
      },
    });

    // 3. AT_RISK: Created 50 minutes ago (URGENT 1-hour budget)
    await prisma.ticket.create({
      data: {
        title: "⚠ Customer Checkout Failing for Credit Cards",
        description: "Stripe payment webhook returns invalid signature error during checkout.",
        priority: "URGENT",
        status: "OPEN",
        reporterId: reporter.id,
        createdAt: new Date(now - 50 * MINUTE),
      },
    });

    // 4. ON_TRACK: Created 2 hours ago (LOW 24-hour budget)
    await prisma.ticket.create({
      data: {
        title: "Update Dark Theme Toggle Colors",
        description: "Subtle color contrast improvement requested for user settings page.",
        priority: "LOW",
        status: "OPEN",
        reporterId: reporter.id,
        createdAt: new Date(now - 2 * HOUR),
      },
    });

    // 5. RESOLVED & MET: Within SLA
    const resolvedTicket = await prisma.ticket.create({
      data: {
        title: "Fix Typo in Welcome Onboarding Email",
        description: "Correct spelling of company name in automated welcome sequence.",
        priority: "MEDIUM",
        status: "RESOLVED",
        reporterId: reporter.id,
        assigneeId: agent.id,
        createdAt: new Date(now - 1 * DAY),
        firstResponseAt: new Date(now - 1 * DAY + 30 * MINUTE),
        resolvedAt: new Date(now - 1 * DAY + 2 * HOUR),
      },
    });
    await prisma.comment.create({
      data: {
        ticketId: resolvedTicket.id,
        authorId: agent.id,
        content: "Email template updated and redeployed to production.",
        createdAt: new Date(now - 1 * DAY + 30 * MINUTE),
      },
    });

    console.log("Seeded original demo tickets:", {
      breached: breachedTicket.id,
      breachedResolution: breachedResTicket.id,
    });
  }

  // ── SLA Demo Tickets (3 explicit states: ON_TRACK, AT_RISK, BREACHED) ─
  // These use unique titles as idempotency keys so they won't duplicate.
  //
  // KEY INSIGHT: The SLA engine counts only business minutes (Mon-Fri 09:00-18:00 IST).
  // When "now" is outside business hours (evenings / weekends), business-time-elapsed
  // since creation is measured only up to the last close of business.
  //
  // Strategy:
  //   ON_TRACK  → created at today's 16:00 IST (only 2 biz hours consumed out of 4h HIGH budget = 50%)
  //   AT_RISK   → created at today's 13:00 IST (50 biz minutes consumed out of 60 min URGENT budget = 83%)
  //               BUT we want 50 min consumed, so: today 09:10 IST  → by 18:00 = 530 min elapsed,
  //               that's way too much. We need it to have EXACTLY ~50 min consumed.
  //               Best approach: place it today at 17:10 IST → only 50 min remain until 18:00 = 50 min consumed.
  //   BREACHED  → created 5+ business days ago → SLA long expired.
  //
  // To handle both "during biz hours" and "after biz hours" seed runs correctly,
  // we compute timestamps based on the MOST RECENT business-day afternoon so that
  // the elapsed business time is deterministic.

  const DEMO_ON_TRACK_TITLE  = "[SLA Demo] Dashboard export takes too long";
  const DEMO_AT_RISK_TITLE   = "[SLA Demo] Payment webhook signature mismatch";
  const DEMO_BREACHED_TITLE  = "[SLA Demo] Critical auth service 502 errors";

  // Delete stale demos so we can recreate with fresh timestamps on every restart.
  // This ensures the SLA states are always correct relative to "now".
  await prisma.ticket.deleteMany({
    where: {
      title: { in: [DEMO_ON_TRACK_TITLE, DEMO_AT_RISK_TITLE, DEMO_BREACHED_TITLE] },
    },
  });

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const now = new Date();

  // Helper: get a Date for "today" (or most-recent weekday) at a given IST hour:minute.
  // IST = UTC + 5:30, so IST 09:00 = UTC 03:30, IST 18:00 = UTC 12:30.
  function istToday(hour: number, minute: number): Date {
    const d = new Date(now);
    d.setUTCHours(hour - 5, minute - 30, 0, 0); // IST → UTC offset
    // If it's weekend, push to previous Friday
    const day = d.getUTCDay();
    if (day === 0) d.setTime(d.getTime() - 2 * DAY);      // Sunday → Friday
    else if (day === 6) d.setTime(d.getTime() - 1 * DAY);  // Saturday → Friday
    return d;
  }

  // ── 1. ON_TRACK — HIGH priority (4h = 240 min first-response budget)
  //    Created at today 16:00 IST.
  //    If seed runs after 18:00: elapsed biz time = 2h (16:00→18:00) = 120 min.
  //    120/240 = 50% consumed → ON_TRACK (< 75%).
  //    If seed runs during biz hours (e.g. 16:30): elapsed = 30 min = 12.5% → still ON_TRACK.
  const onTrackCreatedAt = istToday(16, 0);
  await prisma.ticket.create({
    data: {
      title: DEMO_ON_TRACK_TITLE,
      description:
        "The dashboard CSV export endpoint times out for accounts with more than 10k tickets. " +
        "Need query optimization or background job processing.",
      priority: "HIGH",
      status: "OPEN",
      reporterId: riaReporter.id,
      createdAt: onTrackCreatedAt,
    },
  });
  console.log("  ✅ Created ON_TRACK demo ticket (created", onTrackCreatedAt.toISOString(), ")");

  // ── 2. AT_RISK — URGENT (1h = 60 min first-response budget)
  //    Created at today 14:15 IST.
  //    If seed runs after 18:00: elapsed biz time = 3h45m = 225 min.
  //    225 min > 60 min budget → this would be BREACHED.
  //
  //    BETTER: Created at today 17:10 IST.
  //    If seed runs after 18:00: elapsed biz time = 50 min.
  //    50/60 = 83% consumed → AT_RISK (> 75%, < 100%).
  //    If seed runs during biz hours at e.g. 17:30: elapsed = 20 min = 33% → ON_TRACK.
  //    So for "after hours" this is reliably AT_RISK.
  const atRiskCreatedAt = istToday(17, 10);
  await prisma.ticket.create({
    data: {
      title: DEMO_AT_RISK_TITLE,
      description:
        "Stripe payment webhooks returning signature_verification_error for all " +
        "incoming events. Checkout flow is blocked for credit card payments.",
      priority: "URGENT",
      status: "OPEN",
      reporterId: riaReporter.id,
      createdAt: atRiskCreatedAt,
    },
  });
  console.log("  ⚠️  Created AT_RISK demo ticket (created", atRiskCreatedAt.toISOString(), ")");

  // ── 3. BREACHED — URGENT (1h = 60 min first-response budget)
  //    Created 7 calendar days ago → guaranteed ≥ 3 full business days elapsed
  //    → 3×540 = 1620 min >> 60 min budget → deeply BREACHED.
  const breachedCreatedAt = new Date(now.getTime() - 7 * DAY);
  await prisma.ticket.create({
    data: {
      title: DEMO_BREACHED_TITLE,
      description:
        "Authentication service returns 502 Bad Gateway on all login attempts. " +
        "Multiple customers unable to access their accounts. No response from on-call.",
      priority: "URGENT",
      status: "OPEN",
      reporterId: riaReporter.id,
      createdAt: breachedCreatedAt,
    },
  });
  console.log("  🔴 Created BREACHED demo ticket (created", breachedCreatedAt.toISOString(), ")");

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("All seed accounts:");
  const allUsers = await prisma.user.findMany({ select: { email: true, role: true }, orderBy: { email: "asc" } });
  allUsers.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}`));
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
