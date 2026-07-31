import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, parseView } from "./view";

describe("parseView", () => {
  it("accepts the two valid modes", () => {
    expect(parseView("compact")).toBe("compact");
    expect(parseView("expanded")).toBe("expanded");
  });

  it("rejects anything else, so a tampered cookie cannot break rendering", () => {
    for (const bad of ["grid", "COMPACT", "", " compact", undefined, null]) {
      expect(parseView(bad)).toBeNull();
    }
  });

  it("defaults to compact — a feed of inline players is a lot of scrolling", () => {
    expect(DEFAULT_VIEW).toBe("compact");
  });
});
