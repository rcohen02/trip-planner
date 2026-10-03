import { shareContext } from "@/lib/context";
import { MapView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <MapView ctx={await shareContext((await params).token)} />;
}
