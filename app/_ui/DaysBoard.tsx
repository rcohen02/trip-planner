"use client";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical, Lock, OctagonX } from "lucide-react";
import type { Cluster, DayRule, Place } from "@/lib/content/types";
import { buildSlots, SLOT_LABEL, warningsFor, type Assignments, type Slot } from "@/lib/plan/plan";
import { dateLabel } from "@/lib/format";
import { assignPlace, unassignPlace } from "@/app/t/[slug]/actions";
import { Alert, CATEGORY, Thumb } from "./bits";
import { AddToDaySheet } from "./AddToDay";

type Move = { type: "assign"; slotId: string; placeId: string } | { type: "unassign"; placeId: string };

function apply(a: Assignments, m: Move): Assignments {
  const next: Assignments = {};
  for (const [k, v] of Object.entries(a)) if (v && v !== m.placeId && !(m.type === "assign" && k === m.slotId)) next[k] = v;
  if (m.type === "assign") next[m.slotId] = m.placeId;
  return next;
}

type Sheet = { kind: "place"; placeId: string; slotId?: string } | { kind: "slot"; slotId: string } | null;

export function DaysBoard({
  slug,
  days,
  places,
  clusters,
  initial,
  editable,
  prices,
}: {
  slug: string;
  days: DayRule[];
  places: Place[];
  clusters: Cluster[];
  initial: Assignments;
  editable: boolean;
  prices: Record<string, string>;
}) {
  const slots = useMemo(() => buildSlots(days), [days]);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const [assignments, addMove] = useOptimistic(initial, apply);
  const [, startTransition] = useTransition();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(days[0].date);
  const [category, setCategory] = useState("");
  const [cluster, setCluster] = useState("");
  const [openOn, setOpenOn] = useState("");
  const [q, setQ] = useState("");
  const [railOpen, setRailOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const placed = new Set(Object.values(assignments).filter(Boolean) as string[]);
  const unscheduled = places.filter((p) => !placed.has(p.id));
  const pool = unscheduled.filter(
    (p) =>
      (!category || p.category === category) &&
      (!cluster || p.cluster === cluster) &&
      (!openOn || !warningsFor(p, openOn).some((w) => w.level === "crit")) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );

  function run(m: Move) {
    setError(null);
    startTransition(async () => {
      addMove(m);
      try {
        if (m.type === "assign") await assignPlace(slug, m.slotId, m.placeId);
        else await unassignPlace(slug, m.placeId);
      } catch {
        setError("That change didn't save. Check your connection and try again.");
      }
    });
  }

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const placeId = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    if (target === "pool") run({ type: "unassign", placeId });
    else if (!slots.find((s) => s.id === target)?.locked) run({ type: "assign", slotId: target, placeId });
  }

  const dragName = dragging ? byId.get(dragging)?.name : undefined;
  const sheetPlace = sheet?.kind === "place" ? byId.get(sheet.placeId) : undefined;

  return (
    <DndContext id="days-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {error && (
        <div className="mb-4">
          <Alert level="crit">{error}</Alert>
        </div>
      )}

      <div className="flex flex-col gap-6 min-[960px]:flex-row">
        {/* Unscheduled rail */}
        <aside className="max-sm:order-2 min-[960px]:w-[300px] min-[960px]:shrink-0" aria-label="Unscheduled places">
          <Pool editable={editable}>
            <div className="flex items-baseline justify-between">
              <h2 className="t-heading m-0">Unscheduled</h2>
              <span className="tp-num t-caption">{unscheduled.length} places</span>
            </div>
            <button className="tp-btn tp-btn--secondary sm:hidden" aria-expanded={railOpen} onClick={() => setRailOpen((o) => !o)}>
              {railOpen ? "Hide the list" : "Show the list"}
            </button>
            <div className={`tp-col ${railOpen ? "" : "max-sm:hidden"}`}>
            <div className="grid grid-cols-2 gap-2 min-[960px]:grid-cols-1">
              <label className="tp-field col-span-2 min-[960px]:col-span-1">
                <span className="sr-only">Search</span>
                <input type="search" className="tp-input" placeholder="Search place names" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <label className="tp-field">
                Category
                <select className="tp-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All</option>
                  {[...new Set(places.map((p) => p.category))].map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY[c].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tp-field">
                Area
                <select className="tp-input" value={cluster} onChange={(e) => setCluster(e.target.value)}>
                  <option value="">All</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tp-field col-span-2 min-[960px]:col-span-1">
                Open on
                <select className="tp-input" value={openOn} onChange={(e) => setOpenOn(e.target.value)}>
                  <option value="">Any day</option>
                  {days.map((d) => (
                    <option key={d.date} value={d.date}>
                      {dateLabel(d.date)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="tp-col m-0 list-none p-0 min-[960px]:max-h-[calc(100dvh-24rem)] min-[960px]:overflow-y-auto">
              {pool.map((p) => (
                <li key={p.id} className="tp-col" style={{ gap: 4 }}>
                  <Row
                    place={p}
                    price={prices[p.id]}
                    editable={editable}
                    onTap={() => editable && setSheet({ kind: "place", placeId: p.id })}
                  />
                  {!p.hoursConfirmed && <span className="tp-unsure pl-1">Hours unconfirmed</span>}
                </li>
              ))}
              {pool.length === 0 && (
                <li className="t-caption">{unscheduled.length ? "Nothing matches. Clear a filter to see more." : "Everything is in a day."}</li>
              )}
            </ul>
            </div>
          </Pool>
        </aside>

        {/* Days */}
        <section className="min-w-0 flex-1 max-sm:order-1" aria-label="Days">
          <div className="tp-seg mb-4 sm:hidden" role="group" aria-label="Day">
            {days.map((d) => (
              <button key={d.date} aria-pressed={activeDay === d.date} onClick={() => setActiveDay(d.date)}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {days.map((d) => (
              <div key={d.date} className={`tp-day ${activeDay === d.date ? "" : "max-sm:hidden"}`}>
                <div>
                  <div className="tp-day__title">{dateLabel(d.date)}</div>
                  {d.note && <div className="tp-caption">{d.note}</div>}
                </div>
                {slots
                  .filter((s) => s.date === d.date)
                  .map((s) => {
                    const pid = assignments[s.id];
                    const p = pid ? byId.get(pid) : undefined;
                    const warnings = p ? warningsFor(p, d.date) : [];
                    const crit = warnings.find((w) => w.level === "crit");
                    const conflict = Boolean(crit && !kept.has(s.id));
                    return (
                      <SlotCell
                        key={s.id}
                        slot={s}
                        editable={editable}
                        dragName={dragName}
                        onEmptyTap={() => setSheet({ kind: "slot", slotId: s.id })}
                      >
                        {p && (
                          <>
                            <Row
                              place={p}
                              price={prices[p.id]}
                              editable={editable}
                              conflict={conflict}
                              onTap={() => editable && setSheet({ kind: "place", placeId: p.id })}
                            />
                            {conflict && crit && (
                              <div className="tp-alert tp-alert--crit tp-alert--sm" role="alert">
                                <OctagonX className="tp-icon" aria-hidden />
                                <div className="flex-1">
                                  {crit.text}. {editable ? "Keep it here?" : ""}
                                  {editable && (
                                    <span className="mt-1 flex gap-2">
                                      <button
                                        className="tp-btn tp-btn--secondary"
                                        style={{ minHeight: 32, fontSize: 12, padding: "0 10px" }}
                                        onClick={() => setKept((k) => new Set(k).add(s.id))}
                                      >
                                        Keep
                                      </button>
                                      <button
                                        className="tp-btn tp-btn--primary"
                                        style={{ minHeight: 32, fontSize: 12, padding: "0 10px" }}
                                        onClick={() => setSheet({ kind: "place", placeId: p.id })}
                                      >
                                        Move
                                      </button>
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {warnings
                              .filter((w) => w.level === "warn")
                              .slice(0, 2)
                              .map((w) => (
                                <Alert key={w.text} level="warn" small>
                                  {w.text}
                                </Alert>
                              ))}
                          </>
                        )}
                      </SlotCell>
                    );
                  })}
              </div>
            ))}
          </div>
        </section>
      </div>

      <DragOverlay>
        {dragging && byId.get(dragging) ? (
          <div className="tp-row tp-row--drag">
            <Thumb place={byId.get(dragging)!} />
            <div className="tp-row__body">
              <div className="tp-row__name">{byId.get(dragging)!.name}</div>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {sheetPlace && sheet?.kind === "place" && (
        <AddToDaySheet
          place={sheetPlace}
          days={days}
          assignments={assignments}
          initialSlot={sheet.slotId}
          onClose={() => setSheet(null)}
          onConfirm={(slotId) => {
            run({ type: "assign", slotId, placeId: sheetPlace.id });
            setSheet(null);
          }}
          onRemove={() => {
            run({ type: "unassign", placeId: sheetPlace.id });
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "slot" && (
        <PickPlaceSheet
          slot={slots.find((s) => s.id === sheet.slotId)!}
          places={unscheduled}
          prices={prices}
          onClose={() => setSheet(null)}
          onPick={(placeId) => {
            run({ type: "assign", slotId: sheet.slotId, placeId });
            setSheet(null);
          }}
        />
      )}
    </DndContext>
  );
}

function Pool({ editable, children }: { editable: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool", disabled: !editable });
  return (
    <div
      ref={setNodeRef}
      className="tp-card tp-card--compact"
      style={isOver ? { borderColor: "var(--drop-line)", borderStyle: "dashed", borderWidth: 2, background: "var(--drop-bg)" } : undefined}
    >
      {children}
    </div>
  );
}

function SlotCell({
  slot,
  editable,
  dragName,
  onEmptyTap,
  children,
}: {
  slot: Slot;
  editable: boolean;
  dragName?: string;
  onEmptyTap: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, disabled: Boolean(slot.locked) || !editable });
  const label = `${SLOT_LABEL[slot.kind]}${slot.optional ? " · optional" : ""}`;
  if (slot.locked) {
    return (
      <div className="tp-slot">
        <div className="tp-label">{label}</div>
        <div className="tp-locked">
          <Lock className="tp-icon tp-icon-lg" aria-hidden />
          <b>Airport</b>
          <span className="tp-caption">{slot.locked}</span>
        </div>
      </div>
    );
  }
  const empty = !children;
  return (
    <div ref={setNodeRef} className="tp-slot">
      <div className="tp-label">{label}</div>
      {isOver && dragName ? (
        <div className="tp-slot__drop">Release to add {dragName}</div>
      ) : empty ? (
        editable ? (
          <button className="tp-slot__empty" onClick={onEmptyTap}>
            Drop here or tap to add
          </button>
        ) : (
          <div className="tp-slot__empty">Nothing planned</div>
        )
      ) : (
        children
      )}
    </div>
  );
}

function Row({
  place,
  price,
  editable,
  conflict = false,
  onTap,
}: {
  place: Place;
  price: string;
  editable: boolean;
  conflict?: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: place.id, disabled: !editable });
  return (
    <div
      ref={setNodeRef}
      className={`tp-row ${conflict ? "tp-row--conflict" : ""}`}
      style={isDragging ? { opacity: 0.4 } : undefined}
    >
      <Thumb place={place} />
      <button
        type="button"
        onClick={onTap}
        className="tp-row__body cursor-pointer border-0 bg-transparent p-0 text-left text-ink"
        aria-label={editable ? `${place.name}: add to day or move` : place.name}
        disabled={!editable}
      >
        <div className="tp-row__name">{place.name}</div>
        <div className="tp-label-sm">
          {CATEGORY[place.category].short.toUpperCase()} · {price}
        </div>
      </button>
      {editable && (
        <span className="tp-row__grip flex min-h-[44px] items-center px-1 touch-none" {...listeners} {...attributes} aria-label={`Drag ${place.name}`}>
          <GripVertical className="tp-icon" aria-hidden />
        </span>
      )}
    </div>
  );
}

function PickPlaceSheet({
  slot,
  places,
  prices,
  onPick,
  onClose,
}: {
  slot: Slot;
  places: Place[];
  prices: Record<string, string>;
  onPick: (placeId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = places.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="tp-scrim" onClick={onClose} />
      <div className="tp-sheet tp-col" role="dialog" aria-modal="true" aria-label={`Add a place to ${SLOT_LABEL[slot.kind]}`}>
        <div>
          <p className="tp-label m-0">
            {dateLabel(slot.date)} · {SLOT_LABEL[slot.kind]}
          </p>
          <p className="t-subheading m-0 mt-1">Pick from Unscheduled</p>
        </div>
        <input type="search" className="tp-input" placeholder="Search place names" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <ul className="tp-col m-0 max-h-[50dvh] list-none overflow-y-auto p-0" style={{ gap: 8 }}>
          {shown.map((p) => {
            const crit = warningsFor(p, slot.date).find((w) => w.level === "crit");
            return (
              <li key={p.id}>
                <button className="tp-row w-full cursor-pointer text-left text-ink" onClick={() => onPick(p.id)}>
                  <Thumb place={p} />
                  <div className="tp-row__body">
                    <div className="tp-row__name">{p.name}</div>
                    <div className="tp-label-sm">
                      {CATEGORY[p.category].short.toUpperCase()} · {prices[p.id]}
                    </div>
                    {crit && <div className="text-xs text-crit">{crit.text}</div>}
                  </div>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="t-caption">No unscheduled places match.</li>}
        </ul>
        <button className="tp-btn tp-btn--text" onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}
