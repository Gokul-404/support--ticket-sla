import { useState, useEffect } from "react";

export interface LiveTimerResult {
  /** Seconds remaining in business time. Negative = overdue. */
  remainingSeconds: number;
  /** True when the event has already occurred — timer is frozen. */
  frozen: boolean;
  /** True when outside business hours (timer is currently paused). */
  isPaused: boolean;
}

export function isBusinessHoursNow(timezone = "Asia/Kolkata", startHour = 9, endHour = 18): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hourStr = parts.find((p) => p.type === "hour")?.value;
    const hour = hourStr ? parseInt(hourStr, 10) : 0;

    const isWeekend = weekday === "Sat" || weekday === "Sun";
    return !isWeekend && hour >= startHour && hour < endHour;
  } catch {
    const day = new Date().getDay();
    const hr = new Date().getHours();
    return day !== 0 && day !== 6 && hr >= startHour && hr < endHour;
  }
}

/**
 * Returns a live, business-hour compliant SLA countdown timer.
 *
 * It uses the backend-computed `initialRemainingMinutes` (business time remaining)
 * as the source of truth, pausing during nights and weekends.
 */
export function useLiveTimer(
  dueAt: string,
  completedAt?: string | null,
  initialRemainingMinutes?: number
): LiveTimerResult {
  const parseMs = (val?: string | null): number => {
    if (!val) return Date.now();
    const num = Number(val);
    if (!isNaN(num) && !val.includes("-")) return num;
    const d = new Date(val).getTime();
    return isNaN(d) ? Date.now() : d;
  };

  const getInitialSeconds = (): number => {
    if (initialRemainingMinutes !== undefined && initialRemainingMinutes !== null) {
      return initialRemainingMinutes * 60;
    }
    const dueMs = parseMs(dueAt);
    if (completedAt) {
      const compMs = parseMs(completedAt);
      return Math.round((dueMs - compMs) / 1000);
    }
    return Math.round((dueMs - Date.now()) / 1000);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(getInitialSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(() => !isBusinessHoursNow());

  useEffect(() => {
    setRemainingSeconds(getInitialSeconds());
  }, [dueAt, completedAt, initialRemainingMinutes]);

  useEffect(() => {
    if (completedAt) {
      setIsPaused(false);
      return;
    }

    const tick = () => {
      const inBiz = isBusinessHoursNow();
      setIsPaused(!inBiz);

      if (inBiz) {
        setRemainingSeconds((prev) => prev - 1);
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [completedAt]);

  return {
    remainingSeconds,
    frozen: !!completedAt,
    isPaused: !completedAt && isPaused,
  };
}
