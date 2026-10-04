"use client";
import { useMemo, useState } from "react";
import type { DayRule, Place } from "@/lib/content/types";
import { buildSlots, warningsFor, type Assignments, type ExtraSlot } from "@/lib/plan/plan";
import { dateLabel } from "@/lib/format";
import { assignPlace, unassignPlace } from "@/app/t/[slug]/actions";
import { WarningList } from "./bits";

/*
 * ONE "Add to day" popup for the whole site. Places, Map and Days all render this
 * component (and Places + Map share `usePlanAssignments` below), so any change to the
 * popup — fields, wording, buttons, warnings — belongs here and shows up everywhere.
 * Don't copy it into a page.
 */

/** Local copy of the plan with the save calls wired in; used by every page that opens the Add to day popup. */
export function usePlanAssignments(slug: string, initial: Assignments) {
  const [assignments, setAssignments] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  async function save(next: Assignments, call: () => Promise<void>) {
    const before = assignments;
    setError(null);
    setAssignments(next);
    try {
      await call();
    } catch {
      setAssignments(before);
      setError("That change didn't save. Check your connection and try again.");
    }
  }
  return {
    assignments,
    error,
    assign: (slotId: string, placeId: string) =>
      save(
        { ...Object.fromEntries(Object.entries(assignments).filter(([k, v]) => v !== placeId && k !== slotId)), [slotId]: placeId },
        () => assignPlace(slug, slotId, placeId),
      ),
    unassign: (placeId: string) =>
      save(Object.fromEntries(Object.entries(assignments).filter(([, v]) => v !== placeId)), () => unassignPlace(slug, placeId)),
  };
}

/** "Add to day": Day + Slot selects in a bottom sheet (phone) or small dialog. The tap alternative to dragging. */
export function AddToDaySheet({
  place,
  days,
  extras = [],
  assignments,
  initialSlot,
  onConfirm,
  onRemove,
  onClose,
}: {
  place: Place;
  days: DayRule[];
  extras?: ExtraSlot[];
  assignments: Assignments;
  initialSlot?: string;
  onConfirm: (slotId: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const slots = useMemo(() => buildSlots(days, extras).filter((s) => !s.locked), [days, extras]);
  const current = Object.entries(assignments).find(([, v]) => v === place.id)?.[0];
  const start = initialSlot ?? current ?? slots[0].id;
  const [date, setDate] = useState(start.split(":")[0]);
  const [slotId, setSlotId] = useState(start);
  const daySlots = slots.filter((s) => s.date === date);
  const chosen = daySlots.find((s) => s.id === slotId) ?? daySlots[0];
  const occupant = chosen && assignments[chosen.id];
  const warnings = warningsFor(place, date);

  return (
    <>
      <div className="tp-scrim" onClick={onClose} />
      <div className="tp-sheet tp-col" role="dialog" aria-modal="true" aria-label={`Add ${place.name} to a day`}>
        <div>
          <p className="tp-label m-0">{current ? "Move" : "Add to day"}</p>
          <p className="t-subheading m-0 mt-1">{place.name}</p>
        </div>
        <label className="tp-field">
          Day
          <select
            className="tp-input"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlotId(slots.find((s) => s.date === e.target.value)!.id);
            }}
          >
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {dateLabel(d.date)}
              </option>
            ))}
          </select>
        </label>
        <label className="tp-field">
          Slot
          <select className="tp-input" value={chosen?.id} onChange={(e) => setSlotId(e.target.value)}>
            {daySlots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.optional ? " (optional)" : ""}
                {assignments[s.id] && assignments[s.id] !== place.id ? " · taken" : ""}
              </option>
            ))}
          </select>
        </label>
        {occupant && occupant !== place.id && <p className="tp-help m-0">This replaces what's there; it goes back to Unscheduled.</p>}
        <WarningList items={warnings} />
        <div className="flex flex-wrap gap-2">
          <button className="tp-btn tp-btn--primary flex-1" onClick={() => chosen && onConfirm(chosen.id)}>
            {current ? "Move" : "Add to day"}
          </button>
          {current && onRemove && (
            <button className="tp-btn tp-btn--secondary" onClick={onRemove}>
              Remove from plan
            </button>
          )}
          <button className="tp-btn tp-btn--text" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
