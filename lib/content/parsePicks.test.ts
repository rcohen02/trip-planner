import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePicks } from "./parsePicks";

const md = readFileSync(join(__dirname, "../fixtures/picks.md"), "utf8");
const places = parsePicks(md);
const byName = (n: string) => {
  const p = places.find((x) => x.name.startsWith(n));
  if (!p) throw new Error(`missing ${n}`);
  return p;
};

describe("parsePicks", () => {
  it("reads every place bullet and maps sections to categories", () => {
    expect(byName("MAAT").category).toBe("art");
    expect(byName("Canalha").category).toBe("food");
    expect(byName("BacoAlto").category).toBe("bar");
    expect(byName("Feira da Ladra").category).toBe("shop");
    expect(byName("Tram 12E").category).toBe("tour");
    expect(places).toHaveLength(26);
  });

  it("never imports hotels or the itinerary section", () => {
    expect(places.find((p) => p.name.includes("Late Birds"))).toBeUndefined();
    expect(places.find((p) => p.name.includes("Locke de Santa Joana"))).toBeUndefined();
    expect(places.find((p) => /Outbound|Travelers/.test(p.name))).toBeUndefined();
  });

  it("extracts the first euro price, links and the dated NYT note", () => {
    const c = byName("Canalha");
    expect(c.price).toEqual({ amount: 40, approx: true, unit: "per person", year: 2026 });
    expect(c.mapsUrl).toContain("google.com/maps");
    expect(c.phone).toBe("+351 962 152 742");
    expect(c.note).toMatch(/^Lisbon chefs' favorite/);
    expect(c.noteYear).toBe(2026);
    expect(byName("MAAT").url).toBe("https://www.maat.pt/en/plan-a-visit");
    expect(byName("Galeria Filomena Soares").price).toEqual({ amount: 0, year: 2023 });
    expect(byName("Side Bar").price).toBeNull();
    expect(byName("Monkey Mash").price).toEqual({ amount: 13.5, max: 15, year: 2023 });
    expect(byName("Tricky's").price).toEqual({ amount: 70, approx: true, unit: "for two", year: 2023 });
    expect(byName("Tram 12E").price).toEqual({ amount: 3, year: 2023 });
  });

  it("flags confirmed hours and needed bookings", () => {
    expect(byName("Casa Fernando Pessoa").hoursConfirmed).toBe(true);
    expect(byName("MAAT").hoursConfirmed).toBe(false);
    expect(byName("Canalha").needsBooking).toBe(true);
    expect(byName("Monkey Mash").needsBooking).toBe(true);
    expect(byName("Pigmeu").needsBooking).toBe(false);
  });

  it("keeps the confirmed hours text", () => {
    expect(byName("Casa Fernando Pessoa").hours).toBe("Tue–Sun 10:00–18:00, closed Mon");
    expect(byName("Museu do Tesouro Real").hours).toBe("Daily 10:00–18:00 from Oct (last entry 17:00)");
    expect(byName("Feira da Ladra").hours).toBe("Tuesdays & Saturdays (Sat Oct 10 works)");
    expect(byName("MAAT").hours).toBeNull();
  });

  it("works out open days from the hours text", () => {
    expect(byName("Casa Fernando Pessoa").openDays).toEqual([2, 3, 4, 5, 6, 0]);
    expect(byName("Feira da Ladra").openDays).toEqual([2, 6]);
    expect(byName("Museu do Tesouro Real").openDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(byName("MAAT").openDays).toEqual([0, 1, 3, 4, 5, 6]);
    expect(byName("Damas").openDays).toBeNull();
  });

  it("keeps sub-bullets as part of the note and gives stable ids", () => {
    expect(byName("Rua de São Bento").note).toContain("Sokyo Lisbon");
    expect(byName("MAAT").id).toBe("maat-museum-of-art-architecture-and-technology");
  });
});
