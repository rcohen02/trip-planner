"use client";
import { useMemo, useState } from "react";
import type { DayRule, Place } from "@/lib/content/types";
import { buildSlots, SLOT_LABEL, warningsFor, type Assignments } from "@/lib/plan/plan";
import { dateLabel } from "@/lib/format";
import { WarningList } from "./bits";

/** "Add to day": Day + Slot selects in a bottom sheet (phone) or small dialog. The tap alternative to dragging. */
export function AddToDaySheet({
  place,
  days,
  assignments,
  initialSlot,
  onConfirm,
  onRemove,
  onClose,
}: {
  place: Place;
  days: DayRule[];
  assignments: Assignments;
  initialSlot?: string;
  onConfirm: (slotId: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const slots = useMemo(() => buildSlots(days).filter((s) => !s.locked), [days]);
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
                {SLOT_LABEL[s.kind]}
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
