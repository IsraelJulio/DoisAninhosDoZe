import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/presentes/abc?x=1")).toBe("/presentes/abc?x=1");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", undefined, 42])(
    "rejeita %s",
    (value) => {
      expect(safeNextPath(value, "/fallback")).toBe("/fallback");
    },
  );
});
