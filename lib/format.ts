const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CAD: "C$", JPY: "¥" };

function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** "€40 (≈ $46)" — local price with a USD estimate. */
export function money(local: number | null, currency: string, usdRate: number): string {
  if (local === null) return "";
  if (local === 0) return "Free";
  const sym = SYMBOLS[currency] ?? `${currency} `;
  if (currency === "USD") return `$${amount(local)}`;
  return `${sym}${amount(local)} (≈ $${Math.round(local * usdRate)})`;
}

export function timeIn(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function dateTimeIn(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

/** "Fri, Oct 9" for a YYYY-MM-DD calendar date. */
export function dateLabel(ymd: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );
}

/** 0 = Sunday for a YYYY-MM-DD calendar date. */
export function weekdayOf(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

/** YYYY-MM-DD for an instant in a time zone. */
export function ymdIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(date);
}

export function countdown(iso: string, now: Date = new Date()): string | null {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (d === 0) return plural(Math.max(h, 1), "hour");
  return h ? `${plural(d, "day")}, ${plural(h, "hour")}` : plural(d, "day");
}
