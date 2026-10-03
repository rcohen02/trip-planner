import type { Price } from "./content/types";
const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CAD: "C$", JPY: "¥" };


function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Design system Writing rules: "€16 / $19", "~€40 / $46 per person", "€13.50–15 / $16–17", "Free", "Price unknown". */
export function money(price: Price | null, currency: string, usdRate: number, currentYear = new Date().getFullYear()): string {
  if (!price) return "Price unknown";
  if (price.amount === 0) return "Free";
  const sym = SYMBOLS[currency] ?? `${currency} `;
  const tilde = price.approx ? "~" : "";
  const range = (a: number, b: number | undefined, f: (n: number) => string) => (b ? `${f(a)}–${f(b).replace(/^\D+/, "")}` : f(a));
  const local = range(price.amount, price.max, (n) => `${sym}${amount(n)}`);
  const usd = range(price.amount * usdRate, price.max ? price.max * usdRate : undefined, (n) => `$${Math.round(n)}`);
  let out = currency === "USD" ? `${tilde}${local}` : `${tilde}${local} / ${usd}`;
  if (price.unit) out += ` ${price.unit}`;
  if (price.year && price.year < currentYear) out += ` · ${price.year} price`;
  return out;
}

/** "10:00–18:00" → "10 am–6 pm"; "9:30" → "9:30 am". */
export function hours12(text: string): string {
  return text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => {
    const hh = Number(h);
    const suffix = hh >= 12 ? "pm" : "am";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return m === "00" ? `${h12} ${suffix}` : `${h12}:${m} ${suffix}`;
  });
}

export function timeIn(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso));
  return hours12(parts.replace(/^24:/, "00:"));
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

/** "Fri Oct 9" for a YYYY-MM-DD calendar date. */
export function dateLabel(ymd: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${ymd}T12:00:00Z`))
    .replace(",", "");
}

/** "Saturday, October 10". */
export function longDate(ymd: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
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
