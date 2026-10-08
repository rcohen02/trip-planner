import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, signOut } from "@/auth";
import { listAllTrips, listTripsFor } from "@/lib/trips";
import { getProfileRepo } from "@/lib/profile";
import { nextStep } from "@/lib/profile/setup";
import { getDraftRepo } from "@/lib/newtrip";
import { dateLabel } from "@/lib/format";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  const [trips, profile, draft] = await Promise.all([
    viewer.dev ? listAllTrips() : listTripsFor(viewer.email),
    getProfileRepo().get(viewer.email),
    getDraftRepo().get(viewer.email),
  ]);
  const setupLeft = profile && nextStep(profile) !== "review";
  return (
    <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tp-label m-0">T2T · Time 2 Travel</p>
          <h1 className="t-title mt-1">Your trips</h1>
        </div>
        <Link href="/profile" className="tp-btn tp-btn--secondary">
          Profile
        </Link>
      </div>

      <Link
        href="/new"
        className="tp-btn tp-btn--primary mt-5 min-h-[56px] w-full justify-start gap-3 px-4 text-base font-semibold"
      >
        <svg className="tp-icon tp-icon-lg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M12 5v14" />
        </svg>
        <span className="flex-1">{draft?.destination ? `Continue your ${draft.destination.label.split(",")[0]} trip` : "Start a new itinerary"}</span>
      </Link>

      <section className="tp-card tp-card--compact mt-4 gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="tp-label">Your travel profile</span>
          <Link href="/profile" className="tp-btn tp-btn--text">
            {profile ? "Edit" : "Set up"}
          </Link>
        </div>
        {profile ? (
          <>
            <span className="t-subheading">
              {profile.groups.length} {profile.groups.length === 1 ? "group" : "groups"} · {profile.interests.length}{" "}
              {profile.interests.length === 1 ? "interest" : "interests"}
              {profile.limits.driveMinutes != null ? ` · ${profile.limits.driveMinutes}-min radius` : ""}
            </span>
            <span className="t-caption">
              {profile.groups.map((g) => g.name).join(", ") || "No groups yet"}
              {setupLeft ? " · a few questions still open" : ""}
            </span>
          </>
        ) : (
          <span className="t-caption">Set it up once: who comes, your limits, what you love. Trips then only ask what&apos;s new.</span>
        )}
      </section>

      <p className="tp-label m-0 mt-6">Trips</p>
      <ul className="tp-col m-0 mt-2 list-none p-0">
        {trips.map((t) => (
          <li key={t.slug}>
            <Link href={`/t/${t.slug}`} className="tp-card flex-row items-center justify-between text-ink no-underline">
              <span>
                <span className="t-heading block">{t.name}</span>
                <span className="t-caption">
                  {dateLabel(t.days[0].date)} – {dateLabel(t.days[t.days.length - 1].date)} · {t.travelers.map((x) => x.name).join(" & ")}
                </span>
              </span>
              <span className="tp-btn tp-btn--primary">Open</span>
            </Link>
          </li>
        ))}
      </ul>
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button className="tp-btn tp-btn--text">Sign out {viewer.email}</button>
      </form>
    </main>
  );
}
