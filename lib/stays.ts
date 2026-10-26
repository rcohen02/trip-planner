/** One place the group sleeps during a trip. `from` is the first night, `to` is the checkout day. */
export interface Stay {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  url?: string;
  phone?: string;
  email?: string;
  /** YYYY-MM-DD, first night. */
  from: string;
  /** YYYY-MM-DD, checkout day (not a night here). */
  to: string;
}

/** The stay that covers a given night (YYYY-MM-DD), or null if none does. */
export function stayOn(stays: Stay[], date: string): Stay | null {
  return stays.find((s) => s.from <= date && date < s.to) ?? null;
}

/**
 * Where the group sleeps on a night. Trips with `stays` use the stay covering that night;
 * trips without them (a single base) use the home base. Null when a multi-stop trip has no stay that night.
 */
export function stayFor(
  trip: { stays?: Stay[]; homebase: { label: string; address: string; lat: number; lng: number; url?: string; phone?: string; email?: string } },
  date: string,
): Stay | null {
  if (!trip.stays) return { id: "home", from: "", to: "", ...trip.homebase };
  return stayOn(trip.stays, date);
}
