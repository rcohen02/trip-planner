/** Buttons sorted into named buckets (Must do / If I can fit it in / If I pass by, or Love / Hate), plus the unsorted pool. */
export type Buckets = Record<string, string[]> & { pool: string[] };

const lower = (s: string) => s.toLowerCase();

/** Picked items go in their buckets; every other option waits in the pool, in option order. */
export function initialBuckets(keys: readonly string[], options: readonly string[], picked: Record<string, string[]>): Buckets {
  const taken = new Set(keys.flatMap((k) => picked[k] ?? []).map(lower));
  const out: Buckets = { pool: options.filter((o) => !taken.has(lower(o))) };
  for (const k of keys) out[k] = [...(picked[k] ?? [])];
  return out;
}

/**
 * Moves an item to a bucket (appended) or back to the pool. Pass `options` so an item going back to the
 * pool lands in its original spot; write-ins go to the end.
 */
export function moveChip(b: Buckets, item: string, to: string, options: readonly string[] = []): Buckets {
  if ((b[to] ?? []).includes(item)) return b;
  const out: Buckets = { pool: [] };
  for (const k of Object.keys(b)) out[k] = b[k].filter((x) => x !== item);
  if (to === "pool") {
    const order = (x: string) => {
      const i = options.indexOf(x);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    out.pool = [...out.pool, item].sort((a, c) => order(a) - order(c));
  } else {
    out[to] = [...(out[to] ?? []), item];
  }
  return out;
}

/** Adds someone's own item straight into a bucket. An existing item with the same name (any case) is moved instead. */
export function addWriteIn(b: Buckets, text: string, to: string): Buckets {
  const name = text.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name) return b;
  const existing = Object.values(b)
    .flat()
    .find((x) => lower(x) === lower(name));
  return moveChip(b, existing ?? name, to);
}
