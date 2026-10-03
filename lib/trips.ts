import { TRIPS } from "@/content/generated/trips";
import type { Trip } from "@/lib/content/types";

export function getTrip(slug: string): Trip | null {
  return TRIPS[slug] ?? null;
}

export function listTrips(): Trip[] {
  return Object.values(TRIPS).sort((a, b) => a.days[0].date.localeCompare(b.days[0].date));
}
