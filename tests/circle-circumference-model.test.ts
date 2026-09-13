import { describe, expect, it } from "vitest";
import {
  areaTextbook,
  canAdvance,
  canGoto,
  closestCandidate,
  effectiveRadius,
  evidenceKeys,
  formulaC,
  formulaVisible,
  guessReferenceC,
  measuredC,
  nextStepOf,
  polygonApprox,
  questionCardVisible,
  radius,
  rolledLength,
  squarePerimeter,
  tableHint,
  TWO_PI,
  verifyResult,
  visibleSteps,
} from "@/explorations/circle-circumference/model/derived";
import { checkPattern } from "@/explorations/circle-circumference/model/pattern";
import {
  clampD,
  initialState,
  nextRandom,
  reducer,
  type Action,
} from "@/explorations/circle-circumference/model/reducer";
import {
  D_MAX,
  D_MIN,
  NOISE_AMPLITUDE,
  POLYGON_SIDES,
  type State,
} from "@/explorations/circle-circumference/model/types";

function run(state: State, ...actions: Action[]): State {
  return actions.reduce(reducer, state);
}

/** 模拟按住轮子拖：分若干小步滚满一圈 */
function rollFull(state: State, steps = 40): State {
  let s = reducer(state, { type: "ROLL_START" });
  for (let i = 0; i < steps; i++) s = reducer(s, { type: "ROLL", deltaAngle: TWO_PI / steps + 1e-6 });
  return reducer(s, { type: "ROLL_END" });
}

/** 走到步骤 3（回忆 → 情境 → 先猜合法） */
function toStep3(seed = 1): State {
  return run(
    initialState({ seed }),
    { type: "STEP0_CHOOSE", choice: "2" },
    { type: "NEXT_STEP" },
    { type: "NEXT_STEP" },
    { type: "SET_GUESS", field: "low", value: 8 },
    { type: "SET_GUESS", field: "likely", value: 12 },
    { type: "SET_GUESS", field: "high", value: 20 },
    { type: "NEXT_STEP" },
  );
}

/** 滚三个不同直径并加入数据表，走到步骤 4 就绪 */
function withThreeRows(seed = 1): State {
  let s = toStep3(seed);
  for (const d of [4, 6, 9]) {
    s = reducer(s, { type: "SET_D", d });
    s = rollFull(s);
    s = reducer(s, { type: "ADD_ROW" });
  }
  return s;
}

describe("派生量", () => {
  it("r = d/2，C 内部用 Math.PI，公式用 3.14", () => {
    const s = initialState({ seed: 7 });
    expect(s.d).toBe(4);
    expect(radius(s)).toBe(2);
    expect(formulaC(s)).toBe(12.56);
    expect(formulaC({ ...s, d: 5 })).toBe(15.7);
  });

  it("测量值误差在 ±1% 内，比值落在 3.1–3.2", () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = initialState({ seed });
      expect(Math.abs(s.noise - 1)).toBeLessThanOrEqual(NOISE_AMPLITUDE + 1e-12);
      const ratio = measuredC(s) / s.d;
      expect(ratio).toBeGreaterThan(3.1);
      expect(ratio).toBeLessThan(3.2);
    }
  });

  it("无打滑：滚过长度 = 转角 × 有效半径；满圈 = 测量周长", () => {
    const s = initialState({ seed: 3 });
    const half = { ...s, rollAngle: Math.PI };
    expect(rolledLength(half)).toBeCloseTo(Math.PI * effectiveRadius(s), 10);
    const full = { ...s, rollAngle: TWO_PI };
    expect(rolledLength(full)).toBeCloseTo(measuredC(s), 2);
  });

  it("随机数确定性：同一种子同一序列", () => {
    const a = nextRandom(42);
    const b = nextRandom(42);
    expect(a).toEqual(b);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(1);
  });

  it("割圆术：边数只允许 6/12/24/48/96，多边形周长单调逼近圆周长", () => {
    expect(POLYGON_SIDES).toEqual([6, 12, 24, 48, 96]);
    const s = initialState();
    let last = 0;
    for (const n of POLYGON_SIDES) {
      const p = polygonApprox(s, n);
      expect(p.perimeter).toBeGreaterThan(last);
      expect(p.perimeter).toBeLessThan(Math.PI * s.d);
      expect(p.gap).toBeGreaterThan(0);
      last = p.perimeter;
    }
    expect(polygonApprox(s, 6).ratio).toBeCloseTo(3, 6);
    expect(polygonApprox(s, 96).ratio).toBeCloseTo(Math.PI, 2);
  });

  it("正方形对照 4d 与面积（只演示）", () => {
    const s = { ...initialState(), d: 6 };
    expect(squarePerimeter(s)).toBe(24);
    expect(areaTextbook(s)).toBe(28.26);
  });
});

