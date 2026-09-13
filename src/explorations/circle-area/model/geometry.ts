/**
 * 剪拼几何（纯函数，单位 cm，SVG 坐标 y 向下）。
 * 每一份是圆心角 2π/n 的一份，本地坐标：尖（圆心）在原点，角平分线指向 +x。
 * 视图把 (pose) 乘上比例即可；测试直接校验数值。
 */
import type { Assembly, NValue } from "./types";

export interface Pose {
  /** 尖（原圆圆心）的位置 */
  x: number;
  y: number;
  /** 角平分线方向（弧度） */
  rot: number;
}

export interface PieceGeometry {
  /** 每份圆心角 */
  angle: number;
  /** 半角 */
  half: number;
  /** 弦长（底） */
  chord: number;
  /** 弓高之下的高（apothem） */
  apothem: number;
}

export function pieceGeometry(r: number, n: NValue): PieceGeometry {
  const angle = (2 * Math.PI) / n;
  const half = angle / 2;
  return { angle, half, chord: 2 * r * Math.sin(half), apothem: r * Math.cos(half) };
}

/** 原圆中各份的姿态（可带「移」的径向炸开量 explode，单位 cm） */
export function sourcePose(i: number, n: NValue, center: { x: number; y: number }, explode = 0): Pose {
  const rot = (i + 0.5) * ((2 * Math.PI) / n);
  return { x: center.x + explode * Math.cos(rot), y: center.y + explode * Math.sin(rot), rot };
}

export interface RectLayout {
  /** 长方形左上角（外框，去掉半份的错位） */
  x: number;
  y: number;
  /** 外框长（cm）= n/2 × 弦长 */
  length: number;
  /** 外框宽（cm）= apothem */
  width: number;
  /** 拼合图形实际占位（含两端错位的半份） */
  bbox: { x: number; y: number; w: number; h: number };
}

/**
 * 「拼成长方形」：n 份分两排交错咬合。
 * 偶数份（i 为偶）进下排、尖朝上（角平分线朝 −y）；奇数份进上排、尖朝下。
 * 下排底边 x∈[x0, x0 + (n/2)·chord]，上排底边整体右移半份。
 * origin 为拼合区中心。
 */
export function rectLayout(r: number, n: NValue, origin: { x: number; y: number }): RectLayout {
  const g = pieceGeometry(r, n);
  const length = (n / 2) * g.chord;
  const width = g.apothem;
  const bboxW = length + g.chord / 2;
  const x0 = origin.x - bboxW / 2;
  const yTop = origin.y - width / 2;
  return {
    x: x0 + g.chord / 4,
    y: yTop,
    length,
    width,
    bbox: { x: x0, y: yTop, w: bboxW, h: width },
  };
}

export function rectTargetPose(i: number, r: number, n: NValue, origin: { x: number; y: number }): Pose {
  const g = pieceGeometry(r, n);
  const L = rectLayout(r, n, origin);
  const x0 = L.bbox.x;
  const yTop = L.y;
  const k = Math.floor(i / 2);
  if (i % 2 === 0) {
    // 下排：尖在上、弧在下，角平分线朝 +y
    return { x: x0 + k * g.chord + g.chord / 2, y: yTop, rot: Math.PI / 2 };
  }
  // 上排：尖在下、弧在上，角平分线朝 −y
  return { x: x0 + (k + 1) * g.chord, y: yTop + g.apothem, rot: -Math.PI / 2 };
}

export interface TriLayout {
  /** 每行几份 */
  perRow: number;
  rows: number;
  /** 整体占位 */
  bbox: { x: number; y: number; w: number; h: number };
  chord: number;
  apothem: number;
}

/**
 * 「拆成三角形」：n 份排成一排（或几排）锯齿，底（弧）朝下、尖朝上。
 * 一排放不下（n × 弦长 > maxWidth）时换行，保证全部可见。
 */
export function triLayout(r: number, n: NValue, origin: { x: number; y: number }, maxWidth: number): TriLayout {
  const g = pieceGeometry(r, n);
  const perRow = Math.max(1, Math.min(n, Math.floor(maxWidth / g.chord)));
  const rows = Math.ceil(n / perRow);
  const rowGap = g.apothem * 0.25;
  const w = Math.min(n, perRow) * g.chord;
  const h = rows * g.apothem + (rows - 1) * rowGap;
  return {
    perRow,
    rows,
    bbox: { x: origin.x - w / 2, y: origin.y - h / 2, w, h },
    chord: g.chord,
    apothem: g.apothem,
  };
}

