import Link from "next/link";
import type { TripContext } from "@/lib/context";
import { dateLabel } from "@/lib/format";
import { NavLinks, Main } from "./NavLinks";

export function Shell({ ctx, children, wide = false }: { ctx: TripContext; children: React.ReactNode; wide?: boolean }) {
  const { trip, base, editable } = ctx;
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const range = `${dateLabel(first).slice(4)}–${Number(last.slice(8))}`;
  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <header className="tp-header sticky top-0 z-40">
        <Link href={editable ? "/" : base} className="tp-trip text-ink no-underline">
          <b>{trip.name}</b>
          <span className="tp-label" style={{ letterSpacing: 0, textTransform: "none" }}>
            {range} · {trip.travelers.map((t) => t.name).join(" & ")}
          </span>
        </Link>
        <div className="hidden sm:block">
          <NavLinks base={base} variant="top" />
        </div>
        {!editable && <span className="tp-pill tp-pill--want ml-auto">View only</span>}
      </header>
      <Main wide={wide}>{children}</Main>
      <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden">
        <NavLinks base={base} variant="bottom" />
      </div>
    </div>
  );
}
