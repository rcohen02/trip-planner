"use client";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
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
import { Check, ChevronDown, ChevronUp, GripVertical, Lock, OctagonX, Pencil, Plus } from "lucide-react";
import type { Cluster, DayRule, Place } from "@/lib/content/types";
import {
  buildSlots,
  cleanSlotLabel,
  movePlace,
  neighborSlot,
  SLOT_LABEL,
  suggestSlotLabel,
  warningsFor,
  type Assignments,
  type SlotLayout,
  type Slot,
} from "@/lib/plan/plan";
import { dateLabel } from "@/lib/format";
import { addSlot, assignPlace, removeSlot, renameSlot, setHoursChecked, unassignPlace } from "@/app/t/[slug]/actions";
import { Alert, CATEGORY, Thumb } from "./bits";
import { AddToDaySheet, usePlanBookings } from "./AddToDay";
import { bookingTime, bookingWarnings, type Booking } from "@/lib/plan/booking";

type Move = { type: "assign"; slotId: string; placeId: string } | { type: "unassign"; placeId: string };

/** Same rule as the store: a planned place swaps with what's in the target; one from Unscheduled replaces it. */
function apply(a: Assignments, m: Move): Assignments {
  if (m.type === "assign") return movePlace(a, m.placeId, m.slotId);
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v && v !== m.placeId));
}

type Sheet =
  | { kind: "place"; placeId: string; slotId?: string; booking?: boolean }
  | { kind: "slot"; slotId: string }
  | { kind: "newSlot"; date: string }
  | null;

