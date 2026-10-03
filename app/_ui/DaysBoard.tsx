"use client";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Cluster, DayRule, Place } from "@/lib/content/types";
import { buildSlots, SLOT_LABEL, warningsFor, type Assignments, type Slot } from "@/lib/plan/plan";
import { dateLabel } from "@/lib/format";
import { assignPlace, unassignPlace } from "@/app/t/[slug]/actions";
import { CATEGORY, Thumb, Warnings } from "./bits";

type Move = { type: "assign"; slotId: string; placeId: string } | { type: "unassign"; placeId: string };

function apply(a: Assignments, m: Move): Assignments {
  const next: Assignments = {};
  const moving = m.placeId;
  for (const [k, v] of Object.entries(a)) if (v && v !== moving && !(m.type === "assign" && k === m.slotId)) next[k] = v;
  if (m.type === "assign") next[m.slotId] = m.placeId;
  return next;
}

export function DaysBoard({
  slug,
  days,
  places,
  clusters,
  initial,
  editable,
  money,
}: {
  slug: string;
  days: DayRule[];
  places: Place[];
  clusters: Cluster[];
  initial: Assignments;
  editable: boolean;
  money: Record<string, string>;
}) {
  const slots = useMemo(() => buildSlots(days), [days]);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const [assignments, addMove] = useOptimistic(initial, apply);
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(days[0].date);
  const [category, setCategory] = useState("");
  const [cluster, setCluster] = useState("");
  const [openOn, setOpenOn] = useState("");
  const [q, setQ] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const placed = new Set(Object.values(assignments).filter(Boolean) as string[]);
  const pool = places.filter(
    (p) =>
      !placed.has(p.id) &&
      (!category || p.category === category) &&
      (!cluster || p.cluster === cluster) &&
      (!openOn || !warningsFor(p, openOn).some((w) => w.startsWith("Closed") || w.endsWith("only"))) &&
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
        setError("Couldn't save that change. Check your connection and try again.");
      }
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const placeId = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    if (target === "pool") run({ type: "unassign", placeId });
    else if (!slots.find((s) => s.id === target)?.locked) run({ type: "assign", slotId: target, placeId });
    setSelected(null);
  }

  function tapSlot(s: Slot) {
    if (!editable || s.locked || !selected) return;
    run({ type: "assign", slotId: s.id, placeId: selected });
    setSelected(null);
  }

  const select = (id: string) => editable && setSelected((cur) => (cur === id ? null : id));

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-amber/15 px-3 py-2 text-sm text-amber">
          {error}
        </p>
      )}
      {editable && selected && (
        <div className="sticky top-16 z-20 mb-3 flex items-center justify-between gap-3 rounded-md bg-plum px-3 py-2 text-sm md:hidden">
          <span>
            Tap a slot to place <strong>{byId.get(selected)?.name}</strong>
          </span>
          {placed.has(selected) ? (
            <button
              className="rounded bg-ink/40 px-2 py-1"
              onClick={() => {
                run({ type: "unassign", placeId: selected });
                setSelected(null);
              }}
            >
              Remove
            </button>
          ) : (
            <button className="rounded bg-ink/40 px-2 py-1" onClick={() => setSelected(null)}>
              Cancel
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Day columns */}
        <section className="order-1 min-w-0 flex-1 lg:order-2" aria-label="Days">
          <div className="mb-3 flex gap-1 overflow-x-auto md:hidden" role="tablist">
            {days.map((d) => (
              <button
                key={d.date}
                role="tab"
                aria-selected={activeDay === d.date}
                onClick={() => setActiveDay(d.date)}
                className="shrink-0 rounded-md px-3 py-1.5 text-sm text-mist aria-selected:bg-plum aria-selected:text-paper"
              >
                {dateLabel(d.date)}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {days.map((d) => (
              <div key={d.date} className={`${activeDay === d.date ? "" : "hidden"} md:block`}>
                <div className="perf rounded-t-xl bg-plum-deep pt-3">
                  <div className="px-4 pb-3">
                    <h2 className="font-display text-2xl font-bold">{dateLabel(d.date)}</h2>
                    {d.note && <p className="mt-0.5 text-sm text-mist">{d.note}</p>}
                  </div>
                </div>
                <ol className="space-y-px overflow-hidden rounded-b-xl border-t border-dashed border-mist/40 bg-plum-deep">
                  {slots
                    .filter((s) => s.date === d.date)
                    .map((s) => {
                      const pid = assignments[s.id];
                      const p = pid ? byId.get(pid) : undefined;
                      return (
                        <SlotCell key={s.id} slot={s} onTap={() => tapSlot(s)} armed={Boolean(selected) && !s.locked}>
                          {p ? (
                            <Card
                              place={p}
                              money={money[p.id]}
                              editable={editable}
                              selected={selected === p.id}
                              onSelect={() => select(p.id)}
                              warnings={warningsFor(p, d.date)}
                            />
                          ) : null}
                        </SlotCell>
                      );
                    })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Unscheduled sidebar */}
        <aside className="order-2 lg:order-1 lg:w-72 lg:shrink-0" aria-label="Unscheduled places">
          <Pool editable={editable}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold">Unscheduled</h2>
              <span className="tabular text-sm text-mist">{pool.length}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
              <input
                type="search"
                placeholder="Search places"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="col-span-2 rounded-md border border-plum bg-ink px-3 py-2 placeholder:text-mist/70 lg:col-span-1"
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-plum bg-ink px-2 py-2" aria-label="Category">
                <option value="">All categories</option>
                {[...new Set(places.map((p) => p.category))].map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY[c].label}
                  </option>
                ))}
              </select>
              <select value={cluster} onChange={(e) => setCluster(e.target.value)} className="rounded-md border border-plum bg-ink px-2 py-2" aria-label="Area">
                <option value="">All areas</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={openOn} onChange={(e) => setOpenOn(e.target.value)} className="col-span-2 rounded-md border border-plum bg-ink px-2 py-2 lg:col-span-1" aria-label="Open on">
                <option value="">Open any day</option>
                {days.map((d) => (
                  <option key={d.date} value={d.date}>
                    Open {dateLabel(d.date)}
                  </option>
                ))}
              </select>
            </div>
            <ul className="mt-3 space-y-2 lg:max-h-[calc(100dvh-20rem)] lg:overflow-y-auto lg:pr-1">
              {pool.map((p) => (
                <li key={p.id}>
                  <Card
                    place={p}
                    money={money[p.id]}
                    editable={editable}
                    selected={selected === p.id}
                    onSelect={() => select(p.id)}
                    warnings={[]}
                  />
                </li>
              ))}
              {pool.length === 0 && <li className="text-sm text-mist">Nothing matches. Clear a filter to see more places.</li>}
            </ul>
          </Pool>
        </aside>
      </div>
    </DndContext>
  );
}

function Pool({ editable, children }: { editable: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool", disabled: !editable });
  return (
    <div ref={setNodeRef} className={`rounded-xl border p-4 ${isOver ? "border-mint" : "border-plum"}`}>
      {children}
    </div>
  );
}

function SlotCell({ slot, armed, onTap, children }: { slot: Slot; armed: boolean; onTap: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, disabled: Boolean(slot.locked) });
  const empty = !children;
  return (
    <li
      ref={setNodeRef}
      onClick={empty ? onTap : undefined}
      className={`bg-ink/40 px-3 py-2.5 ${isOver ? "bg-plum/60" : ""} ${empty && armed ? "cursor-pointer ring-1 ring-inset ring-mint/60" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={slot.locked ? "text-mist/60" : "text-mist"}>
          {SLOT_LABEL[slot.kind]}
          {slot.optional && " (optional)"}
        </span>
        {!empty && armed && (
          <button onClick={onTap} className="text-mint">
            Swap in
          </button>
        )}
      </div>
      {slot.locked ? (
        <p className="text-sm text-mist/80">{slot.locked}</p>
      ) : (
        children ?? <p className="py-2 text-sm text-mist/50">{armed ? "Tap to place here" : "Empty"}</p>
      )}
    </li>
  );
}

function Card({
  place,
  money,
  editable,
  selected,
  onSelect,
  warnings,
}: {
  place: Place;
  money: string;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  warnings: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: place.id, disabled: !editable });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`flex gap-3 rounded-lg bg-plum-deep p-2 text-left ${editable ? "cursor-grab touch-manipulation" : ""} ${
        selected ? "ring-2 ring-mint" : ""
      } ${isDragging ? "relative z-50 opacity-90 shadow-lg shadow-ink" : ""}`}
      aria-label={editable ? `${place.name}. Drag to a day, or select and then tap a slot.` : place.name}
    >
      <Thumb place={place} size={48} />
      <div className="min-w-0">
        <p className="truncate font-medium leading-tight">{place.name}</p>
        <p className="mt-0.5 flex gap-2 text-xs text-mist">
          <span style={{ color: CATEGORY[place.category].color }} aria-hidden>
            {CATEGORY[place.category].glyph}
          </span>
          <span className="truncate">{place.location}</span>
          {money && <span className="shrink-0 tabular">{money.replace(/ \(.*\)/, "")}</span>}
        </p>
        <Warnings items={warnings} />
      </div>
    </div>
  );
}
