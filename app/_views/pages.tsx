import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ExternalLink, House, Luggage, TrainFront } from "lucide-react";
import type { TripContext } from "@/lib/context";
import { getStore } from "@/lib/store";
import { priceMap } from "@/lib/prices";
import { warningsFor } from "@/lib/plan/plan";
import { dateLabel } from "@/lib/format";
import { DaysBoard } from "@/app/_ui/DaysBoard";
import { PlacesList } from "@/app/_ui/PlacesList";
import { Carousel } from "@/app/_ui/Carousel";
import { Checklist } from "@/app/_ui/Checklist";
import { ShareControl } from "@/app/_ui/ShareControl";
import { FlightCard } from "@/app/_ui/FlightCard";
import { Alert, CategoryTag, HoursLine, PageTitle, StatusPill } from "@/app/_ui/bits";
import { MapLoader } from "@/app/_ui/MapLoader";

export async function DaysView({ ctx }: { ctx: TripContext }) {
  const { trip, editable } = ctx;
  const [assignments, layout] = await Promise.all([getStore().assignments(trip.slug), getStore().layout(trip.slug)]);
  return (
    <>
      <PageTitle aside={<span className="t-caption">{editable ? "Drag a place into a slot, or tap a slot to add one." : ""}</span>}>Itinerary</PageTitle>
      <DaysBoard
        slug={trip.slug}
        days={trip.days}
        places={trip.places}
        clusters={trip.clusters}
        initial={assignments}
        initialLayout={layout}
        editable={editable}
        prices={priceMap(trip)}
      />
    </>
  );
}

export async function PlacesView({ ctx }: { ctx: TripContext }) {
  const { trip, base, editable } = ctx;
  const [assignments, layout] = await Promise.all([getStore().assignments(trip.slug), getStore().layout(trip.slug)]);
  return (
    <>
      <PageTitle aside={<span className="t-caption">From the NYT · prices local first, then USD at {trip.usdRate}</span>}>Places</PageTitle>
      <PlacesList
        slug={trip.slug}
        base={base}
        places={trip.places}
        clusters={trip.clusters}
        days={trip.days}
        assignments={assignments}
        layout={layout}
        prices={priceMap(trip)}
        editable={editable}
      />
    </>
  );
}

