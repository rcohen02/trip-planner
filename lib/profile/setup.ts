import type { Interest, Pace, Party, Profile, Scope, Tier, TravelGroup, Transport, Traveler } from "./types";

export type SetupStepId = "travelers" | "limits" | "interests" | "food" | "pace" | "avoid" | "review";

export interface SetupStep {
  id: SetupStepId;
  question: string;
  hint: string;
}

/** The profile setup questions, in order. The same list will drive the voice flow (Phase 4). */
export const SETUP_STEPS: SetupStep[] = [
  { id: "travelers", question: "Who usually travels with you?", hint: "Pick one, then who's coming." },
  { id: "limits", question: "How do you travel?", hint: "Pick any that fit." },
  { id: "interests", question: "What makes a trip great for you?", hint: "Drag each one into a bucket, or tap it and then tap a bucket. Add your own." },
  { id: "food", question: "How do you like to eat?", hint: "Drag foods into Love or Hate, or tap one and then tap a list. Add your own." },
  { id: "pace", question: "What pace do you like?", hint: "Relaxed leaves room to linger. Packed covers more ground." },
  { id: "avoid", question: "Anything I should never suggest?", hint: "One per line." },
  { id: "review", question: "Here's your profile. Right?", hint: "You can change any part later." },
];

/** Known from the data itself (e.g. imported notes), or confirmed in setup. */
export function stepAnswered(p: Profile, id: SetupStepId): boolean {
  if (p.confirmed?.includes(id)) return true;
  switch (id) {
    case "travelers":
      return p.groups.length > 0;
    case "limits":
      return p.limits.driveMinutes !== null || p.limits.transport.length > 0 || p.limits.scope !== null;
    case "interests":
      return p.interests.length > 0;
    case "food":
      return p.food.loves.length > 0 || p.food.hates.length > 0 || p.food.localFirst;
    case "pace":
      return p.pace !== null;
    case "avoid":
      return p.avoid.length > 0 || p.specialRequests !== "";
    case "review":
      return false;
  }
}

/** The first question not yet answered; "review" when everything else is known. */
export function nextStep(p: Profile): SetupStepId {
  return SETUP_STEPS.find((s) => !stepAnswered(p, s.id))?.id ?? "review";
}

export type Answers = Record<string, string | undefined>;

const lines = (v: string | undefined) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const on = (v: string | undefined) => v === "on" || v === "true" || v === "yes";
const unique = (xs: string[]) => [...new Set(xs)];
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);

function count(v: string | undefined, min: number, max: number): number | null {
  const n = Number((v ?? "").trim());
  return v && v.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function parseKids(text: string | undefined, existing: Traveler[]): Traveler[] {
  const thisYear = new Date().getFullYear();
  const out: Traveler[] = [];
  for (const line of lines(text)) {
    const m = /^(.*?)[,\s]+(?:born\s+)?(\d{4})\b/i.exec(line);
    if (!m) continue;
    const birthYear = Number(m[2]);
    if (birthYear < thisYear - 25 || birthYear > thisYear) continue;
    const label = m[1].trim() || "Child";
    const same = existing.find((t) => t.label === label && t.birthYear === birthYear && !out.includes(t));
    out.push(same ?? { id: `t${Date.now().toString(36)}${out.length}`, label, birthYear });
  }
  return out;
}

/** Groups for the chosen party. Ids stay stable (g-family, g-adults) and an imported hiking cap is kept. */
function groupsFor(party: Party | null, adults: number, kids: Traveler[], old: TravelGroup[]): TravelGroup[] {
  const cap = (id: string) => old.find((g) => g.id === id)?.hikingMilesPerDay ?? null;
  const adultsName = party === "friends" ? "Friends" : adults === 1 || party === "solo" ? "Just me" : adults === 2 ? "Just us two" : "Adults only";
  const adultsGroup: TravelGroup = { id: "g-adults", name: adultsName, travelerIds: [], hikingMilesPerDay: cap("g-adults") };
  if (!kids.length) return [adultsGroup];
  const family: TravelGroup = { id: "g-family", name: "Whole family", travelerIds: kids.map((k) => k.id), hikingMilesPerDay: cap("g-family") };
  return [family, adultsGroup];
}

const PACES: Pace[] = ["relaxed", "packed", "both"];
const PARTIES: Party[] = ["family", "couple", "solo", "friends"];
const TRANSPORTS: Transport[] = ["transit", "car"];
const SCOPES: Scope[] = ["city", "leave", "both"];
const TIER_ORDER: Tier[] = ["must", "fit", "pass"];

function parseInterests(a: Answers, old: Interest[]): Interest[] {
  const seen = new Set<string>();
  const out: Interest[] = [];
  for (const tier of TIER_ORDER) {
    for (const name of lines(a[tier])) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, detail: old.find((i) => i.name.toLowerCase() === key)?.detail ?? "", tier });
    }
  }
  return out;
}

