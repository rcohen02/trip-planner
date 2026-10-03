"use client";
import { useState, useTransition } from "react";
import { createShare, revokeShare } from "@/app/t/[slug]/actions";

export function ShareControl({ slug, url }: { slug: string; url: string | null }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <section className="tp-card">
      <h2 className="t-heading m-0">Share a view-only link</h2>
      <p className="m-0 text-sm text-ink-2">Anyone with the link sees the plan, places and logistics without signing in. They can't change anything.</p>
      {url ? (
        <>
          <input className="tp-input w-full" readOnly value={url} aria-label="View-only link" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <button
              className="tp-btn tp-btn--primary"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <button className="tp-btn tp-btn--secondary" disabled={pending} onClick={() => start(() => revokeShare(slug))}>
              Turn off link
            </button>
          </div>
        </>
      ) : (
        <div>
          <button className="tp-btn tp-btn--primary" disabled={pending} onClick={() => start(() => createShare(slug))}>
            Create link
          </button>
        </div>
      )}
    </section>
  );
}
