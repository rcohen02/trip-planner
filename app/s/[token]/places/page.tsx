import { shareContext } from "@/lib/context";
import { PlacesView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <PlacesView ctx={await shareContext((await params).token)} />;
}
