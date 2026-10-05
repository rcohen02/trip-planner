export type Category = "art" | "food" | "bar" | "shop" | "tour" | "nature" | "history" | "festival" | "walk";

/** 0 = Sunday … 6 = Saturday (JS Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PlaceImage {
  url: string;
  thumb: string;
  credit: string;
  license: string;
  sourcePage: string;
}

export interface Price {
  amount: number;
  max?: number;
  approx?: boolean;
  unit?: "per person" | "for two";
  /** Year of the source the price came from. */
  year?: number;
}

export interface Place {
  id: string;
  name: string;
  category: Category;
  /** Text right after the name, e.g. "Rua da Junqueira 207, Belém". */
  location: string;
  details: string;
  price: Price | null;
  /** Hours as written in the source, when confirmed on the venue's site (e.g. "Tue–Sun 10:00–18:00, closed Mon"). */
  hours: string | null;
  url: string | null;
  mapsUrl: string | null;
  phone: string | null;
  note: string;
  noteYear: number | null;
  hoursConfirmed: boolean;
  /** True when the hours were checked on the site (✓ in Itinerary), not marked ✓ in picks.md. */
  hoursChecked?: boolean;
  openDays: Weekday[] | null;
  needsBooking: boolean;
  // Added by trip.json overrides / enrichment:
  cluster?: string | null;
  lat?: number | null;
  lng?: number | null;
  images?: PlaceImage[];
  /** On the shortlist (the Shortlist toggle on cards). Set from the store in lib/context.ts. */
  shortlisted?: boolean;
  /** Set for walking routes uploaded on the site (category "walk"). */
  route?: RouteInfo;
}

/** A walking route as a plannable card: the line plus what the UI shows about it. */
export interface RouteInfo {
  routeId: string;
  /** [lat, lng] points in walking order. */
  line: [number, number][];
  distanceM: number;
  startLabel: string | null;
  endLabel: string | null;
  /** Ids of saved places within ~150 m of the line, in walking order. */
  nearby: string[];
}

export interface Flight {
  airline: string;
  flightNo: string;
  from: { code: string; name: string; terminal: string };
  to: { code: string; name: string; terminal: string };
  depart: string; // ISO with offset
  arrive: string; // ISO with offset
  checkInCloses: string; // ISO with offset
  seats: Record<string, string>;
}

export type SlotKind = "early" | "morning" | "lunch" | "afternoon" | "dinner" | "night";

export interface DayRule {
  date: string; // YYYY-MM-DD in trip time zone
  label: string;
  note?: string;
  slots: SlotKind[];
  locked?: { kind: SlotKind; reason: string }[];
  optional?: SlotKind[];
}

export interface Cluster {
  id: string;
  name: string;
  note: string;
  color: string;
}

export interface Todo {
  id: string;
  kind: "book" | "confirm" | "check" | "other";
  text: string;
  placeId?: string;
}

export interface Trip {
  slug: string;
  name: string;
  destination: string;
  timezone: string;
  homeTimezone: string;
  localCurrency: string;
  usdRate: number;
  usdRateDate: string;
  travelers: { name: string; email?: string }[];
  bookingRef: string;
  homebase: { label: string; address: string; lat: number; lng: number; url?: string; phone?: string; email?: string };
  flights: Flight[];
  bags: string[];
  gettingAround: string[];
  days: DayRule[];
  clusters: Cluster[];
  todos: Todo[];
  places: Place[];
}
