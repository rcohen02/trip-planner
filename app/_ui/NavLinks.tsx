"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ListOrdered, Image as ImageIcon, Map as MapIcon, Ellipsis } from "lucide-react";

const TOP = [
  { href: "", label: "Today" },
  { href: "/days", label: "Days" },
  { href: "/places", label: "Places" },
  { href: "/map", label: "Map" },
  { href: "/todo", label: "Bookings & To-Do" },
  { href: "/logistics", label: "Logistics" },
];

export function NavLinks({ base, variant }: { base: string; variant: "top" | "bottom" }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const active = (href: string) => (href === "" ? path === base : path.startsWith(base + href));

  if (variant === "top") {
    return (
      <nav className="tp-nav" aria-label="Sections">
        {TOP.map((t) => (
          <Link key={t.label} href={base + t.href} aria-current={active(t.href) ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    );
  }

  const tabs = [
    { href: "", label: "Today", Icon: CalendarDays },
    { href: "/days", label: "Days", Icon: ListOrdered },
    { href: "/places", label: "Places", Icon: ImageIcon },
    { href: "/map", label: "Map", Icon: MapIcon },
  ];
  const moreActive = active("/todo") || active("/logistics");
  return (
    <>
      {more && (
        <>
          <div className="tp-scrim" onClick={() => setMore(false)} />
          <div className="tp-sheet" role="dialog" aria-label="More sections">
            <nav className="tp-col" aria-label="More sections">
              {TOP.slice(4).map((t) => (
                <Link key={t.label} href={base + t.href} className="tp-btn tp-btn--secondary justify-start" onClick={() => setMore(false)}>
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
      <nav className="tp-tabbar" aria-label="Sections">
        {tabs.map(({ href, label, Icon }) => (
          <Link key={label} href={base + href} aria-current={active(href) ? "page" : undefined}>
            <Icon className="tp-icon tp-icon-lg" aria-hidden />
            {label}
          </Link>
        ))}
        <a
          href="#more"
          aria-current={moreActive ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            setMore(true);
          }}
        >
          <Ellipsis className="tp-icon tp-icon-lg" aria-hidden />
          More
        </a>
      </nav>
    </>
  );
}

/** Days and Map get the wider board width (board-max); everything else uses page-max. */
export function Main({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const isWide = wide || /\/(days|map)$/.test(path);
  return <main className={`mx-auto px-4 pb-12 pt-5 sm:px-6 ${isWide ? "max-w-[1440px]" : "max-w-[1280px]"}`}>{children}</main>;
}
