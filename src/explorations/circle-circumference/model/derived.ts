import { Polygon } from "@mathigon/euclid";
import { checkPattern } from "./pattern";
import {
  GUESS_D,
  PI_TEXTBOOK,
  TABLE_MAX_ROWS,
  VERIFY_TOLERANCE,
  type CoreState,
  type PolygonSides,
  type Step,
} from "./types";

export const TWO_PI = Math.PI * 2;

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** 半径 */
export function radius(s: CoreState): number {
  return s.d / 2;
}

/** 有效滚动半径：几何半径 × 本圈误差系数（模拟「量得」的 ±1%） */
export function effectiveRadius(s: CoreState): number {
  return radius(s) * s.noise;
}

/** 精确周长（内部用 Math.PI，只做几何） */
export function exactC(s: CoreState): number {
  return Math.PI * s.d;
}

/** 本圈测量周长（满圈时地面高亮段的长度），保留两位 */
export function measuredC(s: CoreState): number {
  return round2(exactC(s) * s.noise);
}

/** 已滚过的地面长度 = 转角 × 有效半径（无打滑） */
export function rolledLength(s: CoreState): number {
  return s.rollAngle * effectiveRadius(s);
}

/** 滚动进度 0…1 */
export function rollProgress(s: CoreState): number {
  return Math.min(1, s.rollAngle / TWO_PI);
}

/** 当前（未冻结）比值 */
export function currentRatio(s: CoreState): number {
  return round2(measuredC(s) / s.d);
}

/** 揭示后公式用的周长：主计算恒用 3.14 */
export function formulaC(s: CoreState): number {
  return round2(PI_TEXTBOOK * s.d);
}

/** 展示用 π 文本 */
export function piText(s: CoreState): string {
  return s.piPrecision;
}

/** 红点在轮上的角位置（SVG y 向下坐标，π/2 为贴地） */
export function redPointAngle(s: CoreState): number {
  return Math.PI / 2 + s.rollAngle;
}

export function canAddRow(s: CoreState): boolean {
  return s.rollLocked && s.table.length < TABLE_MAX_ROWS;
}

/** 数据表弱提示（交互稿 5.4） */
export function tableHint(s: CoreState): string | null {
  if (!s.rollLocked) return null;
  const last = s.table[s.table.length - 1];
  if (!last) return null;
  if (Math.abs(last.d - s.d) < 0.3) return "换一个差得多一点的直径，规律更明显";
  if (s.table.some((r) => Math.abs(r.d - s.d) < 0.05)) return "已经有过接近的直径";
  return null;
}

export function tableReady(s: CoreState): boolean {
  return s.table.length >= 3 && s.table.every((r) => Number.isFinite(r.ratio) && r.ratio > 0);
}

export function guessValid(s: CoreState): boolean {
  const { low, likely, high } = s.guess;
  return low !== null && likely !== null && high !== null && low < likely && likely < high;
}

export function patternOk(s: CoreState): boolean {
  return s.patternBlank !== null && checkPattern(s.patternBlank).ok;
}

export function discoveryFilled(s: CoreState): boolean {
  return s.discoveryText.find.trim().length > 0 && s.discoveryText.because.trim().length > 0;
}

/** 步骤 7 任务 A 结果 */
export interface VerifyResult {
  diff: number;
  relative: number;
  ok: boolean;
  direction: "over" | "under" | "equal";
  /** 偏差大时的提示：是否像用了半径当直径 */
  usedRadiusHint: boolean;
}
export function verifyResult(s: CoreState): VerifyResult | null {
  const { cPred, measured, done } = s.verify;
  if (!done || cPred === null || measured === null) return null;
  const diff = round2(cPred - measured);
  const relative = Math.abs(diff) / measured;
  const halfLike = Math.abs(cPred - measured / 2) / (measured / 2) < 0.05;
  return {
    diff,
    relative,
    ok: relative <= VERIFY_TOLERANCE,
    direction: diff > 0.005 ? "over" : diff < -0.005 ? "under" : "equal",
    usedRadiusHint: !(relative <= VERIFY_TOLERANCE) && halfLike,
  };
}

/** 步骤 7 「回到猜一猜」的参考实测值：示范圆（d = 4）那一行；没有就用 3.14 × 4 */
export function guessReferenceC(s: CoreState): number {
  const row = s.table.find((r) => Math.abs(r.d - GUESS_D) < 0.05);
  return row ? row.C : round2(PI_TEXTBOOK * GUESS_D);
}

