import Link from "next/link";
import type { TripContext } from "@/lib/context";
import { NavLinks } from "./NavLinks";

export const TABS = [
  { href: "", label: "Today" },
  { href: "/days", label: "Days" },
  { href: "/places", label: "Places" },
  { href: "/map", label: "Map" },
  { href: "/todo", label: "To-do" },
  { href: "/logistics", label: "Logistics" },
];

export function Shell({ ctx, children }: { ctx: TripContext; children: React.ReactNode }) {
  const { trip, base, editable } = ctx;
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-plum/60 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link href={editable ? "/" : base} className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold tracking-tight text-mint">T2T</span>
            <span className="font-display text-lg font-semibold">{trip.name}</span>
          </Link>
          <nav className="ml-auto hidden md:block" aria-label="Trip sections">
            <NavLinks base={base} tabs={TABS} variant="top" />
          </nav>
          {!editable && <span className="ml-auto rounded-full border border-mist/40 px-3 py-1 text-xs text-mist md:ml-0">View only</span>}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-plum/60 bg-ink/95 backdrop-blur md:hidden"
        aria-label="Trip sections"
      >
        <NavLinks base={base} tabs={TABS} variant="bottom" />
      </nav>
    </div>
  );
}
