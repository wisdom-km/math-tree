import {
  approxFor,
  canAddRow,
  canGoto,
  duplicateRow,
  formulaS,
  n128Available,
  nextStepOf,
  rescaleOnR,
  round1,
  round2,
} from "./derived";
import {
  ASSEMBLE_SNAP,
  HISTORY_MAX,
  N_DEFAULT,
  N_EASTER,
  R_DEFAULT,
  R_MAX,
  R_MIN,
  R_STEP,
  RECT_A_MAX,
  RECT_A_MIN,
  RECT_B_MAX,
  RECT_B_MIN,
  VERIFY_N,
  VERIFY_TOLERANCE,
  type Assembly,
  type CoreState,
  type Mode,
  type NValue,
  type PiPrecision,
  type RectChoice,
  type Row,
  type State,
  type Step,
  type TriChoice,
} from "./types";

/* ---------- 初始状态 ---------- */

export interface InitOptions {
  mode?: Mode;
  /** 老师课前设的默认路线（已拍板第 4 条） */
  defaultAssembly?: Assembly;
  /** 从知识树链上「沿链播放」进入时直接落在步骤 3 */
  startStep?: Step;
}

export function initialCore(opts: InitOptions = {}): CoreState {
  const defaultAssembly = opts.defaultAssembly ?? "rect";
  const start = opts.startStep ?? 0;
  return {
    step: start,
    maxStep: start,
    r: R_DEFAULT,
    n: N_DEFAULT,
    assembleT: 0,
    assembly: defaultAssembly,
    defaultAssembly,
    cutDone: false,
    moved: false,
    assembleCount: 0,
    hintedN: [],
    n128Unlocked: false,
    n128Seen: false,
    table: [],
    guess: { low: null, likely: null, high: null },
    handVotes: {},
    patternBlank: { length: null, width: null },
    discoveryText: { find: "", because: "" },
    patternSubmitted: false,
    formulaRevealed: false,
    derivationLines: 0,
    triCardOpened: false,
    piPrecision: "3.14",
    verify: {
      rPred: 5,
      sPred: null,
      locked: false,
      assembled: null,
      done: false,
      successCount: 0,
      tableDToR: false,
      tableS: null,
      lawnS: null,
      lawnCost: null,
    },
    mode: opts.mode ?? "teacher",
    confusionMode: false,
    confusionEverOpened: false,
    step0: { a: 6, b: 4, choice: null, correct: false },
    step0Skipped: false,
    triRecall: { shown: false, open: false, choice: null, correct: false },
    triUsed: false,
    gridCounted: false,
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
  // 步骤 0 回忆长方形
  | { type: "STEP0_SET_A"; a: number }
  | { type: "STEP0_SET_B"; b: number }
  | { type: "STEP0_CHOOSE"; choice: RectChoice }
  | { type: "STEP0_SKIP" }
  // 步骤 1
  | { type: "GRID_COUNT" }
  // 半径
  | { type: "BEGIN_DRAG_R" }
  | { type: "DRAG_R"; r: number }
  | { type: "END_DRAG_R" }
  | { type: "SET_R"; r: number }
  // 等分数
  | { type: "SET_N"; n: NValue }
  | { type: "UNLOCK_N128" }
  // 剪 / 移 / 拼
  | { type: "CUT" }
  | { type: "TOGGLE_MOVE" }
  | { type: "SET_ASSEMBLE_T"; t: number }
  | { type: "SET_ASSEMBLY"; assembly: Assembly }
  | { type: "SET_DEFAULT_ASSEMBLY"; assembly: Assembly }
  | { type: "TRI_RECALL_CHOOSE"; choice: TriChoice }
  | { type: "TRI_RECALL_CLOSE" }
  | { type: "HINT_N_SHOWN"; n: NValue }
  // 数据表
  | { type: "ADD_ROW" }
  | { type: "REMOVE_LAST_ROW" }
  // 先猜与举手
  | { type: "SET_GUESS"; field: "low" | "likely" | "high"; value: number | null }
  | { type: "ADD_CANDIDATE"; step: Step; label: string }
  | { type: "VOTE"; step: Step; label: string; delta: 1 | -1 }
  // 找规律
  | { type: "SET_BLANK"; field: "length" | "width"; value: string | null }
  | { type: "SET_DISCOVERY"; field: "find" | "because"; value: string }
  | { type: "SUBMIT_PATTERN" }
  | { type: "STEP5_FORCE" }
  // 揭示
  | { type: "REVEAL_LINE" }
  | { type: "OPEN_TRI_CARD" }
  | { type: "SET_PI_PRECISION"; precision: PiPrecision }
  // 验证
  | { type: "VERIFY_SET_R"; r: number }
  | { type: "VERIFY_SET_PRED"; sPred: number | null }
  | { type: "VERIFY_LOCK" }
  | { type: "VERIFY_AGAIN" }
  | { type: "VERIFY_TABLE_D_TO_R" }
  | { type: "VERIFY_TABLE_S"; value: number | null }
  | { type: "VERIFY_LAWN"; field: "lawnS" | "lawnCost"; value: number | null }
  // 模式 / 对比
  | { type: "SET_MODE"; mode: Mode }
  | { type: "SET_CONFUSION"; on: boolean }
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

export function clampR(r: number): number {
  const stepped = round1(Math.round(r / R_STEP) * R_STEP);
  return Math.min(R_MAX, Math.max(R_MIN, stepped));
}

function clampHalf(v: number, min: number, max: number): number {
  const stepped = Math.round(v * 2) / 2;
  return Math.min(max, Math.max(min, stepped));
}

/** 清拼合区：未剪、进度归零、收回「移」 */
function clearAssembly(s: State): State {
  return { ...s, cutDone: false, assembleT: 0, moved: false };
}

/** 改 r：步骤 3–5 清空重拼；揭示后随 r 缩放（已拍板第 3 条） */
function applyR(s: State, r: number): State {
  const nr = clampR(r);
  if (nr === s.r) return s;
  const ns = { ...s, r: nr };
  return rescaleOnR(s) ? ns : clearAssembly(ns);
}

/** 改 n：重新等分，清拼合区；已加入的表行不受影响 */
function applyN(s: State, n: NValue): State {
  if (n === s.n) return s;
  if (n === N_EASTER && !n128Available(s)) return s;
  const ns = clearAssembly({ ...s, n });
  return n === N_EASTER ? { ...ns, n128Seen: true } : ns;
}

function setStep(s: State, step: Step): State {
  const maxStep = step > s.maxStep ? step : s.maxStep;
  // 进入步骤 6 即揭示；揭示后回看 3–5 步公式只读可见
  const formulaRevealed = s.formulaRevealed || step >= 6;
  return { ...s, step, maxStep, formulaRevealed };
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

/** 拼合到位时的结算：计数、步骤 7 验证 */
function onAssembled(s: State): State {
  let ns: State = { ...s, assembleT: 1, moved: false, assembleCount: s.assembleCount + 1 };
  if (ns.step === 7 && ns.verify.locked && !ns.verify.done) {
    const approx = round2(approxFor(ns.r, ns.n, ns.assembly).area);
    const exact = formulaS(ns.verify.rPred);
    const ok = ns.verify.sPred !== null && Math.abs(ns.verify.sPred - exact) / exact <= VERIFY_TOLERANCE;
    ns = {
      ...ns,
      verify: { ...ns.verify, assembled: approx, done: true, successCount: ns.verify.successCount + (ok ? 1 : 0) },
    };
  }
  return ns;
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

    /* 步骤 0 */
    case "STEP0_SET_A":
      return { ...s, step0: { ...s.step0, a: clampHalf(a.a, RECT_A_MIN, RECT_A_MAX) } };
    case "STEP0_SET_B":
      return { ...s, step0: { ...s.step0, b: clampHalf(a.b, RECT_B_MIN, RECT_B_MAX) } };
    case "STEP0_CHOOSE": {
      const correct = a.choice === "长 × 宽";
      return { ...s, step0: { ...s.step0, choice: a.choice, correct: s.step0.correct || correct } };
    }
    case "STEP0_SKIP":
      return { ...s, step0Skipped: true };

    /* 步骤 1 */
    case "GRID_COUNT":
      return { ...s, gridCounted: true };

    /* 半径 */
    case "BEGIN_DRAG_R":
      return pushHistory(s);
    case "DRAG_R":
      return applyR(s, a.r);
    case "END_DRAG_R": {
      const last = s.history[s.history.length - 1];
      if (last && last.r === s.r) return { ...s, history: s.history.slice(0, -1) };
      return s;
    }
    case "SET_R": {
      if (clampR(a.r) === s.r) return s;
      return applyR(pushHistory(s), a.r);
    }

    /* 等分数 */
    case "SET_N": {
      if (a.n === s.n) return s;
      if (a.n === N_EASTER && !n128Available(s)) return s;
      return applyN(pushHistory(s), a.n);
    }
    case "UNLOCK_N128":
      return s.n128Unlocked ? s : { ...s, n128Unlocked: true };

    /* 剪 / 移 / 拼 */
    case "CUT":
      return s.cutDone ? s : { ...s, cutDone: true };
    case "TOGGLE_MOVE": {
      if (!s.cutDone || s.assembleT > 0) return s;
      return { ...s, moved: !s.moved };
    }
    case "SET_ASSEMBLE_T": {
      if (!s.cutDone) return s;
      let t = Math.min(1, Math.max(0, a.t));
      if (t >= ASSEMBLE_SNAP) t = 1;
      if (t === s.assembleT) return s;
      if (t === 1) return onAssembled(pushHistory(s));
      return { ...s, assembleT: t, moved: t > 0 ? false : s.moved };
    }
    case "SET_ASSEMBLY": {
      if (a.assembly === s.assembly) return s;
      let ns = pushHistory(s);
      ns = { ...ns, assembly: a.assembly, assembleT: 0, moved: false };
      if (a.assembly === "tri") {
        ns = { ...ns, triUsed: true };
        if (!ns.triRecall.shown) ns = { ...ns, triRecall: { ...ns.triRecall, shown: true, open: true } };
      }
      return ns;
    }
    case "SET_DEFAULT_ASSEMBLY":
      if (s.mode !== "teacher") return s;
      return { ...s, defaultAssembly: a.assembly };
    case "TRI_RECALL_CHOOSE": {
      const correct = a.choice === "½";
      return { ...s, triRecall: { ...s.triRecall, choice: a.choice, correct: s.triRecall.correct || correct } };
    }
    case "TRI_RECALL_CLOSE":
      return s.triRecall.open ? { ...s, triRecall: { ...s.triRecall, open: false } } : s;
    case "HINT_N_SHOWN":
      return s.hintedN.includes(a.n) ? s : { ...s, hintedN: [...s.hintedN, a.n] };

    /* 数据表 */
    case "ADD_ROW": {
      if (!canAddRow(s) || duplicateRow(s)) return s;
      const ap = approxFor(s.r, s.n, s.assembly);
      const row: Row = {
        id: `row-${s.table.length + 1}-${s.n}-${s.r}-${s.assembly}`,
        n: s.n,
        r: s.r,
        assembly: s.assembly,
        length: round2(ap.length),
        width: round2(ap.width),
        areaApprox: round2(ap.area),
        source: "assemble",
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

    /* 先猜与举手 */
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

    /* 找规律 */
    case "SET_BLANK":
      return { ...s, patternBlank: { ...s.patternBlank, [a.field]: a.value }, patternSubmitted: false };
    case "SET_DISCOVERY":
      return { ...s, discoveryText: { ...s.discoveryText, [a.field]: a.value } };
    case "SUBMIT_PATTERN": {
      if (s.patternBlank.length === null || s.patternBlank.width === null) return s;
      return { ...pushHistory(s), patternSubmitted: true };
    }
    case "STEP5_FORCE":
      return { ...s, step5Forced: true };

    /* 揭示 */
    case "REVEAL_LINE": {
      if (s.derivationLines >= 3) return s;
      const derivationLines = (s.derivationLines + 1) as 1 | 2 | 3;
      return { ...s, derivationLines, formulaRevealed: s.formulaRevealed || derivationLines === 3 };
    }
    case "OPEN_TRI_CARD":
      return s.triCardOpened ? s : { ...s, triCardOpened: true };
    case "SET_PI_PRECISION":
      if (a.precision === "3.1416" && s.mode !== "teacher") return s;
      return { ...s, piPrecision: a.precision };

    /* 验证 */
    case "VERIFY_SET_R": {
      const r = clampR(a.r);
      let ns = applyR(pushHistory(s), r);
      ns = clearAssembly(ns);
      ns = {
        ...ns,
        verify: { ...ns.verify, rPred: r, sPred: null, locked: false, assembled: null, done: false },
      };
      return ns;
    }
    case "VERIFY_SET_PRED":
      if (s.verify.locked) return s;
      return { ...s, verify: { ...s.verify, sPred: a.sPred } };
    case "VERIFY_LOCK": {
      if (s.verify.sPred === null || s.verify.sPred <= 0) return s;
      // 锁定预测后：用 n = 64、已剪好，等孩子点「拼」
      let ns: State = { ...s, r: clampR(s.verify.rPred), n: VERIFY_N, cutDone: true, assembleT: 0, moved: false };
      ns = { ...ns, verify: { ...ns.verify, locked: true, assembled: null, done: false } };
      return ns;
    }
    case "VERIFY_AGAIN":
      return clearAssembly({
        ...s,
        verify: { ...s.verify, sPred: null, locked: false, assembled: null, done: false },
      });
    case "VERIFY_TABLE_D_TO_R":
      return { ...s, verify: { ...s.verify, tableDToR: true } };
    case "VERIFY_TABLE_S":
      if (!s.verify.tableDToR) return s;
      return { ...s, verify: { ...s.verify, tableS: a.value } };
    case "VERIFY_LAWN":
      return { ...s, verify: { ...s.verify, [a.field]: a.value } };

    /* 模式 / 对比 */
    case "SET_MODE": {
      let ns: State = { ...s, mode: a.mode };
      if (a.mode === "student") {
        if (ns.piPrecision === "3.1416") ns = { ...ns, piPrecision: "3.14" };
        if (ns.step === 8) ns = setStep(ns, 9);
        if (ns.confusionMode && ns.step !== 9) ns = { ...ns, confusionMode: false };
        // 彩蛋只在老师模式常显；学生模式若正停在 128 且未解锁则退回 64
        if (ns.n === N_EASTER && !ns.n128Unlocked) ns = applyN(ns, 64);
      }
      return ns;
    }
    case "SET_CONFUSION": {
      if (a.on && !(s.mode === "teacher" || s.step === 9)) return s;
      return { ...s, confusionMode: a.on, confusionEverOpened: s.confusionEverOpened || a.on };
    }
    case "MARK_ASKED":
      return s.askedQuestions.includes(a.key)
        ? { ...s, askedQuestions: s.askedQuestions.filter((k) => k !== a.key) }
        : { ...s, askedQuestions: [...s.askedQuestions, a.key] };
    case "COMPLETE":
      return { ...s, completed: true };

    case "UNDO": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...prev, mode: s.mode, history: s.history.slice(0, -1) };
    }
    case "RESET":
      return { ...initialCore({ mode: s.mode, defaultAssembly: s.defaultAssembly }), history: [] };

    default:
      return s;
  }
}
