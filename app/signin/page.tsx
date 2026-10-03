import { redirect } from "next/navigation";
import { getViewer, signIn } from "@/auth";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getViewer()) redirect(safeNext);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-4">
      <p className="tp-label m-0">T2T · Time 2 Travel</p>
      <h1 className="t-title mt-1">Sign in</h1>
      <p className="t-caption m-0">For Rob and Danielle. If someone shared a trip with you, use the link they sent.</p>
      {error && (
        <div className="tp-alert tp-alert--warn mt-4">That Google account isn't on the list for this site. Sign in with the account you gave Rob.</div>
      )}
      <form
        className="mt-5"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: safeNext });
        }}
      >
        <button className="tp-btn tp-btn--primary w-full">Continue with Google</button>
      </form>
    </main>
  );
}
