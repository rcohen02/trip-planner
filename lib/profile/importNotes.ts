import { emptyProfile, type Profile, type TravelGroup } from "./types";

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

/** Markdown split into "## Heading" sections, keyed by lower-case heading. */
function sections(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  let key = "";
  for (const line of md.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) key = h[1].trim().toLowerCase();
    else if (key) out[key] = (out[key] ?? "") + line + "\n";
  }
  return out;
}

function find(all: Record<string, string>, ...words: string[]): string {
  const k = Object.keys(all).find((h) => words.some((w) => h.includes(w)));
  return k ? all[k] : "";
}

const bullets = (text: string) =>
  text
    .split("\n")
    .map((l) => /^\s*[-*]\s+(.+)$/.exec(l)?.[1].trim())
    .filter((l): l is string => Boolean(l));

const clean = (s: string) => s.replace(/\*\*/g, "").replace(/\.$/, "").trim();

/**
 * Reads travel notes in the travel_context.md layout (Family, Mobility, Trip Pace, Food, Research
 * Priorities, What NOT to Suggest) into a profile. Anything it can't find stays empty, so setup asks for it.
 */
export function importNotes(raw: string): Profile {
  const md = raw.replace(/\r\n?/g, "\n");
  const p = emptyProfile();
  const s = sections(md);

  const family = find(s, "family", "who");
  const adults = /\b(one|two|three|four|five|six|\d+)\s+adults?\b/i.exec(family);
  if (adults) p.adults = WORDS[adults[1].toLowerCase()] ?? Number(adults[1]);
  for (const m of family.matchAll(/^\s*[-*]\s+([A-Za-z][\w ]*?),\s*born\s+(\d{4})/gm)) {
    p.travelers.push({ id: `t${p.travelers.length + 1}`, label: m[1].trim(), birthYear: Number(m[2]) });
  }

  const limits = find(s, "mobility", "limits");
  const hike = /hiking[^.\n]*?under\s+(\d+(?:\.\d+)?)\s*mi/i.exec(limits);
  const drive = /(\d+)[-\s]*minute\s+drive/i.exec(limits);
  if (drive) p.limits.driveMinutes = Number(drive[1]);
  if (/stays in a house|not a hotel/i.test(limits)) p.limits.lodging = "house";
  if (/never suggest[^.\n]*hotel/i.test(limits)) p.limits.neverHotels = true;

  const pace = find(s, "pace");
  if (/both paces/i.test(pace)) p.pace = "both";
  else if (/relaxed/i.test(pace)) p.pace = "relaxed";
  else if (/packed/i.test(pace)) p.pace = "packed";

  const food = bullets(find(s, "food"));
  for (const line of food) {
    const plain = clean(line);
    if (/^no dietary restrictions/i.test(plain)) continue;
    const fav = /^(.+?)\s+(?:are|is) a standing favorite/i.exec(plain);
    if (fav) {
      p.food.favorites.push(fav[1].trim());
      continue;
    }
    if (/local/i.test(plain) && /(tourist|marquee|headline)/i.test(plain)) {
      p.food.localFirst = true;
      continue;
    }
    if (!/\*\*/.test(line) && !/:/.test(plain)) p.food.restrictions.push(...plain.split(/,\s*/).map((x) => x.trim()).filter(Boolean));
  }

  for (const m of find(s, "research", "interests", "priorities").matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*([^.\n]+)/gm)) {
    p.interests.push({ name: m[1].trim(), detail: m[2].trim() });
  }

  p.avoid = bullets(find(s, "not to suggest", "never", "avoid")).map(clean);

  if (p.travelers.length) {
    const family: TravelGroup = {
      id: "g-family",
      name: "Whole family",
      travelerIds: p.travelers.map((t) => t.id),
      hikingMilesPerDay: hike ? Number(hike[1]) : null,
    };
    const adultsOnly: TravelGroup = {
      id: "g-adults",
      name: p.adults === 2 ? "Just us two" : "Adults only",
      travelerIds: [],
      hikingMilesPerDay: null,
    };
    p.groups = [family, adultsOnly];
  }
  return p;
}
