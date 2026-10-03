"use client";
import Link from "next/link";
import { useState } from "react";
import type { Category, Cluster, Place } from "@/lib/content/types";
import { CATEGORY, Thumb } from "./bits";

export function PlacesList({
  base,
  places,
  clusters,
  planned,
  money,
}: {
  base: string;
  places: Place[];
  clusters: Cluster[];
  planned: string[];
  money: Record<string, string>;
}) {
  const [category, setCategory] = useState<Category | "">("");
  const [cluster, setCluster] = useState("");
  const cats = [...new Set(places.map((p) => p.category))];
  const shown = places.filter((p) => (!category || p.category === category) && (!cluster || p.cluster === cluster));
  const plannedSet = new Set(planned);

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Chip on={!category} onClick={() => setCategory("")}>
          All
        </Chip>
        {cats.map((c) => (
          <Chip key={c} on={category === c} onClick={() => setCategory(c)}>
            <span style={{ color: CATEGORY[c].color }} aria-hidden>
              {CATEGORY[c].glyph}
            </span>{" "}
            {CATEGORY[c].label}
          </Chip>
        ))}
        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className="ml-auto rounded-full border border-plum bg-ink px-3 py-1.5 text-sm"
          aria-label="Area"
        >
          <option value="">All areas</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`${base}/places/${p.id}`} className="group block overflow-hidden rounded-xl bg-plum-deep hover:ring-1 hover:ring-mint/60">
              <div className="aspect-[16/9] bg-plum/40">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl" style={{ color: CATEGORY[p.category].color }} aria-hidden>
                    {CATEGORY[p.category].glyph}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-bold leading-tight group-hover:text-mint">{p.name}</h2>
                  {plannedSet.has(p.id) && <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-xs text-mint">Planned</span>}
                </div>
                <p className="mt-1 text-sm text-mist">{p.location}</p>
                <p className="mt-2 line-clamp-2 text-sm">{p.note}</p>
                <p className="tabular mt-2 text-sm text-mist">{money[p.id]}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className="rounded-full border border-plum px-3 py-1.5 text-sm text-mist aria-pressed:border-mint aria-pressed:text-paper"
    >
      {children}
    </button>
  );
}

export { Thumb };
