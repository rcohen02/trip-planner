import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[520px] px-4 py-16">
      <h1 className="t-title">Not found</h1>
      <p className="t-caption">This page or share link doesn't exist, or the link was turned off. Ask whoever sent it for a new one.</p>
      <Link href="/">Go to your trips</Link>
    </main>
  );
}
