import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  addBusinessMinutes,
  addBusinessHours,
  businessMinutesBetween,
  isBusinessDay,
  isBusinessHour,
  isHoliday,
  nextBusinessStart,
  remainingBusinessMinutes,
  type BusinessCalendarConfig,
} from "../../src/services/sla/businessCalendar.js";

const TZ = "Asia/Kolkata";

// Monday 2026-08-24 is our fixed anchor date.
// Tue 2026-08-25 is configured as a holiday for holiday-specific tests.
function ist(y: number, mo: number, d: number, h: number, mi = 0): Date {
  return DateTime.fromObject(
    { year: y, month: mo, day: d, hour: h, minute: mi },
    { zone: TZ }
  )
    .toUTC()
    .toJSDate();
}

const baseConfig: BusinessCalendarConfig = {
  timezone: TZ,
  startHour: 9,
  endHour: 18,
  holidayDates: new Set(["2026-08-25"]), // Tuesday holiday
};

describe("isBusinessDay / isBusinessHour / isHoliday", () => {
  it("treats Monday as a business day", () => {
    expect(isBusinessDay(ist(2026, 8, 24, 10), baseConfig)).toBe(true);
  });

  it("treats Saturday as not a business day", () => {
    expect(isBusinessDay(ist(2026, 8, 29, 10), baseConfig)).toBe(false);
  });

  it("treats Sunday as not a business day", () => {
    expect(isBusinessDay(ist(2026, 8, 30, 10), baseConfig)).toBe(false);
  });

  it("treats a configured holiday weekday as not a business day", () => {
    expect(isHoliday(ist(2026, 8, 25, 10), baseConfig)).toBe(true);
    expect(isBusinessDay(ist(2026, 8, 25, 10), baseConfig)).toBe(false);
  });

  it("is business hour at 09:00 exactly (inclusive start)", () => {
    expect(isBusinessHour(ist(2026, 8, 24, 9, 0), baseConfig)).toBe(true);
  });

  it("is not business hour at 18:00 exactly (exclusive end)", () => {
    expect(isBusinessHour(ist(2026, 8, 24, 18, 0), baseConfig)).toBe(false);
  });

  it("is not business hour before 09:00", () => {
    expect(isBusinessHour(ist(2026, 8, 24, 8, 59), baseConfig)).toBe(false);
  });

  it("is not business hour on a weekend even during 9-18 window", () => {
    expect(isBusinessHour(ist(2026, 8, 29, 12), baseConfig)).toBe(false);
  });
});

describe("nextBusinessStart", () => {
  it("returns same instant when already inside business hours", () => {
    const t = ist(2026, 8, 24, 11, 30);
    expect(nextBusinessStart(t, baseConfig).getTime()).toBe(t.getTime());
  });

  it("rolls forward to 09:00 same day when created before business hours", () => {
    const created = ist(2026, 8, 24, 6, 0); // 6 AM Monday
    const expected = ist(2026, 8, 24, 9, 0);
    expect(nextBusinessStart(created, baseConfig).getTime()).toBe(expected.getTime());
  });

  it("rolls forward to next business day 09:00 when created after business hours (Friday evening)", () => {
    const created = ist(2026, 8, 28, 17, 59); // Friday 17:59 — still inside business hours
    // 17:59 is inside business hours (ends at 18:00 exclusive), so it returns itself.
    expect(nextBusinessStart(created, baseConfig).getTime()).toBe(created.getTime());
  });

  it("rolls Friday 18:30 forward to Monday 09:00, skipping the weekend", () => {
    const created = ist(2026, 8, 28, 18, 30); // Friday after hours
    const expected = ist(2026, 8, 31, 9, 0); // Monday (next business day)
    expect(nextBusinessStart(created, baseConfig).getTime()).toBe(expected.getTime());
  });

  it("rolls Saturday forward to Monday 09:00", () => {
    const created = ist(2026, 8, 29, 12, 0); // Saturday
    const expected = ist(2026, 8, 31, 9, 0);
    expect(nextBusinessStart(created, baseConfig).getTime()).toBe(expected.getTime());
  });

  it("rolls Sunday forward to Monday 09:00", () => {
    const created = ist(2026, 8, 30, 12, 0); // Sunday
    const expected = ist(2026, 8, 31, 9, 0);
    expect(nextBusinessStart(created, baseConfig).getTime()).toBe(expected.getTime());
  });

  it("skips a holiday Tuesday and rolls to Wednesday 09:00", () => {
    const created = ist(2026, 8, 25, 3, 0); // Tuesday (holiday), before hours
    const expected = ist(2026, 8, 26, 9, 0); // Wednesday
    expect(nextBusinessStart(created, baseConfig).getTime()).toBe(expected.getTime());
  });
});

