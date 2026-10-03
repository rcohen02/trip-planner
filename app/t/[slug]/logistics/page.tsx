import { ownerContext } from "@/lib/context";
import { LogisticsView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <LogisticsView ctx={await ownerContext((await params).slug)} />;
}
