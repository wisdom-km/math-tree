import { pieceGeometry } from "./geometry";
import { checkLength, checkWidth } from "./pattern";
import {
  GUESS_R,
  LAWN_D_M,
  LAWN_PRICE,
  N_BASE,
  N_EASTER,
  N_VALUES,
  PI_TEXTBOOK,
  TABLE_D_M,
  TABLE_MAX_ROWS,
  VERIFY_TOLERANCE,
  type Assembly,
  type CoreState,
  type NValue,
  type Step,
} from "./types";

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/* ---------- 圆本身 ---------- */

export function diameter(s: CoreState): number {
  return s.r * 2;
}
/** 精确周长（内部 Math.PI，只做几何） */
export function exactC(s: CoreState): number {
  return 2 * Math.PI * s.r;
}
/** 展示 / 公式用周长：恒用 3.14 */
export function formulaC(r: number): number {
  return round2(2 * PI_TEXTBOOK * r);
}
/** 精确面积 πr²（真值；只在揭示后作为「精确面积」对照） */
export function exactS(s: CoreState): number {
  return Math.PI * s.r * s.r;
}
/** 教材口径的面积 3.14 × r × r（活公式、验证、猜一猜对照） */
export function formulaS(r: number): number {
  return round2(PI_TEXTBOOK * r * r);
}
export function piText(s: CoreState): string {
  return s.piPrecision;
}

/* ---------- 拼合几何派生量（真实弦长 / 弓高，不加噪声；已拍板第 1 条） ---------- */

export interface Approx {
  /** rect：长；tri：每份底 */
  length: number;
  /** rect：宽；tri：每份高 */
  width: number;
  /** rect：长 × 宽；tri：n × ½ × 底 × 高 —— 两者数值相同 */
  area: number;
}

/** 拼成长方形：长 = n/2 × 弦长 → πr；宽 = r·cos(π/n) → r */
export function rectApprox(r: number, n: NValue): Approx {
  const g = pieceGeometry(r, n);
  const length = (n / 2) * g.chord;
  const width = g.apothem;
  return { length, width, area: length * width };
}

/** 拆成三角形：底 = 弦长，高 = r·cos(π/n)，n 份合计 */
export function triApprox(r: number, n: NValue): Approx {
  const g = pieceGeometry(r, n);
  return { length: g.chord, width: g.apothem, area: n * 0.5 * g.chord * g.apothem };
}

export function approxFor(r: number, n: NValue, assembly: Assembly): Approx {
  return assembly === "rect" ? rectApprox(r, n) : triApprox(r, n);
}

/** 当前 (r, n, 拼法) 的近似值，保留两位 */
export function currentApprox(s: CoreState): { length: number; width: number; area: number } {
  const a = approxFor(s.r, s.n, s.assembly);
  return { length: round2(a.length), width: round2(a.width), area: round2(a.area) };
}

/**
 * 还差多少（「精确」− 近似），揭示后说明「越多越接近」。
 * 「精确」取界面上展示的 3.14 × r²（与教材一致），而非 Math.PI；n = 128 时 |差| < 0.02（彩蛋文案依据）。
 */
export function gapToTrue(s: CoreState): number {
  return formulaS(s.r) - approxFor(s.r, s.n, s.assembly).area;
}

/* ---------- 状态谓词 ---------- */

/** 拼合到位 */
export function assembled(s: CoreState): boolean {
  return s.cutDone && s.assembleT >= 1;
}

export function canAddRow(s: CoreState): boolean {
  return assembled(s) && s.table.length < TABLE_MAX_ROWS;
}

/** 同 (n, r, 拼法) 已记过 */
export function duplicateRow(s: CoreState): boolean {
  return s.table.some((row) => row.n === s.n && Math.abs(row.r - s.r) < 0.05 && row.assembly === s.assembly);
}

/** 拼合到位但这一组还没加入数据表（改 n / r 前的误触提示） */
export function unrecordedAssembly(s: CoreState): boolean {
  return assembled(s) && !duplicateRow(s);
}

/** 表里同 r 的行是否已到 3 档不同 n（「和什么有关？」徽章） */
export function relationBadgeAvailable(s: CoreState): boolean {
  const ns = new Set(s.table.filter((row) => Math.abs(row.r - s.r) < 0.05).map((row) => row.n));
  return ns.size >= 3;
}

export function distinctN(s: CoreState): number {
  return new Set(s.table.map((row) => row.n)).size;
}

/** 步骤 4 → 5：≥ 3 行且至少 2 档不同 n */
export function tableReady(s: CoreState): boolean {
  return s.table.length >= 3 && distinctN(s) >= 2;
}

export function guessValid(s: CoreState): boolean {
  const { low, likely, high } = s.guess;
  return low !== null && likely !== null && high !== null && low < likely && likely < high;
}

/** 外接正方形面积（边长 = 直径），步骤 2 参照 */
export function guessSquareArea(): number {
  return (2 * GUESS_R) * (2 * GUESS_R);
}

export function lengthOk(s: CoreState): boolean {
  return s.patternBlank.length !== null && checkLength(s.patternBlank.length).ok;
}
export function widthOk(s: CoreState): boolean {
  return s.patternBlank.width !== null && checkWidth(s.patternBlank.width).ok;
}
export function patternOk(s: CoreState): boolean {
  return lengthOk(s) && widthOk(s);
}
export function discoveryFilled(s: CoreState): boolean {
  return s.discoveryText.find.trim().length > 0 && s.discoveryText.because.trim().length > 0;
}

/** n 档位：128 为彩蛋（老师模式常显，或长按解锁） */
export function n128Available(s: CoreState): boolean {
  return s.mode === "teacher" || s.n128Unlocked;
}
export function availableN(s: CoreState): NValue[] {
  return n128Available(s) ? [...N_VALUES] : [...N_BASE];
}
export function isEasterN(n: NValue): boolean {
  return n === N_EASTER;
}

