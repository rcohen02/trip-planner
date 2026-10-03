import { ownerContext } from "@/lib/context";
import { Shell } from "@/app/_ui/Shell";

export default async function TripLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const ctx = await ownerContext((await params).slug);
  return <Shell ctx={ctx}>{children}</Shell>;
}
