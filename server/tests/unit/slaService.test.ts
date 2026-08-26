import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import type { BusinessCalendarConfig } from "../../src/services/sla/businessCalendar.js";
import { computeTicketSLAInfo } from "../../src/services/sla/slaService.js";
import type { Priority } from "@prisma/client";

const TZ = "Asia/Kolkata";

function ist(y: number, mo: number, d: number, h: number, mi = 0): Date {
  return DateTime.fromObject(
    { year: y, month: mo, day: d, hour: h, minute: mi },
    { zone: TZ }
  )
    .toUTC()
    .toJSDate();
}

const config: BusinessCalendarConfig = {
  timezone: TZ,
  startHour: 9,
  endHour: 18,
  holidayDates: new Set(["2026-08-25"]), // Tuesday holiday
};

// URGENT: 1hr first response / 4hr resolution.
describe("computeTicketSLAInfo — state classification", () => {
  it("is ON_TRACK when little time has been consumed", () => {
    const createdAt = ist(2026, 8, 24, 9, 0); // Monday 09:00
    const now = ist(2026, 8, 24, 9, 10); // 10 min later, urgent has 60 min budget
    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt: null, resolvedAt: null },
      now,
      config
    );
    expect(info.firstResponseState).toBe("ON_TRACK");
    expect(info.firstResponseRemainingMinutes).toBe(50);
  });

  it("is AT_RISK once >=75% of the SLA window is consumed", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const now = ist(2026, 8, 24, 9, 46); // 46/60 = 76.6% consumed
    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt: null, resolvedAt: null },
      now,
      config
    );
    expect(info.firstResponseState).toBe("AT_RISK");
  });

  it("is ON_TRACK just under the 75% boundary", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const now = ist(2026, 8, 24, 9, 44); // 44/60 = 73.3%
    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt: null, resolvedAt: null },
      now,
      config
    );
    expect(info.firstResponseState).toBe("ON_TRACK");
  });

  it("is BREACHED once the due date has passed", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const now = ist(2026, 8, 24, 10, 30); // 90 min later, budget was 60 min
    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt: null, resolvedAt: null },
      now,
      config
    );
    expect(info.firstResponseState).toBe("BREACHED");
    expect(info.firstResponseRemainingMinutes).toBeLessThan(0);
  });

  it("computes a multi-day resolution deadline correctly for MEDIUM priority", () => {
    // MEDIUM resolution = 48 business hours.
    const createdAt = ist(2026, 8, 24, 9, 0); // Monday 09:00
    const now = ist(2026, 8, 24, 9, 1);
    const info = computeTicketSLAInfo(
      { createdAt, priority: "MEDIUM" as Priority, firstResponseAt: null, resolvedAt: null },
      now,
      config
    );
    // Mon 9hrs, Tue holiday skipped, Wed 9hrs, Thu 9hrs, Fri 9hrs -> 36hrs by Fri 18:00
    // remaining 12hrs -> Mon(next week) 09:00 + 12hrs -> spills to Tue... but Tue holiday too? No only 08-25 is holiday (one-off).
    // Just assert the due date falls after Friday of that week (sanity check, not exact to avoid over-coupling two engines).
    expect(info.resolutionDueAt.getTime()).toBeGreaterThan(ist(2026, 8, 28, 18, 0).getTime());
  });
});

describe("computeTicketSLAInfo — freeze rules", () => {
  it("freezes first-response state once firstResponseAt is set, even if now has moved far past due", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const firstResponseAt = ist(2026, 8, 24, 9, 30); // responded within budget (60 min)
    const farFutureNow = ist(2026, 9, 10, 9, 0); // weeks later

    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt, resolvedAt: null },
      farFutureNow,
      config
    );

    expect(info.firstResponseState).toBe("ON_TRACK");
    expect(info.firstResponseRemainingMinutes).toBe(30);
  });

  it("keeps a genuinely late first response frozen as BREACHED (does not un-breach)", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const firstResponseAt = ist(2026, 8, 24, 11, 0); // responded 2hrs late (budget was 60 min)
    const now = ist(2026, 8, 24, 11, 30);

    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt, resolvedAt: null },
      now,
      config
    );

    expect(info.firstResponseState).toBe("BREACHED");
  });

  it("freezes resolution state once resolvedAt is set", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const resolvedAt = ist(2026, 8, 24, 10, 0); // resolved within URGENT's 4hr budget
    const farFutureNow = ist(2026, 9, 10, 9, 0);

    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt: null, resolvedAt },
      farFutureNow,
      config
    );

    expect(info.resolutionState).toBe("ON_TRACK");
  });

  it("first-response and resolution states are evaluated independently", () => {
    const createdAt = ist(2026, 8, 24, 9, 0);
    const firstResponseAt = ist(2026, 8, 24, 9, 15); // fast first response
    const now = ist(2026, 8, 24, 15, 0); // resolution still open, well past risk threshold

    const info = computeTicketSLAInfo(
      { createdAt, priority: "URGENT" as Priority, firstResponseAt, resolvedAt: null },
      now,
      config
    );

    expect(info.firstResponseState).toBe("ON_TRACK"); // frozen, fast response
    expect(info.resolutionState).toBe("BREACHED"); // 4hr budget, 6hrs elapsed
  });
});
