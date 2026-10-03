/** Builds content/generated/<slug>.json for every trip folder. Usage: npm run content */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildTrip } from "../lib/content/buildTrip";

const root = join(process.cwd(), "content");
mkdirSync(join(root, "generated"), { recursive: true });
const index: { slug: string; name: string; start: string; end: string }[] = [];

for (const slug of readdirSync(join(root, "trips"))) {
  const dir = join(root, "trips", slug);
  const meta = JSON.parse(readFileSync(join(dir, "trip.json"), "utf8"));
  const enrichPath = join(dir, "enrichment.json");
  const enrichment = existsSync(enrichPath) ? JSON.parse(readFileSync(enrichPath, "utf8")) : {};
  const trip = buildTrip(readFileSync(join(dir, "picks.md"), "utf8"), meta, enrichment);
  writeFileSync(join(root, "generated", `${slug}.json`), JSON.stringify(trip, null, 2) + "\n");
  index.push({ slug, name: trip.name, start: trip.days[0]?.date, end: trip.days.at(-1)?.date ?? "" });
  console.log(`${slug}: ${trip.places.length} places, ${trip.places.filter((p) => p.lat).length} mapped`);
}
writeFileSync(join(root, "generated", "index.json"), JSON.stringify(index, null, 2) + "\n");
