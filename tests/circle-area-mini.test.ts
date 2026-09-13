import { describe, expect, it } from "vitest";
import {
  clampInnerR,
  clampOuterR,
  innerRBounds,
  ringAreas,
  splitTrianglesArea,
  squareCircleAreas,
} from "@/explorations/circle-area/mini/model";

describe("圆环迷你单", () => {
  it("内半径夹在 0.5 ≤ rInner ≤ R − 0.5", () => {
    expect(innerRBounds(6)).toEqual({ min: 0.5, max: 5.5 });
    expect(clampInnerR(0, 6)).toBe(0.5);
    expect(clampInnerR(6, 6)).toBe(5.5);
    expect(clampInnerR(2, 6)).toBe(2);
    expect(clampOuterR(1)).toBe(2);
    expect(clampOuterR(9)).toBe(6);
  });

  it("光盘内 2 外 6：两种算法都是 100.48；错法 π(R − r)² 是 50.24", () => {
    const a = ringAreas(6, 2);
    expect(a.outer).toBe(113.04);
    expect(a.inner).toBe(12.56);
    expect(a.diff).toBe(100.48);
    expect(a.factored).toBe(100.48);
    expect(a.trap).toBe(50.24);
    expect(a.trap).not.toBe(a.diff);
  });

  it("内圆追上外圆时环面积趋近 0", () => {
    expect(ringAreas(4, 3.5).diff).toBeLessThan(ringAreas(4, 2).diff);
    expect(ringAreas(4, 3.5).diff).toBeLessThan(15);
  });
});

describe("方圆迷你单", () => {
  it("外方内圆：S方 = 4r²，差系数恒 0.86", () => {
    for (const r of [2, 3, 4, 6]) {
      const a = squareCircleAreas(r, "outerSquare");
      expect(a.squareTimes).toBe(4);
      expect(a.square).toBeCloseTo(4 * r * r, 5);
      expect(a.coef).toBe(0.86);
      expect(a.diff).toBeCloseTo(0.86 * r * r, 1);
    }
  });

  it("外圆内方：S方 = 2r²，差系数恒 1.14；拆两个三角形合计 2r²", () => {
    for (const r of [2, 3, 4, 6]) {
      const a = squareCircleAreas(r, "innerSquare");
      expect(a.squareTimes).toBe(2);
      expect(a.coef).toBe(1.14);
      expect(splitTrianglesArea(r)).toBeCloseTo(2 * r * r, 5);
      expect(a.square).toBe(splitTrianglesArea(r));
    }
  });
});
