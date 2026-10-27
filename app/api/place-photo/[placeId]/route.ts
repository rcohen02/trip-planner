import { getViewer } from "@/auth";
import { firstPhotoName, placeDetailsRequest, photoMediaUrl, type PlaceDetails } from "@/lib/photos/googlePlaces";

/**
 * Serves one Google Places photo for a signed-in viewer. The API key stays on the server:
 * place details give a photo name, the media endpoint returns a short-lived photoUri, and
 * the image is fetched from that URI without the key.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ placeId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Sign in to see photos", { status: 401 });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return new Response("Photos are not configured", { status: 503 });

  const { placeId } = await ctx.params;
  if (!/^[A-Za-z0-9_-]+$/.test(placeId)) return new Response("Bad place id", { status: 400 });

  const details = placeDetailsRequest(placeId, key);
  const detailsRes = await fetch(details.url, { headers: details.headers });
  if (!detailsRes.ok) return new Response("Photo lookup failed", { status: 502 });
  const photoName = firstPhotoName((await detailsRes.json()) as PlaceDetails);
  if (!photoName) return new Response("No photo", { status: 404 });

  const mediaRes = await fetch(photoMediaUrl(photoName, 1000), { headers: { "X-Goog-Api-Key": key } });
  if (!mediaRes.ok) return new Response("Photo fetch failed", { status: 502 });
  const { photoUri } = (await mediaRes.json()) as { photoUri?: string };
  if (!photoUri) return new Response("No photo", { status: 404 });

  const imageRes = await fetch(photoUri);
  if (!imageRes.ok || !imageRes.body) return new Response("Photo fetch failed", { status: 502 });

  return new Response(imageRes.body, {
    headers: {
      "Content-Type": imageRes.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
