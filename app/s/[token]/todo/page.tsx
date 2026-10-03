import { shareContext } from "@/lib/context";
import { TodoView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <TodoView ctx={await shareContext((await params).token)} />;
}
