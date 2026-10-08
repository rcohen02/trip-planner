import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { getProfileRepo } from "@/lib/profile";
import { getDraftRepo } from "@/lib/newtrip";
import { countryInfo } from "@/lib/newtrip/build";
import { emptyDraft, nextTripStep, TRIP_STEPS, tripFormValues, tripStepAnswered, type TripDraft, type TripStepId } from "@/lib/newtrip/steps";
import { TRANSPORT_OPTIONS } from "@/lib/profile/options";
import type { Profile } from "@/lib/profile/types";
import { dateLabel } from "@/lib/format";
import { ChoiceRow } from "../profile/_parts";
import { createTrip, discardDraft, saveStay, saveTripStep, saveWhere } from "./actions";

const nights = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

export default async function NewTrip({ searchParams }: { searchParams: Promise<{ step?: string; mode?: string; error?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=/new");
  const profile = await getProfileRepo().get(viewer.email);
  if (!profile || profile.groups.length === 0) redirect("/profile/setup?next=/new");
  const params = await searchParams;
  const draft = (await getDraftRepo().get(viewer.email)) ?? emptyDraft();
  const want = TRIP_STEPS.some((s) => s.id === params.step) ? (params.step as TripStepId) : nextTripStep(draft);
  // Steps that depend on an earlier answer wait for it.
  const step: TripStepId = want === "stay" && !draft.destination ? "where" : want === "review" && nextTripStep(draft) !== "review" ? nextTripStep(draft) : want;
  const edit = params.mode === "edit";
  const info = TRIP_STEPS.find((s) => s.id === step)!;
  const questions = TRIP_STEPS.filter((s) => s.id !== "review");
  const index = questions.findIndex((s) => s.id === step);
  const answered = questions.filter((s) => tripStepAnswered(draft, s.id)).length;
  const v = tripFormValues(draft, step);
  if (step === "different" && !draft.confirmed.includes("different")) v.transport = profile.limits.transport.join("\n");
  const action = step === "where" ? saveWhere : step === "stay" ? saveStay : step === "review" ? createTrip : saveTripStep;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-2 py-2">
        <Link href="/" className="tp-btn tp-btn--text" aria-label="Close. Your answers are saved">
          ✕ Close
        </Link>
        <span className="tp-label">{step === "review" ? "New trip · read-back" : edit ? "New trip · change" : `New trip · ${index + 1} of ${questions.length}`}</span>
        <span className="w-[72px]" aria-hidden />
      </div>
      {!edit && (
        <div className="mx-4 mt-3 h-1 overflow-hidden rounded-sm bg-sunken" aria-hidden>
          <div className="h-full rounded-sm bg-accent" style={{ width: `${Math.round((answered / questions.length) * 100)}%` }} />
        </div>
      )}

      <form action={action} className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-5">
        <input type="hidden" name="step" value={step} />
        {edit && <input type="hidden" name="mode" value="edit" />}
        <h1 className="m-0 text-[28px] font-bold leading-[34px] tracking-[-0.01em]">{info.question}</h1>
        <p className="t-caption m-0">{info.hint}</p>
        {params.error && (
          <div className="tp-alert tp-alert--warn" role="alert">
            {params.error}
          </div>
        )}

        {step === "review" ? <ReadBack draft={draft} profile={profile} /> : <Fields step={step} v={v} draft={draft} profile={profile} />}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button className="tp-btn tp-btn--primary min-h-[52px] text-base font-semibold">
            {step === "review" ? "Yes, create the trip" : edit ? "Save" : "Next"}
          </button>
          {step === "review" && (
            <button formAction={discardDraft} className="tp-btn tp-btn--text">
              Start over
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="tp-field">
      <span>{label}</span>
      {children}
      {help && <span className="tp-help">{help}</span>}
    </label>
  );
}

function Fields({ step, v, draft, profile }: { step: TripStepId; v: Record<string, string | undefined>; draft: TripDraft; profile: Profile }) {
  switch (step) {
    case "where":
      return (
        <Field label="Destination" help="Add the country if the name is common.">
          <input className="tp-input" name="destination" defaultValue={v.destination} placeholder="Lisbon, Portugal" required autoComplete="off" />
        </Field>
      );
    case "when":
      return (
        <div className="flex flex-wrap gap-3">
          <Field label="First day">
            <input className="tp-input" type="date" name="start" defaultValue={v.start} required />
          </Field>
          <Field label="Last day">
            <input className="tp-input" type="date" name="end" defaultValue={v.end} required />
          </Field>
        </div>
      );
    case "who":
      return (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">Who's coming</legend>
          {profile.groups.map((g) => {
            const kids = profile.travelers.filter((t) => g.travelerIds.includes(t.id));
            return (
              <label key={g.id} className="tp-card tp-card--compact cursor-pointer flex-row items-start gap-3 has-[:checked]:border-2 has-[:checked]:border-accent">
                <input type="radio" name="groupId" value={g.id} defaultChecked={v.groupId === g.id} required className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{g.name}</span>
                  <span className="t-caption">
                    {profile.adults} {profile.adults === 1 ? "adult" : "adults"}
                    {kids.length ? ` · ${kids.map((k) => k.label).join(", ")}` : ""}
                  </span>
                </span>
              </label>
            );
          })}
          <Link href="/profile/setup?step=travelers&mode=edit" className="tp-btn tp-btn--text self-start">
            Change groups in your profile
          </Link>
        </fieldset>
      );
    case "stay":
      return (
        <>
          <Field label="Address" help={`In or near ${draft.destination?.label ?? "your destination"}.`}>
            <input className="tp-input" name="address" defaultValue={v.address} placeholder="Rua da Giribita 1, Paço de Arcos" required autoComplete="off" />
          </Field>
          <Field label="What to call it (optional)">
            <input className="tp-input" name="label" defaultValue={v.label} placeholder="The house" maxLength={80} />
          </Field>
        </>
      );
    case "different":
      return (
        <>
          <ChoiceRow name="transport" legend="Getting around this trip" options={TRANSPORT_OPTIONS} value={v.transport} multiple />
          <Field label="Anything else for this trip?" help="Only this trip. Leave empty if nothing's different.">
            <textarea
              className="tp-input h-auto min-h-[112px] py-2.5 leading-5"
              name="overrides"
              maxLength={2000}
              defaultValue={v.overrides}
              placeholder="Focus on food, one rainy-day plan, a birthday dinner Saturday…"
            />
          </Field>
        </>
      );
    case "plan":
      return (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">How to plan the days</legend>
          {(
            [
              ["draft", "Draft the days for me", "A day-by-day plan that respects opening hours and travel time. You edit from there."],
              ["build", "Just fill Places", "Suggestions wait in Places. You build the days yourself."],
            ] as const
          ).map(([value, name, detail]) => (
            <label key={value} className="tp-card tp-card--compact cursor-pointer flex-row items-start gap-3 has-[:checked]:border-2 has-[:checked]:border-accent">
              <input type="radio" name="plan" value={value} defaultChecked={v.plan === value} required className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{name}</span>
                <span className="t-caption">{detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
      );
    case "review":
      return null;
  }
}

function ReadBack({ draft, profile }: { draft: TripDraft; profile: Profile }) {
  const group = profile.groups.find((g) => g.id === draft.groupId);
  const info = draft.destination ? countryInfo(draft.destination.countryCode) : null;
  const row = (step: TripStepId, label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="tp-label">{label}</span>
        <span>{value}</span>
      </span>
      <Link href={`/new?step=${step}&mode=edit`} className="tp-btn tp-btn--text shrink-0" aria-label={`Change ${label.toLowerCase()}`}>
        Change
      </Link>
    </div>
  );
  return (
    <>
      <section className="tp-card tp-card--compact gap-0">
        {row("where", "Where", draft.destination?.label)}
        {row(
          "when",
          "When",
          draft.start && draft.end ? `${dateLabel(draft.start)} – ${dateLabel(draft.end)} · ${nights(draft.start, draft.end) + 1} days` : "",
        )}
        {row("who", "Who", group?.name ?? "")}
        {row(
          "stay",
          "Staying",
          <>
            {draft.homebase?.label}
            <span className="t-caption block">{draft.homebase?.address}</span>
          </>,
        )}
        {row(
          "different",
          "This trip",
          <>
            {draft.transport.length ? draft.transport.map((t) => TRANSPORT_OPTIONS.find((o) => o.value === t)?.label).join(" and ") : "Getting around: not set"}
            {draft.overrides && <span className="t-caption block whitespace-pre-line">{draft.overrides}</span>}
          </>,
        )}
        {row("plan", "Days", draft.plan === "draft" ? "Draft them for me" : "I'll build them")}
      </section>
      {draft.homebase && !draft.homebase.found && (
        <div className="tp-alert tp-alert--warn">I couldn&apos;t find that address on the map, so the house pin sits in the city center for now.</div>
      )}
      <p className="t-caption m-0">
        {info ? `Times in ${info.timezone.split("/").pop()!.replace(/_/g, " ")} time, prices in ${info.currency} and USD. ` : ""}
        Places start empty. Suggestions come in the next update.
      </p>
    </>
  );
}
