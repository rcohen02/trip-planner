"use client";
import { useState } from "react";
import { Footprints } from "lucide-react";
import { uploadRoute } from "@/app/t/[slug]/actions";
import { Alert } from "./bits";

/** "Add a route": upload a Google My Maps export (.kmz/.kml). Each line in the file becomes a Walks card in Unscheduled. */
export function AddRouteButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);
  return (
    <>
      <button className="tp-btn tp-btn--secondary w-full justify-center" onClick={() => (setOpen(true), setDone(null))}>
        <Footprints className="tp-icon" aria-hidden />
        Add a walking route
      </button>
      {done && (
        <Alert level="info" small>
          Added {done.join(", ")} to Unscheduled.
        </Alert>
      )}
      {open && <AddRouteSheet slug={slug} onClose={() => setOpen(false)} onAdded={(names) => (setDone(names), setOpen(false))} />}
    </>
  );
}

function AddRouteSheet({ slug, onClose, onAdded }: { slug: string; onClose: () => void; onAdded: (names: string[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <div className="tp-scrim" onClick={onClose} />
      <form
        className="tp-sheet tp-col"
        role="dialog"
        aria-modal="true"
        aria-label="Add a walking route"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file || busy) return;
          setBusy(true);
          setError(null);
          const form = new FormData();
          form.set("file", file);
          try {
            const res = await uploadRoute(slug, form);
            if ("error" in res) setError(res.error);
            else onAdded(res.added);
          } catch {
            setError("That upload didn't go through. Check your connection and try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <p className="tp-label m-0">Add a walking route</p>
          <p className="t-subheading m-0 mt-1">From Google My Maps</p>
        </div>
        <p className="tp-help m-0">
          In My Maps, open the layer's ⋮ menu → <b>Export data</b> → KMZ. Then choose that file here. Each route line becomes a card you can put in a day.
        </p>
        <label className="tp-field">
          Route file (.kmz or .kml)
          <input
            type="file"
            accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
            className="tp-input"
            style={{ paddingTop: 10, height: "auto", paddingBottom: 10 }}
            onChange={(e) => (setFile(e.target.files?.[0] ?? null), setError(null))}
          />
        </label>
        {error && (
          <Alert level="warn" small>
            {error}
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="tp-btn tp-btn--primary flex-1" disabled={!file || busy}>
            {busy ? "Adding…" : "Add route"}
          </button>
          <button type="button" className="tp-btn tp-btn--text" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
