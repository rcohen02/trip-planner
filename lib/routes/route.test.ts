import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import type { Place } from "../content/types";
import {
  cleanAddress,
  directionsUrl,
  nearbyPlaces,
  readRouteFile,
  routeLength,
  routePlace,
  routesFromKml,
  walkLabel,
} from "./route";

const kml = readFileSync(new URL("./fixture.kml", import.meta.url), "utf8");

describe("routesFromKml", () => {
  it("makes one route per line, labelling start and end from nearby pins", () => {
    const routes = routesFromKml(kml);
    expect(routes.map((r) => r.name)).toEqual(["Seafront loop", "Short & sweet"]);
    expect(routes[0].line[0]).toEqual([38.69, -9.42]); // [lat, lng]
    expect(routes[0].line).toHaveLength(4);
    expect(routes[0].startLabel).toBe("Rua do Teste 1, Cascais");
    expect(routes[0].endLabel).toBeNull(); // no pin near the end
  });

  it("returns nothing for a file without lines", () => {
    expect(routesFromKml("<kml><Placemark><Point><coordinates>-9,38</coordinates></Point></Placemark></kml>")).toEqual([]);
  });

  it("drops postcode and country from Google addresses", () => {
    expect(cleanAddress("R. Olivença 13, 2765-262 Estoril, Portugal")).toBe("R. Olivença 13, Estoril");
    expect(cleanAddress("Cidadela")).toBe("Cidadela");
  });
});

describe("readRouteFile", () => {
  it("reads a .kml file or the KML inside a .kmz", () => {
    expect(readRouteFile("walk.kml", strToU8(kml))).toContain("Seafront loop");
    const kmz = zipSync({ "doc.kml": strToU8(kml), "images/icon-1.png": new Uint8Array([1, 2]) });
    expect(readRouteFile("walk.kmz", kmz)).toContain("Seafront loop");
  });

  it("rejects other files", () => {
    expect(() => readRouteFile("walk.gpx", strToU8("<gpx/>"))).toThrow("Choose a .kmz or .kml file");
    expect(() => readRouteFile("walk.kmz", zipSync({ "a.txt": strToU8("x") }))).toThrow("No map data in that file");
  });
});

describe("walk math", () => {
  const line: [number, number][] = [
    [38.69, -9.42],
    [38.7, -9.42],
  ];

  it("measures the route in metres", () => {
    expect(Math.round(routeLength(line))).toBe(1112); // 0.01° of latitude
  });

  it("describes distance and an easy walking time (4.5 km/h, nearest 5 min)", () => {
    expect(walkLabel(4600)).toBe("4.6 km · about 1 hr");
    expect(walkLabel(1112)).toBe("1.1 km · about 15 min");
    expect(walkLabel(6000)).toBe("6.0 km · about 1 hr 20 min");
  });

  it("lists saved places within 150 m of the line, in walking order", () => {
    const at = (id: string, lat: number | null, lng: number | null) => ({ id, lat, lng }) as Place;
    const places = [at("late", 38.699, -9.4201), at("off", 38.695, -9.41), at("early", 38.691, -9.4195), at("nowhere", null, null)];
    expect(nearbyPlaces(line, places, 150)).toEqual(["early", "late"]);
  });

  it("links to Google Maps walking directions with at most 3 waypoints (phone limit)", () => {
    const long = Array.from({ length: 50 }, (_, i) => [38.69 + i * 0.001, -9.42] as [number, number]);
    const url = new URL(directionsUrl(long));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("travelmode")).toBe("walking");
    expect(url.searchParams.get("origin")).toBe("38.69,-9.42");
    expect(url.searchParams.get("destination")).toBe("38.739,-9.42");
    expect(url.searchParams.get("waypoints")!.split("|")).toHaveLength(3);
  });
});

describe("routePlace", () => {
  it("turns a saved route into a Walks card that plans like any place", () => {
    const [r] = routesFromKml(kml);
    const p = routePlace({ id: "abc", ...r }, []);
    expect(p).toMatchObject({
      id: "route-abc",
      name: "Seafront loop",
      category: "walk",
      hoursConfirmed: true,
      needsBooking: false,
      lat: 38.69,
      lng: -9.42,
    });
    expect(p.route?.distanceM).toBeGreaterThan(1000);
    expect(p.location).toBe("From Rua do Teste 1, Cascais");
    expect(p.mapsUrl).toContain("travelmode=walking");
  });
});
