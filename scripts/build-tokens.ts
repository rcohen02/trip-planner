/** design/tokens.json (Trip Planner design system) → design/tokens.css. Usage: npx tsx scripts/build-tokens.ts */
import { readFileSync, writeFileSync } from "node:fs";

type Val = string | { light: string; dark: string };
const t = JSON.parse(readFileSync("design/tokens.json", "utf8"));
const colors: { name: string; value: Val }[] = t.color.tokens;
const byName = new Map(colors.map((c) => [c.name, c.value]));

function resolve(v: string, theme: "light" | "dark"): string {
  const m = v.match(/^\{(.+)\}$/);
  if (!m) return v;
  const ref = byName.get(m[1]);
  if (ref === undefined) throw new Error(`unknown token ${v}`);
  return resolve(typeof ref === "string" ? ref : ref[theme], theme);
}
const block = (theme: "light" | "dark") =>
  colors.map((c) => `  --${c.name}: ${resolve(typeof c.value === "string" ? c.value : c.value[theme], theme)};`).join("\n");

const plain = [...t.spacing.tokens, ...t.radius.tokens, ...t.size.tokens].map(
  (s: { name: string; value: string }) => `  --${s.name}: ${s.value};`,
);
const shadow = (theme: "light" | "dark") =>
  t.shadow.tokens.map((s: { name: string; value: Record<string, string> }) => `  --${s.name}: ${s.value[theme]};`).join("\n");

const css = `/* Generated from design/tokens.json by scripts/build-tokens.ts. Do not edit by hand. */
:root {
  color-scheme: light dark;
  --font-sans: var(--font-plex-sans), ${t.type.families.sans};
  --font-mono: var(--font-plex-mono), ${t.type.families.mono};
${plain.join("\n")}
${block("light")}
${shadow("light")}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block("dark").replace(/^/gm, "  ")}
${shadow("dark").replace(/^/gm, "  ")}
  }
}
:root[data-theme="dark"] {
${block("dark")}
${shadow("dark")}
}
`;
writeFileSync("design/tokens.css", css);
console.log("wrote design/tokens.css");
