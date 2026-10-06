import { emptyProfile, type Interest, type Profile, type Tier } from "./types";

type Loose = Record<string, unknown>;
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {});

/**
 * Reads a stored profile of any age into the current shape. Profiles saved before the Oct 6 redesign had
 * food.favorites/restrictions and interests without a tier.
 */
export function normalizeProfile(raw: unknown): Profile {
  const r = obj(raw);
  const base = emptyProfile();
  const limits = obj(r.limits);
  const food = obj(r.food);
  const out: Profile = {
    ...base,
    party: (r.party as Profile["party"]) ?? null,
    adults: typeof r.adults === "number" ? r.adults : base.adults,
    travelers: arr(r.travelers),
    groups: arr(r.groups),
    limits: {
      driveMinutes: (limits.driveMinutes as number | null) ?? null,
      lodging: limits.lodging === "house" ? "house" : "any",
      neverHotels: Boolean(limits.neverHotels),
      transport: arr(limits.transport),
      scope: (limits.scope as Profile["limits"]["scope"]) ?? null,
    },
    interests: arr<Loose>(r.interests).map((i): Interest => ({
      name: String(i.name ?? ""),
      detail: String(i.detail ?? ""),
      tier: (["must", "fit", "pass"].includes(i.tier as string) ? i.tier : "must") as Tier,
    })),
    food: {
      loves: arr<string>(food.loves ?? food.favorites),
      hates: arr<string>(food.hates ?? food.restrictions),
      localFirst: Boolean(food.localFirst),
    },
    pace: (r.pace as Profile["pace"]) ?? null,
    avoid: arr(r.avoid),
    specialRequests: typeof r.specialRequests === "string" ? r.specialRequests : "",
  };
  if (Array.isArray(r.confirmed)) out.confirmed = r.confirmed as string[];
  return out;
}
