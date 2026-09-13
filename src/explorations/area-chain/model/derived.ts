import {
  copyAt,
  copyLifted,
  countGridCells,
  irregularShape,
  paraArea,
  paraCut,
  paraCutRange,
  paraPieceAt,
  parallelogram,
  rectArea,
  rectangle,
  round2,
  trapArea,
  trapezoid,
  trapezoidAssembly,
  translate,
  triArea,
  triangle,
  triangleAssembly,
  type CopyAssembly,
  type GridCount,
  type ParaPieces,
  type Polygon,
} from "@/shared/shape-canvas/geometry";
import {
  FILL_ANSWER,
  PARA_FIXED,
  SHAPE_STATIONS,
  STATIONS,
  TRAP_FIXED,
  TRI_FIXED,
  type CoreState,
  type ShapeStationId,
  type StationId,
  type StationState,
} from "./types";

export function isShapeStation(s: StationId): s is ShapeStationId {
  return s !== "circle";
}

export function stationIndex(s: StationId): number {
  return STATIONS.indexOf(s);
}

export function nextStation(s: StationId): StationId | null {
  const i = stationIndex(s);
  return i < STATIONS.length - 1 ? STATIONS[i + 1]! : null;
}
export function prevStation(s: StationId): StationId | null {
  const i = stationIndex(s);
  return i > 0 ? STATIONS[i - 1]! : null;
}

/* ---------------- 第 1 站 ---------------- */

export interface RectDerived {
  a: number;
  b: number;
  shape: Polygon;
  area: number;
  grid: GridCount;
  isSquare: boolean;
  /** 不规则图形 */
  irregular: Polygon;
  irregularGrid: GridCount;
  irregularArea: number;
}
export function rectDerived(st: StationState): RectDerived {
  const a = st.param;
  const b = st.rectB;
  const shape = rectangle(a, b);
  const irregular = irregularShape();
  return {
    a,
    b,
    shape,
    area: rectArea(a, b),
    grid: countGridCells(shape),
    isSquare: Math.abs(a - b) < 1e-9,
    irregular,
    irregularGrid: countGridCells(irregular),
    irregularArea: round2(polygonAreaOf(irregular)),
  };
}
function polygonAreaOf(p: Polygon): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i]!;
    const v = p[(i + 1) % p.length]!;
    s += u.x * v.y - v.x * u.y;
  }
  return Math.abs(s) / 2;
}

/* ---------------- 第 2 站 ---------------- */

export interface ParaDerived {
  a: number;
  h: number;
  s: number;
  c: number;
  shape: Polygon;
  area: number;
  grid: GridCount;
  pieces: ParaPieces;
  /** 当前进度下剪下部分的位置 */
  pieceNow: Polygon;
  /** 剪法：三角形 / 梯形 */
  pieceKind: "triangle" | "trapezoid";
  assembled: boolean;
  newDims: { length: number; width: number };
  /** 上一次拼到位与这次面积相同 */
  sameAsBefore: boolean;
}
export function paraDerived(st: StationState): ParaDerived {
  const { a, h } = PARA_FIXED;
  const s = st.param;
  const { min, max } = paraCutRange(a, s);
  const c = Math.min(max, Math.max(min, st.cutPos));
  const shape = parallelogram(a, h, s);
  const pieces = paraCut(a, h, s, c);
  const assembled = st.cutDone && st.t >= 1 - 1e-9;
  const area = paraArea(a, h);
  let pieceNow = pieces.piece;
  if (st.cutDone) {
    // 「移」展开且未开始拼：剪下部分轻微离体；否则沿水平轨道按 t 平移
    pieceNow = st.moved && st.t === 0 ? translate(pieces.piece, -0.35, 0.35) : paraPieceAt(pieces, a, st.t);
  }
  return {
    a,
    h,
    s,
    c,
    shape,
    area,
    grid: countGridCells(shape),
    pieces,
    pieceNow,
    pieceKind: c - s < 1e-9 ? "triangle" : "trapezoid",
    assembled,
    newDims: { length: a, width: h },
    sameAsBefore: assembled && st.paraRecords.length >= 2,
  };
}

/** 第 2 站小 L3：记录里剪的位置是否至少两处不同 */
export function paraRecordsDistinct(st: StationState): number {
  return new Set(st.paraRecords.map((r) => r.c)).size;
}

/* ---------------- 第 3 站 ---------------- */

export interface CopyDerived {
  shape: Polygon;
  area: number;
  asm: CopyAssembly;
  /** 当前进度下复制体的位置；「移」展开时离体一点 */
  copyNow: Polygon | null;
  assembled: boolean;
  parallelogramArea: number;
}
export interface TriDerived extends CopyDerived {
  a: number;
  h: number;
  apexX: number;
}
export function triDerived(st: StationState): TriDerived {
  const { a } = TRI_FIXED;
  const h = st.param;
  const shape = triangle(a, h, st.triKind);
  const asm = triangleAssembly(a, h, st.triKind);
  const assembled = st.t >= 1 - 1e-9;
  return {
    a,
    h,
    apexX: shape[2]!.x,
    shape,
    area: triArea(a, h),
    asm,
    copyNow: copyPosition(st, asm),
    assembled,
    parallelogramArea: paraArea(a, h),
  };
}
function copyPosition(st: StationState, asm: CopyAssembly): Polygon | null {
  if (st.t > 0) return copyAt(asm, st.t);
  if (st.moved) return copyLifted(asm);
  return null;
}