describe("addBusinessMinutes / addBusinessHours", () => {
  it("adds minutes within the same business day", () => {
    const start = ist(2026, 8, 24, 10, 0);
    const result = addBusinessMinutes(start, 120, baseConfig);
    expect(result.getTime()).toBe(ist(2026, 8, 24, 12, 0).getTime());
  });

  it("rolls over to the next business day when exceeding remaining hours today", () => {
    // Monday 17:00 + 2 business hours = 1hr left today (until 18:00) + 1hr tomorrow.
    // Tuesday is a holiday in this config, so it rolls to Wednesday.
    const start = ist(2026, 8, 24, 17, 0);
    const result = addBusinessHours(start, 2, baseConfig);
    const expected = ist(2026, 8, 26, 10, 0); // Wed 09:00 + 1hr (Tue skipped as holiday)
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("crosses a weekend correctly (Friday 17:00 + 4 business hours)", () => {
    const start = ist(2026, 8, 28, 17, 0); // Friday 17:00, 1hr left today
    const result = addBusinessHours(start, 4, baseConfig);
    // 1hr Friday -> 3hrs remaining -> Monday 09:00 + 3hrs = Monday 12:00
    const expected = ist(2026, 8, 31, 12, 0);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("skips weekend AND Monday holiday (Friday 17:00 + 2 business hours with Monday holiday -> Tuesday 10:00)", () => {
    const holidayConfig: BusinessCalendarConfig = {
      ...baseConfig,
      holidayDates: new Set(["2026-08-31"]), // Monday holiday
    };
    const start = ist(2026, 8, 28, 17, 0); // Friday 17:00 (1hr left Friday)
    const result = addBusinessHours(start, 2, holidayConfig);
    // 1hr Friday -> Saturday & Sunday skipped -> Monday skipped (holiday) -> Tuesday 09:00 + 1hr = Tuesday 10:00
    const expected = ist(2026, 9, 1, 10, 0);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("crosses multiple business days for a large SLA window", () => {
    const start = ist(2026, 8, 24, 9, 0); // Monday 09:00
    // 24 business hours = ~2.67 business days (9hrs/day). Tuesday is a holiday.
    // Mon: 9hrs (09-18). Remaining 15hrs.
    // Tue: holiday, skipped.
    // Wed: 9hrs (09-18). Remaining 6hrs.
    // Thu: 09:00 + 6hrs = 15:00.
    const result = addBusinessHours(start, 24, baseConfig);
    const expected = ist(2026, 8, 27, 15, 0); // Thursday 15:00
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("if created outside business hours, first rolls to next business start before adding", () => {
    const created = ist(2026, 8, 29, 12, 0); // Saturday
    const result = addBusinessHours(created, 1, baseConfig);
    const expected = ist(2026, 8, 31, 10, 0); // Monday 09:00 + 1hr
    expect(result.getTime()).toBe(expected.getTime());
  });
});

describe("businessMinutesBetween / remainingBusinessMinutes", () => {
  it("counts 0 minutes for same-instant range", () => {
    const t = ist(2026, 8, 24, 10, 0);
    expect(businessMinutesBetween(t, t, baseConfig)).toBe(0);
  });

  it("counts full business day span correctly", () => {
    const from = ist(2026, 8, 24, 9, 0);
    const to = ist(2026, 8, 24, 18, 0);
    expect(businessMinutesBetween(from, to, baseConfig)).toBe(9 * 60);
  });

  it("excludes weekend time from the count", () => {
    const from = ist(2026, 8, 28, 17, 0); // Friday 17:00
    const to = ist(2026, 8, 31, 10, 0); // Monday 10:00
    // Friday: 1hr (17-18). Weekend: 0. Monday: 1hr (09-10).
    expect(businessMinutesBetween(from, to, baseConfig)).toBe(120);
  });

  it("excludes holiday time from the count", () => {
    const from = ist(2026, 8, 24, 17, 0); // Monday 17:00
    const to = ist(2026, 8, 26, 10, 0); // Wednesday 10:00 (Tuesday is holiday)
    // Monday: 1hr. Tuesday: 0 (holiday). Wednesday: 1hr.
    expect(businessMinutesBetween(from, to, baseConfig)).toBe(120);
  });

  it("remainingBusinessMinutes is negative once due date has passed", () => {
    const now = ist(2026, 8, 24, 15, 0);
    const due = ist(2026, 8, 24, 10, 0);
    expect(remainingBusinessMinutes(now, due, baseConfig)).toBe(-300);
  });

  it("remainingBusinessMinutes is positive before due date", () => {
    const now = ist(2026, 8, 24, 10, 0);
    const due = ist(2026, 8, 24, 15, 0);
    expect(remainingBusinessMinutes(now, due, baseConfig)).toBe(300);
  });
});