/** Applies one setup step's answers. Returns a new profile with that step confirmed. */
export function applyStep(p: Profile, step: SetupStepId, a: Answers): Profile {
  const next: Profile = structuredClone(p);
  switch (step) {
    case "travelers": {
      next.party = oneOf(a.party, PARTIES);
      next.adults = count(a.adults, 1, 12) ?? 1;
      next.travelers = parseKids(a.kids, p.travelers);
      next.groups = groupsFor(next.party, next.adults, next.travelers, p.groups);
      break;
    }
    case "limits": {
      const neverHotels = on(a.neverHotels);
      next.limits = {
        driveMinutes: count(a.driveMinutes, 1, 24 * 60),
        lodging: neverHotels ? "house" : "any",
        neverHotels,
        transport: unique(lines(a.transport)).filter((t): t is Transport => TRANSPORTS.includes(t as Transport)),
        scope: oneOf(a.scope, SCOPES),
      };
      break;
    }
    case "interests":
      next.interests = parseInterests(a, p.interests);
      break;
    case "food": {
      const hates = unique(lines(a.hate));
      const hated = new Set(hates.map((h) => h.toLowerCase()));
      next.food = { loves: unique(lines(a.love)).filter((l) => !hated.has(l.toLowerCase())), hates, localFirst: on(a.localFirst) };
      break;
    }
    case "pace":
      next.pace = oneOf(a.pace, PACES);
      break;
    case "avoid":
      next.avoid = lines(a.avoid);
      next.specialRequests = (a.specialRequests ?? "").trim().slice(0, 2000);
      break;
    case "review":
      break;
  }
  next.confirmed = [...new Set([...(p.confirmed ?? []), step])];
  return next;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Plain-words summary of what changed, for the profile history. */
export function describeChanges(before: Profile | null, after: Profile): string {
  if (!before) return "Profile created";
  const parts: string[] = [];
  if (before.party !== after.party || before.adults !== after.adults || !same(before.travelers, after.travelers) || !same(before.groups, after.groups)) {
    parts.push("Travelers changed");
  }
  if (before.limits.driveMinutes !== after.limits.driveMinutes) {
    parts.push(`Drive radius ${before.limits.driveMinutes ?? "none"} → ${after.limits.driveMinutes ?? "none"} min`);
  }
  if (!same(before.limits.transport, after.limits.transport) || before.limits.scope !== after.limits.scope) parts.push("How you travel changed");
  if (before.limits.neverHotels !== after.limits.neverHotels) parts.push(after.limits.neverHotels ? "Never suggest hotels" : "Hotels allowed");
  if (!same(before.interests, after.interests)) parts.push("Interests changed");
  if (!same(before.food, after.food)) parts.push("Food changed");
  if (before.pace !== after.pace) parts.push(`Pace: ${after.pace ?? "not set"}`);
  if (!same(before.avoid, after.avoid)) parts.push("Never-suggest list changed");
  if (before.specialRequests !== after.specialRequests) parts.push("Special requests changed");
  return parts.length ? parts.join(" · ") : "No changes";
}

/** The current profile as form values for one step (the same keys applyStep reads), to pre-fill the form. */
export function formValues(p: Profile, step: SetupStepId): Answers {
  const yes = (b: boolean) => (b ? "on" : "");
  const tier = (t: Tier) => p.interests.filter((i) => i.tier === t).map((i) => i.name).join("\n");
  switch (step) {
    case "travelers":
      return { party: p.party ?? "", adults: String(p.adults), kids: p.travelers.map((t) => `${t.label} ${t.birthYear}`).join("\n") };
    case "limits":
      return {
        transport: p.limits.transport.join("\n"),
        scope: p.limits.scope ?? "",
        driveMinutes: p.limits.driveMinutes != null ? String(p.limits.driveMinutes) : "",
        neverHotels: yes(p.limits.neverHotels),
      };
    case "interests":
      return { must: tier("must"), fit: tier("fit"), pass: tier("pass") };
    case "food":
      return { love: p.food.loves.join("\n"), hate: p.food.hates.join("\n"), localFirst: yes(p.food.localFirst) };
    case "pace":
      return { pace: p.pace ?? "" };
    case "avoid":
      return { avoid: p.avoid.join("\n"), specialRequests: p.specialRequests };
    case "review":
      return {};
  }
}
