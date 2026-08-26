import { DateTime } from "luxon";

/**
 * Business-hour calendar utilities.
 *
 * All calculations are performed in the configured BUSINESS_TIMEZONE.
 * Callers pass/receive UTC `Date` objects; conversion to the business
 * timezone happens internally so the rest of the app never has to think
 * about timezones.
 *
 * Business week: Monday - Friday (ISO weekday 1-5).
 * Business hours: [BUSINESS_START_HOUR, BUSINESS_END_HOUR) in BUSINESS_TIMEZONE.
 * Holidays: a configured set of calendar dates (in BUSINESS_TIMEZONE) that are
 * treated as non-business days even if they fall on a weekday.
 */

export interface BusinessCalendarConfig {
  timezone: string;
  startHour: number; // e.g. 9
  endHour: number; // e.g. 18 (exclusive)
  /** Holiday dates as 'yyyy-MM-dd' strings, interpreted in `timezone`. */
  holidayDates: ReadonlySet<string>;
}

export function loadBusinessCalendarConfigFromEnv(
  holidayDates: ReadonlySet<string>
): BusinessCalendarConfig {
  return {
    timezone: process.env.BUSINESS_TIMEZONE ?? "Asia/Kolkata",
    startHour: Number(process.env.BUSINESS_START_HOUR ?? 9),
    endHour: Number(process.env.BUSINESS_END_HOUR ?? 18),
    holidayDates,
  };
}

function toZoned(date: Date, config: BusinessCalendarConfig): DateTime {
  return DateTime.fromJSDate(date, { zone: "utc" }).setZone(config.timezone);
}

export function isHoliday(date: Date, config: BusinessCalendarConfig): boolean {
  const zoned = toZoned(date, config);
  return config.holidayDates.has(zoned.toFormat("yyyy-MM-dd"));
}

export function isWeekend(date: Date, config: BusinessCalendarConfig): boolean {
  const zoned = toZoned(date, config);
  // Luxon weekday: 1 = Monday ... 7 = Sunday
  return zoned.weekday === 6 || zoned.weekday === 7;
}

export function isBusinessDay(date: Date, config: BusinessCalendarConfig): boolean {
  return !isWeekend(date, config) && !isHoliday(date, config);
}

export function isBusinessHour(date: Date, config: BusinessCalendarConfig): boolean {
  if (!isBusinessDay(date, config)) return false;
  const zoned = toZoned(date, config);
  const minuteOfDay = zoned.hour * 60 + zoned.minute;
  return (
    minuteOfDay >= config.startHour * 60 && minuteOfDay < config.endHour * 60
  );
}

/**
 * The number of business minutes in a single business day, e.g. 9 hours = 540 minutes.
 */
export function businessMinutesPerDay(config: BusinessCalendarConfig): number {
  return (config.endHour - config.startHour) * 60;
}

/**
 * Returns the next moment at which business time begins, given an arbitrary
 * instant. If `date` already falls within business hours on a business day,
 * `date` itself is returned unchanged.
 */
export function nextBusinessStart(date: Date, config: BusinessCalendarConfig): Date {
  let zoned = toZoned(date, config);

  // Walk forward day-by-day until we land on a business day, then clamp to
  // business-hour window. Bounded loop to avoid infinite loops on bad config.
  for (let i = 0; i < 3650; i++) {
    const dayIsBusiness = isBusinessDay(zoned.toJSDate(), config);

    if (dayIsBusiness) {
      const startOfBusiness = zoned.set({
        hour: config.startHour,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      const endOfBusiness = zoned.set({
        hour: config.endHour,
        minute: 0,
        second: 0,
        millisecond: 0,
      });

      if (zoned < startOfBusiness) {
        return startOfBusiness.toUTC().toJSDate();
      }
      if (zoned >= startOfBusiness && zoned < endOfBusiness) {
        return zoned.toUTC().toJSDate();
      }
      // zoned >= endOfBusiness -> roll to next day
    }

    zoned = zoned
      .plus({ days: 1 })
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  }

  throw new Error(
    "nextBusinessStart: exceeded search bound (check holiday/timezone config)"
  );
}

/**
 * Adds `minutes` of *business time* to `date`, skipping nights, weekends and
 * holidays. If `date` itself falls outside business hours, it is first
 * rolled forward to the next business start before minutes are added.
 */
export function addBusinessMinutes(
  date: Date,
  minutes: number,
  config: BusinessCalendarConfig
): Date {
  if (minutes < 0) {
    throw new Error("addBusinessMinutes: minutes must be >= 0");
  }

  let cursor = toZoned(nextBusinessStart(date, config), config);
  let remaining = minutes;
  const dailyCapacity = businessMinutesPerDay(config);

  for (let i = 0; i < 3650 && remaining > 0; i++) {
    const endOfBusiness = cursor.set({
      hour: config.endHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const minutesLeftToday = Math.max(
      0,
      Math.round(endOfBusiness.diff(cursor, "minutes").minutes)
    );

    if (remaining <= minutesLeftToday) {
      cursor = cursor.plus({ minutes: remaining });
      remaining = 0;
      break;
    }

    remaining -= minutesLeftToday;
    // Move to next business day's start.
    const nextDay = cursor
      .plus({ days: 1 })
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    cursor = toZoned(nextBusinessStart(nextDay.toUTC().toJSDate(), config), config);

    // Safety: dailyCapacity should always be > 0; guarded by config validation upstream.
    void dailyCapacity;
  }

  return cursor.toUTC().toJSDate();
}

export function addBusinessHours(
  date: Date,
  hours: number,
  config: BusinessCalendarConfig
): Date {
  return addBusinessMinutes(date, hours * 60, config);
}

/**
 * Business minutes elapsed between two instants (from -> to), counting only
 * time inside business hours on business days. Returns 0 if `to <= from`.
 */
export function businessMinutesBetween(
  from: Date,
  to: Date,
  config: BusinessCalendarConfig
): number {
  if (to.getTime() <= from.getTime()) return 0;

  let cursor = toZoned(from, config);
  const end = toZoned(to, config);
  let total = 0;

  for (let i = 0; i < 3650 && cursor < end; i++) {
    if (!isBusinessDay(cursor.toJSDate(), config)) {
      cursor = cursor
        .plus({ days: 1 })
        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      continue;
    }

    const startOfBusiness = cursor.set({
      hour: config.startHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    const endOfBusiness = cursor.set({
      hour: config.endHour,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const windowStart = cursor < startOfBusiness ? startOfBusiness : cursor;
    const windowEnd = end < endOfBusiness ? end : endOfBusiness;

    if (windowStart < windowEnd) {
      total += windowEnd.diff(windowStart, "minutes").minutes;
    }

    cursor = cursor
      .plus({ days: 1 })
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  }

  return Math.round(total);
}

/**
 * Remaining business minutes between `now` and a due date. Can be negative
 * once the deadline has passed (callers use this sign to detect breach).
 */
export function remainingBusinessMinutes(
  now: Date,
  due: Date,
  config: BusinessCalendarConfig
): number {
  if (now.getTime() <= due.getTime()) {
    return businessMinutesBetween(now, due, config);
  }
  return -businessMinutesBetween(due, now, config);
}
