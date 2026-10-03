import Link from "next/link";
import type { TripContext } from "@/lib/context";
import { getStore } from "@/lib/store";
import { buildSlots, SLOT_LABEL, todayFor, warningsFor } from "@/lib/plan/plan";
import { countdown, longDate, money, timeIn, weekdayOf } from "@/lib/format";
import { describeCode, getForecast, toF } from "@/lib/weather";
import { Alert, HoursLine, Thumb } from "@/app/_ui/bits";
import { FlightCard } from "@/app/_ui/FlightCard";

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function TodayView({ ctx }: { ctx: TripContext }) {
  const { trip, base } = ctx;
  const now = new Date();
  const [assignments, forecast] = await Promise.all([
    getStore().assignments(trip.slug),
    getForecast(trip.homebase.lat, trip.homebase.lng, trip.timezone),
  ]);
  const day = todayFor(trip.days, trip.timezone, now);
  const index = trip.days.findIndex((d) => d.date === day.date);
  const rule = trip.days[index];
  const slots = buildSlots(trip.days).filter((s) => s.date === day.date);
  const byId = new Map(trip.places.map((p) => [p.id, p]));
  const planned = slots.map((s) => ({ s, p: assignments[s.id] ? byId.get(assignments[s.id]!) : undefined }));
  const next = planned.find((x) => x.p)?.p;

  const [out, back] = [trip.flights[0], trip.flights[trip.flights.length - 1]];
  const beforeTrip = now < new Date(out.depart);
  const flight = beforeTrip ? out : back;
  const toGo = countdown(flight.depart, now);
  const w = forecast[day.date];

  const info: string[] = [];
  for (const f of trip.flights) {
    const ms = new Date(f.checkInCloses).getTime() - now.getTime();
    if (ms > 0 && ms < 48 * 3600_000)
      info.push(`${f.flightNo} check-in closes ${timeIn(f.checkInCloses, f.from.code === "LIS" ? trip.timezone : trip.homeTimezone)}${f.from.code === "LIS" ? "" : " ET"}.`);
  }
  if (!beforeTrip || day.date === trip.days[trip.days.length - 1].date) info.push("Swap return seats at check-in: 22B is between you.");

  return (
    <div className="grid gap-6 min-[960px]:grid-cols-[minmax(0,1fr)_320px]">
      <section className="tp-col min-w-0" style={{ gap: 20 }}>
        <div>
          <p className="tp-label m-0">
            {WEEKDAY[weekdayOf(day.date)]} · Day {index + 1} of {trip.days.length}
            {day.status === "upcoming" ? " · coming up" : ""}
          </p>
          <h1 className="t-display m-0 mt-1">{longDate(day.date)}</h1>
          {rule.note && <p className="t-caption m-0 mt-1">{rule.note}</p>}
        </div>

        <div className="tp-card">
          <h2 className="t-heading m-0">{day.status === "today" ? "Today's plan" : "The plan"}</h2>
          <ol className="tp-col m-0 list-none p-0" style={{ gap: 12 }}>
            {planned.map(({ s, p }) => (
              <li key={s.id} className="tp-col" style={{ gap: 6 }}>
                <span className="tp-label">{SLOT_LABEL[s.kind]}</span>
                {s.locked ? (
                  <div className="tp-alert tp-alert--info">{s.locked}</div>
                ) : p ? (
                  <>
                    <div className="tp-row" style={{ padding: 10, gap: 12 }}>
                      <Thumb place={p} size="md" />
                      <div className="tp-row__body">
                        <Link href={`${base}/places/${p.id}`} className="tp-row__name block text-ink no-underline">
                          {p.name}
                        </Link>
                        <div className="text-sm text-ink-2">
                          {p.location.split(",").pop()!.trim()} · {money(p.price, trip.localCurrency, trip.usdRate)}
                        </div>
                        <HoursLine place={p} />
                      </div>
                      {p.mapsUrl && (
                        <a className="tp-btn tp-btn--text" href={p.mapsUrl} target="_blank" rel="noreferrer">
                          Maps
                        </a>
                      )}
                    </div>
                    {warningsFor(p, day.date)
                      .filter((x) => x.level === "crit")
                      .map((x) => (
                        <Alert key={x.text} level="crit" small>
                          {x.text}. <Link href={`${base}/days`}>Move it in Days</Link>
                        </Alert>
                      ))}
                  </>
                ) : (
                  <div className="tp-slot__empty">
                    Nothing planned for {SLOT_LABEL[s.kind].toLowerCase()}.&nbsp;<Link href={`${base}/days`}>Pick from Unscheduled</Link>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <aside className="tp-col" aria-label="At a glance" style={{ gap: 16 }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="tp-stat" style={{ minWidth: 0 }}>
            <div className="tp-label">Weather</div>
            {w ? (
              <>
                <div className="tp-stat__value">{Math.round(w.maxC)}°C</div>
                <div className="tp-stat__sub">
                  {Math.round(w.maxC)}°C / {toF(w.maxC)}°F high, low {Math.round(w.minC)}°C / {toF(w.minC)}°F. {describeCode(w.code)}
                  {w.rainPct !== null ? `, ${w.rainPct}% rain` : ""}
                </div>
              </>
            ) : (
              <div className="tp-stat__sub mt-1">Forecast appears about 2 weeks out</div>
            )}
          </div>
          <div className="tp-stat" style={{ minWidth: 0 }}>
            <div className="tp-label">Sunset</div>
            {w ? (
              <>
                <div className="tp-stat__value">{timeIn(`${w.sunset}:00Z`, "UTC")}</div>
                <div className="tp-stat__sub">Senhora do Monte for the view</div>
              </>
            ) : (
              <div className="tp-stat__sub mt-1">With the forecast</div>
            )}
          </div>
        </div>

        <div className="tp-stat">
          <div className="tp-label">{beforeTrip ? "Leaving in" : "Flight home in"}</div>
          <div className="tp-stat__value">{toGo ?? "Departed"}</div>
          <div className="tp-stat__sub">
            {flight.flightNo} · {flight.from.code} {timeIn(flight.depart, flight.from.code === "LIS" ? trip.timezone : trip.homeTimezone)}
            {flight.from.code === "LIS" ? "" : " ET"}
          </div>
        </div>

        <div className="tp-card tp-card--compact">
          <div className="tp-label">Next booking</div>
          {next ? (
            <>
              <p className="t-subheading m-0">{next.name}</p>
              <p className="m-0 text-sm text-ink-2">{next.location}</p>
              {next.phone && <p className="tp-data m-0">{next.phone}</p>}
              <div className="flex gap-2">
                {next.mapsUrl && (
                  <a className="tp-btn tp-btn--primary" href={next.mapsUrl} target="_blank" rel="noreferrer">
                    Open in Maps
                  </a>
                )}
                {next.phone && (
                  <a className="tp-btn tp-btn--secondary" href={`tel:${next.phone.replace(/\s/g, "")}`}>
                    Call
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="m-0 text-sm text-ink-2">
              Nothing planned yet. <Link href={`${base}/days`}>Plan this day</Link>
            </p>
          )}
        </div>

        {info.map((t) => (
          <Alert key={t} level="info">
            {t}
          </Alert>
        ))}

        {beforeTrip && <FlightCard flight={out} trip={trip} title="Outbound" />}
      </aside>
    </div>
  );
}