export function triTargetPose(i: number, r: number, n: NValue, origin: { x: number; y: number }, maxWidth: number): Pose {
  const L = triLayout(r, n, origin, maxWidth);
  const row = Math.floor(i / L.perRow);
  const col = i % L.perRow;
  const rowGap = L.apothem * 0.25;
  return {
    x: L.bbox.x + col * L.chord + L.chord / 2,
    y: L.bbox.y + row * (L.apothem + rowGap),
    rot: Math.PI / 2,
  };
}

/** 最短路径角度插值 */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, rot: lerpAngle(a.rot, b.rot, t) };
}

export interface StageLayout {
  sourceCenter: { x: number; y: number };
  assemblyOrigin: { x: number; y: number };
  /** 拼合区可用宽度（cm） */
  assemblyMaxWidth: number;
}

/** 某一份在拼合进度 t 下的姿态（含「移」炸开） */
export function piecePose(
  i: number,
  r: number,
  n: NValue,
  assembly: Assembly,
  t: number,
  moved: boolean,
  layout: StageLayout,
  explodeRatio: number,
): Pose {
  const src = sourcePose(i, n, layout.sourceCenter, moved && t === 0 ? explodeRatio * r : 0);
  if (t <= 0) return src;
  const dst =
    assembly === "rect"
      ? rectTargetPose(i, r, n, layout.assemblyOrigin)
      : triTargetPose(i, r, n, layout.assemblyOrigin, layout.assemblyMaxWidth);
  if (t >= 1) return dst;
  return lerpPose(src, dst, t);
}

/** 一份的 SVG path（本地坐标、单位 cm×scale）：尖在原点，弧从 −half 到 +half */
export function piecePath(rPx: number, half: number, straight = false): string {
  const x1 = rPx * Math.cos(-half);
  const y1 = rPx * Math.sin(-half);
  const x2 = rPx * Math.cos(half);
  const y2 = rPx * Math.sin(half);
  if (straight) return `M0 0 L${x1} ${y1} L${x2} ${y2} Z`;
  return `M0 0 L${x1} ${y1} A${rPx} ${rPx} 0 0 1 ${x2} ${y2} Z`;
}

/** 步骤 1 数格子：圆心在网格交点，统计圆内完整格与边缘不完整格 */
export function gridCount(r: number): { complete: number; partial: number } {
  const R = Math.ceil(r);
  let complete = 0;
  let partial = 0;
  const inside = (x: number, y: number) => x * x + y * y <= r * r + 1e-9;
  for (let i = -R; i < R; i++) {
    for (let j = -R; j < R; j++) {
      const corners = [inside(i, j), inside(i + 1, j), inside(i, j + 1), inside(i + 1, j + 1)];
      const c = corners.filter(Boolean).length;
      if (c === 4) complete++;
      else if (c > 0) partial++;
      else {
        // 四角都在外但圆可能穿过格子（最近点在边上）
        const nx = Math.max(i, Math.min(0, i + 1));
        const ny = Math.max(j, Math.min(0, j + 1));
        if (nx * nx + ny * ny < r * r) partial++;
      }
    }
  }
  return { complete, partial };
}

/** 步骤 1 数格子：逐格分类（供视图着色） */
export function gridCells(r: number): { i: number; j: number; kind: "complete" | "partial" }[] {
  const R = Math.ceil(r);
  const out: { i: number; j: number; kind: "complete" | "partial" }[] = [];
  const inside = (x: number, y: number) => x * x + y * y <= r * r + 1e-9;
  for (let i = -R; i < R; i++) {
    for (let j = -R; j < R; j++) {
      const c = [inside(i, j), inside(i + 1, j), inside(i, j + 1), inside(i + 1, j + 1)].filter(Boolean).length;
      if (c === 4) out.push({ i, j, kind: "complete" });
      else if (c > 0) out.push({ i, j, kind: "partial" });
      else {
        const nx = Math.max(i, Math.min(0, i + 1));
        const ny = Math.max(j, Math.min(0, j + 1));
        if (nx * nx + ny * ny < r * r) out.push({ i, j, kind: "partial" });
      }
    }
  }
  return out;
}
