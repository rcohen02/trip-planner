import { parsePicks } from "./parsePicks";
import type { PlaceImage, Trip } from "./types";

export type TripMeta = Omit<Trip, "places"> & { clusterOf?: Record<string, string> };
export type Enrichment = Record<string, { lat?: number | null; lng?: number | null; images?: PlaceImage[] }>;

/** Combine picks.md + trip.json + enrichment.json into the Trip the site renders. */
export function buildTrip(picksMd: string, meta: TripMeta, enrichment: Enrichment): Trip {
  const { clusterOf = {}, ...rest } = meta;
  const places = parsePicks(picksMd).map((p) => {
    const e = enrichment[p.id] ?? {};
    return {
      ...p,
      cluster: clusterOf[p.id] ?? null,
      lat: e.lat ?? null,
      lng: e.lng ?? null,
      images: e.images ?? [],
    };
  });
  return { ...rest, places };
}
