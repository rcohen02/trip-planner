import { shareContext } from "@/lib/context";
import { PlaceDetailView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  return <PlaceDetailView ctx={await shareContext(token)} id={id} />;
}
