/** One place the group sleeps during a trip. `from` is the first night, `to` is the checkout day. */
export interface Stay {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  url?: string;
  phone?: string;
  email?: string;
  /** YYYY-MM-DD, first night. */
  from: string;
  /** YYYY-MM-DD, checkout day (not a night here). */
  to: string;
}

/** The stay that covers a given night (YYYY-MM-DD), or null if none does. */
export function stayOn(stays: Stay[], date: string): Stay | null {
  return stays.find((s) => s.from <= date && date < s.to) ?? null;
}
