import Link from "next/link";
import type { Answers, SetupStepId } from "@/lib/profile/setup";
import { ageOn, type Profile } from "@/lib/profile/types";

const PACE_WORDS = { relaxed: "Relaxed", packed: "Packed", both: "Show both, labeled" } as const;

function Section({ title, step, edit, children }: { title: string; step: SetupStepId; edit: boolean; children: React.ReactNode }) {
  return (
    <section className="tp-card tp-card--compact gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-subheading m-0">{title}</h2>
        {edit && (
          <Link href={`/profile/setup?step=${step}&mode=edit`} className="tp-btn tp-btn--text" aria-label={`Edit ${title.toLowerCase()}`}>
            Edit
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="t-caption m-0">{children}</p>;

/** The profile as cards, one per section. `edit` adds an Edit link to each. */
export function ProfileSections({ p, edit = true }: { p: Profile; edit?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-3">
      <Section title="Travelers" step="travelers" edit={edit}>
        <div className="flex justify-between gap-2">
          <span>Adults</span>
          <span className="t-caption tp-num">{p.adults}</span>
        </div>
        {p.travelers.map((t) => (
          <div key={t.id} className="flex justify-between gap-2">
            <span>{t.label}</span>
            <span className="t-caption tp-num">
              born {t.birthYear} · {ageOn(t.birthYear, today)} this year
            </span>
          </div>
        ))}
      </Section>

      <Section title="Groups" step="travelers" edit={false}>
        {p.groups.length === 0 && <Empty>Set up travelers to get groups like “Whole family”.</Empty>}
        {p.groups.map((g, i) => (
          <div key={g.id} className={i ? "flex flex-col gap-0.5 border-t border-line pt-2" : "flex flex-col gap-0.5"}>
            <span className="font-semibold">{g.name}</span>
            <span className="t-caption">
              {p.adults} {p.adults === 1 ? "adult" : "adults"}
              {g.travelerIds.length ? `, ${g.travelerIds.length} ${g.travelerIds.length === 1 ? "kid" : "kids"}` : ""}
              {g.hikingMilesPerDay != null ? ` · hikes under ${g.hikingMilesPerDay} mi a day` : " · no hiking cap"}
            </span>
          </div>
        ))}
      </Section>

      <Section title="Limits" step="limits" edit={edit}>
        <dl className="tp-dl m-0 border-0 pt-0">
          <dt>Radius</dt>
          <dd>{p.limits.driveMinutes != null ? `${p.limits.driveMinutes}-min drive from the house` : "Not set"}</dd>
          <dt>Lodging</dt>
          <dd>{p.limits.neverHotels ? "Always a house. Never suggest hotels." : "Any"}</dd>
        </dl>
      </Section>

      <Section title="Interests, ranked" step="interests" edit={edit}>
        {p.interests.length === 0 && <Empty>None yet.</Empty>}
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {p.interests.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="tp-num w-4 text-ink-3">{i + 1}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">{it.name}</span>
                {it.detail && <span className="t-caption">{it.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Food" step="food" edit={edit}>
        <dl className="tp-dl m-0 border-0 pt-0">
          <dt>Can&apos;t eat</dt>
          <dd>{p.food.restrictions.length ? p.food.restrictions.join(", ") : "No restrictions"}</dd>
          <dt>Favorites</dt>
          <dd>{p.food.favorites.length ? p.food.favorites.join(", ") : "None yet"}</dd>
          <dt>Rule</dt>
          <dd>{p.food.localFirst ? "Neighborhood spots over tourist restaurants" : "None"}</dd>
        </dl>
      </Section>

      <Section title="Pace" step="pace" edit={edit}>
        <span>{p.pace ? PACE_WORDS[p.pace] : "Not set"}</span>
      </Section>

      <Section title="Never suggest" step="avoid" edit={edit}>
        {p.avoid.length === 0 && <Empty>Nothing yet.</Empty>}
        <ul className="m-0 flex flex-col gap-1 pl-5">
          {p.avoid.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Section>
    </div>
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

const area = "tp-input h-auto min-h-[112px] py-2.5 leading-5";

/** Form fields for one setup step, pre-filled with `v` (lib/profile/setup formValues). */
export function StepFields({ step, v }: { step: SetupStepId; v: Answers }) {
  switch (step) {
    case "travelers":
      return (
        <>
          <Field label="Adults">
            <input className="tp-input w-28" name="adults" type="number" min={1} max={12} defaultValue={v.adults} required />
          </Field>
          <Field label="Kids, one per line" help="A name or “Boy”, then the year they were born. Leave empty if no kids.">
            <textarea className={area} name="kids" defaultValue={v.kids} placeholder={"Boy 2016\nGirl 2019"} />
          </Field>
          <Field label="Daily hiking cap with kids (miles)" help="Leave empty for no cap.">
            <input className="tp-input w-28" name="hikingCap" type="number" min={0} max={50} step="0.5" defaultValue={v.hikingCap} />
          </Field>
        </>
      );
    case "limits":
      return (
        <>
          <Field label="Farthest drive from the house (minutes)">
            <input className="tp-input w-28" name="driveMinutes" type="number" min={1} max={1440} defaultValue={v.driveMinutes} />
          </Field>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5">
            <input type="checkbox" name="neverHotels" defaultChecked={v.neverHotels === "on"} className="h-5 w-5 accent-[var(--accent)]" />
            <span>We always have a house. Never suggest hotels.</span>
          </label>
        </>
      );
    case "interests":
      return (
        <Field label="Interests, most important first" help="One per line. Add details after a dash: “Ruins — climbable, not glass cases”.">
          <textarea className={`${area} min-h-[160px]`} name="interests" defaultValue={v.interests} placeholder={"Land art — sculpture parks\nRuins — climbable\nFestivals"} />
        </Field>
      );
    case "food":
      return (
        <>
          <Field label="Anything you can't eat" help="Separate with commas. Leave empty for none.">
            <input className="tp-input" name="restrictions" defaultValue={v.restrictions} placeholder="vegetarian, no shellfish" />
          </Field>
          <Field label="Favorites to look for" help="Separate with commas.">
            <input className="tp-input" name="favorites" defaultValue={v.favorites} placeholder="Seafood" />
          </Field>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5">
            <input type="checkbox" name="localFirst" defaultChecked={v.localFirst === "on"} className="h-5 w-5 accent-[var(--accent)]" />
            <span>Neighborhood spots over tourist restaurants</span>
          </label>
        </>
      );
    case "pace":
      return (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">Pace</legend>
          {(
            [
              ["relaxed", "Relaxed", "Fewer stops, room to linger."],
              ["packed", "Packed", "More stops, more ground covered."],
              ["both", "Show both", "Draft both and label them."],
            ] as const
          ).map(([value, name, detail]) => (
            <label key={value} className="tp-card tp-card--compact cursor-pointer flex-row items-start gap-3 has-[:checked]:border-2 has-[:checked]:border-accent">
              <input type="radio" name="pace" value={value} defaultChecked={v.pace === value} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{name}</span>
                <span className="t-caption">{detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
      );
    case "avoid":
      return (
        <Field label="Never suggest, one per line">
          <textarea className={area} name="avoid" defaultValue={v.avoid} placeholder={"Theme parks\nHeadline attractions when a local option exists"} />
        </Field>
      );
    case "review":
      return null;
  }
}
