import { describe, expect, it } from "vitest";
import { parsePicks } from "./parsePicks";
import { money } from "@/lib/format";

const line = `## Tours & Getting Around

- **Sample Tour** — Cabarete. RD$1,530–2,140 per tour. ✓ Daily 9 am–4 pm. [Site](https://example.com)
`;

describe("Dominican peso prices", () => {
  it("parses RD$ amounts from picks", () => {
    const [place] = parsePicks(line);
    expect(place.price).toMatchObject({ amount: 1530, max: 2140 });
  });

  it("shows RD$ as the symbol for DOP", () => {
    expect(money({ amount: 1530 }, "DOP", 0.01634, 2026)).toMatch(/^RD\$1530/);
  });
});
