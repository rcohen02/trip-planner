import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, signOut } from "@/auth";
import { listAllTrips, listTripsFor } from "@/lib/trips";
import { dateLabel } from "@/lib/format";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  const trips = viewer.dev ? await listAllTrips() : await listTripsFor(viewer.email);
  return (
    <main className="mx-auto max-w-[720px] px-4 py-10 sm:px-6">
      <p className="tp-label m-0">T2T · Time 2 Travel</p>
      <h1 className="t-title mt-1">Your trips</h1>
      <ul className="tp-col m-0 mt-5 list-none p-0">
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
