import { TRIPS } from "@/content/generated/trips";
import type { Trip } from "@/lib/content/types";
import { createPrisma } from "@/lib/store/prisma";
import { ensureSeeded } from "./access";
import { MemoryTripRepo } from "./memory";
import { PrismaTripRepo } from "./prisma";
import { byStart, type TripRepo } from "./types";

const g = globalThis as unknown as { __t2tTrips?: { repo: TripRepo; seeded?: Promise<void> } };

/** Methods the current repo class has (so a hot reload after code changes swaps in a fresh repo). */
function methods(cls: { prototype: object }): string[] {
  return Object.getOwnPropertyNames(cls.prototype).filter((k) => k !== "constructor");
}

/**
 * Trips and users: Postgres when DATABASE_URL is set, otherwise in memory for local runs.
 * The first call seeds the store with the trips bundled in content/generated and the ALLOWED_EMAILS people.
 */
export async function getTripRepo(): Promise<TripRepo> {
  const url = process.env.DATABASE_URL;
  const Cls = url ? PrismaTripRepo : MemoryTripRepo;
  const cached = g.__t2tTrips?.repo as unknown as Record<string, unknown> | undefined;
  if (!cached || methods(Cls).some((k) => typeof cached[k] !== "function")) {
    g.__t2tTrips = { repo: url ? new PrismaTripRepo(createPrisma(url)) : new MemoryTripRepo() };
  }
  const slot = g.__t2tTrips!;
  slot.seeded ??= ensureSeeded(slot.repo, Object.values(TRIPS), process.env.ALLOWED_EMAILS).catch((e) => {
    slot.seeded = undefined;
    throw e;
  });
  await slot.seeded;
  return slot.repo;
}

export async function getTrip(slug: string): Promise<Trip | null> {
  return (await getTripRepo()).getTrip(slug);
}

/** Trips the signed-in person is on, earliest first. */
export async function listTripsFor(email: string): Promise<Trip[]> {
  return (await getTripRepo()).tripsFor(email);
}

/** May this person open this trip (member, or app admin)? */
export async function canOpenTrip(slug: string, email: string): Promise<boolean> {
  return (await getTripRepo()).canOpen(slug, email);
}

/** Every trip, earliest first (local dev without sign-in only). */
export async function listAllTrips(): Promise<Trip[]> {
  const repo = await getTripRepo();
  const all = await Promise.all((await repo.slugs()).map((s) => repo.getTrip(s)));
  return all.filter((t): t is Trip => Boolean(t)).sort(byStart);
}
