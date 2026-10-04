import { ownerContext } from "@/lib/context";
import { TodayView } from "@/app/_views/Today";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const day = (await searchParams).day;
  return <TodayView ctx={await ownerContext((await params).slug)} requestedDay={typeof day === "string" ? day : undefined} />;
}