export function DaysBoard({
  slug,
  days,
  places: sourcePlaces,
  clusters,
  initial,
  initialLayout,
  initialBookings,
  editable,
  prices,
}: {
  slug: string;
  days: DayRule[];
  places: Place[];
  clusters: Cluster[];
  initial: Assignments;
  initialLayout: Required<SlotLayout>;
  initialBookings: Record<string, Booking>;
  editable: boolean;
  prices: Record<string, string>;
}) {
  const [layout, setLayout] = useState(initialLayout);
  // ✓ on "Hours unconfirmed": local overrides until the server catches up.
  const [hoursOverride, setHoursOverride] = useState<Record<string, boolean>>({});
  const [undo, setUndo] = useState<{ placeId: string; name: string } | null>(null);
  const places = useMemo(
    () =>
      sourcePlaces.map((p) =>
        p.id in hoursOverride && (hoursOverride[p.id] || p.hoursChecked)
          ? { ...p, hoursConfirmed: hoursOverride[p.id], hoursChecked: hoursOverride[p.id] }
          : p,
      ),
    [sourcePlaces, hoursOverride],
  );
  const { bookings, saveBooking, clearBooking, error: bookingError } = usePlanBookings(slug, initialBookings);
  const extras = layout.extras;
  const setExtras = (f: (e: typeof extras) => typeof extras) => setLayout((l) => ({ ...l, extras: f(l.extras) }));
  const slots = useMemo(() => buildSlots(days, layout), [days, layout]);
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

  async function createSlot(after: string, label: string) {
    setError(null);
    try {
      const x = await addSlot(slug, after, label);
      setExtras((e) => [...e, x]);
      setSheet(null);
    } catch {
      setError("That slot didn't save. Check your connection and try again.");
    }
  }

  async function dropSlot(id: string) {
    const gone = extras.find((x) => x.id === id);
    const pid = assignments[id];
    setError(null);
    setExtras((e) => e.filter((x) => x.id !== id).map((x) => (gone && x.after === id ? { ...x, after: gone.after } : x)));
    if (pid) startTransition(() => addMove({ type: "unassign", placeId: pid }));
    try {
      await removeSlot(slug, id);
    } catch {
      setExtras(() => extras);
      setError("That slot wasn't removed. Check your connection and try again.");
    }
  }

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);

  async function checkHours(placeId: string, checked: boolean) {
    const name = sourcePlaces.find((p) => p.id === placeId)?.name ?? "";
    setError(null);
    setHoursOverride((o) => ({ ...o, [placeId]: checked }));
    setUndo(checked ? { placeId, name } : null);
    try {
      await setHoursChecked(slug, placeId, checked);
    } catch {
      setHoursOverride((o) => ({ ...o, [placeId]: !checked }));
      setUndo(null);
      setError("That didn't save. Check your connection and try again.");
    }
  }

  const hoursCheck = (p: Place) =>
    editable ? (
      <button className="tp-check-btn" onClick={() => checkHours(p.id, true)} aria-label={`Mark ${p.name}'s hours as checked`} title="Hours checked">
        <Check className="tp-icon" aria-hidden />
      </button>
    ) : undefined;

  async function rename(slot: Slot, raw: string | null) {
    const before = layout;
    const label = raw === null ? null : cleanSlotLabel(raw);
    if (label === null && slot.extra) return;
    setError(null);
    setLayout((l) => {
      if (slot.extra) return { ...l, extras: l.extras.map((x) => (x.id === slot.id ? { ...x, label: label! } : x)) };
      const labels = { ...l.labels };
      if (label && label !== SLOT_LABEL[slot.kind]) labels[slot.id] = label;
      else delete labels[slot.id];
      return { ...l, labels };
    });
    try {
      await renameSlot(slug, slot.id, label && (slot.extra || label !== SLOT_LABEL[slot.kind]) ? label : null);
    } catch {
      setLayout(before);
      setError("That name didn't save. Check your connection and try again.");
    }
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
      {(error ?? bookingError) && (
        <div className="mb-4">
          <Alert level="crit">{error ?? bookingError}</Alert>
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
                  {!p.hoursConfirmed && (
                    <span className="tp-unsure-row">
                      <span className="tp-unsure">Hours unconfirmed</span>
                      {hoursCheck(p)}
                    </span>
                  )}
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
        <section className="min-w-0 flex-1 max-sm:order-1" aria-label="Itinerary">
          <div className="tp-seg mb-4 sm:hidden" role="group" aria-label="Day">
            {days.map((d) => (
              <button key={d.date} aria-pressed={activeDay === d.date} onClick={() => setActiveDay(d.date)}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    const booking = p ? bookings[p.id] : undefined;
                    const warnings = p ? [...(booking ? bookingWarnings(booking, s) : []), ...warningsFor(p, d.date, booking)] : [];
                    const crit = warnings.find((w) => w.level === "crit");
                    const conflict = Boolean(crit && !kept.has(s.id));
                    const up = p ? neighborSlot(slots, s.id, -1) : null;
                    const down = p ? neighborSlot(slots, s.id, 1) : null;
                    return (
                      <SlotCell
                        key={s.id}
                        slot={s}
                        editable={editable}
                        dragName={dragName}
                        onEmptyTap={() => setSheet({ kind: "slot", slotId: s.id })}
                        onRemove={s.extra ? () => dropSlot(s.id) : undefined}
                        onRename={(label) => rename(s, label)}
                        move={
                          p
                            ? {
                                name: p.name,
                                up,
                                down,
                                go: (to: Slot) => run({ type: "assign", slotId: to.id, placeId: p.id }),
                              }
                            : undefined
                        }
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
                            {(booking || editable) && (
                              <button
                                className="tp-booking-chip self-start"
                                data-booked={booking ? "" : undefined}
                                disabled={!editable}
                                onClick={() => setSheet({ kind: "place", placeId: p.id, booking: true })}
                                aria-label={booking ? `Booking for ${p.name}: ${bookingTime(booking)}. Edit` : `Add booking details for ${p.name}`}
                              >
                                {booking
                                  ? `Booked · ${booking.date === d.date ? "" : `${dateLabel(booking.date)}, `}${bookingTime(booking)}${booking.confirmation ? ` · ${booking.confirmation}` : ""}`
                                  : "+ Add booking"}
                              </button>
                            )}
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
                                <Alert key={w.text} level="warn" small action={w.text === "Hours unconfirmed" ? hoursCheck(p) : undefined}>
                                  {w.text}
                                </Alert>
                              ))}
                          </>
                        )}
                      </SlotCell>
                    );
                  })}
                {editable && (
                  <button className="tp-btn tp-btn--text justify-start" onClick={() => setSheet({ kind: "newSlot", date: d.date })}>
                    <Plus className="tp-icon tp-icon-lg" aria-hidden />
                    Add a slot
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {undo && (
        <div className="tp-toast" role="status">
          <Alert
            level="info"
            action={
              <span className="flex shrink-0 gap-1">
                <button
                  className="tp-btn tp-btn--text"
                  style={{ minHeight: 32, padding: "0 8px", fontSize: 13 }}
                  onClick={() => checkHours(undo.placeId, false)}
                >
                  Undo
                </button>
                <button className="tp-btn tp-btn--text" style={{ minHeight: 32, padding: "0 8px", fontSize: 13 }} onClick={() => setUndo(null)} aria-label="Dismiss">
                  ✕
                </button>
              </span>
            }
          >
            Hours checked for {undo.name}.
          </Alert>
        </div>
      )}

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
          layout={layout}
          assignments={assignments}
          initialSlot={sheet.slotId}
          placeNames={Object.fromEntries(places.map((p) => [p.id, p.name]))}
          booking={bookings[sheetPlace.id] ?? null}
          startOnBooking={sheet.booking}
          onSaveBooking={editable ? saveBooking : undefined}
          onClearBooking={() => clearBooking(sheetPlace.id)}
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
      {sheet?.kind === "newSlot" && (
        <NewSlotSheet
          date={sheet.date}
          slots={slots.filter((s) => s.date === sheet.date)}
          onClose={() => setSheet(null)}
          onAdd={createSlot}
        />
      )}
    </DndContext>
  );
}

