import type { Trip } from "../content/types";
import { parseAllowlist, seedPlan } from "./seed";
import type { TripRepo } from "./types";

/**
 * First run against a store: bring in the trips bundled with the site and the people on the old
 * ALLOWED_EMAILS list. Safe to call on every request; it only adds what's missing.
 */
export async function ensureSeeded(repo: TripRepo, bundled: Trip[], allowlist: string | undefined) {
  const [existingSlugs, existingEmails] = await Promise.all([repo.slugs(), repo.userEmails()]);
  const plan = seedPlan({ trips: bundled, existingSlugs, existingEmails, allowlist });
  for (const u of plan.users) await repo.addUser(u);
  for (const t of plan.trips) {
    const owner = plan.members.find((m) => m.slug === t.slug && m.role === "owner");
    await repo.saveTrip(t, owner?.email ?? "admin");
  }
  for (const m of plan.members) await repo.addMember(m.slug, m.email, m.role);
}

/** Who may sign in: a user, someone with an open invite, or (while moving off it) the old allowlist. */
export async function maySignIn(repo: TripRepo, email: string | null | undefined, allowlist: string | undefined) {
  if (!email) return false;
  if (parseAllowlist(allowlist).includes(email.trim().toLowerCase())) return true;
  return Boolean((await repo.user(email)) || (await repo.isInvited(email)));
}

/** After a successful sign-in: an invite becomes a user. */
export async function onSignIn(repo: TripRepo, email: string, name?: string) {
  if (await repo.isInvited(email)) await repo.acceptInvite(email, name);
}
