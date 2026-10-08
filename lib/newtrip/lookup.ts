import type { FoundPlace } from "./steps";

/** Finds a city or address on the map. Real one: OpenStreetMap Nominatim (free). Tests use FakeGeocoder. */
export interface Geocoder {
  find(query: string): Promise<FoundPlace | null>;
}

type Loose = Record<string, unknown>;

export function parseNominatim(json: unknown): FoundPlace | null {
  if (!Array.isArray(json) || !json.length) return null;
  const r = json[0] as Loose;
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const a = (r.address ?? {}) as Loose;
  const place = (a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state ?? r.name) as string | undefined;
  const country = a.country as string | undefined;
  const label = place && country ? `${place}, ${country}` : String(r.display_name ?? r.name ?? "");
  return { label, lat, lng, countryCode: String(a.country_code ?? "").toLowerCase() };
}

/** OpenStreetMap Nominatim. Their policy: one request per second, a real User-Agent. We only call it on a typed answer. */
export class NominatimGeocoder implements Geocoder {
  async find(query: string): Promise<FoundPlace | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=en&q=${encodeURIComponent(query.trim())}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "T2T trip planner (time-2-travel.vercel.app)" }, signal: AbortSignal.timeout(8000) });
      return res.ok ? parseNominatim(await res.json()) : null;
    } catch {
      return null;
    }
  }
}

export class FakeGeocoder implements Geocoder {
  constructor(private known: Record<string, FoundPlace>) {}
  async find(query: string) {
    return this.known[query.trim().toLowerCase()] ?? null;
  }
}

export interface Rate {
  usdRate: number;
  usdRateDate: string;
}

/** Today's USD value of 1 unit of a currency. Real one: Frankfurter (European Central Bank rates, free, no key). */
export interface RateSource {
  latest(currency: string): Promise<Rate | null>;
}

export function parseFrankfurter(json: unknown): Rate | null {
  const r = (json ?? {}) as Loose;
  const usd = (r.rates as Loose | undefined)?.USD;
  if (typeof usd !== "number" || typeof r.date !== "string") return null;
  return { usdRate: usd >= 0.1 ? Math.round(usd * 100) / 100 : Number(usd.toPrecision(2)), usdRateDate: r.date };
}

export class FrankfurterRates implements RateSource {
  async latest(currency: string): Promise<Rate | null> {
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(currency)}&to=USD`, { signal: AbortSignal.timeout(8000) });
      return res.ok ? parseFrankfurter(await res.json()) : null;
    } catch {
      return null;
    }
  }
}

/** USD is 1. If the rate can't be fetched: 1 with no date, and research (3b) fetches it again before showing prices. */
export async function usdRateFor(currency: string, source: RateSource): Promise<Rate> {
  if (currency === "USD") return { usdRate: 1, usdRateDate: "" };
  return (await source.latest(currency)) ?? { usdRate: 1, usdRateDate: "" };
}
