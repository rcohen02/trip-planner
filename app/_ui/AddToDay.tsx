"use client";
import { useMemo, useState } from "react";
import type { DayRule, Place } from "@/lib/content/types";
import { buildSlots, movePlace, warningsFor, type Assignments, type SlotLayout } from "@/lib/plan/plan";
import { bookingTime, bookingWarnings, cleanBooking, type Booking } from "@/lib/plan/booking";
import { dateLabel } from "@/lib/format";
import { assignPlace, clearBooking, saveBooking, unassignPlace } from "@/app/t/[slug]/actions";
import { WarningList } from "./bits";

/*
 * ONE "Add to day" popup for the whole site. Places, Map and Itinerary all render this
 * component (and share `usePlanAssignments` / `usePlanBookings` below), so any change to the
 * popup — fields, wording, buttons, warnings, the Booking step — belongs here and shows up everywhere.
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
      save(movePlace(assignments, placeId, slotId), () => assignPlace(slug, slotId, placeId)),
    unassign: (placeId: string) =>
      save(Object.fromEntries(Object.entries(assignments).filter(([, v]) => v !== placeId)), () => unassignPlace(slug, placeId)),
  };
}

/** Local copy of bookings with the save calls wired in; shared by every page that opens the popup. */
export function usePlanBookings(slug: string, initial: Record<string, Booking>) {
  const [bookings, setBookings] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  async function save(next: Record<string, Booking>, call: () => Promise<void>) {
    const before = bookings;
    setError(null);
    setBookings(next);
    try {
      await call();
    } catch {
      setBookings(before);
      setError("That booking didn't save. Check your connection and try again.");
    }
  }
  return {
    bookings,
    error,
    saveBooking: (b: Booking) => save({ ...bookings, [b.placeId]: b }, () => saveBooking(slug, b)),
    clearBooking: (placeId: string) =>
      save(Object.fromEntries(Object.entries(bookings).filter(([k]) => k !== placeId)), () => clearBooking(slug, placeId)),
  };
}

