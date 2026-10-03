import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowed, devBypass } from "@/lib/auth/allow";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    signIn({ user }) {
      return isAllowed(user.email, process.env.ALLOWED_EMAILS);
    },
  },
});

export interface Viewer {
  email: string;
  name: string;
}

/** Signed-in, allowlisted viewer, or null. Local dev without Google configured gets a stand-in. */
export async function getViewer(): Promise<Viewer | null> {
  if (devBypass(process.env)) return { email: "dev@localhost", name: "Dev" };
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAllowed(email, process.env.ALLOWED_EMAILS)) return null;
  return { email, name: session.user?.name ?? email };
}
