import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getProfileRepo } from "@/lib/profile";
import { nextStep } from "@/lib/profile/setup";
import { importFromNotes, undoChange } from "./actions";
import { ProfileSections } from "./_parts";

const REASON = { manual: "You edited", import: "Imported", setup: "Setup", proposal: "From a trip" } as const;

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=/profile");
  const repo = getProfileRepo();
  const [profile, history] = await Promise.all([repo.get(viewer.email), repo.history(viewer.email)]);
  const latest = history.find((c) => !c.undone);
  const unfinished = profile && nextStep(profile) !== "review";

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pb-12 pt-4 sm:px-6 sm:pt-8">
      <Link href="/" className="tp-btn tp-btn--text self-start pl-0">
        ← Your trips
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tp-label m-0">{viewer.name} · used on every trip</p>
          <h1 className="t-title m-0 mt-1">Travel profile</h1>
        </div>
        {profile && (
          <Link href={`/profile/setup?step=${nextStep(profile)}`} className="tp-btn tp-btn--primary">
            {unfinished ? "Finish setup" : "Review it all"}
          </Link>
        )}
      </div>

      {!profile && (
        <>
          <p className="t-body m-0 text-ink-2">
            Your profile holds what stays true on every trip: who comes, your limits, what you love. Trips only ask what&apos;s new.
          </p>
          <section className="tp-card gap-3">
            <h2 className="t-heading m-0">Answer a few questions</h2>
            <p className="t-caption m-0">Six short questions. Takes about two minutes.</p>
            <Link href="/profile/setup?step=travelers" className="tp-btn tp-btn--primary self-start">
              Start setup
            </Link>
          </section>
          <ImportCard first />
        </>
      )}

      {profile && (
        <>
          {unfinished && (
            <div className="tp-alert tp-alert--info">
              <span>
                A few questions are still open. <Link href={`/profile/setup?step=${nextStep(profile)}`}>Answer them</Link>.
              </span>
            </div>
          )}
          <ProfileSections p={profile} />
          <section className="tp-card tp-card--compact gap-2">
            <h2 className="t-subheading m-0">History</h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {history.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
                  <span className={c.undone ? "min-w-0 text-ink-3 line-through" : "min-w-0"}>
                    {c.summary}
                    <span className="t-caption block">
                      {REASON[c.reason]} · {new Date(c.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </span>
                  {c.id === latest?.id && (
                    <form action={undoChange}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="tp-btn tp-btn--secondary">Undo</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <ImportCard />
        </>
      )}
    </main>
  );
}

function ImportCard({ first = false }: { first?: boolean }) {
  return (
    <details className="tp-card tp-card--compact" open={first}>
      <summary className="t-subheading flex min-h-[44px] cursor-pointer items-center">
        {first ? "Or import your travel notes" : "Replace from travel notes"}
      </summary>
      <form action={importFromNotes} className="mt-2 flex flex-col gap-3">
        <label className="tp-field">
          <span>Paste notes (like travel_context.md)</span>
          <textarea name="notes" required className="tp-input h-auto min-h-[180px] py-2.5 font-mono text-[13px] leading-5" />
          <span className="tp-help">I&apos;ll fill in what I can find, then ask only what&apos;s missing.{first ? "" : " Your current profile can be restored with Undo."}</span>
        </label>
        <button className="tp-btn tp-btn--secondary self-start">Import</button>
      </form>
    </details>
  );
}