export async function PlaceDetailView({ ctx, id }: { ctx: TripContext; id: string }) {
  const { trip, base } = ctx;
  const p = trip.places.find((x) => x.id === id);
  if (!p) notFound();
  const assignments = await getStore().assignments(trip.slug);
  const slotId = Object.entries(assignments).find(([, v]) => v === p.id)?.[0];
  const cluster = trip.clusters.find((c) => c.id === p.cluster);
  const prices = priceMap(trip);
  const planDate = slotId?.split(":")[0];
  return (
    <div className="grid gap-6 min-[960px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="tp-col min-w-0" style={{ gap: 16 }}>
        <Link href={`${base}/places`} className="text-sm">
          All places
        </Link>
        <h1 className="t-display m-0">{p.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <CategoryTag category={p.category} />
          <StatusPill planned={Boolean(slotId)} />
          {planDate && <span className="t-caption">In the plan for {dateLabel(planDate)}</span>}
        </div>
        <Carousel images={p.images ?? []} name={p.name} />
        {p.note && (
          <section>
            <p className="tp-label m-0">NYT note{p.noteYear ? ` · ${p.noteYear}` : ""}</p>
            <p className="t-body mt-1">{p.note}</p>
          </section>
        )}
        {p.details && <p className="t-body m-0 text-ink-2">{p.details}</p>}
      </div>
      <aside className="tp-col" style={{ gap: 16 }}>
        <div className="tp-card">
          <dl className="tp-dl" style={{ borderTop: 0, paddingTop: 0 }}>
            <dt>Where</dt>
            <dd>{p.location}</dd>
            {cluster && (
              <>
                <dt>Area</dt>
                <dd>
                  {cluster.name} · {cluster.note}
                </dd>
              </>
            )}
            <dt>Price</dt>
            <dd className="tp-num">{prices[p.id]}</dd>
            <dt>Hours</dt>
            <dd>
              <HoursLine place={p} />
            </dd>
            {p.phone && (
              <>
                <dt>Phone</dt>
                <dd className="tp-data">{p.phone}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            {p.mapsUrl && (
              <a className="tp-btn tp-btn--primary" href={p.mapsUrl} target="_blank" rel="noreferrer">
                Open in Maps
              </a>
            )}
            {p.url && (
              <a className="tp-btn tp-btn--secondary" href={p.url} target="_blank" rel="noreferrer">
                Site <ExternalLink className="tp-icon" aria-hidden />
              </a>
            )}
            {p.phone && (
              <a className="tp-btn tp-btn--secondary" href={`tel:${p.phone.replace(/\s/g, "")}`}>
                Call
              </a>
            )}
          </div>
        </div>
        {!p.hoursConfirmed && <Alert level="warn">Hours unconfirmed. Check before heading to {p.location.split(",").pop()!.trim()}.</Alert>}
        {p.needsBooking && <Alert level="warn">Needs a booking. It's on Bookings & To-Do.</Alert>}
        {planDate &&
          warningsFor(p, planDate)
            .filter((w) => w.level === "crit")
            .map((w) => (
              <Alert key={w.text} level="crit">
                {w.text}, but it's planned for {dateLabel(planDate)}. <Link href={`${base}/days`}>Move it in Itinerary</Link>
              </Alert>
            ))}
      </aside>
    </div>
  );
}

export async function MapView({ ctx }: { ctx: TripContext }) {
  const { trip, base, editable } = ctx;
  const [assignments, layout] = await Promise.all([getStore().assignments(trip.slug), getStore().layout(trip.slug)]);
  return (
    <>
      <PageTitle>Map</PageTitle>
      <MapLoader
        slug={trip.slug}
        base={base}
        homebase={trip.homebase}
        places={trip.places}
        clusters={trip.clusters}
        days={trip.days}
        assignments={assignments}
        layout={layout}
        editable={editable}
      />
    </>
  );
}

export async function TodoView({ ctx }: { ctx: TripContext }) {
  const { trip, editable } = ctx;
  const store = getStore();
  const [done, share] = await Promise.all([store.todos(trip.slug), editable ? store.activeShare(trip.slug) : null]);
  const byId = new Map(trip.places.map((p) => [p.id, p]));
  const actions: Record<string, { label: string; href: string }> = {};
  for (const t of trip.todos) {
    const p = t.placeId ? byId.get(t.placeId) : undefined;
    if (!p) continue;
    if (p.phone) actions[t.id] = { label: "Call", href: `tel:${p.phone.replace(/\s/g, "")}` };
    else if (p.url) actions[t.id] = { label: "Site", href: p.url };
    else if (p.mapsUrl) actions[t.id] = { label: "Maps", href: p.mapsUrl };
  }
  let shareUrl: string | null = null;
  if (share) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    shareUrl = `${process.env.SITE_URL ?? `${proto}://${host}`}/s/${share.token}`;
  }
  return (
    <>
      <PageTitle>Bookings & To-Do</PageTitle>
      <div className="grid gap-6 min-[960px]:grid-cols-[minmax(0,1fr)_320px]">
        <Checklist slug={trip.slug} todos={trip.todos} initial={done} editable={editable} actions={actions} />
        {editable && (
          <aside>
            <ShareControl slug={trip.slug} url={shareUrl} />
          </aside>
        )}
      </div>
    </>
  );
}

export function LogisticsView({ ctx }: { ctx: TripContext }) {
  const { trip } = ctx;
  return (
    <>
      <PageTitle>Logistics</PageTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <FlightCard flight={trip.flights[0]} trip={trip} title="Outbound" />
        <FlightCard flight={trip.flights[trip.flights.length - 1]} trip={trip} title="Return" />
        <section className="tp-card">
          <h2 className="t-heading m-0 flex items-center gap-2">
            <House className="tp-icon tp-icon-lg" aria-hidden /> {trip.homebase.label}
          </h2>
          <p className="m-0">{trip.homebase.address}</p>
          {(trip.homebase.phone || trip.homebase.email) && (
            <p className="m-0 text-sm">
              {trip.homebase.phone && <a href={`tel:${trip.homebase.phone.replace(/\s/g, "")}`}>{trip.homebase.phone}</a>}
              {trip.homebase.phone && trip.homebase.email && " · "}
              {trip.homebase.email && <a href={`mailto:${trip.homebase.email}`}>{trip.homebase.email}</a>}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {trip.homebase.url && (
              <a className="tp-btn tp-btn--secondary" href={trip.homebase.url} target="_blank" rel="noreferrer">
                Website
              </a>
            )}
            <a
              className="tp-btn tp-btn--secondary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${trip.homebase.label}, ${trip.homebase.address}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Maps
            </a>
          </div>
        </section>
        <section className="tp-card">
          <h2 className="t-heading m-0 flex items-center gap-2">
            <Luggage className="tp-icon tp-icon-lg" aria-hidden /> Bags and tickets
          </h2>
          <ul className="m-0 pl-5 text-sm leading-6">
            {trip.bags.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
        <section className="tp-card md:col-span-2">
          <h2 className="t-heading m-0 flex items-center gap-2">
            <TrainFront className="tp-icon tp-icon-lg" aria-hidden /> Getting around
          </h2>
          <ul className="m-0 pl-5 text-sm leading-6">
            {trip.gettingAround.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

