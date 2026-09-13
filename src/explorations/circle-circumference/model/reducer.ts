import { canGoto, measuredC, nextStepOf, round1, round2, TWO_PI } from "./derived";
import {
  BIKE_R,
  D_DEFAULT,
  D_MAX,
  D_MIN,
  HISTORY_MAX,
  MARK_EVERY_RAD,
  NOISE_AMPLITUDE,
  SNAP_RAD,
  TABLE_MAX_ROWS,
  VERIFY_TOLERANCE,
  type CoreState,
  type Mode,
  type PiPrecision,
  type PolygonSides,
  type Row,
  type State,
  type Step,
  type Step0Choice,
} from "./types";

/* ---------- 确定性随机（测试可复现） ---------- */

/** mulberry32：返回 [0,1) 与新种子 */
export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, seed: t };
}

function drawNoise(seed: number): { noise: number; seed: number } {
  const r = nextRandom(seed);
  return { noise: 1 + (r.value * 2 - 1) * NOISE_AMPLITUDE, seed: r.seed };
}

/* ---------- 初始状态 ---------- */

export interface InitOptions {
  mode?: Mode;
  seed?: number;
}

export function initialCore(opts: InitOptions = {}): CoreState {
  const { noise, seed } = drawNoise(opts.seed ?? 20220901);
  return {
    step: 0,
    maxStep: 0,
    d: D_DEFAULT,
    rollAngle: 0,
    isRolling: false,
    rollLocked: false,
    rollCount: 0,
    noise,
    seed,
    marks: [],
    table: [],
    guess: { low: null, likely: null, high: null },
    handVotes: {},
    patternBlank: null,
    discoveryText: { find: "", because: "" },
    patternSubmitted: false,
    piRevealed: false,
    piPrecision: "3.14",
    formulaEmphasis: "d",
    verify: { dPred: 5, cPred: null, locked: false, measured: null, done: false, successCount: 0 },
    bike: { r: BIKE_R, shown: false },
    mode: opts.mode ?? "teacher",
    confusionMode: false,
    confusionEverOpened: false,
    easter: { nSides: 6, squareCompare: false, maxSidesSeen: 6 },
    step0: { r0: 2, choice: null, correct: false },
    step0Skipped: false,
    step5Forced: false,
    askedQuestions: [],
    completed: false,
  };
}

export function initialState(opts: InitOptions = {}): State {
  return { ...initialCore(opts), history: [] };
}

/* ---------- 动作 ---------- */

export type Action =
  | { type: "GOTO_STEP"; step: Step }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  // 步骤 0
  | { type: "STEP0_SET_R"; r: number }
  | { type: "STEP0_CHOOSE"; choice: Step0Choice }
  | { type: "STEP0_SKIP" }
  // 直径
  | { type: "BEGIN_DRAG_D" }
  | { type: "DRAG_D"; d: number }
  | { type: "END_DRAG_D" }
  | { type: "SET_D"; d: number }
  // 滚动
  | { type: "ROLL_START" }
  | { type: "ROLL"; deltaAngle: number }
  | { type: "ROLL_END" }
  | { type: "ROLL_RESET" }
  // 数据表
  | { type: "ADD_ROW" }
  | { type: "REMOVE_LAST_ROW" }
  | { type: "RENAME_ROW"; id: string; label: string }
  // 先猜与举手
  | { type: "SET_GUESS"; field: "low" | "likely" | "high"; value: number | null }
  | { type: "ADD_CANDIDATE"; step: Step; label: string }
  | { type: "VOTE"; step: Step; label: string; delta: 1 | -1 }
  // 找规律
  | { type: "SET_PATTERN_BLANK"; value: string }
  | { type: "SET_DISCOVERY"; field: "find" | "because"; value: string }
  | { type: "SUBMIT_PATTERN" }
  | { type: "STEP5_FORCE" }
  // 揭示
  | { type: "REVEAL_PI" }
  | { type: "SET_PI_PRECISION"; precision: PiPrecision }
  | { type: "SET_FORMULA_EMPHASIS"; emphasis: "d" | "r" }
  // 验证
  | { type: "VERIFY_SET_D"; d: number }
  | { type: "VERIFY_SET_PRED"; cPred: number | null }
  | { type: "VERIFY_LOCK" }
  | { type: "VERIFY_AGAIN" }
  | { type: "BIKE_SHOW"; shown: boolean }
  // 模式 / 对比 / 彩蛋
  | { type: "SET_MODE"; mode: Mode }
  | { type: "SET_CONFUSION"; on: boolean }
  | { type: "SET_SIDES"; n: PolygonSides }
  | { type: "SET_SQUARE_COMPARE"; on: boolean }
  | { type: "MARK_ASKED"; key: string }
  | { type: "COMPLETE" }
  // 撤销 / 重置
  | { type: "UNDO" }
  | { type: "RESET" };

/* ---------- 工具 ---------- */

function snapshot(s: State): CoreState {
  const { history: _h, ...core } = s;
  return core;
}

