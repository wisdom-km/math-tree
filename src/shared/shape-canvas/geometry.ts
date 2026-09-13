/**
 * 面积转化链共用几何（单位 cm，原点在网格左下、y 向上）。
 * 全部是纯函数：图形顶点由参数与转化进度 t 插值算出，视图只负责画。
 */

export interface Pt {
  x: number;
  y: number;
}

export type Polygon = Pt[];

export function pt(x: number, y: number): Pt {
  return { x, y };
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** 鞋带公式，返回正值 */
export function polygonArea(poly: Polygon): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function translate(poly: Polygon, dx: number, dy: number): Polygon {
  return poly.map((p) => pt(p.x + dx, p.y + dy));
}

/** 绕 center 旋转 angle（弧度，逆时针为正） */
export function rotate(poly: Polygon, center: Pt, angle: number): Polygon {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return poly.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return pt(center.x + dx * c - dy * s, center.y + dx * s + dy * c);
  });
}

export function midpoint(a: Pt, b: Pt): Pt {
  return pt((a.x + b.x) / 2, (a.y + b.y) / 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** 对齐半格（步进 0.5 cm） */
export function snapHalf(x: number): number {
  return Math.round(x * 2) / 2;
}

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export function bounds(polys: Polygon[]): Bounds {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    }
  }
  return { xMin, xMax, yMin, yMax };
}

/** 射线法：点是否在多边形内（边上按内算，容差 1e-9） */
export function pointInPolygon(p: Pt, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (onSegment(p, a, b)) return true;
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function onSegment(p: Pt, a: Pt, b: Pt): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dot < -1e-9) return false;
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= len2 + 1e-9;
}

export interface GridCell {
  i: number;
  j: number;
  /** full：整格都在图形内；partial：部分在内（数半格） */
  kind: "full" | "partial";
}

export interface GridCount {
  cells: GridCell[];
  full: number;
  partial: number;
  /** 数格子估算：整格 + 半格 ÷ 2（四舍五入到 0.5） */
  estimate: number;
}

/**
 * 数格子：对 1 cm 方格逐格判定。
 * 整格：四角与中心都在图形内；半格：只有部分点在内。
 * 采样点用 3×3 网格（含边中点），足够区分链上五个多边形与不规则图形。
 */
export function countGridCells(poly: Polygon): GridCount {
  const b = bounds([poly]);
  const cells: GridCell[] = [];
  const i0 = Math.floor(b.xMin);
  const i1 = Math.ceil(b.xMax);
  const j0 = Math.floor(b.yMin);
  const j1 = Math.ceil(b.yMax);
  const eps = 1e-6;
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      let inside = 0;
      let total = 0;
      for (let sy = 0; sy <= 2; sy++) {
        for (let sx = 0; sx <= 2; sx++) {
          // 采样点略向格内收，避免边线上的判定抖动
          const x = i + eps + (sx / 2) * (1 - 2 * eps);
          const y = j + eps + (sy / 2) * (1 - 2 * eps);
          total++;
          if (pointInPolygon(pt(x, y), poly)) inside++;
        }
      }
      if (inside === total) cells.push({ i, j, kind: "full" });
      else if (inside > 0) cells.push({ i, j, kind: "partial" });
    }
  }
  const full = cells.filter((c) => c.kind === "full").length;
  const partial = cells.length - full;
  return { cells, full, partial, estimate: full + Math.round(partial) / 2 };
}

/* ---------------- 五站图形 ---------------- */

/** 第 1 站：长方形（左下角在原点） */
export function rectangle(a: number, b: number): Polygon {
  return [pt(0, 0), pt(a, 0), pt(a, b), pt(0, b)];
}

/**
 * 第 1 站附加：不规则图形（数格子估算用）。
 * 固定形状，参数只有缩放，保证「数不清」但估得出。
 */
export function irregularShape(scale = 1): Polygon {
  const raw: [number, number][] = [
    [0.4, 1.2],
    [1.6, 0.3],
    [3.4, 0.6],
    [5.2, 0.2],
    [6.6, 1.4],
    [6.2, 3.0],
    [6.9, 4.4],
    [5.4, 5.3],
    [3.7, 4.6],
    [2.6, 5.4],
    [1.1, 4.5],
    [0.2, 2.9],
  ];
  return raw.map(([x, y]) => pt(x * scale, y * scale));
}

/** 第 2 站：平行四边形，底 a 在 x 轴上，上底右移 s，高 h */
export function parallelogram(a: number, h: number, s: number): Polygon {
  return [pt(0, 0), pt(a, 0), pt(a + s, h), pt(s, h)];
}

/** 竖直剪切线合法范围：与上下底都相交 → c ∈ [s, a] */
export function paraCutRange(a: number, s: number): { min: number; max: number } {
  return { min: Math.min(s, a), max: Math.max(s, a) };
}

