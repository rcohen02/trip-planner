import Link from "next/link";
import type { Answers, SetupStepId } from "@/lib/profile/setup";
import { FOOD_OPTIONS, HIKE_LEVELS, HIKES, INTEREST_OPTIONS, PARTY_OPTIONS, SCOPE_OPTIONS, TIERS, TRANSPORT_OPTIONS } from "@/lib/profile/options";
import { ageOn, type Profile } from "@/lib/profile/types";
import { BucketPicker } from "./BucketPicker";

const PACE_WORDS = { relaxed: "Relaxed", packed: "Packed", both: "Show both, labeled" } as const;
const word = <T extends string>(list: readonly { value: T; label: string }[], v: T | null) => list.find((o) => o.value === v)?.label;

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

function Pills({ items, tone = "want" }: { items: string[]; tone?: "want" | "planned" | "skipped" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className={`tp-pill tp-pill--${tone}`}>
          {x}
        </span>
      ))}
    </div>
  );
}

/** The profile as cards, one per section. `edit` adds an Edit link to each. */
export function ProfileSections({ p, edit = true }: { p: Profile; edit?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-3">
      <Section title="Who travels" step="travelers" edit={edit}>
        <div className="flex justify-between gap-2">
          <span className="font-semibold">{word(PARTY_OPTIONS, p.party) ?? "Not set"}</span>
          <span className="t-caption tp-num">
            {p.adults} {p.adults === 1 ? "adult" : "adults"}
            {p.travelers.length ? `, ${p.travelers.length} ${p.travelers.length === 1 ? "kid" : "kids"}` : ""}
          </span>
        </div>
        {p.travelers.map((t) => (
          <div key={t.id} className="flex justify-between gap-2">
            <span>{t.label}</span>
            <span className="t-caption tp-num">
              born {t.birthYear} · {ageOn(t.birthYear, today)} this year
            </span>
          </div>
        ))}
        {p.groups.length > 1 && <span className="t-caption">Groups: {p.groups.map((g) => g.name).join(", ")}</span>}
      </Section>

      <Section title="How you travel" step="limits" edit={edit}>
        <dl className="tp-dl m-0 border-0 pt-0">
          <dt>Getting around</dt>
          <dd>{p.limits.transport.length ? p.limits.transport.map((t) => word(TRANSPORT_OPTIONS, t)).join(", ") : "Not set"}</dd>
          <dt>Where</dt>
          <dd>{word(SCOPE_OPTIONS, p.limits.scope) ?? "Not set"}</dd>
          <dt>Radius</dt>
          <dd>{p.limits.driveMinutes != null ? `${p.limits.driveMinutes}-min drive from the house` : "Not set"}</dd>
        </dl>
      </Section>

      <Section title="What makes a trip great" step="interests" edit={edit}>
        {p.interests.length === 0 && <Empty>None yet.</Empty>}
        {TIERS.map((t) => {
          const items = p.interests.filter((i) => i.tier === t.value);
          if (!items.length) return null;
          return (
            <div key={t.value} className="flex flex-col gap-1.5">
              <span className="tp-label">{t.label}</span>
              <Pills items={items.map((i) => (i.name === HIKES && i.detail ? `${i.name} · ${i.detail}` : i.name))} tone={t.value === "must" ? "planned" : "want"} />
            </div>
          );
        })}
      </Section>

      <Section title="Food" step="food" edit={edit}>
        <div className="flex flex-col gap-1.5">
          <span className="tp-label">Love</span>
          {p.food.loves.length ? <Pills items={p.food.loves} tone="planned" /> : <Empty>Nothing yet.</Empty>}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="tp-label">Hate</span>
          {p.food.hates.length ? <Pills items={p.food.hates} tone="skipped" /> : <Empty>Nothing.</Empty>}
        </div>
        {p.food.localFirst && <span className="t-caption">Neighborhood spots over tourist restaurants</span>}
      </Section>

      <Section title="Pace" step="pace" edit={edit}>
        <span>{p.pace ? PACE_WORDS[p.pace] : "Not set"}</span>
      </Section>

      <Section title="Additional notes" step="avoid" edit={edit}>
        <span className="tp-label">Never suggest</span>
        {p.avoid.length === 0 && <Empty>Nothing yet.</Empty>}
        <ul className="m-0 flex flex-col gap-1 pl-5">
          {p.avoid.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
        {p.specialRequests && (
          <div className="flex flex-col gap-0.5 border-t border-line pt-2">
            <span className="tp-label">Special requests</span>
            <span className="whitespace-pre-line">{p.specialRequests}</span>
          </div>
        )}
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

/** A row of buttons backed by radio inputs (one choice) or checkboxes (any). Works without JavaScript. */
function ChoiceRow({
  name,
  legend,
  options,
  value,
  multiple = false,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  value: string | undefined;
  multiple?: boolean;
}) {
  const chosen = new Set((value ?? "").split("\n").filter(Boolean));
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="tp-label mb-2 p-0">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="tp-chip has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]"
          >
            <input type={multiple ? "checkbox" : "radio"} name={name} value={o.value} defaultChecked={chosen.has(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const area = "tp-input h-auto min-h-[112px] py-2.5 leading-5";
const linesOf = (v: string | undefined) => (v ?? "").split("\n").filter(Boolean);

/** Form fields for one setup step, pre-filled with `v` (lib/profile/setup formValues). */
export function StepFields({ step, v }: { step: SetupStepId; v: Answers }) {
  switch (step) {
    case "travelers":
      return (
        <>
          <ChoiceRow name="party" legend="Usually" options={PARTY_OPTIONS} value={v.party} />
          <Field label="Adults">
            <input className="tp-input w-28" name="adults" type="number" min={1} max={12} defaultValue={v.adults} required />
          </Field>
          <Field label="Kids, one per line" help="A name or “Boy”, then the year they were born. Leave empty if no kids.">
            <textarea className={area} name="kids" defaultValue={v.kids} placeholder={"Boy 2016\nGirl 2019"} />
          </Field>
        </>
      );
    case "limits":
      return (
        <>
          <ChoiceRow name="transport" legend="Getting around" options={TRANSPORT_OPTIONS} value={v.transport} multiple />
          <ChoiceRow name="scope" legend="Where" options={SCOPE_OPTIONS} value={v.scope} />
          <Field label="Farthest drive from the house (minutes)">
            <input className="tp-input w-28" name="driveMinutes" type="number" min={1} max={1440} defaultValue={v.driveMinutes} />
          </Field>
        </>
      );
    case "interests":
      return (
        <BucketPicker
          id="interests"
          buckets={TIERS.map((t) => ({ key: t.value, label: t.label }))}
          options={INTEREST_OPTIONS}
          picked={{ must: linesOf(v.must), fit: linesOf(v.fit), pass: linesOf(v.pass) }}
          followUp={{ item: HIKES, name: "hikeLevel", question: "How hard a hike?", options: HIKE_LEVELS, value: v.hikeLevel ?? "" }}
          poolLabel="Ideas"
          writeInLabel="Something else?"
        />
      );
    case "food":
      return (
        <>
          <BucketPicker
            id="food"
            buckets={[
              { key: "love", label: "Love" },
              { key: "hate", label: "Hate", hint: "Includes anything you can't eat." },
            ]}
            options={FOOD_OPTIONS}
            picked={{ love: linesOf(v.love), hate: linesOf(v.hate) }}
            poolLabel="Foods"
            writeInLabel="Something else?"
          />
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
        <>
          <Field label="Never suggest, one per line">
            <textarea className={area} name="avoid" defaultValue={v.avoid} placeholder={"Theme parks\nHeadline attractions when a local option exists"} />
          </Field>
          <Field label="Any special requests?" help="Anything else I should know, in your own words.">
            <textarea className={area} name="specialRequests" maxLength={2000} defaultValue={v.specialRequests} placeholder="Stroller-friendly, quiet mornings, a pool day…" />
          </Field>
        </>
      );
    case "review":
      return null;
  }
}
