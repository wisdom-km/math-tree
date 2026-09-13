import { describe, expect, it } from "vitest";
import {
  copyAt,
  countGridCells,
  irregularShape,
  paraArea,
  paraCut,
  paraCutRange,
  paraPieceAt,
  parallelogram,
  pointInPolygon,
  polygonArea,
  rectArea,
  rectangle,
  rotate,
  snapHalf,
  translate,
  trapArea,
  trapezoid,
  trapezoidAssembly,
  triArea,
  triangle,
  triangleAssembly,
  type Polygon,
} from "@/shared/shape-canvas/geometry";

/** 两个多边形顶点集合是否相同（不看顺序） */
function sameVertexSet(a: Polygon, b: Polygon): boolean {
  const key = (p: { x: number; y: number }) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  const sa = a.map(key).sort();
  const sb = b.map(key).sort();
  return sa.length === sb.length && sa.every((k, i) => k === sb[i]);
}

describe("基础几何", () => {
  it("鞋带公式：长方形、三角形", () => {
    expect(polygonArea(rectangle(6, 4))).toBe(24);
    expect(polygonArea(triangle(6, 4))).toBe(12);
  });
  it("平移、旋转保面积", () => {
    const p = parallelogram(6, 4, 2);
    expect(polygonArea(translate(p, 3, -1))).toBeCloseTo(24, 9);
    expect(polygonArea(rotate(p, { x: 1, y: 1 }, 1.2))).toBeCloseTo(24, 9);
  });
  it("半格吸附", () => {
    expect(snapHalf(2.24)).toBe(2);
    expect(snapHalf(2.26)).toBe(2.5);
    expect(snapHalf(2.75)).toBe(3);
  });
  it("点在多边形内（含边上）", () => {
    const r = rectangle(2, 2);
    expect(pointInPolygon({ x: 1, y: 1 }, r)).toBe(true);
    expect(pointInPolygon({ x: 2, y: 1 }, r)).toBe(true);
    expect(pointInPolygon({ x: 2.1, y: 1 }, r)).toBe(false);
  });
});

describe("第 1 站 · 长方形数格子", () => {
  it("整数边：整格数 = 长 × 宽，无半格", () => {
    const g = countGridCells(rectangle(6, 4));
    expect(g.full).toBe(24);
    expect(g.partial).toBe(0);
    expect(g.estimate).toBe(rectArea(6, 4));
  });
  it("半格边：多出一列半格", () => {
    const g = countGridCells(rectangle(6.5, 4));
    expect(g.full).toBe(24);
    expect(g.partial).toBe(4);
    expect(g.estimate).toBe(26);
  });
  it("正方形是长 = 宽的特例", () => {
    expect(rectArea(4, 4)).toBe(16);
    expect(countGridCells(rectangle(4, 4)).full).toBe(16);
  });
  it("不规则图形：整格 + 半格估算接近真实面积（误差 < 15%）", () => {
    const shape = irregularShape();
    const exact = polygonArea(shape);
    const g = countGridCells(shape);
    expect(g.full).toBeGreaterThan(0);
    expect(g.partial).toBeGreaterThan(0);
    expect(Math.abs(g.estimate - exact) / exact).toBeLessThan(0.15);
    // 整格全在图形内、半格不全在
    expect(g.full + g.partial).toBe(g.cells.length);
  });
});

describe("第 2 站 · 平行四边形剪 / 移 / 拼", () => {
  const a = 6;
  const h = 4;

  it("面积 = 底 × 高，与倾斜量无关", () => {
    for (const s of [0, 1, 2.5, 5]) expect(polygonArea(parallelogram(a, h, s))).toBeCloseTo(paraArea(a, h), 9);
  });

  it("剪切位置合法范围 [s, a]", () => {
    expect(paraCutRange(a, 2)).toEqual({ min: 2, max: 6 });
    expect(paraCutRange(a, 0)).toEqual({ min: 0, max: 6 });
  });

  it.each([0, 1, 2, 3.5, 5])("倾斜 s=%s：从左上顶点作高剪下三角形，右移后拼成 a × h 长方形", (s) => {
    const p = paraCut(a, h, s, s);
    expect(p.piece).toHaveLength(3);
    // 剪开后两块面积守恒
    expect(polygonArea(p.piece) + polygonArea(p.rest)).toBeCloseTo(paraArea(a, h), 9);
    // 到位后仍守恒，且刚好补成长方形
    expect(polygonArea(p.pieceTarget) + polygonArea(p.rest)).toBeCloseTo(paraArea(a, h), 9);
    expect(polygonArea(p.rect)).toBeCloseTo(a * h, 9);
    const union = [...p.rest, ...p.pieceTarget];
    for (const v of p.rect) expect(union.some((u) => Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9)).toBe(true);
  });

  it("小 L3：任意位置竖直剪（两个梯形）都拼成同一个 a × h 长方形", () => {
    const s = 2;
    const rects: Polygon[] = [];
    for (const c of [2, 3, 4.5, 6]) {
      const p = paraCut(a, h, s, c);
      if (c > s) expect(p.piece).toHaveLength(4);
      expect(polygonArea(p.piece) + polygonArea(p.rest)).toBeCloseTo(24, 9);
      expect(polygonArea(p.rect)).toBeCloseTo(24, 9);
      const w = Math.max(...p.rect.map((q) => q.x)) - Math.min(...p.rect.map((q) => q.x));
      const hh = Math.max(...p.rect.map((q) => q.y)) - Math.min(...p.rect.map((q) => q.y));
      expect([w, hh]).toEqual([a, h]);
      rects.push(p.rect);
    }
    expect(rects).toHaveLength(4);
  });

  it("剪切位置越界会被裁剪到合法范围（c = a：右边只剩一个三角形）", () => {
    const p = paraCut(a, h, 2, 10);
    expect(polygonArea(p.rest)).toBeCloseTo((2 * h) / 2, 9);
    expect(polygonArea(p.piece)).toBeCloseTo(24 - 4, 9);
    expect(polygonArea(p.rect)).toBeCloseTo(24, 9);
  });

  it("转化进度 t 插值：t=0 在原位，t=1 到位，中途面积不变", () => {
    const p = paraCut(a, h, 2, 2);
    expect(sameVertexSet(paraPieceAt(p, a, 0), p.piece)).toBe(true);
    expect(sameVertexSet(paraPieceAt(p, a, 1), p.pieceTarget)).toBe(true);
    for (const t of [0.25, 0.5, 0.9]) expect(polygonArea(paraPieceAt(p, a, t))).toBeCloseTo(polygonArea(p.piece), 9);
  });
});

