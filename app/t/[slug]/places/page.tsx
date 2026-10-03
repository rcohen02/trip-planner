import { ownerContext } from "@/lib/context";
import { PlacesView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PlacesView ctx={await ownerContext((await params).slug)} />;
}