/* ---------------- 第 4 站 ---------------- */

export interface TrapDerived extends CopyDerived {
  a: number;
  b: number;
  h: number;
}
export function trapDerived(st: StationState): TrapDerived {
  const { a, h } = TRAP_FIXED;
  const b = st.param;
  const shape = trapezoid(a, b, h);
  const asm = trapezoidAssembly(a, b, h);
  return {
    a,
    b,
    h,
    shape,
    area: trapArea(a, b, h),
    asm,
    copyNow: copyPosition(st, asm),
    assembled: st.t >= 1 - 1e-9,
    parallelogramArea: paraArea(a + b, h),
  };
}

/* ---------------- 通用 ---------------- */

/** 本站精确面积（第 4 节公式） */
export function stationArea(station: ShapeStationId, st: StationState): number {
  switch (station) {
    case "rect":
      return rectArea(st.param, st.rectB);
    case "para":
      return paraArea(PARA_FIXED.a, PARA_FIXED.h);
    case "tri":
      return triArea(TRI_FIXED.a, st.param);
    case "trap":
      return trapArea(TRAP_FIXED.a, st.param, TRAP_FIXED.h);
  }
}

/** 是否已「拼到位」（第 1 站无转化，恒 true） */
export function stationAssembled(station: ShapeStationId, st: StationState): boolean {
  if (station === "rect") return true;
  if (station === "para") return st.cutDone && st.t >= 1 - 1e-9;
  return st.t >= 1 - 1e-9;
}

/** 填空是否通过：单选看是否等于答案；梯形双空看集合是否等于 {上底, 下底} */
export function fillCheck(station: ShapeStationId, fillIn: string[]): boolean {
  const ans = FILL_ANSWER[station];
  if (station === "trap") {
    if (fillIn.length !== 2) return false;
    return ans.every((x) => fillIn.includes(x)) && fillIn.every((x) => ans.includes(x));
  }
  return fillIn.length === 1 && fillIn[0] === ans[0];
}

/** 错选时的对照反馈类型（不打叉） */
export type FillFeedback =
  | { kind: "perimeter" }
  | { kind: "slant" }
  | { kind: "half-right" }
  | { kind: "double" }
  | { kind: "borrowed" }
  | { kind: "leg" }
  | null;
export function fillFeedback(station: ShapeStationId, st: StationState): FillFeedback {
  if (!st.fillSubmitted || fillCheck(station, st.fillIn)) return null;
  const f = st.fillIn;
  switch (station) {
    case "rect":
      return f[0] === "长 + 宽" || f[0] === "(长 + 宽) × 2" ? { kind: "perimeter" } : null;
    case "para":
      if (f[0] === "底 × 斜边") return { kind: "slant" };
      if (f[0] === "长 × 宽") return { kind: "half-right" };
      return null;
    case "tri":
      if (f[0] === "× 2") return { kind: "double" };
      if (f[0] === "不用再算") return { kind: "borrowed" };
      return null;
    case "trap":
      return f.includes("腰") ? { kind: "leg" } : null;
  }
}

export function stationCompleted(s: CoreState, station: ShapeStationId): boolean {
  return s.stations[station].fillPassed;
}
export function completedStations(s: CoreState): ShapeStationId[] {
  return SHAPE_STATIONS.filter((k) => stationCompleted(s, k));
}
export function allShapeStationsCompleted(s: CoreState): boolean {
  return SHAPE_STATIONS.every((k) => stationCompleted(s, k));
}

/** 「下一站」是否亮起：本站填空通过；老师随时可点（未通过时记 skipped） */
export function canGoNext(s: CoreState): boolean {
  if (s.station === "circle") return false;
  if (s.mode === "teacher") return true;
  return isShapeStation(s.station) ? stationCompleted(s, s.station) : true;
}

export function questionCardVisible(s: CoreState): boolean {
  return s.mode === "teacher" && !s.embedded;
}

/** 嵌入模式各站显示的核心动作（交互稿 6.1） */
export function embeddedActions(station: ShapeStationId): ("cut" | "move" | "assemble")[] {
  switch (station) {
    case "rect":
      return [];
    case "para":
      return ["assemble"];
    default:
      return ["assemble"];
  }
}

/** 证据事件键（交互稿 8.2）；嵌入模式不写 */
export type EvidenceKey =
  | `stationCompleted:${ShapeStationId}`
  | `stationSkipped:${ShapeStationId}`
  | "squareCaseSeen"
  | "paraCutPositionDiscovered"
  | "playedThrough";

export function evidenceKeys(s: CoreState): EvidenceKey[] {
  if (s.embedded) return [];
  const keys: EvidenceKey[] = [];
  for (const k of SHAPE_STATIONS) {
    if (s.stations[k].fillPassed) keys.push(`stationCompleted:${k}`);
  }
  for (const k of s.skippedByTeacher) keys.push(`stationSkipped:${k}`);
  if (s.stations.rect.squareSeen) keys.push("squareCaseSeen");
  if (s.stations.para.paraDiscovery === "不影响") keys.push("paraCutPositionDiscovered");
  if (s.playThrough && s.circleEntered && allShapeStationsCompleted(s)) keys.push("playedThrough");
  return keys;
}
