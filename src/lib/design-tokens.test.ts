import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import tokens from "@docs/design-tokens.json";

// Garante que as cores do CSS continuam iguais às do asset pack (docs/design-tokens.json).
const css = readFileSync(path.resolve(import.meta.dirname, "../styles/globals.css"), "utf8").toLowerCase();

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe("design tokens", () => {
  it.each(Object.entries(tokens.colors))("cor %s está no globals.css", (name, hex) => {
    expect(css).toContain(`--color-${kebab(name)}: ${hex.toLowerCase()};`);
  });

  it("raios e sombra conferem", () => {
    expect(css).toContain(`--radius-card: ${tokens.radii.card}px;`);
    expect(css).toContain(`--radius-button: ${tokens.radii.button}px;`);
    expect(css).toContain("0 12px 34px rgba(75, 46, 23, 0.14)");
  });
});
