import type { Place } from "../content/types";

/** Mark shortlisted places (the Shortlist toggle). Applied in lib/context.ts so every page reads place.shortlisted. */
export function applyShortlist(places: Place[], ids: string[]): Place[] {
  const set = new Set(ids);
  return places.map((p) => ({ ...p, shortlisted: set.has(p.id) }));
}

/** The "Shortlist only" filter used wherever you pick places. */
export function onlyShortlisted<T extends Pick<Place, "shortlisted">>(places: T[], on: boolean): T[] {
  return on ? places.filter((p) => p.shortlisted) : places;
}