export interface ParaPieces {
  /** 留在原处的部分 */
  rest: Polygon;
  /** 剪下的部分（c = s 时是三角形，否则是梯形） */
  piece: Polygon;
  /** 剪下部分到位后的位置（右移 a） */
  pieceTarget: Polygon;
  /** 拼成的长方形 */
  rect: Polygon;
}

/** 第 2 站：沿 x = c 的竖直线（一条高）剪开，剪下部分右移 a 补到右侧 */
export function paraCut(a: number, h: number, s: number, c: number): ParaPieces {
  const { min, max } = paraCutRange(a, s);
  const cc = clamp(c, min, max);
  const piece: Polygon = cc - s < 1e-9 ? [pt(0, 0), pt(cc, 0), pt(cc, h)] : [pt(0, 0), pt(cc, 0), pt(cc, h), pt(s, h)];
  const rest: Polygon = [pt(cc, 0), pt(a, 0), pt(a + s, h), pt(cc, h)];
  return {
    rest,
    piece,
    pieceTarget: translate(piece, a, 0),
    rect: [pt(cc, 0), pt(a + cc, 0), pt(a + cc, h), pt(cc, h)],
  };
}

/** 第 2 站：转化进度 t 下剪下部分的位置（水平轨道平移） */
export function paraPieceAt(pieces: ParaPieces, a: number, t: number): Polygon {
  return translate(pieces.piece, a * clamp(t, 0, 1), 0);
}

export type TriangleKind = "acute" | "right" | "obtuse";

/** 第 3 站：三角形顶点的水平位置（底 a 在 x 轴上） */
export function triangleApexX(a: number, kind: TriangleKind): number {
  switch (kind) {
    case "right":
      return 0;
    case "obtuse":
      return a + 2;
    default:
      // 一般三角形：底中点偏右 1 cm（交互稿），避免误以为只对等腰成立
      return a / 2 + 1;
  }
}

export function triangle(a: number, h: number, kind: TriangleKind = "acute"): Polygon {
  return [pt(0, 0), pt(a, 0), pt(triangleApexX(a, kind), h)];
}

export interface CopyAssembly {
  /** 复制的「一样的」图形在原位 */
  copy: Polygon;
  /** 旋转中心：一条边的中点 */
  pivot: Pt;
  /** 到位后的位置 */
  target: Polygon;
  /** 拼成的平行四边形 */
  parallelogram: Polygon;
}

/** 第 3 站：复制一个一样的三角形，绕边 BC 中点旋转 180° 拼成平行四边形 */
export function triangleAssembly(a: number, h: number, kind: TriangleKind = "acute"): CopyAssembly {
  const tri = triangle(a, h, kind);
  const [A, B, C] = tri as [Pt, Pt, Pt];
  const pivot = midpoint(B, C);
  const target = rotate(tri, pivot, Math.PI);
  return {
    copy: tri,
    pivot,
    target,
    parallelogram: [A, B, pt(B.x + C.x, h), C],
  };
}

/** 第 4 站：梯形，下底 a 在 x 轴上，上底 b 从 x = offset 开始，高 h */
export const TRAP_TOP_OFFSET = 1.5;
export function trapezoid(a: number, b: number, h: number, offset = TRAP_TOP_OFFSET): Polygon {
  return [pt(0, 0), pt(a, 0), pt(offset + b, h), pt(offset, h)];
}

/** 第 4 站：复制一个一样的梯形，绕右腰中点旋转 180° 拼成平行四边形（底 a + b） */
export function trapezoidAssembly(a: number, b: number, h: number, offset = TRAP_TOP_OFFSET): CopyAssembly {
  const trap = trapezoid(a, b, h, offset);
  const [A, B, C, D] = trap as [Pt, Pt, Pt, Pt];
  const pivot = midpoint(B, C);
  const target = rotate(trap, pivot, Math.PI);
  return {
    copy: trap,
    pivot,
    target,
    parallelogram: [A, pt(a + b, 0), pt(a + offset + b, h), D],
  };
}

/** 复制体在进度 t 下的位置：绕 pivot 旋转 π·t（旋转 + 平移一体） */
export function copyAt(asm: CopyAssembly, t: number): Polygon {
  return rotate(asm.copy, asm.pivot, Math.PI * clamp(t, 0, 1));
}

/** 「移」：复制体离体一点，标出它是「一样的」 */
export function copyLifted(asm: CopyAssembly, dx = 0.35, dy = 0.35): Polygon {
  return translate(asm.copy, dx, dy);
}

/* ---------------- 五站公式 ---------------- */

export const rectArea = (a: number, b: number): number => round2(a * b);
export const paraArea = (a: number, h: number): number => round2(a * h);
export const triArea = (a: number, h: number): number => round2((a * h) / 2);
export const trapArea = (a: number, b: number, h: number): number => round2(((a + b) * h) / 2);
