"use client";
import { useState } from "react";
import type { DayRule, Place } from "@/lib/content/types";
import type { Assignments, SlotLayout } from "@/lib/plan/plan";
import type { Booking } from "@/lib/plan/booking";
import { addToDayLabel } from "@/lib/plan/addToDayLabel";
import { AddToDaySheet, usePlanAssignments, usePlanBookings } from "./AddToDay";

/** "Add to day" button for one place, opening the site-wide popup from AddToDay.tsx. */
export function PlaceAddToDay({
  slug,
  place,
  places,
  days,
  layout,
  assignments: initialAssignments,
  bookings: initialBookings,
}: {
  slug: string;
  place: Place;
  places: Place[];
  days: DayRule[];
  layout: SlotLayout;
  assignments: Assignments;
  bookings: Record<string, Booking>;
}) {
  const { assignments, assign, unassign } = usePlanAssignments(slug, initialAssignments);
  const { bookings, saveBooking, clearBooking } = usePlanBookings(slug, initialBookings);
  const [open, setOpen] = useState(false);
  const planned = Object.values(assignments).includes(place.id);

  return (
    <>
      <button className="tp-btn tp-btn--secondary" onClick={() => setOpen(true)}>
        {addToDayLabel(planned)}
      </button>
      {open && (
        <AddToDaySheet
          place={place}
          days={days}
          layout={layout}
          placeNames={Object.fromEntries(places.map((p) => [p.id, p.name]))}
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
