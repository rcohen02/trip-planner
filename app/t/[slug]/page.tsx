import { ownerContext } from "@/lib/context";
import { TodayView } from "@/app/_views/Today";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <TodayView ctx={await ownerContext((await params).slug)} />;
}
