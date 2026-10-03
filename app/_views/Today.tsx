import Link from "next/link";
import type { TripContext } from "@/lib/context";
import { getStore } from "@/lib/store";
import { buildSlots, SLOT_LABEL, todayFor, warningsFor } from "@/lib/plan/plan";
import { countdown, dateLabel, dateTimeIn, money, timeIn } from "@/lib/format";
import { describeCode, getForecast, toF } from "@/lib/weather";
import { Thumb } from "@/app/_ui/bits";

export async function TodayView({ ctx }: { ctx: TripContext }) {
  const { trip, base } = ctx;
  const now = new Date();
  const [assignments, forecast] = await Promise.all([
    getStore().assignments(trip.slug),
    getForecast(trip.homebase.lat, trip.homebase.lng, trip.timezone),
  ]);
  const day = todayFor(trip.days, trip.timezone, now);
  const rule = trip.days.find((d) => d.date === day.date)!;
  const slots = buildSlots(trip.days).filter((s) => s.date === day.date);
  const byId = new Map(trip.places.map((p) => [p.id, p]));
  const out = trip.flights[0];
  const back = trip.flights[trip.flights.length - 1];
  const beforeTrip = now < new Date(out.depart);
  const flight = beforeTrip ? out : back;
  const toGo = countdown(flight.depart, now);
  const w = forecast[day.date];

  const planned = slots.map((s) => ({ s, p: assignments[s.id] ? byId.get(assignments[s.id]!) : undefined }));
  const next = planned.find((x) => x.p)?.p;
  const alerts: string[] = [];
  for (const f of trip.flights) {
    const closes = new Date(f.checkInCloses).getTime() - now.getTime();
    if (closes > 0 && closes < 36 * 3600_000) alerts.push(`${f.flightNo} check-in closes ${dateTimeIn(f.checkInCloses, f.checkInCloses.endsWith("-04:00") ? trip.homeTimezone : trip.timezone)}`);
  }
  for (const { p } of planned) if (p) for (const warn of warningsFor(p, day.date)) if (!warn.startsWith("Hours")) alerts.push(`${p.name}: ${warn}`);

  return (
    <div className="space-y-8">
      {/* Boarding-pass hero */}
      <section className="perf overflow-hidden rounded-2xl bg-plum pt-3">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-8">
          <div>
            <p className="text-sm text-paper/80">
              {beforeTrip ? "Outbound" : "Flight home"} · {flight.airline} {flight.flightNo}
            </p>
            <div className="mt-2 flex items-end gap-4 font-display">
              <div>
                <p className="text-5xl font-extrabold tracking-tight md:text-7xl">{flight.from.code}</p>
                <p className="tabular text-lg">{timeIn(flight.depart, flight.from.code === "LIS" ? trip.timezone : trip.homeTimezone)}</p>
              </div>
              <p className="pb-8 text-3xl text-mint" aria-hidden>
                ✈
              </p>
              <div>
                <p className="text-5xl font-extrabold tracking-tight md:text-7xl">{flight.to.code}</p>
                <p className="tabular text-lg">{timeIn(flight.arrive, flight.to.code === "LIS" ? trip.timezone : trip.homeTimezone)}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-paper/80">
              {dateLabel(flight.depart.slice(0, 10))} · Seats {Object.entries(flight.seats).map(([n, s]) => `${n} ${s}`).join(", ")} · Ref {trip.bookingRef}
            </p>
          </div>
          <div className="border-t border-dashed border-paper/30 pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="text-sm text-paper/80">{toGo ? "Departs in" : "Departed"}</p>
            <p className="tabular font-display text-3xl font-bold md:text-4xl">{toGo ?? dateLabel(flight.depart.slice(0, 10))}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="font-display text-2xl font-bold">
            {day.status === "today" ? "Today" : day.status === "upcoming" ? "First day" : "Last day"}, {dateLabel(day.date)}
          </h2>
          {rule.note && <p className="mt-1 text-mist">{rule.note}</p>}
          <ol className="mt-4 divide-y divide-plum/60 rounded-xl bg-plum-deep">
            {planned.map(({ s, p }) => (
              <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-24 shrink-0 text-sm text-mist">{SLOT_LABEL[s.kind]}</span>
                {s.locked ? (
                  <span className="text-mist">{s.locked}</span>
                ) : p ? (
                  <Link href={`${base}/places/${p.id}`} className="flex min-w-0 items-center gap-3 hover:text-mint">
                    <Thumb place={p} size={40} />
                    <span className="truncate">{p.name}</span>
                  </Link>
                ) : (
                  <span className="text-mist/60">Nothing planned</span>
                )}
              </li>
            ))}
          </ol>
          <Link href={`${base}/days`} className="mt-3 inline-block text-sm text-mint underline-offset-4 hover:underline">
            Plan the days
          </Link>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-plum p-4">
            <h2 className="font-display text-lg font-bold">Weather in {trip.name}</h2>
            {w ? (
              <>
                <p className="tabular mt-2 text-3xl font-semibold">
                  {Math.round(w.maxC)}° <span className="text-lg text-mist">/ {Math.round(w.minC)}°C</span>
                </p>
                <p className="text-sm text-mist">
                  {toF(w.maxC)}° / {toF(w.minC)}°F · {describeCode(w.code)}
                  {w.rainPct !== null && ` · ${w.rainPct}% rain`}
                </p>
                <p className="mt-2 text-sm">Sunset {w.sunset.slice(11)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-mist">The forecast shows up about two weeks before {dateLabel(day.date)}.</p>
            )}
          </div>

          <div className="rounded-xl border border-plum p-4">
            <h2 className="font-display text-lg font-bold">Next up</h2>
            {next ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-base font-medium">{next.name}</p>
                <p className="text-mist">{next.location}</p>
                {next.phone && (
                  <p>
                    <a href={`tel:${next.phone.replace(/\s/g, "")}`} className="text-mint">
                      {next.phone}
                    </a>
                  </p>
                )}
                {next.mapsUrl && (
                  <a href={next.mapsUrl} className="text-mint" target="_blank" rel="noreferrer">
                    Open in Maps
                  </a>
                )}
                <p className="text-mist">{money(next.priceLocal, trip.localCurrency, trip.usdRate)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-mist">Nothing scheduled yet for this day.</p>
            )}
          </div>

          {alerts.length > 0 && (
            <div className="rounded-xl border border-amber/50 p-4">
              <h2 className="font-display text-lg font-bold text-amber">Heads up</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {alerts.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
