"use client";
import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="tp-ph h-[60dvh] min-h-[420px]" style={{ borderRadius: "var(--radius-lg)" }} aria-label="Loading map" />,
});

export function MapLoader(props: React.ComponentProps<typeof TripMap>) {
  return <TripMap {...props} />;
}
