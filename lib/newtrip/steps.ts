import type { Transport } from "../profile/types";

export type TripStepId = "where" | "when" | "who" | "stay" | "different" | "plan" | "review";

export interface TripStep {
  id: TripStepId;
  question: string;
  hint: string;
}

/** The new-trip questions, in order. Voice (Phase 4) will reuse this list. */
export const TRIP_STEPS: TripStep[] = [
  { id: "where", question: "Where to?", hint: "A city or region." },
  { id: "when", question: "When?", hint: "First and last day there." },
  { id: "who", question: "Who's coming?", hint: "From your profile." },
  { id: "stay", question: "Where are you staying?", hint: "The address puts your home base on the map." },
  { id: "different", question: "Anything different this time?", hint: "Only for this trip. Your profile stays as it is." },
  { id: "plan", question: "Draft the days, or build them yourself?", hint: "You can switch later." },
  { id: "review", question: "Here's the plan. Right?", hint: "Yes creates the trip." },
];

/** A place found on the map (OpenStreetMap). */
export interface FoundPlace {
  label: string;
  lat: number;
  lng: number;
  /** ISO 3166 two-letter code, lower-case. */
  countryCode: string;
}

export interface DraftHomebase {
  label: string;
  address: string;
  lat: number;
  lng: number;
  /** False when the address wasn't found and the pin sits on the city center instead. */
  found: boolean;
}

/** A trip being set up, saved after each answer so it can be finished later. */
export interface TripDraft {
  destination: FoundPlace | null;
  start: string | null;
  end: string | null;
  groupId: string | null;
  homebase: DraftHomebase | null;
  overrides: string;
  /** This trip's way of getting around; starts as the profile's. */
  transport: Transport[];
  plan: "draft" | "build" | null;
  confirmed: TripStepId[];
}

export function emptyDraft(): TripDraft {
  return { destination: null, start: null, end: null, groupId: null, homebase: null, overrides: "", transport: [], plan: null, confirmed: [] };
}

export function tripStepAnswered(d: TripDraft, id: TripStepId): boolean {
  switch (id) {
    case "where":
      return d.destination !== null;
    case "when":
      return d.start !== null && d.end !== null;
    case "who":
      return d.groupId !== null;
    case "stay":
      return d.homebase !== null;
    case "different":
      return d.confirmed.includes("different");
    case "plan":
      return d.plan !== null;
    case "review":
      return false;
  }
}

export function nextTripStep(d: TripDraft): TripStepId {
  return TRIP_STEPS.find((s) => !tripStepAnswered(d, s.id))?.id ?? "review";
}

export type Answers = Record<string, string | undefined>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const lines = (v: string | undefined) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const TRANSPORTS: Transport[] = ["transit", "car"];

/**
 * Applies a typed answer. "where" and "stay" need a map lookup, so the server action does those and
 * sets destination / homebase directly. Throws with a plain-words message when an answer can't be used.
 */
export function applyTripStep(d: TripDraft, step: TripStepId, a: Answers, groupIds: string[] = []): TripDraft {
  const next: TripDraft = structuredClone(d);
  switch (step) {
    case "when": {
      const start = (a.start ?? "").trim();
      const end = (a.end ?? "").trim();
      if (!ISO.test(start) || !ISO.test(end) || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) throw new Error("Pick a start and end date.");
      if (days(start, end) < 0) throw new Error("The last day has to be on or after the first.");
      if (days(start, end) > 29) throw new Error("Trips can be up to 30 days.");
      next.start = start;
      next.end = end;
      break;
    }
    case "who":
      if (!a.groupId || !groupIds.includes(a.groupId)) throw new Error("Pick who's coming.");
      next.groupId = a.groupId;
      break;
    case "different":
      next.overrides = (a.overrides ?? "").trim().slice(0, 2000);
      next.transport = [...new Set(lines(a.transport))].filter((t): t is Transport => TRANSPORTS.includes(t as Transport));
      break;
    case "plan":
      next.plan = a.plan === "draft" || a.plan === "build" ? a.plan : null;
      break;
    case "where":
    case "stay":
    case "review":
      break;
  }
  if (!next.confirmed.includes(step)) next.confirmed = [...next.confirmed, step];
  return next;
}

export function tripFormValues(d: TripDraft, step: TripStepId): Answers {
  switch (step) {
    case "where":
      return { destination: d.destination?.label ?? "" };
    case "when":
      return { start: d.start ?? "", end: d.end ?? "" };
    case "who":
      return { groupId: d.groupId ?? "" };
    case "stay":
      return { label: d.homebase?.label ?? "", address: d.homebase?.address ?? "" };
    case "different":
      return { overrides: d.overrides, transport: d.transport.join("\n") };
    case "plan":
      return { plan: d.plan ?? "" };
    case "review":
      return {};
  }
}
