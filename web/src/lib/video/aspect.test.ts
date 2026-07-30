import { describe, expect, it } from "vitest";
import { fitAspect } from "./aspect";

describe("fitAspect", () => {
  it("treats 16:9 as horizontal", () => {
    expect(fitAspect(1080, 1920)).toEqual({ isVertical: false, transform: 0 });
    expect(fitAspect(720, 1280)).toEqual({ isVertical: false, transform: 0 });
  });

  it("caps transform past square", () => {
    expect(fitAspect(1920, 1080)).toEqual({ isVertical: true, transform: 37.5 });
  });

  it("puts exactly-square on the scaled branch, as V1 did", () => {
    // V1's second branch was `ratio <= 1 && ratio > 0.57`, so ratio === 1
    // scales rather than capping: ((1 - 0.5625) / 2) * 100.
    expect(fitAspect(1000, 1000)).toEqual({ isVertical: true, transform: 21.875 });
  });

  it("scales transform between 16:9 and square, matching V1", () => {
    // V1: ((ratio - 0.5625) / 2) * 100
    const { isVertical, transform } = fitAspect(600, 800); // ratio 0.75
    expect(isVertical).toBe(true);
    expect(transform).toBeCloseTo(9.375, 5);
  });

  it("does not flag ratios just under the 0.57 threshold", () => {
    expect(fitAspect(569, 1000).isVertical).toBe(false);
    expect(fitAspect(571, 1000).isVertical).toBe(true);
  });

  it("degrades safely on missing or bogus dimensions", () => {
    for (const [h, w] of [[null, null], [0, 0], [-1, 100], [undefined, 500]] as const) {
      expect(fitAspect(h, w)).toEqual({ isVertical: false, transform: 0 });
    }
  });
});
