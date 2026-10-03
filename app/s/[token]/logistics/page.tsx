import { shareContext } from "@/lib/context";
import { LogisticsView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <LogisticsView ctx={await shareContext((await params).token)} />;
}
