/** Diameter in px of a map cluster bubble that holds `count` pins: bigger groups get bigger bubbles. */
export function clusterSize(count: number): number {
  if (count >= 25) return 48;
  if (count >= 10) return 40;
  return 34;
}
