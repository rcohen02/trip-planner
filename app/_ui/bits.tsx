import { Image as ImageIcon, Utensils, Wine, ShoppingBag, Flag, Trees, Castle, Music, Footprints, TriangleAlert, OctagonX, Clock, Check } from "lucide-react";
import type { Category, Place } from "@/lib/content/types";
import type { PlanWarning } from "@/lib/plan/plan";
import { hours12 } from "@/lib/format";

export const CATEGORY: Record<Category, { label: string; short: string; Icon: typeof ImageIcon }> = {
  art: { label: "Art & Museums", short: "Art", Icon: ImageIcon },
  food: { label: "Restaurants", short: "Food", Icon: Utensils },
  bar: { label: "Bars & Nightlife", short: "Bar", Icon: Wine },
  shop: { label: "Shopping", short: "Shop", Icon: ShoppingBag },
  tour: { label: "Tours", short: "Tour", Icon: Flag },
  nature: { label: "Nature", short: "Nature", Icon: Trees },
  history: { label: "History", short: "History", Icon: Castle },
  festival: { label: "Festivals", short: "Festival", Icon: Music },
  walk: { label: "Walks", short: "Walk", Icon: Footprints },
};

export function CategoryTag({ category }: { category: Category }) {
  const { label, Icon } = CATEGORY[category];
  return (
    <span className={`tp-cat c-${category}`}>
      <Icon className="tp-icon" aria-hidden />
      {label}
    </span>
  );
}

export function Thumb({ place, size = "sm" }: { place: Place; size?: "sm" | "md" }) {
  const img = place.images?.[0];
  const cls = `tp-thumb ${size === "md" ? "tp-thumb--md" : ""}`;
  if (!img && place.route)
    return (
      <div className={`${cls} tp-thumb--walk c-walk`} aria-hidden>
        <Footprints className="tp-icon tp-icon-lg" />
      </div>
    );
  if (!img) return <div className={`${cls} tp-ph`} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- Wikimedia thumbnails, already sized
  return <img src={img.thumb} alt="" loading="lazy" className={cls} />;
}

export function Alert({
  level,
  small = false,
  action,
  children,
}: {
  level: "warn" | "crit" | "info";
  small?: boolean;
  /** Optional button at the right edge (e.g. the ✓ on "Hours unconfirmed"). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const Icon = level === "warn" ? TriangleAlert : level === "crit" ? OctagonX : Clock;
  return (
    <div className={`tp-alert tp-alert--${level} ${small ? "tp-alert--sm" : ""}`} role={level === "crit" ? "alert" : undefined}>
      <Icon className="tp-icon" aria-hidden />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function WarningList({ items, small = true }: { items: PlanWarning[]; small?: boolean }) {
  return (
    <>
      {items.slice(0, 3).map((w) => (
        <Alert key={w.text} level={w.level} small={small}>
          {w.text}
        </Alert>
      ))}
    </>
  );
}

export function StatusPill({ planned }: { planned: boolean }) {
  // "Want" was replaced by the Shortlist toggle (Shortlist.tsx); unplanned places show nothing here.
  return planned ? <span className="tp-pill tp-pill--planned">Planned</span> : null;
}

export function HoursLine({ place }: { place: Place }) {
  if (place.route) return null; // walks have no opening hours
  if (place.hoursConfirmed && place.hours) {
    return (
      <span className="tp-ok inline-flex items-center gap-1">
        <Check className="tp-icon" aria-hidden />
        {hours12(place.hours)}
      </span>
    );
  }
  if (place.hoursConfirmed) return <span className="tp-ok">Hours confirmed</span>;
  return <span className="tp-unsure">Hours unconfirmed</span>;
}

export function PageTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="t-title m-0">{children}</h1>
      {aside}
    </div>
  );
}
