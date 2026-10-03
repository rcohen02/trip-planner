import type { Metadata } from "next";
import { shareContext } from "@/lib/context";
import { Shell } from "@/app/_ui/Shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedLayout({ children, params }: { children: React.ReactNode; params: Promise<{ token: string }> }) {
  const ctx = await shareContext((await params).token);
  return <Shell ctx={ctx}>{children}</Shell>;
}
