import type { Category, Place, Weekday } from "./types";

const SECTIONS: Record<string, Category> = {
  "art & museums": "art",
  restaurants: "food",
  "bars & nightlife": "bar",
  shopping: "shop",
  "tours & getting around": "tour",
  nature: "nature",
  "history & ruins": "history",
  festivals: "festival",
};

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const DAYS: Record<string, Weekday> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const ALL: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function dayIndex(word: string): Weekday | undefined {
  return DAYS[word.slice(0, 3).toLowerCase()];
}

/** Open days from free text like "Tue–Sun 10:00–18:00, closed Mon" or "Tuesdays & Saturdays". */
export function parseOpenDays(text: string): Weekday[] | null {
  const d = "(mon|tue|wed|thu|fri|sat|sun)[a-z]*";
  if (/\bdaily\b/i.test(text)) return [...ALL];
  const range = text.match(new RegExp(`\\b${d}\\s*[–-]\\s*${d}\\b`, "i"));
  if (range) {
    const a = dayIndex(range[1])!;
    const b = dayIndex(range[2])!;
    const out: Weekday[] = [];
    for (let i = a; ; i = (i + 1) % 7) {
      out.push(i as Weekday);
      if (i === b) break;
    }
    return out;
  }
  const closed = text.match(new RegExp(`closed\\s+${d}`, "i"));
  if (closed) {
    const c = dayIndex(closed[1]);
    return ALL.filter((x) => x !== c);
  }
  const pair = text.match(new RegExp(`\\b${d}s?\\s*(?:&|and)\\s*${d}`, "i"));
  if (pair) return [dayIndex(pair[1])!, dayIndex(pair[2])!].sort((x, y) => x - y) as Weekday[];
  return null;
}

function link(text: string, label: string): string | null {
  const m = text.match(new RegExp(`\\[${label}\\]\\((https?://[^)\\s]+)\\)`));
  return m ? m[1] : null;
}

function price(text: string): number | null {
  if (/(^|[.—]\s*)Free\b/.test(text)) return 0;
  const m = text.match(/€\s?(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

/** Parse a picks markdown file (format of content/trips/<slug>/picks.md) into places. */
export function parsePicks(md: string): Place[] {
  const places: Place[] = [];
  let category: Category | null = null;
  let current: Place | null = null;

  for (const line of md.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      category = SECTIONS[h[1].toLowerCase()] ?? null;
      current = null;
      continue;
    }
    if (!category) continue;

    const top = line.match(/^- \*\*(.+?)\*\*\s*—\s*(.*)$/);
    if (top) {
      const [, name, rest] = top;
      const [location, ...more] = rest.split(/\.\s+/);
      const hoursConfirmed = rest.includes("✓");
      current = {
        id: slugify(name),
        name,
        category,
        location: location.replace(/\.$/, ""),
        details: more.join(". ").replace(/\[[^\]]+\]\([^)]+\)/g, "").trim(),
        priceLocal: price(rest),
        url: link(rest, "Site") ?? link(rest, "Info"),
        mapsUrl: link(rest, "Maps"),
        phone: rest.match(/\+\d{1,3}(?:\s?\d{2,4}){2,4}/)?.[0] ?? null,
        note: "",
        noteYear: null,
        hoursConfirmed,
        openDays: parseOpenDays(rest),
        needsBooking: /book (now|ahead)|to book/i.test(rest),
      };
      places.push(current);
      continue;
    }
    if (!current) continue;

    const note = line.match(/^\s+\*(\d{4}):\*\s*(.*)$/);
    if (note) {
      current.noteYear = Number(note[1]);
      current.note = note[2].trim();
      if (/book (now|ahead)|to book/i.test(note[2])) current.needsBooking = true;
      continue;
    }
    const sub = line.match(/^\s+- (.*)$/);
    if (sub) current.note += ` · ${sub[1].replace(/\*\*/g, "")}`;
  }
  return places;
}
