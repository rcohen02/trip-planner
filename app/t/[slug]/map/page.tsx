import { ownerContext } from "@/lib/context";
import { MapView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <MapView ctx={await ownerContext((await params).slug)} />;
}