describe("第 3 站 · 三角形两个一样的拼成平行四边形", () => {
  it.each(["acute", "right", "obtuse"] as const)("%s：复制体一样大，旋转 180° 后与原三角形拼成底 a、高 h 的平行四边形", (kind) => {
    const a = 6;
    const h = 4;
    const asm = triangleAssembly(a, h, kind);
    expect(polygonArea(asm.copy)).toBeCloseTo(triArea(a, h), 9);
    expect(polygonArea(asm.target)).toBeCloseTo(triArea(a, h), 9);
    expect(polygonArea(asm.parallelogram)).toBeCloseTo(paraArea(a, h), 9);
    expect(polygonArea(asm.parallelogram)).toBeCloseTo(2 * triArea(a, h), 9);
    // 到位的复制体顶点都落在平行四边形顶点上（拼合无缝）
    for (const v of asm.target) {
      expect(asm.parallelogram.some((u) => Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9)).toBe(true);
    }
    // 中途面积守恒
    for (const t of [0, 0.3, 0.7, 1]) expect(polygonArea(copyAt(asm, t))).toBeCloseTo(triArea(a, h), 9);
    expect(sameVertexSet(copyAt(asm, 1), asm.target)).toBe(true);
  });
  it("高改变时面积随之变，底不变", () => {
    expect(triArea(6, 4)).toBe(12);
    expect(triArea(6, 8)).toBe(24);
    expect(triangle(6, 8)[1]).toEqual({ x: 6, y: 0 });
  });
});

describe("第 4 站 · 梯形两个一样的拼成平行四边形", () => {
  it.each([1, 3, 5])("上底 b=%s：拼成底 (a + b)、高 h 的平行四边形，梯形是它的一半", (b) => {
    const a = 6;
    const h = 4;
    const asm = trapezoidAssembly(a, b, h);
    expect(polygonArea(trapezoid(a, b, h))).toBeCloseTo(trapArea(a, b, h), 9);
    expect(polygonArea(asm.target)).toBeCloseTo(trapArea(a, b, h), 9);
    expect(polygonArea(asm.parallelogram)).toBeCloseTo((a + b) * h, 9);
    expect(polygonArea(asm.parallelogram)).toBeCloseTo(2 * trapArea(a, b, h), 9);
    // 拼成的平行四边形底边从 0 到 a + b
    const xs = asm.parallelogram.filter((p) => p.y === 0).map((p) => p.x).sort((x, y) => x - y);
    expect(xs).toEqual([0, a + b]);
    // 到位的复制体顶点都落在平行四边形边界上（拼合无缝、不出界）
    for (const v of asm.target) expect(pointInPolygon(v, asm.parallelogram)).toBe(true);
    for (const v of asm.copy) expect(pointInPolygon(v, asm.parallelogram)).toBe(true);
    expect(polygonArea(asm.copy) + polygonArea(asm.target)).toBeCloseTo(polygonArea(asm.parallelogram), 9);
    expect(sameVertexSet(copyAt(asm, 1), asm.target)).toBe(true);
  });
  it("公式 (上底 + 下底) × 高 ÷ 2", () => {
    expect(trapArea(6, 3, 4)).toBe(18);
    expect(trapArea(6, 0, 4)).toBe(triArea(6, 4));
    expect(trapArea(6, 6, 4)).toBe(paraArea(6, 4));
  });
});