function pushHistory(s: State): State {
  const history = [...s.history, snapshot(s)];
  if (history.length > HISTORY_MAX) history.shift();
  return { ...s, history };
}

export function clampD(d: number): number {
  const stepped = round1(Math.round(d / 0.1) * 0.1);
  return Math.min(D_MAX, Math.max(D_MIN, stepped));
}

/** 改 d：清空印记与转角、解锁、重新抽误差 */
function applyD(s: State, d: number): State {
  const nd = clampD(d);
  if (nd === s.d) return s;
  const { noise, seed } = drawNoise(s.seed);
  return { ...s, d: nd, rollAngle: 0, marks: [], rollLocked: false, isRolling: false, noise, seed };
}

function nextRowLabel(table: Row[]): string {
  return `圆${table.length + 1}`;
}

function setStep(s: State, step: Step): State {
  const maxStep = step > s.maxStep ? step : s.maxStep;
  // 进入步骤 6 即揭示；揭示后回看 3–5 步公式只读可见
  const piRevealed = s.piRevealed || step >= 6;
  return { ...s, step, maxStep, piRevealed };
}

function vote(s: State, step: Step, label: string, delta: number, createIfMissing: boolean): State {
  const list = s.handVotes[step] ?? [];
  const idx = list.findIndex((c) => c.label === label);
  let next: typeof list;
  if (idx < 0) {
    if (!createIfMissing) return s;
    next = [...list, { label, count: Math.max(0, delta) }];
  } else {
    const cur = list[idx]!;
    next = list.map((c, i) => (i === idx ? { ...cur, count: Math.max(0, cur.count + delta) } : c));
  }
  return { ...s, handVotes: { ...s.handVotes, [step]: next } };
}