/** "Add to day": Day + Slot selects in a bottom sheet (phone) or small dialog. The tap alternative to dragging. */
export function AddToDaySheet({
  place,
  days,
  layout,
  assignments,
  initialSlot,
  placeNames,
  booking,
  startOnBooking,
  onSaveBooking,
  onClearBooking,
  onConfirm,
  onRemove,
  onClose,
}: {
  place: Place;
  days: DayRule[];
  layout?: SlotLayout;
  assignments: Assignments;
  initialSlot?: string;
  /** placeId → name, so the popup can say who swaps or goes back to Unscheduled. */
  placeNames?: Record<string, string>;
  /** This place's reservation, if any. With onSaveBooking, a planned place gets a Booking step. */
  booking?: Booking | null;
  /** Open straight on the Booking step (e.g. from the "Add booking" chip on the Itinerary). */
  startOnBooking?: boolean;
  onSaveBooking?: (b: Booking) => void;
  onClearBooking?: () => void;
  onConfirm: (slotId: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const slots = useMemo(() => buildSlots(days, layout).filter((s) => !s.locked), [days, layout]);
  const current = Object.entries(assignments).find(([, v]) => v === place.id)?.[0];
  const start = initialSlot ?? current ?? slots[0].id;
  const [date, setDate] = useState(start.split(":")[0]);
  const [slotId, setSlotId] = useState(start);
  const daySlots = slots.filter((s) => s.date === date);
  const chosen = daySlots.find((s) => s.id === slotId) ?? daySlots[0];
  const occupant = chosen && assignments[chosen.id];
  const occupantName = occupant && occupant !== place.id ? placeNames?.[occupant] : undefined;
  const fromSlot = current ? slots.find((s) => s.id === current) : undefined;
  const warnings = [...warningsFor(place, date, booking), ...(booking && chosen && chosen.id !== current ? bookingWarnings(booking, chosen) : [])];
  const [step, setStep] = useState<"plan" | "booking">(startOnBooking && current && onSaveBooking ? "booking" : "plan");

  if (step === "booking" && current && onSaveBooking) {
    return (
      <BookingStep
        place={place}
        days={days}
        defaultDate={current.split(":")[0]}
        booking={booking ?? null}
        onSave={(b) => (onSaveBooking(b), onClose())}
        onClear={onClearBooking ? () => (onClearBooking(), onClose()) : undefined}
        onBack={startOnBooking ? onClose : () => setStep("plan")}
        backLabel={startOnBooking ? "Cancel" : "Back"}
      />
    );
  }

  return (
    <>
      <div className="tp-scrim" onClick={onClose} />
      <div className="tp-sheet tp-col" role="dialog" aria-modal="true" aria-label={`Add ${place.name} to a day`}>
        <div>
          <p className="tp-label m-0">{current ? "Move" : "Add to day"}</p>
          <p className="t-subheading m-0 mt-1">{place.name}</p>
        </div>
        {current && onSaveBooking && (
          <button className="tp-booking-chip self-start" data-booked={booking ? "" : undefined} onClick={() => setStep("booking")}>
            {booking ? `Booked · ${dateLabel(booking.date)}, ${bookingTime(booking)}` : "Add booking details"}
          </button>
        )}
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
        {occupant && occupant !== place.id && (
          <p className="tp-help m-0">
            {fromSlot
              ? `Swaps places: ${occupantName ?? "what's there"} moves to ${dateLabel(fromSlot.date)} · ${fromSlot.label}.`
              : `This replaces ${occupantName ?? "what's there"}; it goes back to Unscheduled.`}
          </p>
        )}
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

/** The Booking step of the popup: date, local time at the destination, confirmation and a note. */
function BookingStep({
  place,
  days,
  defaultDate,
  booking,
  onSave,
  onClear,
  onBack,
  backLabel,
}: {
  place: Place;
  days: DayRule[];
  defaultDate: string;
  booking: Booking | null;
  onSave: (b: Booking) => void;
  onClear?: () => void;
  onBack: () => void;
  backLabel: string;
}) {
  const [date, setDate] = useState(booking?.date ?? defaultDate);
  const [time, setTime] = useState(booking?.time ?? "");
  const [confirmation, setConfirmation] = useState(booking?.confirmation ?? "");
  const [note, setNote] = useState(booking?.note ?? "");
  const [tried, setTried] = useState(false);
  const clean = cleanBooking({ placeId: place.id, date, time, confirmation, note });
  return (
    <>
      <div className="tp-scrim" onClick={onBack} />
      <form
        className="tp-sheet tp-col"
        role="dialog"
        aria-modal="true"
        aria-label={`Booking for ${place.name}`}
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (clean) onSave(clean);
        }}
      >
        <div>
          <p className="tp-label m-0">Booking</p>
          <p className="t-subheading m-0 mt-1">{place.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="tp-field">
            Day
            <select className="tp-input" value={date} onChange={(e) => setDate(e.target.value)}>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {dateLabel(d.date)}
                </option>
              ))}
            </select>
          </label>
          <label className="tp-field">
            Local time
            <input type="time" className="tp-input" value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={tried && !clean} autoFocus={!booking} />
          </label>
        </div>
        {tried && !clean && <p className="tp-help m-0">Add the time of the reservation.</p>}
        <label className="tp-field">
          Confirmation or name it's under <span className="tp-caption">(optional)</span>
          <input className="tp-input" value={confirmation} maxLength={60} onChange={(e) => setConfirmation(e.target.value)} />
        </label>
        <label className="tp-field">
          Note <span className="tp-caption">(optional)</span>
          <textarea className="tp-input" rows={2} value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} placeholder="Ask for the terrace · card held, 24h cancel" style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="tp-btn tp-btn--primary flex-1">
            Save booking
          </button>
          {booking && onClear && (
            <button type="button" className="tp-btn tp-btn--secondary" onClick={onClear}>
              Remove booking
            </button>
          )}
          <button type="button" className="tp-btn tp-btn--text" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      </form>
    </>
  );
}