describe("步骤 5 宽松校验", () => {
  it.each(["3", "3倍", "3倍多一些", "约3.14", "3.14", "3.1", "大约 3 倍多一点", "３．１４倍", "3倍多"])(
    "接受「%s」",
    (v) => {
      expect(checkPattern(v).ok).toBe(true);
    },
  );
  it("填 2 或 4 给对照反馈而不是打叉", () => {
    expect(checkPattern("2")).toMatchObject({ ok: false, contrast: 2 });
    expect(checkPattern("4倍")).toMatchObject({ ok: false, contrast: 4 });
    expect(checkPattern("10")).toMatchObject({ ok: false, contrast: null });
    expect(checkPattern("")).toMatchObject({ ok: false });
  });
});

describe("步骤流转", () => {
  it("步骤 0：选对「2」才能进下一步；选错不放行；老师可跳过", () => {
    const s = initialState();
    expect(canAdvance(s)).toBe(false);
    expect(reducer(s, { type: "NEXT_STEP" }).step).toBe(0);
    const wrong = reducer(s, { type: "STEP0_CHOOSE", choice: "一半" });
    expect(canAdvance(wrong)).toBe(false);
    const right = reducer(wrong, { type: "STEP0_CHOOSE", choice: "2" });
    expect(canAdvance(right)).toBe(true);
    expect(reducer(right, { type: "NEXT_STEP" }).step).toBe(1);
    const skipped = reducer(s, { type: "STEP0_SKIP" });
    expect(canAdvance(skipped)).toBe(true);
    expect(evidenceKeys(skipped)).toContain("step0Skipped");
  });

  it("步骤 0：直径 = 2 × 半径 随 r 联动", () => {
    const s = reducer(initialState(), { type: "STEP0_SET_R", r: 3.2 });
    expect(s.step0.r0).toBe(3.2);
    expect(s.step0.r0 * 2).toBeCloseTo(6.4);
  });

  it("步骤 2：low < likely < high 才能继续", () => {
    let s = run(initialState(), { type: "STEP0_CHOOSE", choice: "2" }, { type: "NEXT_STEP" }, { type: "NEXT_STEP" });
    expect(s.step).toBe(2);
    s = run(
      s,
      { type: "SET_GUESS", field: "low", value: 12 },
      { type: "SET_GUESS", field: "likely", value: 10 },
      { type: "SET_GUESS", field: "high", value: 20 },
    );
    expect(canAdvance(s)).toBe(false);
    s = reducer(s, { type: "SET_GUESS", field: "low", value: 8 });
    expect(canAdvance(s)).toBe(true);
  });

  it("举手候选支持 +1/−1，人数不为负", () => {
    let s = run(initialState(), { type: "ADD_CANDIDATE", step: 2, label: "12" }, { type: "ADD_CANDIDATE", step: 2, label: "12" });
    expect(s.handVotes[2]).toHaveLength(1);
    s = run(s, { type: "VOTE", step: 2, label: "12", delta: 1 }, { type: "VOTE", step: 2, label: "12", delta: 1 });
    expect(s.handVotes[2]?.[0]?.count).toBe(2);
    s = run(s, { type: "VOTE", step: 2, label: "12", delta: -1 }, { type: "VOTE", step: 2, label: "12", delta: -1 }, { type: "VOTE", step: 2, label: "12", delta: -1 });
    expect(s.handVotes[2]?.[0]?.count).toBe(0);
    // 其他步骤的固定选项直接投票即创建
    s = reducer(s, { type: "VOTE", step: 3, label: "偏长", delta: 1 });
    expect(s.handVotes[3]).toEqual([{ label: "偏长", count: 1 }]);
  });

  it("滚满一圈自动停、锁定，不能继续拖过", () => {
    let s = toStep3();
    expect(s.step).toBe(3);
    s = rollFull(s);
    expect(s.rollAngle).toBe(TWO_PI);
    expect(s.rollLocked).toBe(true);
    expect(s.rollCount).toBe(1);
    const more = reducer(s, { type: "ROLL", deltaAngle: 0.5 });
    expect(more.rollAngle).toBe(TWO_PI);
    expect(rolledLength(s)).toBeCloseTo(measuredC(s), 2);
    expect(s.marks.length).toBeGreaterThan(10);
  });

  it("满圈前 2° 内吸附到满圈", () => {
    let s = reducer(toStep3(), { type: "ROLL_START" });
    s = reducer(s, { type: "ROLL", deltaAngle: TWO_PI - (1.5 * Math.PI) / 180 });
    expect(s.rollLocked).toBe(true);
    expect(s.rollAngle).toBe(TWO_PI);
  });

  it("未满圈不能加入数据表；满圈后可加入，行含 d、C、C÷d（两位小数）", () => {
    let s = reducer(toStep3(), { type: "ROLL_START" });
    s = reducer(s, { type: "ROLL", deltaAngle: 1 });
    expect(reducer(s, { type: "ADD_ROW" }).table).toHaveLength(0);
    s = rollFull(s);
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(1);
    const row = s.table[0]!;
    expect(row.d).toBe(4);
    expect(row.C).toBe(measuredC(s));
    expect(row.ratio).toBe(Math.round((row.C / row.d) * 100) / 100);
    expect(String(row.C).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
    expect(row.label).toBe("圆1");
    // 步骤 3 与 4 同屏：加入第一行后点亮 4
    expect(s.step).toBe(4);
  });

  it("改直径（限 2.0–10.0，步进 0.1）后轨迹清空且需重滚", () => {
    let s = rollFull(toStep3());
    expect(s.rollLocked).toBe(true);
    s = reducer(s, { type: "SET_D", d: 6.04 });
    expect(s.d).toBe(6);
    expect(s.rollAngle).toBe(0);
    expect(s.marks).toEqual([]);
    expect(s.rollLocked).toBe(false);
    expect(clampD(0.5)).toBe(D_MIN);
    expect(clampD(99)).toBe(D_MAX);
    expect(clampD(4.26)).toBe(4.3);
  });

  it("至少 3 行数据后才可进入步骤 5", () => {
    let s = toStep3();
    s = rollFull(s);
    s = reducer(s, { type: "ADD_ROW" });
    expect(canAdvance(s)).toBe(false);
    s = withThreeRows();
    expect(s.table).toHaveLength(3);
    expect(canAdvance(s)).toBe(true);
    expect(reducer(s, { type: "NEXT_STEP" }).step).toBe(5);
    expect(evidenceKeys(s)).toContain("tableRows3");
  });

  it("数据表弱提示：直径相差 < 0.3 时提示换一个", () => {
    let s = withThreeRows();
    s = reducer(s, { type: "SET_D", d: 9.2 });
    s = rollFull(s);
    expect(tableHint(s)).toContain("差得多一点");
  });

  it("步骤 5 前不出现公式；进入步骤 6 才揭示", () => {
    let s = withThreeRows();
    expect(formulaVisible(s)).toBe(false);
    s = reducer(s, { type: "NEXT_STEP" });
    expect(s.step).toBe(5);
    expect(formulaVisible(s)).toBe(false);
    expect(canAdvance(s)).toBe(false);
    s = run(
      s,
      { type: "SET_PATTERN_BLANK", value: "3倍多一些" },
      { type: "SET_DISCOVERY", field: "find", value: "比值差不多一样" },
      { type: "SET_DISCOVERY", field: "because", value: "每一行都接近" },
      { type: "SUBMIT_PATTERN" },
    );
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("patternPassed");
    s = reducer(s, { type: "NEXT_STEP" });
    expect(s.step).toBe(6);
    expect(s.piRevealed).toBe(true);
    expect(formulaVisible(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("revealSeen");
  });

  it("老师可强制进入揭示并记「未填完整」", () => {
    let s = reducer(withThreeRows(), { type: "NEXT_STEP" });
    s = reducer(s, { type: "STEP5_FORCE" });
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("step5Forced");
  });

  it("活公式与轮子、表同一数据源：改 d 公式即变", () => {
    let s = run(withThreeRows(), { type: "NEXT_STEP" }, { type: "STEP5_FORCE" }, { type: "NEXT_STEP" });
    expect(formulaC(s)).toBe(3.14 * 9);
    s = reducer(s, { type: "SET_D", d: 5 });
    expect(formulaC(s)).toBe(15.7);
    expect(radius(s)).toBe(2.5);
  });

  it("π 展示：默认 3.14；老师可切 3.1416；学生模式不可切且切回", () => {
    let s = initialState({ mode: "teacher" });
    expect(s.piPrecision).toBe("3.14");
    s = reducer(s, { type: "SET_PI_PRECISION", precision: "3.1416" });
    expect(s.piPrecision).toBe("3.1416");
    expect(formulaC(s)).toBe(12.56); // 主计算仍用 3.14
    s = reducer(s, { type: "SET_MODE", mode: "student" });
    expect(s.piPrecision).toBe("3.14");
    expect(reducer(s, { type: "SET_PI_PRECISION", precision: "3.1416" }).piPrecision).toBe("3.14");
  });

  it("步骤 7：先输入预测再滚动，2% 内「对上了」", () => {
    let s = run(withThreeRows(), { type: "NEXT_STEP" }, { type: "STEP5_FORCE" }, { type: "NEXT_STEP" }, { type: "NEXT_STEP" });
    expect(s.step).toBe(7);
    s = reducer(s, { type: "VERIFY_SET_D", d: 5 });
    expect(s.d).toBe(5);
    // 未锁定预测时滚满不算验证
    const early = rollFull(s);
    expect(early.verify.done).toBe(false);
    s = reducer(s, { type: "VERIFY_SET_PRED", cPred: 15.7 });
    s = reducer(s, { type: "VERIFY_LOCK" });
    expect(s.verify.locked).toBe(true);
    expect(s.rollAngle).toBe(0);
    s = rollFull(s);
    const r = verifyResult(s);
    expect(r?.ok).toBe(true);
    expect(s.verify.successCount).toBe(1);
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("predictRollSuccess");
  });

  it("步骤 7：把半径当直径时给出提示", () => {
    let s = run(withThreeRows(), { type: "NEXT_STEP" }, { type: "STEP5_FORCE" }, { type: "NEXT_STEP" }, { type: "NEXT_STEP" });
    s = run(s, { type: "VERIFY_SET_D", d: 6 }, { type: "VERIFY_SET_PRED", cPred: 9.42 }, { type: "VERIFY_LOCK" });
    s = rollFull(s);
    const r = verifyResult(s);
    expect(r?.ok).toBe(false);
    expect(r?.usedRadiusHint).toBe(true);
    expect(r?.direction).toBe("under");
  });

  it("步骤 7 回看猜一猜：参考实测取 d=4 那一行，找最接近候选", () => {
    let s = withThreeRows();
    s = run(
      s,
      { type: "ADD_CANDIDATE", step: 2, label: "8" },
      { type: "ADD_CANDIDATE", step: 2, label: "12" },
      { type: "ADD_CANDIDATE", step: 2, label: "20" },
    );
    const ref = guessReferenceC(s);
    expect(ref).toBe(s.table[0]!.C);
    expect(closestCandidate(s, 2, ref)).toBe("12");
  });

  it("学生模式隐藏步骤 8 与提问卡，7 → 9", () => {
    const t = initialState({ mode: "teacher" });
    expect(questionCardVisible(t)).toBe(true);
    expect(visibleSteps(t)).toHaveLength(10);
    const st = reducer(t, { type: "SET_MODE", mode: "student" });
    expect(questionCardVisible(st)).toBe(false);
    expect(visibleSteps(st)).not.toContain(8);
    expect(nextStepOf({ ...st, step: 7 })).toBe(9);
    expect(canGoto({ ...st, step: 7, maxStep: 9 }, 8)).toBe(false);
  });

  it("易混并排：老师随时可开；学生模式第 9 步才可开；开过记证据", () => {
    const t = initialState({ mode: "teacher" });
    expect(reducer(t, { type: "SET_CONFUSION", on: true }).confusionMode).toBe(true);
    const st = initialState({ mode: "student" });
    expect(reducer(st, { type: "SET_CONFUSION", on: true }).confusionMode).toBe(false);
    const st9 = { ...st, step: 9 as const, maxStep: 9 as const };
    const opened = reducer(st9, { type: "SET_CONFUSION", on: true });
    expect(opened.confusionMode).toBe(true);
    expect(evidenceKeys(opened)).toContain("confusionOpened");
  });

  it("割圆术拖到 96 记彩蛋", () => {
    const s = run(initialState(), { type: "SET_SIDES", n: 96 }, { type: "SET_SIDES", n: 12 });
    expect(s.easter.nSides).toBe(12);
    expect(evidenceKeys(s)).toContain("polygon96");
  });

  it("已完成步骤可回看且不改数据", () => {
    const s = withThreeRows();
    const back = reducer(s, { type: "GOTO_STEP", step: 1 });
    expect(back.step).toBe(1);
    expect(back.table).toEqual(s.table);
    expect(back.maxStep).toBe(4);
    // 不能跳到未解锁的步骤
    expect(reducer(back, { type: "GOTO_STEP", step: 7 }).step).toBe(1);
  });
});

describe("撤销 / 重置", () => {
  it("撤销可回退最近的 d 变更", () => {
    let s = toStep3();
    s = reducer(s, { type: "SET_D", d: 7 });
    expect(s.d).toBe(7);
    s = reducer(s, { type: "UNDO" });
    expect(s.d).toBe(4);
    expect(s.step).toBe(3);
  });

  it("撤销可回退表行加入", () => {
    let s = rollFull(toStep3());
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(1);
    s = reducer(s, { type: "UNDO" });
    expect(s.table).toHaveLength(0);
    expect(s.rollLocked).toBe(true); // 回到加入前：仍是满圈状态
  });

  it("拖直径没变时不留撤销记录", () => {
    const s = toStep3();
    const n = run(s, { type: "BEGIN_DRAG_D" }, { type: "DRAG_D", d: 4 }, { type: "END_DRAG_D" });
    expect(n.history.length).toBe(s.history.length);
    const changed = run(s, { type: "BEGIN_DRAG_D" }, { type: "DRAG_D", d: 5 }, { type: "END_DRAG_D" });
    expect(changed.history.length).toBe(s.history.length + 1);
    expect(reducer(changed, { type: "UNDO" }).d).toBe(4);
  });

  it("撤销栈最多 30 步", () => {
    let s = toStep3();
    for (let i = 0; i < 40; i++) s = reducer(s, { type: "SET_D", d: 2 + (i % 70) * 0.1 });
    expect(s.history.length).toBeLessThanOrEqual(30);
  });

  it("重置清到步骤 0 初始：d=4，空表，猜清空，π 未揭示；保留模式", () => {
    let s = run(withThreeRows(), { type: "NEXT_STEP" }, { type: "STEP5_FORCE" }, { type: "NEXT_STEP" });
    s = reducer(s, { type: "SET_MODE", mode: "student" });
    s = reducer(s, { type: "RESET" });
    expect(s.step).toBe(0);
    expect(s.d).toBe(4);
    expect(s.table).toEqual([]);
    expect(s.guess).toEqual({ low: null, likely: null, high: null });
    expect(s.piRevealed).toBe(false);
    expect(s.history).toEqual([]);
    expect(s.mode).toBe("student");
  });

  it("撤销不改变界面模式", () => {
    let s = reducer(toStep3(), { type: "SET_D", d: 7 });
    s = reducer(s, { type: "SET_MODE", mode: "student" });
    s = reducer(s, { type: "UNDO" });
    expect(s.mode).toBe("student");
    expect(s.d).toBe(4);
  });
});
