import { shareContext } from "@/lib/context";
import { DaysView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <DaysView ctx={await shareContext((await params).token)} />;
}