/* ---------- 步骤 7 ---------- */

export type VerifyHint = "circumference" | "diameter" | null;

export interface VerifyResult {
  exact: number;
  assembledApprox: number;
  diff: number;
  relative: number;
  ok: boolean;
  direction: "over" | "under" | "equal";
  hint: VerifyHint;
}

/**
 * 预测偏差的归因提示：
 * - ≈ 2πr（= πd = π × 2r，即把 r² 当成 2r 或算成了周长）→ 「你算的可能是周长；r² 是 r × r」
 * - ≈ πd² → 「用的是直径还是半径？」
 */
export function verifyHint(sPred: number, r: number): VerifyHint {
  const near = (target: number) => target > 0 && Math.abs(sPred - target) / target < 0.05;
  if (near(2 * PI_TEXTBOOK * r)) return "circumference";
  if (near(PI_TEXTBOOK * (2 * r) * (2 * r))) return "diameter";
  return null;
}

export function verifyResult(s: CoreState): VerifyResult | null {
  const { sPred, assembled: approx, done } = s.verify;
  if (!done || sPred === null || approx === null) return null;
  const exact = formulaS(s.verify.rPred);
  const diff = round2(sPred - exact);
  const relative = Math.abs(diff) / exact;
  const ok = relative <= VERIFY_TOLERANCE;
  return {
    exact,
    assembledApprox: approx,
    diff,
    relative,
    ok,
    direction: diff > 0.005 ? "over" : diff < -0.005 ? "under" : "equal",
    hint: ok ? null : verifyHint(sPred, s.verify.rPred),
  };
}

/** 任务 B：圆形桌面 d = 1 m → r = 0.5 m，S = 0.785 m² */
export function tableExpected(): { r: number; s: number } {
  const r = TABLE_D_M / 2;
  return { r, s: Math.round(PI_TEXTBOOK * r * r * 10000) / 10000 };
}
/** 任务 C：草坪 d = 20 m → S = 314 m²，钱 = 2512 元 */
export function lawnExpected(): { r: number; s: number; cost: number } {
  const r = LAWN_D_M / 2;
  const s = round2(PI_TEXTBOOK * r * r);
  return { r, s, cost: round2(s * LAWN_PRICE) };
}
export function within(pred: number | null, expected: number, tol = VERIFY_TOLERANCE): boolean {
  return pred !== null && Math.abs(pred - expected) / expected <= tol;
}

/** 步骤 7 「回到猜一猜」的参考值：示范圆 r = 4 的精确面积 3.14 × 16 */
export function guessReferenceS(): number {
  return formulaS(GUESS_R);
}

/** 举手分布里最接近参考值的候选 */
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

/* ---------- 模式 / 可见性 ---------- */

export function questionCardVisible(s: CoreState): boolean {
  return s.mode === "teacher";
}

/** 易混并排入口（已拍板沿用周长稿第 8 条：老师随时、学生第 9 步） */
export function confusionAvailable(s: CoreState): boolean {
  return s.mode === "teacher" || s.step === 9;
}

/** 揭示前界面不出现 S = πr²、πr、r² */
export function formulaVisible(s: CoreState): boolean {
  return s.formulaRevealed;
}

/** 揭示后步骤 6 起改 r 不再清拼合区，拼好的图形随 r 缩放（已拍板第 3 条） */
export function rescaleOnR(s: CoreState): boolean {
  return s.formulaRevealed || s.step >= 6;
}

export function visibleSteps(s: CoreState): Step[] {
  const all: Step[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return s.mode === "student" ? all.filter((x) => x !== 8) : all;
}

export function canAdvance(s: CoreState): boolean {
  switch (s.step) {
    case 0:
      return s.step0.correct || s.step0Skipped;
    case 1:
      return true;
    case 2:
      return guessValid(s);
    case 3:
      return s.assembleCount >= 1;
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

export function nextStepOf(s: CoreState): Step | null {
  if (s.step >= 9) return null;
  let n = (s.step + 1) as Step;
  if (n === 8 && s.mode === "student") n = 9;
  return n;
}

export function canGoto(s: CoreState, target: Step): boolean {
  if (s.mode === "student" && target === 8) return false;
  if (target <= s.maxStep) return true;
  return nextStepOf(s) === target && canAdvance(s);
}

/* ---------- 证据（交互稿 8.2）：由状态派生，界面据此写库并去重 ---------- */

export type EvidenceKey =
  | "step0Completed"
  | "step0Skipped"
  | "firstAssembly"
  | "tableRows3"
  | "triUsed"
  | "patternPassed"
  | "step5Forced"
  | "formulaRevealed"
  | "predictVerified"
  | "confusionOpened"
  | "easterN128"
  | "completed";

export function evidenceKeys(s: CoreState): EvidenceKey[] {
  const keys: EvidenceKey[] = [];
  if (s.step0.correct) keys.push("step0Completed");
  if (s.step0Skipped) keys.push("step0Skipped");
  if (s.assembleCount >= 1) keys.push("firstAssembly");
  if (s.table.length >= 3) keys.push("tableRows3");
  if (s.triUsed) keys.push("triUsed");
  if (s.patternSubmitted && patternOk(s)) keys.push("patternPassed");
  if (s.step5Forced) keys.push("step5Forced");
  if (s.formulaRevealed) keys.push("formulaRevealed");
  if (s.verify.successCount >= 1) keys.push("predictVerified");
  if (s.confusionEverOpened) keys.push("confusionOpened");
  if (s.n128Seen) keys.push("easterN128");
  if (s.completed) keys.push("completed");
  return keys;
}
