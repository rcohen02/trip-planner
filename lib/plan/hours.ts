import type { Place, Todo } from "../content/types";

/** The place a to-do confirms hours for, or null when the to-do is about something else. */
export function hoursTodoPlace(t: Todo): string | null {
  return t.kind === "confirm" && t.placeId && /\bhours\b/i.test(t.text) ? t.placeId : null;
}

/** Places whose hours are checked: ticked with ✓ on the Itinerary, or via a ticked "Confirm … hours" to-do. */
export function checkedPlaces(checks: string[], todos: Todo[], done: Record<string, boolean>): string[] {
  const out = new Set(checks);
  for (const t of todos) {
    const p = hoursTodoPlace(t);
    if (p && done[t.id]) out.add(p);
  }
  return [...out];
}

/** Places with checked hours count as confirmed everywhere (warnings, hours lines). */
export function applyHoursChecks(places: Place[], checked: string[]): Place[] {
  if (!checked.length) return places;
  const set = new Set(checked);
  return places.map((p) => (set.has(p.id) && !p.hoursConfirmed ? { ...p, hoursConfirmed: true, hoursChecked: true } : p));
}
