"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Category, Cluster, Place, Trip } from "@/lib/content/types";
import { CATEGORY } from "./bits";

const HOUSE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

export default function TripMap({
  base,
  homebase,
  places,
  clusters,
}: {
  base: string;
  homebase: Trip["homebase"];
  places: Place[];
  clusters: Cluster[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const layers = useRef<Map<Category, import("leaflet").LayerGroup>>(new Map());
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const [picked, setPicked] = useState<Place | null>(null);
  const cats = [...new Set(places.map((p) => p.category))];
  const [hidden, setHidden] = useState<Set<Category>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      const map = L.map(el.current);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      const pts: [number, number][] = [[homebase.lat, homebase.lng]];
      L.marker([homebase.lat, homebase.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:34px;height:34px;border-radius:17px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)">${HOUSE_SVG}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        title: `${homebase.label}: ${homebase.address}`,
        zIndexOffset: 1000,
      }).addTo(map);
      for (const p of places) {
        if (p.lat == null || p.lng == null) continue;
        pts.push([p.lat, p.lng]);
        let group = layers.current.get(p.category);
        if (!group) {
          group = L.layerGroup().addTo(map);
          layers.current.set(p.category, group);
        }
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: "", html: `<div class="tp-pin c-${p.category}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
          title: `${p.name} (${CATEGORY[p.category].label})`,
          keyboard: true,
        })
          .on("click", () => setPicked(p))
          .addTo(group);
      }
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
    })();
    const groups = layers.current;
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      groups.clear();
    };
  }, [homebase, places]);

  function toggle(c: Category) {
    const next = new Set(hidden);
    const g = layers.current.get(c);
    const m = mapRef.current;
    if (next.has(c)) {
      next.delete(c);
      if (g && m) g.addTo(m);
    } else {
      next.add(c);
      if (g && m) m.removeLayer(g);
    }
    setHidden(next);
  }

  return (
    <div className="flex flex-col gap-5 min-[960px]:flex-row">
      <aside className="tp-col min-[960px]:order-2 min-[960px]:w-[300px] min-[960px]:shrink-0" aria-label="Map legend">
        <div className="tp-card tp-card--compact">
          <h2 className="t-heading m-0">Show on map</h2>
          <div className="flex flex-wrap gap-2 min-[960px]:flex-col">
            {cats.map((c) => (
              <button key={c} className={`tp-chip c-${c} justify-start`} aria-pressed={!hidden.has(c)} onClick={() => toggle(c)}>
                <span className="tp-dot" aria-hidden />
                {CATEGORY[c].label}
                <span className="tp-count">{places.filter((p) => p.category === c).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tp-card tp-card--compact">
          <h2 className="t-heading m-0">Areas</h2>
          <ul className="tp-col m-0 list-none p-0" style={{ gap: 8 }}>
            {clusters.map((c) => (
              <li key={c.id}>
                <span className="t-subheading">{c.name}</span>
                <span className="t-caption block">
                  {c.note} · {places.filter((p) => p.cluster === c.id).length} places
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="relative min-w-0 flex-1">
        <div
          ref={el}
          className="h-[60dvh] min-h-[420px] w-full overflow-hidden min-[960px]:h-[calc(100dvh-12rem)]"
          style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--line)" }}
          aria-label="Map of places and the house"
        />
        {picked && (
          <div
            className="tp-card tp-card--compact absolute inset-x-3 bottom-3 z-[1000] sm:left-auto sm:right-3 sm:top-3 sm:bottom-auto sm:w-80"
            style={{ boxShadow: "var(--shadow-sheet)", background: "var(--surface-raised)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="t-subheading m-0">{picked.name}</p>
                <p className="t-caption m-0">{picked.location}</p>
              </div>
              <button onClick={() => setPicked(null)} className="tp-btn tp-btn--text" aria-label="Close">
                Close
              </button>
            </div>
            <p className="m-0 line-clamp-3 text-sm text-ink-2">{picked.note}</p>
            <div className="flex gap-2">
              <a className="tp-btn tp-btn--primary" href={`${base}/places/${picked.id}`}>
                Details
              </a>
              {picked.mapsUrl && (
                <a className="tp-btn tp-btn--secondary" href={picked.mapsUrl} target="_blank" rel="noreferrer">
                  Open in Maps
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
