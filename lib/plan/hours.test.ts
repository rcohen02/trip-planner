import { describe, expect, it } from "vitest";
import type { Place, Todo } from "../content/types";
import { applyHoursChecks, checkedPlaces, hoursTodoPlace } from "./hours";
import { todoDone } from "./booking";
import { warningsFor } from "./plan";

const place = (id: string, hoursConfirmed: boolean): Place => ({
  id, name: id, category: "art", location: "", details: "", price: null, hours: null, url: null, mapsUrl: null,
  phone: null, note: "", noteYear: null, hoursConfirmed, openDays: null, needsBooking: false,
});

describe("hours checks", () => {
  it("counts a ticked 'Confirm … hours' to-do as checked", () => {
    const todos: Todo[] = [
      { id: "confirm-maat", kind: "confirm", text: "Confirm MAAT hours", placeId: "maat" },
      { id: "confirm-fado", kind: "confirm", text: "Confirm Friday seats", placeId: "fado" },
    ];
    expect(checkedPlaces(["macam"], todos, { "confirm-maat": true, "confirm-fado": true }).sort()).toEqual(["maat", "macam"]);
  });

  it("treats a checked place as confirmed so the warning goes away", () => {
    const [maat, macam] = applyHoursChecks([place("maat", false), place("macam", false)], ["maat"]);
    expect(maat.hoursConfirmed).toBe(true);
    expect(macam.hoursConfirmed).toBe(false);
    expect(warningsFor(maat, "2026-10-10").map((w) => w.text)).not.toContain("Hours unconfirmed");
  });

  it("only links to-dos that are about confirming hours", () => {
    expect(hoursTodoPlace({ id: "confirm-maat", kind: "confirm", text: "Confirm MAAT hours", placeId: "maat" })).toBe("maat");
    expect(hoursTodoPlace({ id: "confirm-fado", kind: "confirm", text: "Confirm Friday seats", placeId: "fado" })).toBeNull();
    expect(hoursTodoPlace({ id: "book-x", kind: "book", text: "Book X hours", placeId: "x" })).toBeNull();
  });

  it("ticks the matching 'Confirm … hours' to-do for checked places", () => {
    const todos: Todo[] = [
      { id: "confirm-maat", kind: "confirm", text: "Confirm MAAT hours", placeId: "maat" },
      { id: "confirm-fado", kind: "confirm", text: "Confirm Friday seats", placeId: "fado" },
    ];
    expect(todoDone(todos, {}, {}, ["maat", "fado"])).toEqual({ "confirm-maat": true });
    expect(todoDone(todos, { "confirm-maat": true }, {}, [])).toEqual({ "confirm-maat": true }); // ticks made before this feature still count
  });
});
