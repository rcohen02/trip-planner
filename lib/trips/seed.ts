/** What the first run against a database needs to create: users from the old allowlist, bundled trips, memberships. */
export interface SeedInput<T extends { slug: string }> {
  /** Trips bundled with the site (content/generated). */
  trips: T[];
  existingSlugs: string[];
  existingEmails: string[];
  /** ALLOWED_EMAILS, comma separated. The first address becomes the app admin. */
  allowlist: string | undefined;
}

export interface SeedPlan<T> {
  users: { email: string; admin: boolean }[];
  trips: T[];
  members: { slug: string; email: string; role: "owner" | "member" }[];
}

export function parseAllowlist(list: string | undefined): string[] {
  return [...new Set((list ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export function seedPlan<T extends { slug: string }>(input: SeedInput<T>): SeedPlan<T> {
  const emails = parseAllowlist(input.allowlist);
  const known = new Set(input.existingEmails.map((e) => e.toLowerCase()));
  const firstRun = known.size === 0;
  const users = emails.filter((e) => !known.has(e)).map((email) => ({ email, admin: firstRun && email === emails[0] }));
  const have = new Set(input.existingSlugs);
  const trips = input.trips.filter((t) => !have.has(t.slug));
  const members = trips.flatMap((t) =>
    emails.map((email, i) => ({ slug: t.slug, email, role: i === 0 ? ("owner" as const) : ("member" as const) })),
  );
  return { users, trips, members };
}
