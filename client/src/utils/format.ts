/**
  * Safely formats an ISO date string, JS timestamp, or Date object as readable date/time string.
  * Never returns "Invalid Date" — returns "—" if empty/invalid.
  */
export function formatDateTime(iso: string | number | Date | null | undefined): string {
  if (!iso) return "—";

  let d: Date;
  if (iso instanceof Date) {
    d = iso;
  } else if (typeof iso === "number") {
    d = new Date(iso);
  } else if (typeof iso === "string") {
    const num = Number(iso);
    if (!isNaN(num) && iso.trim().length > 0 && !iso.includes("-")) {
      d = new Date(num);
    } else {
      d = new Date(iso);
    }
  } else {
    return "—";
  }

  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRemainingMinutes(minutes: number): string {
  const overdue = minutes < 0;
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  const label = parts.join(" ");
  return overdue ? `${label} overdue` : `${label} left`;
}

/**
 * Formats an absolute number of seconds as "Xh Ym Zs".
 * Omits leading zero segments (e.g. "5m 3s" when hours = 0).
 */
export function formatSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds)) return "0s";
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}
