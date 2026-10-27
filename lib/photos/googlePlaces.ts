/** Pure helpers for Google Places (New) photos. The API key is only ever sent in a header, server-side. */

const BASE = "https://places.googleapis.com/v1";

export interface PlaceDetails {
  photos?: { name: string }[];
}

export function firstPhotoName(details: PlaceDetails): string | null {
  return details.photos?.[0]?.name ?? null;
}

/** Returns JSON with a photoUri, so the key is never forwarded to another host. */
export function photoMediaUrl(photoName: string, maxWidthPx: number): string {
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
}

export function placeDetailsRequest(placeId: string, apiKey: string): { url: string; headers: Record<string, string> } {
  return {
    url: `${BASE}/places/${placeId}`,
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "photos" },
  };
}
