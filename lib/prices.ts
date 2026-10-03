import type { Trip } from "@/lib/content/types";
import { money } from "@/lib/format";

export function priceMap(trip: Trip): Record<string, string> {
  return Object.fromEntries(trip.places.map((p) => [p.id, money(p.price, trip.localCurrency, trip.usdRate)]));
}
