import type { Place } from "@/lib/content/types";

/** A simple drawing of a walking route: the line, a start dot and an end ring. No map tiles needed. */
export function RouteSketch({ place, height = 280 }: { place: Place; height?: number }) {
  const line = place.route?.line;
  if (!line || line.length < 2) return null;
  const k = Math.cos((line[0][0] * Math.PI) / 180);
  const xs = line.map(([, lng]) => lng * k);
  const ys = line.map(([lat]) => -lat);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const W = 600;
  const H = height;
  const pad = 24;
  const scale = Math.min((W - pad * 2) / (maxX - minX || 1e-6), (H - pad * 2) / (maxY - minY || 1e-6));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const pt = (i: number) => [ox + (xs[i] - minX) * scale, oy + (ys[i] - minY) * scale] as const;
  const d = xs.map((_, i) => `${i ? "L" : "M"}${pt(i)[0].toFixed(1)},${pt(i)[1].toFixed(1)}`).join(" ");
  const [sx, sy] = pt(0);
  const [ex, ey] = pt(xs.length - 1);
  return (
    <figure className="m-0 c-walk tp-sketch">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Route outline: ${place.details}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <path d={d} fill="none" stroke="var(--c)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={sx} cy={sy} r={8} fill="var(--c)" stroke="var(--surface-raised)" strokeWidth={3} />
        <circle cx={ex} cy={ey} r={7} fill="var(--surface-raised)" stroke="var(--c)" strokeWidth={4} />
      </svg>
      <figcaption className="t-caption flex flex-wrap gap-x-4 px-4 pb-3">
        <span>● Start{place.route?.startLabel ? `: ${place.route.startLabel}` : ""}</span>
        <span>○ End{place.route?.endLabel ? `: ${place.route.endLabel}` : ""}</span>
      </figcaption>
    </figure>
  );
}
