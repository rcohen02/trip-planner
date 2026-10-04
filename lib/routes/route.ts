import { strFromU8, unzipSync } from "fflate";
import type { Place } from "../content/types";

type LatLng = [number, number];

/** A route read from a file, before it's saved. */
export interface RouteDraft {
  name: string;
  line: LatLng[];
  startLabel: string | null;
  endLabel: string | null;
}

/** A saved route (stored per trip). */
export interface RouteRecord extends RouteDraft {
  id: string;
}

const WALK_KMH = 4.5;
const PIN_MATCH_M = 100;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

function coords(text: string): LatLng[] {
  return text
    .trim()
    .split(/\s+/)
    .map((c) => c.split(",").map(Number))
    .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
    .map(([lng, lat]) => [lat, lng]);
}

/** "R. Olivença 13, 2765-262 Estoril, Portugal" → "R. Olivença 13, Estoril". */
export function cleanAddress(s: string): string {
  return s
    .replace(/,\s*Portugal$/i, "")
    .replace(/\b\d{4}-\d{3}\s+/, "")
    .trim();
}

/** Metres between two points (haversine). */
function dist([a, b]: LatLng, [c, d]: LatLng): number {
  const R = 6371000;
  const p1 = (a * Math.PI) / 180;
  const p2 = (c * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((d - b) * Math.PI) / 180;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2));
}

/** Google My Maps KML → one route per line. Pins near a line's ends name its start and end. */
export function routesFromKml(xml: string): RouteDraft[] {
  const marks = [...xml.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/g)].map((m) => m[0]);
  const nameOf = (m: string) => decode(/<name>([\s\S]*?)<\/name>/.exec(m)?.[1] ?? "");
  const pins = marks
    .filter((m) => /<Point\b/.test(m))
    .map((m) => ({ name: nameOf(m), at: coords(/<coordinates>([\s\S]*?)<\/coordinates>/.exec(m)?.[1] ?? "")[0] }))
    .filter((p) => p.at && p.name);
  const pinNear = (at: LatLng) => {
    const hit = pins.map((p) => ({ p, d: dist(p.at, at) })).sort((x, y) => x.d - y.d)[0];
    return hit && hit.d <= PIN_MATCH_M ? cleanAddress(hit.p.name) : null;
  };
  return marks
    .filter((m) => /<LineString\b/.test(m))
    .map((m) => {
      const line = coords(/<LineString\b[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/.exec(m)?.[1] ?? "");
      return { name: nameOf(m) || "Walk", line, startLabel: pinNear(line[0]), endLabel: pinNear(line[line.length - 1]) };
    })
    .filter((r) => r.line.length >= 2);
}

/** The KML text in an uploaded .kml or .kmz (a zip with doc.kml inside). */
export function readRouteFile(fileName: string, bytes: Uint8Array): string {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "kml") return strFromU8(bytes);
  if (ext !== "kmz") throw new Error("Choose a .kmz or .kml file");
  const files = unzipSync(bytes, { filter: (f) => f.name.toLowerCase().endsWith(".kml") });
  const name = Object.keys(files).sort((a, b) => Number(b === "doc.kml") - Number(a === "doc.kml"))[0];
  if (!name) throw new Error("No map data in that file");
  return strFromU8(files[name]);
}

export function routeLength(line: LatLng[]): number {
  return line.slice(1).reduce((sum, p, i) => sum + dist(line[i], p), 0);
}

/** "4.6 km · about 1 hr" at an easy 4.5 km/h, rounded to 5 minutes. */
export function walkLabel(metres: number): string {
  const mins = Math.max(5, Math.round((metres / 1000 / WALK_KMH) * 12) * 5);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const time = h ? `${h} hr${m ? ` ${m} min` : ""}` : `${m} min`;
  return `${(metres / 1000).toFixed(1)} km · about ${time}`;
}

/** Metres from a point to a segment, plus how far along the segment (0–1) the closest point is. Local flat projection. */
function toSegment(p: LatLng, a: LatLng, b: LatLng): { d: number; t: number } {
  const k = Math.cos((p[0] * Math.PI) / 180) * 111320;
  const [px, py, ax, ay, bx, by] = [p[1] * k, p[0] * 110540, a[1] * k, a[0] * 110540, b[1] * k, b[0] * 110540];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return { d: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

/** Ids of places within `radius` metres of the line, in the order you'd pass them. */
export function nearbyPlaces(line: LatLng[], places: Pick<Place, "id" | "lat" | "lng">[], radius = 150): string[] {
  const hits: { id: string; along: number }[] = [];
  for (const p of places) {
    if (p.lat == null || p.lng == null) continue;
    let best = { d: Infinity, along: 0 };
    for (let i = 1; i < line.length; i++) {
      const s = toSegment([p.lat, p.lng], line[i - 1], line[i]);
      if (s.d < best.d) best = { d: s.d, along: i - 1 + s.t };
    }
    if (best.d <= radius) hits.push({ id: p.id, along: best.along });
  }
  return hits.sort((a, b) => a.along - b.along).map((h) => h.id);
}

/** Point `frac` (0–1) of the way along the line by distance. */
function pointAlong(line: LatLng[], frac: number): LatLng {
  const total = routeLength(line);
  let goal = total * frac;
  for (let i = 1; i < line.length; i++) {
    const seg = dist(line[i - 1], line[i]);
    if (goal <= seg && seg > 0) {
      const t = goal / seg;
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
    }
    goal -= seg;
  }
  return line[line.length - 1];
}

const fmt = ([lat, lng]: LatLng) => `${+lat.toFixed(5)},${+lng.toFixed(5)}`;

/** Google Maps walking directions that follow the route: start, end and 3 waypoints (the most phones accept). */
export function directionsUrl(line: LatLng[]): string {
  const q = new URLSearchParams({
    api: "1",
    origin: fmt(line[0]),
    destination: fmt(line[line.length - 1]),
    travelmode: "walking",
    waypoints: [0.25, 0.5, 0.75].map((f) => fmt(pointAlong(line, f))).join("|"),
  });
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

/** A saved route as a Walks card: it plans, books and maps like any place. */
export function routePlace(r: RouteRecord, places: Place[]): Place {
  const distanceM = routeLength(r.line);
  const [lat, lng] = r.line[0];
  const loc = [r.startLabel && `From ${r.startLabel}`, r.endLabel && `to ${r.endLabel}`].filter(Boolean).join(" ");
  return {
    id: `route-${r.id}`,
    name: r.name,
    category: "walk",
    location: loc || "Walking route",
    details: walkLabel(distanceM),
    price: null,
    hours: null,
    url: null,
    mapsUrl: directionsUrl(r.line),
    phone: null,
    note: "",
    noteYear: null,
    hoursConfirmed: true,
    openDays: null,
    needsBooking: false,
    lat,
    lng,
    route: {
      routeId: r.id,
      line: r.line,
      distanceM,
      startLabel: r.startLabel,
      endLabel: r.endLabel,
      nearby: nearbyPlaces(r.line, places.filter((p) => p.category !== "walk")),
    },
  };
}
