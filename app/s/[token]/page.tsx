import { shareContext } from "@/lib/context";
import { TodayView } from "@/app/_views/Today";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const day = (await searchParams).day;
  return <TodayView ctx={await shareContext((await params).token)} requestedDay={typeof day === "string" ? day : undefined} />;
}
