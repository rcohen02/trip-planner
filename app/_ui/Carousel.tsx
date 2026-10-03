"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PlaceImage } from "@/lib/content/types";

export function Carousel({ images, name }: { images: PlaceImage[]; name: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="tp-ph aspect-[16/9] w-full" style={{ borderRadius: "var(--radius-lg)" }} aria-hidden />;
  const img = images[i];
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);
  return (
    <figure className="m-0">
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/9]" style={{ borderRadius: "var(--radius-lg)", background: "var(--placeholder)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={`${name}, photo ${i + 1} of ${images.length}`} className="h-full w-full object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="tp-btn tp-btn--secondary absolute left-2 top-1/2 -translate-y-1/2" style={{ padding: "0 10px" }}>
              <ChevronLeft className="tp-icon tp-icon-lg" aria-hidden />
            </button>
            <button onClick={() => go(1)} aria-label="Next photo" className="tp-btn tp-btn--secondary absolute right-2 top-1/2 -translate-y-1/2" style={{ padding: "0 10px" }}>
              <ChevronRight className="tp-icon tp-icon-lg" aria-hidden />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden>
              {images.map((_, k) => (
                <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: k === i ? "var(--ink)" : "var(--steel)" }} />
              ))}
            </div>
          </>
        )}
      </div>
      <figcaption className="t-caption mt-2">
        Photo {i + 1} of {images.length}:{" "}
        <a href={img.sourcePage} target="_blank" rel="noreferrer">
          {img.credit}
        </a>
        , {img.license}, via Wikimedia Commons
      </figcaption>
    </figure>
  );
}
