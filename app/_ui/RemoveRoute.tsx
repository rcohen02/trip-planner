"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeRoute } from "@/app/t/[slug]/actions";

/** Delete an uploaded walking route, with a second tap to confirm (no browser dialogs). */
export function RemoveRouteButton({ slug, routeId, back }: { slug: string; routeId: string; back: string }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (!confirm)
    return (
      <button className="tp-btn tp-btn--text" onClick={() => setConfirm(true)}>
        Delete this route
      </button>
    );
  return (
    <div className="tp-col" style={{ gap: 8 }}>
      <p className="tp-help m-0">It leaves your plan and loses any booking. You can upload the file again later.</p>
      <div className="flex gap-2">
        <button
          className="tp-btn tp-btn--primary"
          style={{ background: "var(--crit)", borderColor: "var(--crit)" }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await removeRoute(slug, routeId);
            router.push(back);
          }}
        >
          {busy ? "Deleting…" : "Delete route"}
        </button>
        <button className="tp-btn tp-btn--text" onClick={() => setConfirm(false)}>
          Keep it
        </button>
      </div>
    </div>
  );
}
