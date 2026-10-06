import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { devBypass } from "@/lib/auth/allow";
import { getTripRepo } from "@/lib/trips";
import { maySignIn, onSignIn } from "@/lib/trips/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ user }) {
      const repo = await getTripRepo();
      if (!(await maySignIn(repo, user.email, process.env.ALLOWED_EMAILS))) return false;
      await onSignIn(repo, user.email!, user.name ?? undefined);
      return true;
    },
  },
});

export interface Viewer {
  email: string;
  name: string;
  /** Local dev without Google sign-in: sees every trip. */
  dev?: boolean;
}

/** Signed-in viewer who may use the app (a user, an invite, or the old allowlist), or null. Local dev without Google configured gets a stand-in. */
export async function getViewer(): Promise<Viewer | null> {
  if (devBypass(process.env)) return { email: devEmail(), name: "Dev", dev: true };
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !(await maySignIn(await getTripRepo(), email, process.env.ALLOWED_EMAILS))) return null;
  return { email, name: session.user?.name ?? email };
}

/** Local dev stand-in: the first allowlisted address, so the seeded trips show up on the home page. */
function devEmail(): string {
  return process.env.ALLOWED_EMAILS?.split(",")[0]?.trim() || "dev@localhost";
}
