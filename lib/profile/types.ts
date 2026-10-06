/** A child (or anyone who isn't a user) who travels with the profile's owner. Age comes from birth year + trip dates. */
export interface Traveler {
  id: string;
  label: string;
  birthYear: number;
}

/** A named preset of who comes ("Whole family", "Just us two"), with rules that apply only when it's picked. */
export interface TravelGroup {
  id: string;
  name: string;
  /** Children in the group (adults always come). */
  travelerIds: string[];
  /** Daily hiking cap for this group, or null for none. Set by imported notes; not asked in setup. */
  hikingMilesPerDay: number | null;
}

/** How much an interest matters: Must do, If I can fit it in, If I pass by. */
export type Tier = "must" | "fit" | "pass";

export interface Interest {
  name: string;
  detail: string;
  tier: Tier;
}

export type Pace = "relaxed" | "packed" | "both";
export type Party = "family" | "couple" | "solo" | "friends";
export type Transport = "transit" | "car";
/** Stay in the city, leave it (day trips), or both. */
export type Scope = "city" | "leave" | "both";

/** Everything that stays true from trip to trip. One per user; stored as one JSON document. */
export interface Profile {
  party: Party | null;
  adults: number;
  travelers: Traveler[];
  groups: TravelGroup[];
  limits: {
    /** Drive radius from the house, in minutes; null = not set. */
    driveMinutes: number | null;
    lodging: "house" | "any";
    neverHotels: boolean;
    transport: Transport[];
    scope: Scope | null;
  };
  /** Must do first, then If I can fit it in, then If I pass by; order within a tier is the user's. */
  interests: Interest[];
  food: { loves: string[]; hates: string[]; localFirst: boolean };
  pace: Pace | null;
  avoid: string[];
  /** Free text: "Any special requests?" */
  specialRequests: string;
  /** Setup steps the owner has answered or confirmed (lib/profile/setup), so they aren't asked again. */
  confirmed?: string[];
}

export function emptyProfile(): Profile {
  return {
    party: null,
    adults: 1,
    travelers: [],
    groups: [],
    limits: { driveMinutes: null, lodging: "any", neverHotels: false, transport: [], scope: null },
    interests: [],
    food: { loves: [], hates: [], localFirst: false },
    pace: null,
    avoid: [],
    specialRequests: "",
  };
}

/** Age during the year of an ISO date. */
export function ageOn(birthYear: number, isoDate: string): number {
  return Number(isoDate.slice(0, 4)) - birthYear;
}
