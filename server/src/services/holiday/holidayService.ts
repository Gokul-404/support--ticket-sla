import { DateTime } from "luxon";
import type { Holiday, PrismaClient } from "@prisma/client";
import {
  loadBusinessCalendarConfigFromEnv,
  type BusinessCalendarConfig,
} from "../sla/businessCalendar.js";

/**
 * Loads all holidays from the DB and builds a BusinessCalendarConfig.
 * Called per-request (holidays change rarely; if this becomes a hot path,
 * wrap with a short-lived cache).
 */
export async function buildBusinessCalendarConfig(
  prisma: PrismaClient
): Promise<BusinessCalendarConfig> {
  const holidays = await prisma.holiday.findMany({ select: { date: true } });
  const timezone = process.env.BUSINESS_TIMEZONE ?? "Asia/Kolkata";

  const holidayDates = new Set<string>(
    holidays.map((h: Pick<Holiday, "date">) =>
      DateTime.fromJSDate(h.date, { zone: "utc" })
        .setZone(timezone)
        .toFormat("yyyy-MM-dd")
    )
  );

  return loadBusinessCalendarConfigFromEnv(holidayDates);
}

export async function listHolidays(prisma: PrismaClient) {
  return prisma.holiday.findMany({ orderBy: { date: "asc" } });
}
