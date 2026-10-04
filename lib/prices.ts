import type { Trip } from "@/lib/content/types";
import { money } from "@/lib/format";

/** The money line for each card. Walking routes show distance and time instead ("4.6 km · about 1 hr"). */
export function priceMap(trip: Trip): Record<string, string> {
  return Object.fromEntries(trip.places.map((p) => [p.id, p.route ? p.details : money(p.price, trip.localCurrency, trip.usdRate)]));
}
