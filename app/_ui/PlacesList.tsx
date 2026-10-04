"use client";
import Link from "next/link";
import { useState } from "react";
import type { Category, Cluster, DayRule, Place } from "@/lib/content/types";
import type { Assignments, ExtraSlot } from "@/lib/plan/plan";
import { Alert, CATEGORY, HoursLine, StatusPill } from "./bits";
import { AddToDaySheet, usePlanAssignments } from "./AddToDay";

export function PlacesList({
  slug,
  base,
  places,
  clusters,
  days,
  assignments,
  extras,
  prices,
  editable,
}: {
  slug: string;
  base: string;
  places: Place[];
  clusters: Cluster[];
  days: DayRule[];
  assignments: Assignments;
  extras: ExtraSlot[];
  prices: Record<string, string>;
  editable: boolean;
}) {
  const [category, setCategory] = useState<Category | "">("");
  const [cluster, setCluster] = useState("");
  const [status, setStatus] = useState("");
  const { assignments: local, assign, unassign, error } = usePlanAssignments(slug, assignments);
  const [sheet, setSheet] = useState<Place | null>(null);
  const planned = new Set(Object.values(local).filter(Boolean) as string[]);
  const cats = [...new Set(places.map((p) => p.category))];
  const shown = places.filter(
    (p) =>
      (!category || p.category === category) &&
      (!cluster || p.cluster === cluster) &&
      (!status || (status === "planned") === planned.has(p.id)),
  );
  const clusterName = (id?: string | null) => clusters.find((c) => c.id === id)?.name.replace(" Lisbon", "") ?? "";

  return (
    <>
      {error && (
        <div className="mb-4">
          <Alert level="crit">{error}</Alert>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button className="tp-chip" aria-pressed={!category} onClick={() => setCategory("")}>
          All <span className="tp-count">{places.length}</span>
        </button>
        {cats.map((c) => (
          <button key={c} className={`tp-chip c-${c}`} aria-pressed={category === c} onClick={() => setCategory(category === c ? "" : c)}>
            <span className="tp-dot" aria-hidden />
            {CATEGORY[c].label} <span className="tp-count">{places.filter((p) => p.category === c).length}</span>
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="tp-field w-44">
          Area
          <select className="tp-input" value={cluster} onChange={(e) => setCluster(e.target.value)}>
            <option value="">All areas</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="tp-field w-44">
          Status
          <select className="tp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="want">Want</option>
            <option value="planned">Planned</option>
          </select>
        </label>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {shown.map((p) => (
          <li key={p.id} className="flex">
            <article className="tp-place flex-1">
              <div className="tp-place__photo">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="tp-ph h-full w-full" aria-hidden />
                )}
                {p.images && p.images.length > 1 && (
                  <div className="tp-dots" aria-hidden>
                    {p.images.map((_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                )}
              </div>
              <div className="tp-place__body">
                <Link className="tp-place__name" href={`${base}/places/${p.id}`}>
                  {p.name}
                </Link>
                <div className="tp-label-sm">
                  {p.location.split(",").pop()!.trim().toUpperCase()}
                  {p.cluster ? ` · ${clusterName(p.cluster).toUpperCase()}` : ""}
                </div>
                <div className="tp-num">{prices[p.id]}</div>
                <HoursLine place={p} />
                <div className="tp-place__foot">
                  <StatusPill planned={planned.has(p.id)} />
                  {editable && (
                    <button className="tp-btn tp-btn--secondary" style={{ fontSize: 13, padding: "0 12px" }} onClick={() => setSheet(p)}>
                      {planned.has(p.id) ? "Move" : "Add to day"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="t-caption">No places match these filters. Choose All to see everything.</p>}
      {sheet && (
        <AddToDaySheet
          place={sheet}
          days={days}
          extras={extras}
          assignments={local}
          onClose={() => setSheet(null)}
          onConfirm={(slotId) => {
            setSheet(null);
            assign(slotId, sheet.id);
          }}
          onRemove={() => {
            setSheet(null);
            unassign(sheet.id);
          }}
        />
      )}
    </>
  );
}
