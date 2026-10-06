import type { Interest, Pace, Profile, TravelGroup, Traveler } from "./types";

export type SetupStepId = "travelers" | "limits" | "interests" | "food" | "pace" | "avoid" | "review";

export interface SetupStep {
  id: SetupStepId;
  question: string;
  hint: string;
}

/** The profile setup questions, in order. The same list will drive the voice flow (Phase 4). */
export const SETUP_STEPS: SetupStep[] = [
  { id: "travelers", question: "Who usually travels with you?", hint: "Adults, and any kids with the year they were born." },
  { id: "limits", question: "Any limits I should always respect?", hint: "How far you'll drive, and where you stay." },
  { id: "interests", question: "What makes a trip great for you?", hint: "One per line, most important first. Add a few words after a dash." },
  { id: "food", question: "How do you like to eat?", hint: "Anything you can't eat, and favorites I should look for." },
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
      return p.limits.driveMinutes !== null;
    case "interests":
      return p.interests.length > 0;
    case "food":
      return p.food.favorites.length > 0 || p.food.restrictions.length > 0 || p.food.localFirst;
    case "pace":
      return p.pace !== null;
    case "avoid":
      return p.avoid.length > 0;
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
const commaList = (v: string | undefined) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const on = (v: string | undefined) => v === "on" || v === "true" || v === "yes";

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

function groupsFor(adults: number, kids: Traveler[], hikingCap: number | null, old: TravelGroup[]): TravelGroup[] {
  const adultsName = adults === 1 ? "Just me" : adults === 2 ? "Just us two" : "Adults only";
  const oldFamily = old.find((g) => g.id === "g-family");
  const oldAdults = old.find((g) => g.id === "g-adults");
  const adultsGroup: TravelGroup = { id: "g-adults", name: oldAdults && oldAdults.name !== "Just me" && oldAdults.name !== "Just us two" && oldAdults.name !== "Adults only" ? oldAdults.name : adultsName, travelerIds: [], hikingMilesPerDay: kids.length ? null : hikingCap };
  if (!kids.length) return [adultsGroup];
  const family: TravelGroup = { id: "g-family", name: oldFamily?.name ?? "Whole family", travelerIds: kids.map((k) => k.id), hikingMilesPerDay: hikingCap };
  return [family, adultsGroup];
}

function parseInterests(text: string | undefined): Interest[] {
  return lines(text).map((l) => {
    const t = l.replace(/^\d+[.)]\s*/, "");
    const [name, ...rest] = t.split(/\s+[—–-]\s+/);
    return { name: name.trim(), detail: rest.join(" — ").trim() };
  });
}

const PACES: Pace[] = ["relaxed", "packed", "both"];

/** Applies one setup step's typed answers. Returns a new profile with that step confirmed. */
export function applyStep(p: Profile, step: SetupStepId, a: Answers): Profile {
  const next: Profile = structuredClone(p);
  switch (step) {
    case "travelers": {
      next.adults = count(a.adults, 1, 12) ?? 1;
      next.travelers = parseKids(a.kids, p.travelers);
      const cap = count(a.hikingCap, 0, 50);
      next.groups = groupsFor(next.adults, next.travelers, cap, p.groups);
      break;
    }
    case "limits": {
      const neverHotels = on(a.neverHotels);
      next.limits = { driveMinutes: count(a.driveMinutes, 1, 24 * 60), lodging: neverHotels ? "house" : "any", neverHotels };
      break;
    }
    case "interests":
      next.interests = parseInterests(a.interests);
      break;
    case "food":
      next.food = { restrictions: commaList(a.restrictions), favorites: commaList(a.favorites), localFirst: on(a.localFirst) };
      break;
    case "pace":
      next.pace = PACES.includes(a.pace as Pace) ? (a.pace as Pace) : null;
      break;
    case "avoid":
      next.avoid = lines(a.avoid);
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
  if (before.adults !== after.adults || !same(before.travelers, after.travelers) || !same(before.groups, after.groups)) parts.push("Travelers changed");
  if (before.limits.driveMinutes !== after.limits.driveMinutes) {
    parts.push(`Drive radius ${before.limits.driveMinutes ?? "none"} → ${after.limits.driveMinutes ?? "none"} min`);
  }
  if (before.limits.neverHotels !== after.limits.neverHotels) parts.push(after.limits.neverHotels ? "Never suggest hotels" : "Hotels allowed");
  if (!same(before.interests, after.interests)) parts.push("Interests changed");
  if (!same(before.food, after.food)) parts.push("Food changed");
  if (before.pace !== after.pace) parts.push(`Pace: ${after.pace ?? "not set"}`);
  if (!same(before.avoid, after.avoid)) parts.push("Never-suggest list changed");
  return parts.length ? parts.join(" · ") : "No changes";
}

/** The current profile as form values for one step (the same keys applyStep reads), to pre-fill the form. */
export function formValues(p: Profile, step: SetupStepId): Answers {
  const yes = (b: boolean) => (b ? "on" : "");
  switch (step) {
    case "travelers": {
      const family = p.groups.find((g) => g.travelerIds.length > 0) ?? p.groups[0];
      return {
        adults: String(p.adults),
        kids: p.travelers.map((t) => `${t.label} ${t.birthYear}`).join("\n"),
        hikingCap: family?.hikingMilesPerDay != null ? String(family.hikingMilesPerDay) : "",
      };
    }
    case "limits":
      return { driveMinutes: p.limits.driveMinutes != null ? String(p.limits.driveMinutes) : "", neverHotels: yes(p.limits.neverHotels) };
    case "interests":
      return { interests: p.interests.map((i) => (i.detail ? `${i.name} — ${i.detail}` : i.name)).join("\n") };
    case "food":
      return { restrictions: p.food.restrictions.join(", "), favorites: p.food.favorites.join(", "), localFirst: yes(p.food.localFirst) };
    case "pace":
      return { pace: p.pace ?? "" };
    case "avoid":
      return { avoid: p.avoid.join("\n") };
    case "review":
      return {};
  }
}
