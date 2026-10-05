"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import type { Place } from "@/lib/content/types";
import { setShortlisted } from "@/app/t/[slug]/actions";

/**
 * The Shortlist toggle (replaced "Want"). One hook per page component keeps an optimistic copy,
 * so a tap shows at once and every list on that page agrees.
 */
export function useShortlist(slug: string, places: Place[]) {
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const is = (p: Pick<Place, "id" | "shortlisted">) => (p.id in override ? override[p.id] : Boolean(p.shortlisted));
  async function toggle(p: Pick<Place, "id" | "shortlisted">) {
    const next = !is(p);
    setError(null);
    setOverride((o) => ({ ...o, [p.id]: next }));
    try {
      await setShortlisted(slug, p.id, next);
    } catch {
      setOverride((o) => ({ ...o, [p.id]: !next }));
      setError("That didn't save. Check your connection and try again.");
    }
  }
  /** Places with the current shortlist state applied. */
  const withState = <T extends Place>(list: T[]): T[] => list.map((p) => (p.id in override ? { ...p, shortlisted: override[p.id] } : p));
  const count = places.filter(is).length;
  return { is, toggle, withState, count, error };
}

/** "☆ Shortlist" (off) / "★ Shortlisted" (on, highlighted). Read-only viewers see it only when on. */
export function ShortlistToggle({
  on,
  name,
  editable,
  onToggle,
  compact = false,
}: {
  on: boolean;
  name: string;
  editable: boolean;
  onToggle: () => void;
  /** Icon only, for tight rows. */
  compact?: boolean;
}) {
  if (!editable && !on) return null;
  return (
    <button
      type="button"
      className={`tp-short ${compact ? "tp-short--icon" : ""}`}
      aria-pressed={on}
      disabled={!editable}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={on ? `Remove ${name} from the shortlist` : `Add ${name} to the shortlist`}
      title={on ? "On your shortlist" : "Add to shortlist"}
    >
      <Star className={`tp-icon ${on ? "is-filled" : ""}`} aria-hidden />
      {!compact && (on ? "Shortlisted" : "Shortlist")}
    </button>
  );
}

/** "★ Shortlist only" filter button for lists you pick from. */
export function ShortlistFilter({ on, count, onChange }: { on: boolean; count: number; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="tp-chip" aria-pressed={on} onClick={() => onChange(!on)} disabled={!count && !on} title={count ? undefined : "Nothing on the shortlist yet"}>
      <Star className={`tp-icon ${on ? "is-filled" : ""}`} aria-hidden />
      Shortlist only <span className="tp-count">{count}</span>
    </button>
  );
}

/** The toggle on its own, for server-rendered pages (the place page). */
export function ShortlistButton({ slug, place, editable }: { slug: string; place: Place; editable: boolean }) {
  const short = useShortlist(slug, [place]);
  return <ShortlistToggle on={short.is(place)} name={place.name} editable={editable} onToggle={() => short.toggle(place)} />;
}
