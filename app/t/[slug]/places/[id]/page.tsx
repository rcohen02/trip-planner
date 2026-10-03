import { ownerContext } from "@/lib/context";
import { PlaceDetailView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  return <PlaceDetailView ctx={await ownerContext(slug)} id={id} />;
}
