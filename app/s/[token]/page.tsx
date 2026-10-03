import { shareContext } from "@/lib/context";
import { TodayView } from "@/app/_views/Today";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <TodayView ctx={await shareContext((await params).token)} />;
}
