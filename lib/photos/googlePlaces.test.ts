import { describe, expect, it } from "vitest";
import { firstPhotoName, photoMediaUrl, placeDetailsRequest } from "./googlePlaces";

describe("Google Places photos", () => {
  it("takes the first photo name from place details", () => {
    expect(firstPhotoName({ photos: [{ name: "places/abc/photos/one" }, { name: "places/abc/photos/two" }] })).toBe(
      "places/abc/photos/one",
    );
  });

  it("returns null when the place has no photos", () => {
    expect(firstPhotoName({})).toBeNull();
    expect(firstPhotoName({ photos: [] })).toBeNull();
  });

  it("builds a media URL for a photo at a set width", () => {
    expect(photoMediaUrl("places/abc/photos/one", 1000)).toBe(
      "https://places.googleapis.com/v1/places/abc/photos/one/media?maxWidthPx=1000&skipHttpRedirect=true",
    );
  });

  it("asks for only the photos field, with the key in a header not the URL", () => {
    const req = placeDetailsRequest("ChIJabc", "secret-key");
    expect(req.url).toBe("https://places.googleapis.com/v1/places/ChIJabc");
    expect(req.headers["X-Goog-FieldMask"]).toBe("photos");
    expect(req.headers["X-Goog-Api-Key"]).toBe("secret-key");
    expect(req.url).not.toContain("secret-key");
  });
});
