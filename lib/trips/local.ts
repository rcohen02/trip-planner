import type { Flight, Trip } from "../content/types";
import { dateLabel } from "../format";

/** Short names for common home time zones, shown after a home-side flight time ("5:30 pm ET"). */
const HOME_LABEL: Record<string, string> = {
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Los_Angeles": "PT",
};

/** Airports at the destination: where the outbound flight lands and the return leaves. */
function localAirports(trip: Trip): Set<string> {
  const out = new Set<string>();
  if (trip.flights[0]) out.add(trip.flights[0].to.code);
  if (trip.flights.length > 1) out.add(trip.flights[trip.flights.length - 1].from.code);
  return out;
}

/** Which clock a flight time at this airport is shown in, and the label after it ("" for trip time). */
export function flightZone(trip: Trip, airport: string): { zone: string; suffix: string } {
  if (localAirports(trip).has(airport)) return { zone: trip.timezone, suffix: "" };
  const short = HOME_LABEL[trip.homeTimezone] ?? trip.homeTimezone.split("/").pop()!.replace(/_/g, " ");
  return { zone: trip.homeTimezone, suffix: ` ${short}` };
}

/** "2026-10-09" in a time zone → that midnight as ISO with the zone's offset ("2026-10-09T00:00:00+01:00"). */
function midnight(ymd: string, tz: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(new Date(`${ymd}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName")?.value;
  const off = !part || part === "GMT" ? "+00:00" : part.replace("GMT", "");
  return `${ymd}T00:00:00${off}`;
}

const ymdIn = (now: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);

/**
 * The countdown tile on the Day View. With flights: to the outbound flight, then to the flight home.
 * Without: to the first day, then "Day 2 of 4". `target` is null when there's nothing to count down to.
 */
export function tripCountdown(trip: Trip, now: Date): { label: string; target: string | null; detail: string; flight?: Flight } {
  if (trip.flights.length) {
    const out = trip.flights[0];
    const back = trip.flights[trip.flights.length - 1];
    const before = now < new Date(out.depart);
    const f = before ? out : back;
    const z = flightZone(trip, f.from.code);
    return { label: before ? "Leaving in" : "Flight home in", target: f.depart, detail: `${f.flightNo} · ${f.from.code}${z.suffix}`, flight: f };
  }
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const today = ymdIn(now, trip.timezone);
  if (today < first) return { label: "Trip starts in", target: midnight(first, trip.timezone), detail: dateLabel(first) };
  if (today > last) return { label: "Trip", target: null, detail: "Over" };
  const i = trip.days.findIndex((d) => d.date === today);
  return { label: "Trip day", target: null, detail: `Day ${i + 1} of ${trip.days.length}` };
}

/** A seat-swap note from the trip's own bag/flight notes (e.g. Lisbon's "22B is between you"), or null. */
export function seatReminder(trip: Trip): string | null {
  return trip.bags.find((b) => /swap/i.test(b) && /seat/i.test(b)) ?? null;
}
