import type { DayRule, Trip, TripPlanning } from "../content/types";
import type { Profile } from "../profile/types";
import type { TripDraft } from "./steps";

/** Time zone (main one) and currency by ISO country code. Countries not listed get picked on the read-back later. */
const COUNTRIES: Record<string, [string, string]> = {
  pt: ["Europe/Lisbon", "EUR"],
  es: ["Europe/Madrid", "EUR"],
  fr: ["Europe/Paris", "EUR"],
  it: ["Europe/Rome", "EUR"],
  de: ["Europe/Berlin", "EUR"],
  nl: ["Europe/Amsterdam", "EUR"],
  be: ["Europe/Brussels", "EUR"],
  at: ["Europe/Vienna", "EUR"],
  ie: ["Europe/Dublin", "EUR"],
  gr: ["Europe/Athens", "EUR"],
  fi: ["Europe/Helsinki", "EUR"],
  hr: ["Europe/Zagreb", "EUR"],
  si: ["Europe/Ljubljana", "EUR"],
  sk: ["Europe/Bratislava", "EUR"],
  ee: ["Europe/Tallinn", "EUR"],
  lv: ["Europe/Riga", "EUR"],
  lt: ["Europe/Vilnius", "EUR"],
  mt: ["Europe/Malta", "EUR"],
  cy: ["Asia/Nicosia", "EUR"],
  lu: ["Europe/Luxembourg", "EUR"],
  gb: ["Europe/London", "GBP"],
  ch: ["Europe/Zurich", "CHF"],
  dk: ["Europe/Copenhagen", "DKK"],
  se: ["Europe/Stockholm", "SEK"],
  no: ["Europe/Oslo", "NOK"],
  is: ["Atlantic/Reykjavik", "ISK"],
  pl: ["Europe/Warsaw", "PLN"],
  cz: ["Europe/Prague", "CZK"],
  hu: ["Europe/Budapest", "HUF"],
  tr: ["Europe/Istanbul", "TRY"],
  us: ["America/New_York", "USD"],
  ca: ["America/Toronto", "CAD"],
  mx: ["America/Mexico_City", "MXN"],
  cr: ["America/Costa_Rica", "CRC"],
  br: ["America/Sao_Paulo", "BRL"],
  ar: ["America/Argentina/Buenos_Aires", "ARS"],
  cl: ["America/Santiago", "CLP"],
  pe: ["America/Lima", "PEN"],
  co: ["America/Bogota", "COP"],
  jp: ["Asia/Tokyo", "JPY"],
  kr: ["Asia/Seoul", "KRW"],
  cn: ["Asia/Shanghai", "CNY"],
  hk: ["Asia/Hong_Kong", "HKD"],
  tw: ["Asia/Taipei", "TWD"],
  sg: ["Asia/Singapore", "SGD"],
  th: ["Asia/Bangkok", "THB"],
  vn: ["Asia/Ho_Chi_Minh", "VND"],
  id: ["Asia/Jakarta", "IDR"],
  in: ["Asia/Kolkata", "INR"],
  il: ["Asia/Jerusalem", "ILS"],
  ae: ["Asia/Dubai", "AED"],
  ma: ["Africa/Casablanca", "MAD"],
  eg: ["Africa/Cairo", "EGP"],
  za: ["Africa/Johannesburg", "ZAR"],
  ke: ["Africa/Nairobi", "KES"],
  au: ["Australia/Sydney", "AUD"],
  nz: ["Pacific/Auckland", "NZD"],
};

export function countryInfo(code: string): { timezone: string; currency: string } | null {
  const c = COUNTRIES[code.toLowerCase()];
  return c ? { timezone: c[0], currency: c[1] } : null;
}

/** "lisbon-2026", unique against slugs already taken. */
export function slugFor(destination: string, start: string, taken: string[]): string {
  const city = destination.split(",")[0].normalize("NFD").replace(/[̀-ͯ]/g, "");
  const base = `${city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip"}-${start.slice(0, 4)}`;
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dates(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${start}T12:00:00Z`); t <= Date.parse(`${end}T12:00:00Z`); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Fields the owner's profile or the trip's questions don't cover: the owner, today's rate, slugs already used. */
export interface BuildContext {
  usdRate: number;
  usdRateDate: string;
  taken: string[];
  homeTimezone?: string;
}

/** Turns a finished draft into a new trip: logistics, one day per date with the usual slots, no places yet. */
export function tripFromDraft(d: TripDraft, profile: Profile, owner: { email: string; name: string }, ctx: BuildContext): Trip & { planning: TripPlanning } {
  if (!d.destination) throw new Error("Pick where you're going.");
  if (!d.start || !d.end) throw new Error("Pick your dates.");
  if (!d.groupId) throw new Error("Pick who's coming.");
  if (!d.homebase) throw new Error("Add where you're staying.");
  if (!d.plan) throw new Error("Pick draft or build.");
  const info = countryInfo(d.destination.countryCode);
  const group = profile.groups.find((g) => g.id === d.groupId);
  const kids = profile.travelers.filter((t) => group?.travelerIds.includes(t.id)).map((t) => ({ name: t.label }));
  const all = dates(d.start, d.end);
  const days: DayRule[] = all.map((date, i) => ({
    date,
    label: WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()],
    ...(all.length > 1 && i === 0 ? { note: "Arrival day" } : {}),
    ...(all.length > 1 && i === all.length - 1 ? { note: "Departure day" } : {}),
    slots: ["morning", "lunch", "afternoon", "dinner", "night"],
    optional: ["night"],
  }));
  return {
    slug: slugFor(d.destination.label, d.start, ctx.taken),
    name: d.destination.label.split(",")[0].trim(),
    destination: d.destination.label,
    timezone: info?.timezone ?? "UTC",
    homeTimezone: ctx.homeTimezone ?? "America/New_York",
    localCurrency: info?.currency ?? "USD",
    usdRate: ctx.usdRate,
    usdRateDate: ctx.usdRateDate,
    travelers: [{ name: owner.name.split(" ")[0] || owner.email, email: owner.email }, ...kids],
    bookingRef: "",
    homebase: { label: d.homebase.label, address: d.homebase.address, lat: d.homebase.lat, lng: d.homebase.lng },
    flights: [],
    bags: [],
    gettingAround: [],
    days,
    clusters: [],
    todos: [],
    places: [],
    planning: { groupId: d.groupId, overrides: d.overrides, transport: d.transport, plan: d.plan },
  };
}
