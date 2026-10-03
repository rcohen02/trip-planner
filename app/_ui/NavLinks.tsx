"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({
  base,
  tabs,
  variant,
}: {
  base: string;
  tabs: { href: string; label: string }[];
  variant: "top" | "bottom";
}) {
  const path = usePathname();
  const isActive = (href: string) => (href === "" ? path === base : path.startsWith(base + href));
  if (variant === "top") {
    return (
      <ul className="flex gap-1">
        {tabs.map((t) => (
          <li key={t.label}>
            <Link
              href={base + t.href}
              aria-current={isActive(t.href) ? "page" : undefined}
              className="rounded-md px-3 py-1.5 text-sm text-mist hover:text-paper aria-[current=page]:bg-plum aria-[current=page]:text-paper"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-6">
      {tabs.map((t) => (
        <li key={t.label}>
          <Link
            href={base + t.href}
            aria-current={isActive(t.href) ? "page" : undefined}
            className="block py-3 text-center text-[11px] text-mist aria-[current=page]:text-mint aria-[current=page]:font-semibold"
          >
            {t.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
