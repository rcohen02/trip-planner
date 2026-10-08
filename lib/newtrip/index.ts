import { createPrisma } from "@/lib/store/prisma";
import { MemoryDraftRepo, PrismaDraftRepo, type DraftRepo } from "./drafts";
import { FakeGeocoder, FrankfurterRates, NominatimGeocoder, type Geocoder, type RateSource } from "./lookup";

const g = globalThis as unknown as { __t2tDrafts?: DraftRepo };

/** Trips in progress: Postgres when DATABASE_URL is set, otherwise in memory (reset on restart). */
export function getDraftRepo(): DraftRepo {
  const url = process.env.DATABASE_URL;
  const want = url ? PrismaDraftRepo : MemoryDraftRepo;
  if (!(g.__t2tDrafts instanceof want)) g.__t2tDrafts = url ? new PrismaDraftRepo(createPrisma(url)) : new MemoryDraftRepo();
  return g.__t2tDrafts;
}

/** Local testing without internet: LOOKUPS=fake knows a few places and a fixed EUR rate. Never set on Vercel. */
const fake = () => process.env.LOOKUPS === "fake" && process.env.NODE_ENV !== "production";

export function getGeocoder(): Geocoder {
  if (!fake()) return new NominatimGeocoder();
  return new FakeGeocoder({
    lisbon: { label: "Lisbon, Portugal", lat: 38.7077, lng: -9.1366, countryCode: "pt" },
    rome: { label: "Rome, Italy", lat: 41.8933, lng: 12.4829, countryCode: "it" },
    "rua da giribita 1, paço de arcos": { label: "Paço de Arcos, Portugal", lat: 38.6978, lng: -9.2839, countryCode: "pt" },
    "via giulia 1, rome": { label: "Rome, Italy", lat: 41.8957, lng: 12.4683, countryCode: "it" },
  });
}

export function getRates(): RateSource {
  if (!fake()) return new FrankfurterRates();
  return { latest: async (c) => (c === "EUR" ? { usdRate: 1.16, usdRateDate: "2026-10-07" } : null) };
}
