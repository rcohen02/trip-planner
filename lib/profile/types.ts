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
  /** Daily hiking cap for this group, or null for none. */
  hikingMilesPerDay: number | null;
}

export interface Interest {
  name: string;
  detail: string;
}

export type Pace = "relaxed" | "packed" | "both";

/** Everything that stays true from trip to trip. One per user; stored as one JSON document. */
export interface Profile {
  adults: number;
  travelers: Traveler[];
  groups: TravelGroup[];
  limits: {
    /** Drive radius from the house, in minutes; null = not set. */
    driveMinutes: number | null;
    lodging: "house" | "any";
    neverHotels: boolean;
  };
  /** Ranked, most important first. */
  interests: Interest[];
  food: { restrictions: string[]; favorites: string[]; localFirst: boolean };
  pace: Pace | null;
  avoid: string[];
  sources: string[];
  /** Setup steps the owner has answered or confirmed (lib/profile/setup), so they aren't asked again. */
  confirmed?: string[];
}

export function emptyProfile(): Profile {
  return {
    adults: 1,
    travelers: [],
    groups: [],
    limits: { driveMinutes: null, lodging: "any", neverHotels: false },
    interests: [],
    food: { restrictions: [], favorites: [], localFirst: false },
    pace: null,
    avoid: [],
    sources: [],
  };
}

/** Age on a given ISO date (birthday assumed Jan 1, so this is the age during that year). */
export function ageOn(birthYear: number, isoDate: string): number {
  return Number(isoDate.slice(0, 4)) - birthYear;
}
