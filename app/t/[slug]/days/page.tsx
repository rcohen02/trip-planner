import { ownerContext } from "@/lib/context";
import { DaysView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <DaysView ctx={await ownerContext((await params).slug)} />;
}
