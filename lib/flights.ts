import type { Flight } from "@/lib/content/types";

/**
 * The flight the Today countdown should show: the outbound before the trip starts,
 * then the return. Null when the trip has no flights yet.
 */
export function nextFlight(flights: Flight[], now: Date): { flight: Flight; outbound: boolean } | null {
  if (flights.length === 0) return null;
  const first = flights[0];
  if (now < new Date(first.depart)) return { flight: first, outbound: true };
  return { flight: flights[flights.length - 1], outbound: false };
}
