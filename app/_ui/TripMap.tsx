"use client";
import { useEffect, useRef, useState } from "react";
import type { Stay } from "@/lib/stays";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { Category, Cluster, DayRule, Place, Trip } from "@/lib/content/types";
import { clusterSize } from "@/lib/map/cluster";
import { visibleCategories, type Assignments, type SlotLayout } from "@/lib/plan/plan";
import { Alert, CATEGORY, StatusPill } from "./bits";
import { ShortlistFilter, ShortlistToggle, useShortlist } from "./Shortlist";
import { AddToDaySheet, usePlanAssignments, usePlanBookings } from "./AddToDay";
import { bookingTime, type Booking } from "@/lib/plan/booking";
import { dateLabel } from "@/lib/format";

const HOUSE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

/** A category-coloured pin; the ring marks shortlisted places. */
function pinIcon(L: typeof import("leaflet"), category: Category, shortlisted: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="tp-pin c-${category}${shortlisted ? " tp-pin--short" : ""}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function TripMap({
  slug,
  base,
  homebase,
  stays,
  places,
  clusters,
  days,
  assignments: initial,
  layout,
  bookings: initialBookings,
  editable,
}: {
  slug: string;
  base: string;
  homebase: Trip["homebase"];
  stays?: Stay[];
  places: Place[];
  clusters: Cluster[];
  days: DayRule[];
  assignments: Assignments;
  layout: SlotLayout;
  bookings: Record<string, Booking>;
  editable: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  /** Route lines, one group per category. Pins live in the cluster group instead. */
  const layers = useRef<Map<Category, import("leaflet").LayerGroup>>(new Map());
  const mapRef = useRef<import("leaflet").Map | null>(null);
  /** All place pins go here, so pins that sit close together collapse into one numbered bubble. */
  const clusterRef = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const [picked, setPicked] = useState<Place | null>(null);
  const cats = [...new Set(places.map((p) => p.category))];
  const [only, setOnly] = useState<Category | null>(null);
  const [shortOnly, setShortOnly] = useState(false);
  const [ready, setReady] = useState(0);
  const placesKey = places.map((p) => `${p.id}:${p.lat}:${p.lng}`).join("|");
  const short = useShortlist(slug, places);
  const shortKey = places.filter(short.is).map((p) => p.id).join("|");
  /** placeId → its pin (and route line), so the shortlist filter can hide single places. */
  const items = useRef<Map<string, { group: import("leaflet").LayerGroup; routes: import("leaflet").Layer[]; pin: import("leaflet").Marker }>>(new Map());
  const [sheet, setSheet] = useState<Place | null>(null);
  const { assignments, assign, unassign, error: planError } = usePlanAssignments(slug, initial);
  const { bookings, saveBooking, clearBooking, error: bookingError } = usePlanBookings(slug, initialBookings);
  const error = planError ?? bookingError ?? short.error;
  const planned = new Set(Object.values(assignments).filter(Boolean) as string[]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      leaflet.current = L;
      const map = L.map(el.current);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      // Home bases sit in their own pane, under the pins and clusters, so they never hide a place.
      map.createPane("homes").style.zIndex = "450";
      const bases = stays?.length
        ? stays
        : [{ id: "home", label: homebase.label, address: homebase.address, lat: homebase.lat, lng: homebase.lng, from: "", to: "" }];
      const pts: [number, number][] = bases.map((b) => [b.lat, b.lng]);
      for (const b of bases) {
        L.marker([b.lat, b.lng], {
          pane: "homes",
          icon: L.divIcon({
            className: "",
            html: `<div style="width:30px;height:30px;border-radius:15px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;border:2px solid var(--surface)">${HOUSE_SVG}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
          title: `${b.label}: ${b.address}`,
        }).addTo(map);
      }
      await import("leaflet.markercluster");
      // The plugin adds markerClusterGroup to Leaflet's CommonJS export, which the namespace import doesn't show.
      const LC = (L as unknown as { default?: typeof L }).default ?? L;
      const cluster = LC.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          const s = clusterSize(n);
          return L.divIcon({
            className: "",
            html: `<div class="tp-cluster" style="width:${s}px;height:${s}px;line-height:${s}px">${n}</div>`,
            iconSize: [s, s],
          });
        },
      }).addTo(map);
      clusterRef.current = cluster;
      for (const p of places) {
        if (p.lat == null || p.lng == null) continue;
        pts.push([p.lat, p.lng]);
        let group = layers.current.get(p.category);
        if (!group) {
          group = L.layerGroup().addTo(map);
          layers.current.set(p.category, group);
        }
        const routes: import("leaflet").Layer[] = [];
        if (p.route) {
          routes.push(
            L.polyline(p.route.line, { className: "tp-route", weight: 5, opacity: 0.85 })
              .on("click", () => setPicked(p))
              .addTo(group),
          );
          pts.push(...p.route.line);
        }
        const pin = L.marker([p.lat, p.lng], {
          icon: pinIcon(L, p.category, false),
          title: `${p.name} (${CATEGORY[p.category].label})`,
          keyboard: true,
        }).on("click", () => setPicked(p));
        cluster.addLayer(pin);
        items.current.set(p.id, { group, routes, pin });
      }
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
      setReady((n) => n + 1);
    })();
    const groups = layers.current;
    const placed = items.current;
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      clusterRef.current = null;
      groups.clear();
      placed.clear();
    };
    // Rebuild only when the places or their positions change, not on every data refresh (that would reset the zoom).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homebase.lat, homebase.lng, stays, placesKey]);

  // One pass decides what is on the map: a tapped category shows only itself, "Shortlist only" hides
  // the rest, and shortlisted pins get a ring. Pins that are hidden leave the cluster group entirely.
  useEffect(() => {
    const c = clusterRef.current;
    const L = leaflet.current;
    if (!c || !L) return;
    const shown = new Set(visibleCategories([...layers.current.keys()], only));
    for (const p of places) {
      const it = items.current.get(p.id);
      if (!it) continue;
      const on = short.is(p);
      const visible = shown.has(p.category) && (!shortOnly || on);
      if (visible) c.addLayer(it.pin);
      else c.removeLayer(it.pin);
      it.pin.setIcon(pinIcon(L, p.category, on));
      for (const r of it.routes) {
        if (visible) it.group.addLayer(r);
        else it.group.removeLayer(r);
      }
    }
    if (picked && !shown.has(picked.category)) setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [only, shortOnly, shortKey, picked, ready]);

  // Picking a walk zooms the map to its line (it's a squiggle at trip-wide zoom).
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !picked?.route) return;
    m.fitBounds(picked.route.line, { padding: [40, 40], maxZoom: 16 });
  }, [picked]);

  return (
    <div className="flex flex-col gap-5 min-[960px]:flex-row">
      <aside className="tp-col min-[960px]:order-2 min-[960px]:w-[300px] min-[960px]:shrink-0" aria-label="Map legend">
        <div className="tp-card tp-card--compact">
          <div className="flex items-center justify-between gap-3">
            <h2 className="t-heading m-0">Show on map</h2>
            <button className="tp-btn tp-btn--text" onClick={() => setOnly(null)} disabled={!only} aria-label="Reset: show every category">
              Reset
            </button>
          </div>
          <ShortlistFilter on={shortOnly} count={short.count} onChange={setShortOnly} />
          <div className="flex flex-wrap gap-2 min-[960px]:flex-col" role="group" aria-label="Show one category">
            {cats.map((c) => (
              <button key={c} className={`tp-chip c-${c} justify-start`} aria-pressed={only === c} onClick={() => setOnly(only === c ? null : c)}>
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
      <div className="relative isolate min-w-0 flex-1">
        <div
          ref={el}
          className="h-[60dvh] min-h-[420px] w-full overflow-hidden min-[960px]:h-[calc(100dvh-12rem)]"
          style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--line)" }}
          aria-label={`Map of places and ${homebase.label}`}
        />
        {picked && (!shortOnly || short.is(picked)) && (
          <div
            className="tp-card tp-card--compact absolute inset-x-3 bottom-3 z-[1000] sm:left-auto sm:right-3 sm:top-3 sm:bottom-auto sm:w-80"
            style={{ boxShadow: "var(--shadow-sheet)", background: "var(--surface-raised)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="t-subheading m-0">{picked.name}</p>
                <p className="t-caption m-0">{picked.location}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <ShortlistToggle on={short.is(picked)} name={picked.name} editable={editable} onToggle={() => short.toggle(picked)} />
                  <StatusPill planned={planned.has(picked.id)} />
                  {bookings[picked.id] && (
                    <span className="tp-pill tp-pill--planned">
                      Booked · {dateLabel(bookings[picked.id].date)}, {bookingTime(bookings[picked.id])}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setPicked(null)} className="tp-btn tp-btn--text" aria-label="Close">
                Close
              </button>
            </div>
            <p className="m-0 line-clamp-3 text-sm text-ink-2">{picked.route ? picked.details : picked.note}</p>
            {picked.route && picked.route.nearby.length > 0 && (
              <p className="m-0 text-sm text-ink-2">
                Passes {picked.route.nearby.length} of your places: {picked.route.nearby.slice(0, 3).map((id) => places.find((x) => x.id === id)?.name).filter(Boolean).join(", ")}
                {picked.route.nearby.length > 3 ? "…" : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {editable && (
                <button className="tp-btn tp-btn--primary" onClick={() => setSheet(picked)}>
                  {planned.has(picked.id) ? "Move" : "Add to day"}
                </button>
              )}
              <a className={`tp-btn ${editable ? "tp-btn--secondary" : "tp-btn--primary"}`} href={`${base}/places/${picked.id}`}>
                Details
              </a>
              {picked.mapsUrl && (
                <a className="tp-btn tp-btn--secondary" href={picked.mapsUrl} target="_blank" rel="noreferrer">
                  {picked.route ? "Walking directions" : "Open in Maps"}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="fixed inset-x-4 top-4 z-[1100] sm:left-auto sm:w-96">
          <Alert level="crit">{error}</Alert>
        </div>
      )}
      {sheet && (
        <AddToDaySheet
          place={sheet}
          days={days}
          layout={layout}
          placeNames={Object.fromEntries(places.map((p) => [p.id, p.name]))}
          booking={bookings[sheet.id] ?? null}
          onSaveBooking={editable ? saveBooking : undefined}
          onClearBooking={() => clearBooking(sheet.id)}
          assignments={assignments}
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
    </div>
  );
}
