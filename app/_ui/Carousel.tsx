"use client";
import { useState } from "react";
import type { PlaceImage } from "@/lib/content/types";

export function Carousel({ images, name }: { images: PlaceImage[]; name: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return null;
  const img = images[i];
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);
  return (
    <figure className="overflow-hidden rounded-xl bg-plum-deep">
      <div className="relative aspect-[4/3] md:aspect-[16/9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={`${name}, photo ${i + 1} of ${images.length}`} className="h-full w-full object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 px-3 py-2 text-lg">
              ‹
            </button>
            <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/70 px-3 py-2 text-lg">
              ›
            </button>
          </>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-mist">
        <a href={img.sourcePage} target="_blank" rel="noreferrer" className="truncate hover:text-paper">
          {img.credit}, {img.license}, via Wikimedia Commons
        </a>
        {images.length > 1 && (
          <span className="flex shrink-0 gap-1.5" aria-hidden>
            {images.map((_, k) => (
              <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === i ? "bg-mint" : "bg-mist/40"}`} />
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