/** Add a labeled slot between existing ones, e.g. a second afternoon. */
function NewSlotSheet({
  date,
  slots,
  onAdd,
  onClose,
}: {
  date: string;
  slots: Slot[];
  onAdd: (after: string, label: string) => Promise<void>;
  onClose: () => void;
}) {
  const open = slots.filter((s) => !s.locked);
  const start = open.find((s) => s.kind === "afternoon" && !s.extra)?.id ?? open[0]?.id ?? "";
  const [after, setAfter] = useState(start);
  const [label, setLabel] = useState(() => suggestSlotLabel(slots, start));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const clean = cleanSlotLabel(label);
  return (
    <>
      <div className="tp-scrim" onClick={onClose} />
      <form
        className="tp-sheet tp-col"
        role="dialog"
        aria-modal="true"
        aria-label="Add a slot"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!clean || busy) return;
          setBusy(true);
          await onAdd(after, clean);
          setBusy(false);
        }}
      >
        <div>
          <p className="tp-label m-0">{dateLabel(date)} · Add a slot</p>
          <p className="t-subheading m-0 mt-1">Room for one more</p>
        </div>
        <label className="tp-field">
          Goes after
          <select
            className="tp-input"
            value={after}
            onChange={(e) => {
              setAfter(e.target.value);
              if (!touched) setLabel(suggestSlotLabel(slots, e.target.value));
            }}
          >
            {open.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="tp-field">
          Label
          <input
            className="tp-input"
            value={label}
            maxLength={40}
            aria-invalid={!clean}
            onChange={(e) => {
              setTouched(true);
              setLabel(e.target.value);
            }}
            autoFocus
          />
        </label>
        {!clean && <p className="tp-help m-0">Give the slot a name, like Afternoon 2 or Gelato.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="tp-btn tp-btn--primary flex-1" disabled={!clean || busy}>
            {busy ? "Adding…" : "Add slot"}
          </button>
          <button type="button" className="tp-btn tp-btn--text" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </>
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

type SlotMove = { name: string; up: Slot | null; down: Slot | null; go: (to: Slot) => void };

function SlotCell({
  slot,
  editable,
  dragName,
  onEmptyTap,
  onRemove,
  onRename,
  move,
  children,
}: {
  slot: Slot;
  editable: boolean;
  dragName?: string;
  onEmptyTap: () => void;
  onRemove?: () => void;
  onRename: (label: string | null) => void;
  move?: SlotMove;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, disabled: Boolean(slot.locked) || !editable });
  const [editing, setEditing] = useState(false);
  const label = `${slot.label}${slot.optional ? " · optional" : ""}`;
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
      {editing ? (
        <RenameSlot slot={slot} onCancel={() => setEditing(false)} onRemove={onRemove} onSave={(l) => (setEditing(false), onRename(l))} />
      ) : editable ? (
        <div className="flex items-center justify-between gap-1">
          <button
            className="tp-slot__name"
            onClick={() => setEditing(true)}
            aria-label={`Rename the ${slot.label} slot`}
            title="Rename this slot"
          >
            <span className="tp-label">{label}</span>
            <Pencil className="tp-slot__pencil" aria-hidden />
          </button>
          {move && (
            <span className="flex shrink-0">
              <button
                className="tp-icon-btn"
                disabled={!move.up}
                onClick={() => move.up && move.go(move.up)}
                aria-label={move.up ? `Move ${move.name} up to ${move.up.label}` : `${move.name} is already first`}
              >
                <ChevronUp className="tp-icon tp-icon-lg" aria-hidden />
              </button>
              <button
                className="tp-icon-btn"
                disabled={!move.down}
                onClick={() => move.down && move.go(move.down)}
                aria-label={move.down ? `Move ${move.name} down to ${move.down.label}` : `${move.name} is already last`}
              >
                <ChevronDown className="tp-icon tp-icon-lg" aria-hidden />
              </button>
            </span>
          )}
        </div>
      ) : (
        <div className="tp-label">{label}</div>
      )}
      {isOver && dragName ? (
        <div className="tp-slot__drop">{empty ? `Release to add ${dragName}` : `Release to swap with ${dragName}`}</div>
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

/** Inline rename: type a name and press Return. Base slots can go back to their default name. */
function RenameSlot({
  slot,
  onSave,
  onCancel,
  onRemove,
}: {
  slot: Slot;
  onSave: (label: string | null) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [value, setValue] = useState(slot.label);
  const clean = cleanSlotLabel(value);
  return (
    <form
      className="tp-col"
      style={{ gap: 6 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (clean) onSave(clean);
        else if (!slot.extra) onSave(null);
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <label className="tp-field">
        <span className="sr-only">Slot name</span>
        <input
          className="tp-input"
          value={value}
          maxLength={40}
          aria-invalid={!clean && slot.extra}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      </label>
      <div className="flex flex-wrap items-center gap-1">
        <button type="submit" className="tp-btn tp-btn--primary" style={{ fontSize: 13, padding: "0 12px" }} disabled={!clean && slot.extra}>
          Save
        </button>
        <button type="button" className="tp-btn tp-btn--text" style={{ fontSize: 13, padding: "0 8px" }} onClick={onCancel}>
          Cancel
        </button>
        {slot.renamed && (
          <button type="button" className="tp-btn tp-btn--text" style={{ fontSize: 13, padding: "0 8px" }} onClick={() => onSave(null)}>
            Reset to {SLOT_LABEL[slot.kind]}
          </button>
        )}
        {onRemove && (
          <button type="button" className="tp-btn tp-btn--text" style={{ fontSize: 13, padding: "0 8px", color: "var(--crit)" }} onClick={onRemove}>
            Remove slot
          </button>
        )}
      </div>
    </form>
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
      <div className="tp-sheet tp-col" role="dialog" aria-modal="true" aria-label={`Add a place to ${slot.label}`}>
        <div>
          <p className="tp-label m-0">
            {dateLabel(slot.date)} · {slot.label}
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
