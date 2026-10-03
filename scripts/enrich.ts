/**
 * Adds coordinates (OpenStreetMap Nominatim) and freely licensed photos (Wikimedia Commons)
 * to every place in a trip. Writes content/trips/<slug>/enrichment.json; keeps existing entries
 * unless --force. Usage: npm run enrich -- lisbon-2026 [--force]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parsePicks } from "../lib/content/parsePicks";
import type { Enrichment } from "../lib/content/buildTrip";
import type { PlaceImage } from "../lib/content/types";

const UA = "T2T-trip-planner/0.1 (personal trip planner; cohen.rl@gmail.com)";
const slug = process.argv[2] ?? "lisbon-2026";
const force = process.argv.includes("--force");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",") : null;
const dir = join(process.cwd(), "content/trips", slug);
const meta = JSON.parse(readFileSync(join(dir, "trip.json"), "utf8"));
const city: string = meta.destination.split(",")[0];
const out = join(dir, "enrichment.json");
const overrides: Record<string, { geoQuery?: string; imageQuery?: string; imageMatch?: string; noImages?: boolean }> =
  meta.enrich ?? {};
const existing: Enrichment = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pt&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  await sleep(1100); // Nominatim policy: max 1 request/second
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function images(q: string): Promise<PlaceImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "6",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "900",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { pages: Record<string, { index: number; imageinfo?: { thumburl: string; url: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }> };
  };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter((i): i is NonNullable<typeof i> => Boolean(i?.thumburl))
    .map((i) => ({
      url: i.thumburl,
      thumb: i.thumburl.replace(/\/\d+px-/, "/330px-"),
      credit: strip(i.extmetadata?.Artist?.value) || "Wikimedia Commons",
      license: strip(i.extmetadata?.LicenseShortName?.value) || "see source",
      sourcePage: i.descriptionurl,
    }))
    .slice(0, 5);
}

/** Search-friendly name: drop parentheticals and "at …" suffixes. */
function cleanName(name: string): string {
  return name.replace(/\(.*?\)/g, "").split(/ \/ | \+ /)[0].replace(/\s+at\s+.*/i, "").trim();
}

async function main() {
  const places = parsePicks(readFileSync(join(dir, "picks.md"), "utf8"));
  const result: Enrichment = { ...existing };
  for (const p of places) {
    if (only ? !only.includes(p.id) : result[p.id] && !force) continue;
    const o = overrides[p.id] ?? {};
    const name = cleanName(p.name);
    const loc = p.location.replace(/^(In|Near|Off|From|Starts at)\s+/i, "");
    const geo =
      (o.geoQuery ? await geocode(o.geoQuery) : null) ??
      (await geocode(`${name}, ${city}`)) ??
      (/\d/.test(loc) ? await geocode(`${loc}, ${city}`) : null) ??
      (await geocode(`${loc.split(",").pop()!.trim()}, ${city}`));
    const found = o.noImages ? [] : await images(o.imageQuery ?? `${name} ${city}`);
    const imgs = o.imageMatch ? found.filter((i) => i.sourcePage.includes(o.imageMatch!)) : found;
    result[p.id] = { lat: geo?.lat ?? null, lng: geo?.lng ?? null, images: imgs };
    console.log(`${geo ? "📍" : "  "} ${imgs.length}🖼  ${p.name}`);
  }
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.log(`wrote ${out}`);
}

main();
