"use client";
import { useState } from "react";
import type { DayRule, Place } from "@/lib/content/types";
import type { Assignments, SlotLayout } from "@/lib/plan/plan";
import type { Booking } from "@/lib/plan/booking";
import { AddToDaySheet, usePlanAssignments, usePlanBookings } from "./AddToDay";
import { Alert } from "./bits";

/** The "Add to day" / "Move" button on a place's detail page. Opens the one shared AddToDay popup. */
export function PlaceAddToDay({
  slug,
  place,
  days,
  layout,
  assignments: initialAssignments,
  bookings: initialBookings,
  placeNames,
}: {
  slug: string;
  place: Place;
  days: DayRule[];
  layout: SlotLayout;
  assignments: Assignments;
  bookings: Record<string, Booking>;
  placeNames: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const { assignments, assign, unassign, error: planError } = usePlanAssignments(slug, initialAssignments);
  const { bookings, saveBooking, clearBooking, error: bookingError } = usePlanBookings(slug, initialBookings);
  const planned = Object.values(assignments).includes(place.id);
  const error = planError ?? bookingError;

  return (
    <>
      <button className="tp-btn tp-btn--primary" onClick={() => setOpen(true)}>
        {planned ? "Move" : "Add to day"}
      </button>
      {error && (
        <Alert level="crit">{error}</Alert>
      )}
      {open && (
        <AddToDaySheet
          place={place}
          days={days}
          layout={layout}
          placeNames={placeNames}
          booking={bookings[place.id] ?? null}
          onSaveBooking={saveBooking}
          onClearBooking={() => clearBooking(place.id)}
          assignments={assignments}
          onClose={() => setOpen(false)}
          onConfirm={(slotId) => {
            setOpen(false);
            assign(slotId, place.id);
          }}
          onRemove={() => {
            setOpen(false);
            unassign(place.id);
          }}
        />
      )}
    </>
  );
}
