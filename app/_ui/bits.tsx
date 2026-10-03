import type { Category, Place } from "@/lib/content/types";

export const CATEGORY: Record<Category, { label: string; glyph: string; color: string }> = {
  art: { label: "Art & museums", glyph: "◆", color: "#97D8B2" },
  food: { label: "Restaurants", glyph: "●", color: "#F2B85A" },
  bar: { label: "Bars & nightlife", glyph: "▲", color: "#E7A1D9" },
  shop: { label: "Shopping", glyph: "■", color: "#A0ACAD" },
  tour: { label: "Tours", glyph: "✦", color: "#8FC1E3" },
  nature: { label: "Nature", glyph: "♣", color: "#97D8B2" },
  history: { label: "History", glyph: "♜", color: "#D9C38F" },
  festival: { label: "Festivals", glyph: "♪", color: "#E7A1D9" },
};

export function CategoryTag({ category }: { category: Category }) {
  const c = CATEGORY[category];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-mist">
      <span aria-hidden style={{ color: c.color }}>
        {c.glyph}
      </span>
      {c.label}
    </span>
  );
}

export function Thumb({ place, size = 56 }: { place: Place; size?: number }) {
  const img = place.images?.[0];
  const c = CATEGORY[place.category];
  if (!img) {
    return (
      <div
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-md bg-plum-deep text-lg"
        style={{ width: size, height: size, color: c.color }}
      >
        {c.glyph}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Wikimedia thumbnails, already sized
    <img
      src={img.thumb}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1">
      {items.map((w) => (
        <li key={w} className="rounded bg-amber/15 px-1.5 py-0.5 text-[11px] font-medium text-amber">
          {w}
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{children}</h1>
      {aside}
    </div>
  );
}
