import type { Flight, Trip } from "@/lib/content/types";
import { dateLabel, timeIn } from "@/lib/format";

function zoneFor(code: string, trip: Trip) {
  return code === "LIS" ? trip.timezone : trip.homeTimezone;
}
function zoneSuffix(code: string) {
  return code === "LIS" ? "" : " ET";
}
function duration(a: string, b: string) {
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function FlightCard({ flight, trip, title }: { flight: Flight; trip: Trip; title: string }) {
  const seats = Object.entries(flight.seats);
  const rows = new Set(seats.map(([, s]) => s.replace(/\D/g, "")));
  const letters = seats.map(([, s]) => s.replace(/\d/g, "")).sort();
  const together = rows.size === 1 && letters.length === 2 && Math.abs(letters[0].charCodeAt(0) - letters[1].charCodeAt(0)) === 1;
  return (
    <section className="tp-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-subheading m-0">
          {title} · {flight.flightNo}
        </h2>
        <span className="tp-caption">{dateLabel(flight.depart.slice(0, 10))}</span>
      </div>
      <div className="tp-route">
        <div>
          <div className="tp-code tp-num">{flight.from.code}</div>
          <div className="tp-caption">
            {timeIn(flight.depart, zoneFor(flight.from.code, trip))}
            {zoneSuffix(flight.from.code)} · Terminal {flight.from.terminal}
          </div>
        </div>
        <div className="tp-label text-center" style={{ letterSpacing: 0 }}>
          {duration(flight.depart, flight.arrive)}
          <br />
          ———→
        </div>
        <div className="text-right">
          <div className="tp-code tp-num">{flight.to.code}</div>
          <div className="tp-caption">
            {timeIn(flight.arrive, zoneFor(flight.to.code, trip))}
            {zoneSuffix(flight.to.code)}
            {flight.arrive.slice(0, 10) !== flight.depart.slice(0, 10) ? ` ${dateLabel(flight.arrive.slice(0, 10)).slice(0, 3)}` : ""} · T{flight.to.terminal}
          </div>
        </div>
      </div>
      <dl className="tp-dl">
        <dt>Check-in closes</dt>
        <dd>
          {timeIn(flight.checkInCloses, zoneFor(flight.from.code, trip))}
          {zoneSuffix(flight.from.code)}
        </dd>
        <dt>Seats</dt>
        <dd>
          {seats.map(([n, s]) => `${n} ${s}`).join(" · ")}{" "}
          {!together && <span style={{ color: "var(--warn-ink)" }}>(not together)</span>}
        </dd>
        <dt>Booking ref</dt>
        <dd className="tp-data">{trip.bookingRef}</dd>
      </dl>
    </section>
  );
}
