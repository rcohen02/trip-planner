"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Cluster, Place, Trip } from "@/lib/content/types";
import { CATEGORY } from "./bits";

export default function TripMapClient({
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
  const [picked, setPicked] = useState<Place | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      map = L.map(el.current, { zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      const pts: [number, number][] = [[homebase.lat, homebase.lng]];
      L.marker([homebase.lat, homebase.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#97D8B2;color:#170312;font:700 12px/1 var(--font-figtree);padding:6px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 3px #170312">⌂ ${homebase.label}</div>`,
          iconAnchor: [40, 14],
        }),
        title: homebase.address,
      }).addTo(map);

      for (const p of places) {
        if (p.lat == null || p.lng == null) continue;
        pts.push([p.lat, p.lng]);
        const c = CATEGORY[p.category];
        const ring = clusters.find((k) => k.id === p.cluster)?.color ?? "#A0ACAD";
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:22px;height:22px;border-radius:999px;background:#33032F;border:2px solid ${ring};color:${c.color};display:flex;align-items:center;justify-content:center;font-size:11px">${c.glyph}</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          title: p.name,
          keyboard: true,
        })
          .on("click", () => setPicked(p))
          .addTo(map);
      }
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [homebase, places, clusters]);

  return (
    <div className="relative">
      <div ref={el} className="h-[calc(100dvh-14rem)] min-h-[420px] w-full overflow-hidden rounded-xl" aria-label="Map of places" />
      <ul className="mt-3 flex flex-wrap gap-4 text-sm text-mist" aria-label="Areas">
        {clusters.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2" style={{ borderColor: c.color }} aria-hidden />
            <span>
              <span className="text-paper">{c.name}</span>: {c.note}
            </span>
          </li>
        ))}
      </ul>
      {picked && (
        <div className="absolute inset-x-3 bottom-16 z-[1000] rounded-xl bg-plum-deep p-4 shadow-xl shadow-ink md:left-auto md:right-3 md:top-3 md:bottom-auto md:w-80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold leading-tight">{picked.name}</p>
              <p className="text-sm text-mist">{picked.location}</p>
            </div>
            <button onClick={() => setPicked(null)} aria-label="Close" className="text-mist hover:text-paper">
              ✕
            </button>
          </div>
          <p className="mt-2 line-clamp-3 text-sm">{picked.note}</p>
          <div className="mt-3 flex gap-4 text-sm">
            <a href={`${base}/places/${picked.id}`} className="text-mint">
              Details
            </a>
            {picked.mapsUrl && (
              <a href={picked.mapsUrl} target="_blank" rel="noreferrer" className="text-mint">
                Open in Maps
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