/** 举手分布里最接近参考实测值的候选 */
export function closestCandidate(s: CoreState, step: Step, reference: number): string | null {
  const list = s.handVotes[step] ?? [];
  let best: { label: string; diff: number } | null = null;
  for (const c of list) {
    const v = parseFloat(c.label);
    if (!Number.isFinite(v)) continue;
    const diff = Math.abs(v - reference);
    if (!best || diff < best.diff) best = { label: c.label, diff };
  }
  return best?.label ?? null;
}

/** 割圆术：圆内接正 n 边形周长与比值（@mathigon/euclid） */
export interface PolygonApprox {
  n: PolygonSides;
  perimeter: number;
  ratio: number;
  gap: number;
}
export function polygonApprox(s: CoreState, n: PolygonSides = s.easter.nSides): PolygonApprox {
  const poly = Polygon.regular(n, radius(s));
  const perimeter = poly.circumference;
  return { n, perimeter, ratio: perimeter / s.d, gap: exactC(s) - perimeter };
}

/** 正方形对照：边长 a = d，周长 4d */
export function squarePerimeter(s: CoreState): number {
  return 4 * s.d;
}

/** 易混并排：面积（只演示不讲） */
export function areaTextbook(s: CoreState): number {
  const r = radius(s);
  return round2(PI_TEXTBOOK * r * r);
}

/** 提问卡按钮是否可见 */
export function questionCardVisible(s: CoreState): boolean {
  return s.mode === "teacher";
}

/** 易混并排入口是否可开（已拍板：老师模式随时可开、学生模式第 9 步才出现） */
export function confusionAvailable(s: CoreState): boolean {
  return s.mode === "teacher" || s.step === 9;
}

/** 揭示前界面不出现 π、C=πd、C=2πr */
export function formulaVisible(s: CoreState): boolean {
  return s.piRevealed;
}

/** 步骤条可见步骤：学生模式隐藏步骤 8 */
export function visibleSteps(s: CoreState): Step[] {
  const all: Step[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return s.mode === "student" ? all.filter((x) => x !== 8) : all;
}

/** 进入下一步的条件（交互稿第 5 节各步「进入下一步条件」） */
export function canAdvance(s: CoreState): boolean {
  switch (s.step) {
    case 0:
      return s.step0.correct || s.step0Skipped;
    case 1:
      return true;
    case 2:
      return guessValid(s);
    case 3:
      return s.rollCount >= 1;
    case 4:
      return tableReady(s);
    case 5:
      return (patternOk(s) && discoveryFilled(s)) || s.step5Forced;
    case 6:
      return true;
    case 7:
      return s.verify.successCount >= 1 || s.verify.done;
    case 8:
      return true;
    case 9:
      return false;
    default:
      return false;
  }
}

/** 下一步的编号（学生模式跳过 8） */
export function nextStepOf(s: CoreState): Step | null {
  if (s.step >= 9) return null;
  let n = (s.step + 1) as Step;
  if (n === 8 && s.mode === "student") n = 9;
  return n;
}

/** 某步是否可点（回看 ≤ maxStep，或满足条件前进一步） */
export function canGoto(s: CoreState, target: Step): boolean {
  if (s.mode === "student" && target === 8) return false;
  if (target <= s.maxStep) return true;
  return nextStepOf(s) === target && canAdvance(s);
}

/** 证据事件（交互稿 8.2）：由状态派生，界面据此写库并去重 */
export type EvidenceKey =
  | "step0Completed"
  | "fullRoll"
  | "tableRows3"
  | "patternPassed"
  | "revealSeen"
  | "predictRollSuccess"
  | "confusionOpened"
  | "polygon96"
  | "step0Skipped"
  | "step5Forced"
  | "completed";

export function evidenceKeys(s: CoreState): EvidenceKey[] {
  const keys: EvidenceKey[] = [];
  if (s.step0.correct) keys.push("step0Completed");
  if (s.step0Skipped) keys.push("step0Skipped");
  if (s.rollCount >= 1) keys.push("fullRoll");
  if (s.table.length >= 3) keys.push("tableRows3");
  if (s.patternSubmitted && patternOk(s)) keys.push("patternPassed");
  if (s.step5Forced) keys.push("step5Forced");
  if (s.piRevealed) keys.push("revealSeen");
  if (s.verify.successCount >= 1) keys.push("predictRollSuccess");
  if (s.confusionEverOpened) keys.push("confusionOpened");
  if (s.easter.maxSidesSeen === 96) keys.push("polygon96");
  if (s.completed) keys.push("completed");
  return keys;
}
