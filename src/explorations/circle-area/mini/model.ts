import { formulaS, round2 } from "../model/derived";
import { PI_TEXTBOOK } from "../model/types";

/** 圆环外半径范围（与主探究单 r 一致，光盘外 6 刚好顶到上限） */
export const RING_R_MIN = 2;
export const RING_R_MAX = 6;
export const RING_INNER_FLOOR = 0.5;
export const RING_INNER_GAP = 0.5;
export const DISC_OUTER = 6;
export const DISC_INNER = 2;

export function clampOuterR(R: number): number {
  return Math.min(RING_R_MAX, Math.max(RING_R_MIN, round2(R)));
}

/** 0.5 ≤ rInner ≤ R − 0.5 */
export function innerRBounds(R: number): { min: number; max: number } {
  return { min: RING_INNER_FLOOR, max: round2(R - RING_INNER_GAP) };
}

export function clampInnerR(rInner: number, R: number): number {
  const { min, max } = innerRBounds(R);
  return Math.min(max, Math.max(min, round2(rInner)));
}

export interface RingAreas {
  /** πR²（教材 3.14） */
  outer: number;
  /** πr² */
  inner: number;
  /** πR² − πr² */
  diff: number;
  /** π(R² − r²)，与 diff 应相等 */
  factored: number;
  /** 错法 π(R − r)² */
  trap: number;
}

export function ringAreas(R: number, rInner: number): RingAreas {
  const outer = formulaS(R);
  const inner = formulaS(rInner);
  const diff = round2(outer - inner);
  const factored = round2(PI_TEXTBOOK * (R * R - rInner * rInner));
  const gap = R - rInner;
  const trap = round2(PI_TEXTBOOK * gap * gap);
  return { outer, inner, diff, factored, trap };
}

export type SquareKind = "outerSquare" | "innerSquare";

export interface SquareCircleAreas {
  circle: number;
  square: number;
  diff: number;
  r2: number;
  /** 差值 ÷ r²：外方内圆恒 0.86，外圆内方恒 1.14 */
  coef: number;
  /** 正方形是 r² 的几倍：外方 4，内方 2 */
  squareTimes: 4 | 2;
}

export function squareCircleAreas(r: number, kind: SquareKind): SquareCircleAreas {
  const r2 = round2(r * r);
  const circle = formulaS(r);
  const squareTimes: 4 | 2 = kind === "outerSquare" ? 4 : 2;
  const square = round2(squareTimes * r * r);
  const diff = kind === "outerSquare" ? round2(square - circle) : round2(circle - square);
  const coef = kind === "outerSquare" ? round2(4 - PI_TEXTBOOK) : round2(PI_TEXTBOOK - 2);
  return { circle, square, diff, r2, coef, squareTimes };
}

/** 外圆内方：两个底 2r、高 r 的三角形，面积合计 2r² */
export function splitTrianglesArea(r: number): number {
  return round2(2 * 0.5 * (2 * r) * r);
}