/* ---------- reducer ---------- */

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "GOTO_STEP": {
      if (!canGoto(s, a.step)) return s;
      return setStep(s, a.step);
    }
    case "NEXT_STEP": {
      const n = nextStepOf(s);
      if (n === null || !canGoto(s, n)) return s;
      return setStep(s, n);
    }
    case "PREV_STEP": {
      if (s.step === 0) return s;
      let p = (s.step - 1) as Step;
      if (p === 8 && s.mode === "student") p = 7;
      return setStep(s, p);
    }

    case "STEP0_SET_R": {
      const r0 = Math.min(5, Math.max(1, round1(a.r)));
      return { ...s, step0: { ...s.step0, r0 } };
    }
    case "STEP0_CHOOSE": {
      const correct = a.choice === "2";
      return { ...s, step0: { ...s.step0, choice: a.choice, correct: s.step0.correct || correct } };
    }
    case "STEP0_SKIP":
      return { ...s, step0Skipped: true };

    case "BEGIN_DRAG_D":
      return pushHistory(s);
    case "DRAG_D":
      return applyD(s, a.d);
    case "END_DRAG_D": {
      // 拖完没变：把 BEGIN 时压入的快照弹掉
      const last = s.history[s.history.length - 1];
      if (last && last.d === s.d) return { ...s, history: s.history.slice(0, -1) };
      return s;
    }
    case "SET_D": {
      if (clampD(a.d) === s.d) return s;
      return applyD(pushHistory(s), a.d);
    }

    case "ROLL_START": {
      if (s.rollLocked) return s;
      let ns: State = { ...s, isRolling: true };
      if (s.rollAngle === 0) ns = pushHistory(ns);
      return ns;
    }
    case "ROLL": {
      if (s.rollLocked) return s;
      let angle = s.rollAngle + a.deltaAngle;
      if (angle < 0) angle = 0;
      let locked = false;
      if (angle >= TWO_PI - SNAP_RAD) {
        angle = TWO_PI;
        locked = true;
      }
      // 印记：每转过 MARK_EVERY_RAD 落一个
      const marks = [...s.marks];
      const lastMark = marks[marks.length - 1] ?? 0;
      for (let m = lastMark + MARK_EVERY_RAD; m <= angle + 1e-9; m += MARK_EVERY_RAD) marks.push(round2(m));
      while (marks.length && marks[marks.length - 1]! > angle + 1e-9) marks.pop();

      let ns: State = { ...s, rollAngle: angle, marks };
      if (locked) {
        ns = { ...ns, rollLocked: true, isRolling: false, rollCount: s.rollCount + 1 };
        // 步骤 7：预测已锁定 → 记实测
        if (ns.step === 7 && ns.verify.locked && !ns.verify.done) {
          const measured = measuredC(ns);
          const ok = ns.verify.cPred !== null && Math.abs(ns.verify.cPred - measured) / measured <= VERIFY_TOLERANCE;
          ns = {
            ...ns,
            verify: {
              ...ns.verify,
              measured,
              done: true,
              successCount: ns.verify.successCount + (ok ? 1 : 0),
            },
          };
        }
      }
      return ns;
    }
    case "ROLL_END":
      return s.isRolling ? { ...s, isRolling: false } : s;
    case "ROLL_RESET": {
      const { noise, seed } = drawNoise(s.seed);
      return { ...s, rollAngle: 0, marks: [], rollLocked: false, isRolling: false, noise, seed };
    }

    case "ADD_ROW": {
      if (!s.rollLocked || s.table.length >= TABLE_MAX_ROWS) return s;
      const C = measuredC(s);
      const row: Row = {
        id: `row-${s.table.length + 1}-${s.seed.toString(16)}`,
        label: nextRowLabel(s.table),
        d: s.d,
        C,
        ratio: round2(C / s.d),
        source: "roll",
      };
      let ns = pushHistory(s);
      ns = { ...ns, table: [...ns.table, row] };
      if (ns.step === 3) ns = setStep(ns, 4);
      return ns;
    }
    case "REMOVE_LAST_ROW": {
      if (s.table.length === 0) return s;
      const ns = pushHistory(s);
      return { ...ns, table: ns.table.slice(0, -1) };
    }
    case "RENAME_ROW": {
      const label = a.label.trim();
      if (!label) return s;
      return { ...s, table: s.table.map((r) => (r.id === a.id ? { ...r, label } : r)) };
    }

    case "SET_GUESS":
      return { ...s, guess: { ...s.guess, [a.field]: a.value } };
    case "ADD_CANDIDATE": {
      const label = a.label.trim();
      if (!label) return s;
      if ((s.handVotes[a.step] ?? []).some((c) => c.label === label)) return s;
      return vote(s, a.step, label, 0, true);
    }
    case "VOTE":
      return vote(s, a.step, a.label, a.delta, true);

    case "SET_PATTERN_BLANK":
      return { ...s, patternBlank: a.value, patternSubmitted: false };
    case "SET_DISCOVERY":
      return { ...s, discoveryText: { ...s.discoveryText, [a.field]: a.value } };
    case "SUBMIT_PATTERN": {
      if (s.patternBlank === null) return s;
      const ns = pushHistory(s);
      return { ...ns, patternSubmitted: true };
    }
    case "STEP5_FORCE":
      return { ...s, step5Forced: true };

    case "REVEAL_PI":
      return s.piRevealed ? s : { ...s, piRevealed: true };
    case "SET_PI_PRECISION":
      if (a.precision === "3.1416" && s.mode !== "teacher") return s;
      return { ...s, piPrecision: a.precision };
    case "SET_FORMULA_EMPHASIS":
      return { ...s, formulaEmphasis: a.emphasis };

    case "VERIFY_SET_D": {
      const d = clampD(a.d);
      let ns = applyD(pushHistory(s), d);
      ns = { ...ns, verify: { ...ns.verify, dPred: d, cPred: null, locked: false, measured: null, done: false } };
      return ns;
    }
    case "VERIFY_SET_PRED":
      if (s.verify.locked) return s;
      return { ...s, verify: { ...s.verify, cPred: a.cPred } };
    case "VERIFY_LOCK": {
      if (s.verify.cPred === null || s.verify.cPred <= 0) return s;
      // 锁定预测后从头滚
      let ns: State = { ...s, verify: { ...s.verify, locked: true, measured: null, done: false } };
      ns = reducer(ns, { type: "ROLL_RESET" });
      return ns;
    }
    case "VERIFY_AGAIN":
      return {
        ...s,
        verify: { ...s.verify, cPred: null, locked: false, measured: null, done: false },
        rollAngle: 0,
        marks: [],
        rollLocked: false,
      };
    case "BIKE_SHOW":
      return { ...s, bike: { ...s.bike, shown: a.shown } };

    case "SET_MODE": {
      let ns: State = { ...s, mode: a.mode };
      if (a.mode === "student") {
        if (ns.piPrecision === "3.1416") ns = { ...ns, piPrecision: "3.14" };
        if (ns.step === 8) ns = setStep(ns, 9);
        if (ns.confusionMode && ns.step !== 9) ns = { ...ns, confusionMode: false };
      }
      return ns;
    }
    case "SET_CONFUSION": {
      if (a.on && !(s.mode === "teacher" || s.step === 9)) return s;
      return { ...s, confusionMode: a.on, confusionEverOpened: s.confusionEverOpened || a.on };
    }
    case "SET_SIDES": {
      const maxSidesSeen = a.n > s.easter.maxSidesSeen ? a.n : s.easter.maxSidesSeen;
      return { ...s, easter: { ...s.easter, nSides: a.n, maxSidesSeen } };
    }
    case "SET_SQUARE_COMPARE":
      return { ...s, easter: { ...s.easter, squareCompare: a.on } };
    case "MARK_ASKED":
      return s.askedQuestions.includes(a.key)
        ? { ...s, askedQuestions: s.askedQuestions.filter((k) => k !== a.key) }
        : { ...s, askedQuestions: [...s.askedQuestions, a.key] };
    case "COMPLETE":
      return { ...s, completed: true };

    case "UNDO": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      // 撤销不改界面模式
      return { ...prev, mode: s.mode, history: s.history.slice(0, -1) };
    }
    case "RESET":
      return { ...initialCore({ mode: s.mode, seed: s.seed }), history: [] };

    default:
      return s;
  }
}
