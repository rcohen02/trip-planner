import { ownerContext } from "@/lib/context";
import { TodoView } from "@/app/_views/pages";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <TodoView ctx={await ownerContext((await params).slug)} />;
}
