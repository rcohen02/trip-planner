export function isAllowed(email: string | null | undefined, list: string | undefined): boolean {
  if (!email || !list) return false;
  const allowed = list.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/** Local development without Google credentials: treat the viewer as signed in. Never in production. */
export function devBypass(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "development" && !env.AUTH_GOOGLE_ID;
}
