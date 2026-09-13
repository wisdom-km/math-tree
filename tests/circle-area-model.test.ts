import { describe, expect, it } from "vitest";
import {
  approxFor,
  assembled,
  availableN,
  canAdvance,
  canGoto,
  closestCandidate,
  confusionAvailable,
  currentApprox,
  duplicateRow,
  evidenceKeys,
  exactS,
  formulaS,
  formulaVisible,
  gapToTrue,
  guessReferenceS,
  guessSquareArea,
  lawnExpected,
  patternOk,
  questionCardVisible,
  rectApprox,
  relationBadgeAvailable,
  rescaleOnR,
  tableExpected,
  tableReady,
  triApprox,
  unrecordedAssembly,
  verifyHint,
  verifyResult,
  visibleSteps,
} from "@/explorations/circle-area/model/derived";
import {
  gridCount,
  lerpAngle,
  pieceGeometry,
  piecePose,
  rectLayout,
  rectTargetPose,
  sourcePose,
  triLayout,
  triTargetPose,
  type StageLayout,
} from "@/explorations/circle-area/model/geometry";
import { checkLength, checkWidth } from "@/explorations/circle-area/model/pattern";
import { clampR, initialState, reducer, type Action } from "@/explorations/circle-area/model/reducer";
import {
  ASSEMBLE_SNAP,
  N_BASE,
  N_VALUES,
  R_MAX,
  R_MIN,
  type NValue,
  type State,
} from "@/explorations/circle-area/model/types";

function run(state: State, ...actions: Action[]): State {
  return actions.reduce(reducer, state);
}

/** 剪 → 拖滑块到位 */
function cutAndAssemble(state: State, steps = 10): State {
  let s = reducer(state, { type: "CUT" });
  for (let i = 1; i <= steps; i++) s = reducer(s, { type: "SET_ASSEMBLE_T", t: i / steps });
  return s;
}

/** 走到步骤 3 */
function toStep3(): State {
  return run(
    initialState(),
    { type: "STEP0_CHOOSE", choice: "长 × 宽" },
    { type: "NEXT_STEP" },
    { type: "NEXT_STEP" },
    { type: "SET_GUESS", field: "low", value: 30 },
    { type: "SET_GUESS", field: "likely", value: 45 },
    { type: "SET_GUESS", field: "high", value: 60 },
    { type: "NEXT_STEP" },
  );
}

/** 同一 r 下 8 / 16 / 32 三档拼合并加入表 */
function withThreeRows(): State {
  let s = toStep3();
  for (const n of [8, 16, 32] as NValue[]) {
    s = reducer(s, { type: "SET_N", n });
    s = cutAndAssemble(s);
    s = reducer(s, { type: "ADD_ROW" });
  }
  return s;
}

function toStep6(): State {
  return run(
    withThreeRows(),
    { type: "NEXT_STEP" },
    { type: "SET_BLANK", field: "length", value: "周长的一半" },
    { type: "SET_BLANK", field: "width", value: "半径" },
    { type: "SET_DISCOVERY", field: "find", value: "份数越多越像长方形" },
    { type: "SET_DISCOVERY", field: "because", value: "凹凸越来越小" },
    { type: "SUBMIT_PATTERN" },
    { type: "NEXT_STEP" },
  );
}

describe("拼合几何派生量（真实弦长 / 弓高，不加噪声）", () => {
  it("每份几何：弦长 2r·sin(π/n)，高 r·cos(π/n)", () => {
    const g = pieceGeometry(4, 8);
    expect(g.angle).toBeCloseTo(Math.PI / 4, 12);
    expect(g.chord).toBeCloseTo(2 * 4 * Math.sin(Math.PI / 8), 12);
    expect(g.apothem).toBeCloseTo(4 * Math.cos(Math.PI / 8), 12);
  });

  it.each([2, 4, 6])("r = %s：长方形的长随 n 单调逼近 πr、宽逼近 r、面积逼近 πr²", (r) => {
    let lastLen = 0;
    let lastW = 0;
    let lastArea = 0;
    for (const n of N_VALUES) {
      const a = rectApprox(r, n);
      expect(a.length).toBeGreaterThan(lastLen);
      expect(a.width).toBeGreaterThan(lastW);
      expect(a.area).toBeGreaterThan(lastArea);
      expect(a.length).toBeLessThan(Math.PI * r);
      expect(a.width).toBeLessThan(r);
      expect(a.area).toBeLessThan(Math.PI * r * r);
      lastLen = a.length;
      lastW = a.width;
      lastArea = a.area;
    }
    const big = rectApprox(r, 128);
    expect(big.length).toBeCloseTo(Math.PI * r, 2);
    expect(big.width).toBeCloseTo(r, 2);
    expect(Math.PI * r * r - big.area).toBeLessThan(0.02 * r * r);
  });

  it("两条路线的面积近似值完全一致（长 × 宽 = n × ½ × 底 × 高）", () => {
    for (const r of [2, 3.5, 6]) {
      for (const n of N_VALUES) {
        expect(triApprox(r, n).area).toBeCloseTo(rectApprox(r, n).area, 10);
        expect(approxFor(r, n, "tri").area).toBeCloseTo(approxFor(r, n, "rect").area, 10);
      }
    }
  });

  it("三角形路线：底 = 周长的 1/n（以弦计）、高 → r；n × ½ × 底 × 高 → ½ × C × r", () => {
    const r = 4;
    const t = triApprox(r, 64);
    expect(t.length).toBeCloseTo(2 * r * Math.sin(Math.PI / 64), 12);
    expect(t.width).toBeCloseTo(r * Math.cos(Math.PI / 64), 12);
    expect(Math.abs(t.area - 0.5 * (2 * Math.PI * r) * r)).toBeLessThan(0.1);
  });

  it("r = 4：n = 8 → 128 的面积近似值（两位）与 3.14 × 16 = 50.24 对照", () => {
    const s = { ...initialState(), r: 4 };
    const values = N_VALUES.map((n) => currentApprox({ ...s, n }).area);
    expect(values).toEqual([45.25, 48.98, 49.94, 50.18, 50.25]);
    expect(formulaS(4)).toBe(50.24);
    expect(exactS(s)).toBeCloseTo(50.265, 3);
    // 128 份：与精确值差 < 0.02 cm²（彩蛋文案依据）
    expect(Math.abs(gapToTrue({ ...s, n: 128 }))).toBeLessThan(0.02);
    expect(gapToTrue({ ...s, n: 8 })).toBeGreaterThan(gapToTrue({ ...s, n: 64 }));
    for (const r of [2, 3.3, 5, 6]) expect(Math.abs(gapToTrue({ ...s, r, n: 128 }))).toBeLessThan(0.02);
  });

  it("数格子：r = 4 时完整 32 格；完整 + 不完整 ≥ 面积所需格数", () => {
    const g = gridCount(4);
    expect(g.complete).toBe(32);
    expect(g.complete + g.partial).toBeGreaterThan(Math.PI * 16);
    expect(g.complete).toBeLessThan(Math.PI * 16);
  });
});

describe("剪拼轨道", () => {
  const layout: StageLayout = { sourceCenter: { x: 8, y: 10 }, assemblyOrigin: { x: 28, y: 10 }, assemblyMaxWidth: 22 };

  it("t = 0 在原圆位置，t = 1 在目标位置，中途线性插值", () => {
    const src = sourcePose(3, 8, layout.sourceCenter);
    const dst = rectTargetPose(3, 4, 8, layout.assemblyOrigin);
    expect(piecePose(3, 4, 8, "rect", 0, false, layout, 0.2)).toEqual(src);
    expect(piecePose(3, 4, 8, "rect", 1, false, layout, 0.2)).toEqual(dst);
    const mid = piecePose(3, 4, 8, "rect", 0.5, false, layout, 0.2);
    expect(mid.x).toBeCloseTo((src.x + dst.x) / 2, 10);
    expect(mid.y).toBeCloseTo((src.y + dst.y) / 2, 10);
    expect(mid.rot).toBeCloseTo(lerpAngle(src.rot, dst.rot, 0.5), 10);
  });

  it("「移」只在 t = 0 时径向炸开 0.2r", () => {
    const p = piecePose(0, 4, 8, "rect", 0, true, layout, 0.2);
    expect(Math.hypot(p.x - layout.sourceCenter.x, p.y - layout.sourceCenter.y)).toBeCloseTo(0.8, 10);
    const q = piecePose(0, 4, 8, "rect", 0.3, true, layout, 0.2);
    const src = sourcePose(0, 8, layout.sourceCenter);
    expect(q.x).not.toBeCloseTo(src.x + 0.8 * Math.cos(src.rot), 5);
  });

  it("长方形拼法：上下两排各 n/2 份、尖朝相反方向，外框长 = n/2 × 弦长、宽 = 高", () => {
    const r = 4;
    for (const n of N_VALUES) {
      const L = rectLayout(r, n, layout.assemblyOrigin);
      const g = pieceGeometry(r, n);
      expect(L.length).toBeCloseTo((n / 2) * g.chord, 12);
      expect(L.width).toBeCloseTo(g.apothem, 12);
      let up = 0;
      let down = 0;
      for (let i = 0; i < n; i++) {
        const p = rectTargetPose(i, r, n, layout.assemblyOrigin);
        if (Math.abs(p.rot - Math.PI / 2) < 1e-9) {
          up++;
          expect(p.y).toBeCloseTo(L.y, 12);
        } else {
          down++;
          expect(p.y).toBeCloseTo(L.y + L.width, 12);
        }
        expect(p.x).toBeGreaterThanOrEqual(L.bbox.x - 1e-9);
        expect(p.x).toBeLessThanOrEqual(L.bbox.x + L.bbox.w + 1e-9);
      }
      expect(up).toBe(n / 2);
      expect(down).toBe(n / 2);
    }
  });

  it("三角形拼法：一排放不下时换行，全部落在占位框内", () => {
    const r = 6;
    const L = triLayout(r, 64, layout.assemblyOrigin, 22);
    expect(L.rows).toBeGreaterThan(1);
    expect(L.perRow * L.rows).toBeGreaterThanOrEqual(64);
    for (let i = 0; i < 64; i++) {
      const p = triTargetPose(i, r, 64, layout.assemblyOrigin, 22);
      expect(p.rot).toBeCloseTo(Math.PI / 2, 12);
      expect(p.x).toBeGreaterThanOrEqual(L.bbox.x);
      expect(p.x).toBeLessThanOrEqual(L.bbox.x + L.bbox.w);
    }
    expect(triLayout(2, 8, layout.assemblyOrigin, 22).rows).toBe(1);
  });
});

describe("步骤 5 宽松校验", () => {
  it.each(["周长的一半", "半周长", "C ÷ 2", "c/2", "πr", "π×r", "π*r", "3.14×r", "3.14r", "ｃ÷２", "大约周长的一半"])(
    "长接受「%s」",
    (v) => expect(checkLength(v).ok).toBe(true),
  );
  it.each(["半径", "r", "R", "ｒ"])("宽接受「%s」", (v) => expect(checkWidth(v).ok).toBe(true));
  it("填「周长」「直径」给对照线段而不是打叉", () => {
    expect(checkLength("周长")).toMatchObject({ ok: false, contrast: "C" });
    expect(checkLength("2πr")).toMatchObject({ ok: false, contrast: "C" });
    expect(checkLength("直径")).toMatchObject({ ok: false, contrast: "d" });
    expect(checkWidth("直径")).toMatchObject({ ok: false, contrast: "d" });
    expect(checkWidth("d")).toMatchObject({ ok: false, contrast: "d" });
    expect(checkLength("面积")).toMatchObject({ ok: false, contrast: null });
    expect(checkLength("")).toMatchObject({ ok: false });
  });
});

describe("步骤流转", () => {
  it("步骤 0：选对「长 × 宽」才放行；老师可跳过", () => {
    const s = initialState();
    expect(canAdvance(s)).toBe(false);
    const wrong = reducer(s, { type: "STEP0_CHOOSE", choice: "长 + 宽" });
    expect(canAdvance(wrong)).toBe(false);
    const right = reducer(wrong, { type: "STEP0_CHOOSE", choice: "长 × 宽" });
    expect(canAdvance(right)).toBe(true);
    expect(evidenceKeys(right)).toContain("step0Completed");
    expect(evidenceKeys(reducer(s, { type: "STEP0_SKIP" }))).toContain("step0Skipped");
  });

  it("步骤 0 长方形长宽步进 0.5、范围受限", () => {
    let s = reducer(initialState(), { type: "STEP0_SET_A", a: 7.3 });
    expect(s.step0.a).toBe(7.5);
    s = reducer(s, { type: "STEP0_SET_A", a: 99 });
    expect(s.step0.a).toBe(12);
    s = reducer(s, { type: "STEP0_SET_B", b: 0 });
    expect(s.step0.b).toBe(2);
  });

  it("步骤 2：外接正方形 64 cm²；low < likely < high 才能继续", () => {
    expect(guessSquareArea()).toBe(64);
    let s = run(initialState(), { type: "STEP0_CHOOSE", choice: "长 × 宽" }, { type: "NEXT_STEP" }, { type: "NEXT_STEP" });
    expect(s.step).toBe(2);
    s = run(
      s,
      { type: "SET_GUESS", field: "low", value: 50 },
      { type: "SET_GUESS", field: "likely", value: 40 },
      { type: "SET_GUESS", field: "high", value: 70 },
    );
    expect(canAdvance(s)).toBe(false);
    s = reducer(s, { type: "SET_GUESS", field: "low", value: 30 });
    expect(canAdvance(s)).toBe(true);
  });

  it("剪前「移」「拼」无效；剪后可移、可拼；≥ 0.98 吸附到 1", () => {
    let s = toStep3();
    expect(reducer(s, { type: "TOGGLE_MOVE" }).moved).toBe(false);
    expect(reducer(s, { type: "SET_ASSEMBLE_T", t: 0.5 }).assembleT).toBe(0);
    s = reducer(s, { type: "CUT" });
    expect(s.cutDone).toBe(true);
    s = reducer(s, { type: "TOGGLE_MOVE" });
    expect(s.moved).toBe(true);
    s = reducer(s, { type: "SET_ASSEMBLE_T", t: 0.5 });
    expect(s.assembleT).toBe(0.5);
    expect(s.moved).toBe(false);
    expect(assembled(s)).toBe(false);
    s = reducer(s, { type: "SET_ASSEMBLE_T", t: ASSEMBLE_SNAP + 0.001 });
    expect(s.assembleT).toBe(1);
    expect(assembled(s)).toBe(true);
    expect(s.assembleCount).toBe(1);
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("firstAssembly");
    // 可来回拖
    s = reducer(s, { type: "SET_ASSEMBLE_T", t: 0.3 });
    expect(s.assembleT).toBe(0.3);
  });

  it("n 固定四档，128 为彩蛋：学生模式不可选，老师模式可选，长按解锁后学生也可", () => {
    expect(N_BASE).toEqual([8, 16, 32, 64]);
    const st = initialState({ mode: "student" });
    expect(availableN(st)).toEqual([8, 16, 32, 64]);
    expect(reducer(st, { type: "SET_N", n: 128 }).n).toBe(8);
    const t = initialState({ mode: "teacher" });
    expect(availableN(t)).toContain(128);
    const t128 = reducer(t, { type: "SET_N", n: 128 });
    expect(t128.n).toBe(128);
    expect(evidenceKeys(t128)).toContain("easterN128");
    const unlocked = reducer(st, { type: "UNLOCK_N128" });
    expect(reducer(unlocked, { type: "SET_N", n: 128 }).n).toBe(128);
    // 切回学生模式且未解锁：128 退回 64
    expect(reducer(t128, { type: "SET_MODE", mode: "student" }).n).toBe(64);
  });

  it("改 n 或 r（步骤 3–5）后拼合区清空、需重剪重拼；已加入的表行不受影响", () => {
    let s = cutAndAssemble(toStep3());
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(1);
    const afterN = reducer(s, { type: "SET_N", n: 16 });
    expect(afterN.cutDone).toBe(false);
    expect(afterN.assembleT).toBe(0);
    expect(afterN.table).toHaveLength(1);
    const afterR = reducer(s, { type: "SET_R", r: 5 });
    expect(afterR.r).toBe(5);
    expect(afterR.cutDone).toBe(false);
    expect(afterR.assembleT).toBe(0);
    expect(afterR.table).toHaveLength(1);
    expect(rescaleOnR(s)).toBe(false);
  });

  it("半径限 2.0–6.0，步进 0.1", () => {
    expect(clampR(0.5)).toBe(R_MIN);
    expect(clampR(99)).toBe(R_MAX);
    expect(clampR(4.26)).toBe(4.3);
  });

  it("未到位不能加入数据表；到位后行含 n、长 ≈、宽、面积 ≈（两位）", () => {
    let s = reducer(toStep3(), { type: "CUT" });
    s = reducer(s, { type: "SET_ASSEMBLE_T", t: 0.9 });
    expect(reducer(s, { type: "ADD_ROW" }).table).toHaveLength(0);
    s = reducer(s, { type: "SET_ASSEMBLE_T", t: 1 });
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(1);
    const row = s.table[0]!;
    expect(row.n).toBe(8);
    expect(row.r).toBe(4);
    expect(row.assembly).toBe("rect");
    expect(row.length).toBe(12.25);
    expect(row.width).toBe(3.7);
    expect(row.areaApprox).toBe(45.25);
    // 步骤 3 与 4 同屏：加入第一行后点亮 4
    expect(s.step).toBe(4);
    // 同 (n, r, 拼法) 不重复加入
    expect(duplicateRow(s)).toBe(true);
    expect(reducer(s, { type: "ADD_ROW" }).table).toHaveLength(1);
    expect(unrecordedAssembly(s)).toBe(false);
  });

  it("切拼法：进度归零；首次切「拆成三角形」弹迷你回忆并记 tri_assembly_used；两种拼法的行可混放", () => {
    let s = cutAndAssemble(toStep3());
    s = reducer(s, { type: "ADD_ROW" });
    s = reducer(s, { type: "SET_ASSEMBLY", assembly: "tri" });
    expect(s.assembleT).toBe(0);
    expect(s.cutDone).toBe(true);
    expect(s.triRecall.open).toBe(true);
    expect(s.triUsed).toBe(true);
    expect(evidenceKeys(s)).toContain("triUsed");
    s = reducer(s, { type: "TRI_RECALL_CHOOSE", choice: "1" });
    expect(s.triRecall.correct).toBe(false);
    s = reducer(s, { type: "TRI_RECALL_CHOOSE", choice: "½" });
    expect(s.triRecall.correct).toBe(true);
    s = reducer(s, { type: "TRI_RECALL_CLOSE" });
    expect(s.triRecall.open).toBe(false);
    for (let i = 1; i <= 5; i++) s = reducer(s, { type: "SET_ASSEMBLE_T", t: i / 5 });
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(2);
    expect(s.table[1]!.assembly).toBe("tri");
    expect(s.table[1]!.areaApprox).toBe(s.table[0]!.areaApprox);
    // 再切回不再弹
    s = reducer(s, { type: "SET_ASSEMBLY", assembly: "rect" });
    s = reducer(s, { type: "SET_ASSEMBLY", assembly: "tri" });
    expect(s.triRecall.open).toBe(false);
  });

  it("至少 3 行且 ≥ 2 档 n 才可进入步骤 5", () => {
    let s = cutAndAssemble(toStep3());
    s = reducer(s, { type: "ADD_ROW" });
    s = reducer(s, { type: "SET_ASSEMBLY", assembly: "tri" });
    for (let i = 1; i <= 5; i++) s = reducer(s, { type: "SET_ASSEMBLE_T", t: i / 5 });
    s = reducer(s, { type: "ADD_ROW" });
    s = reducer(s, { type: "SET_R", r: 5 });
    s = cutAndAssemble(s);
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(3);
    expect(tableReady(s)).toBe(false); // 只有一档 n
    s = withThreeRows();
    expect(tableReady(s)).toBe(true);
    expect(relationBadgeAvailable(s)).toBe(true);
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("tableRows3");
    expect(reducer(s, { type: "NEXT_STEP" }).step).toBe(5);
  });

  it("步骤 5 前不出现公式；双填空通过 + 两句非空才放行；进入步骤 6 才揭示", () => {
    let s = withThreeRows();
    expect(formulaVisible(s)).toBe(false);
    s = reducer(s, { type: "NEXT_STEP" });
    expect(formulaVisible(s)).toBe(false);
    s = run(s, { type: "SET_BLANK", field: "length", value: "周长" }, { type: "SET_BLANK", field: "width", value: "半径" });
    expect(patternOk(s)).toBe(false);
    s = reducer(s, { type: "SET_BLANK", field: "length", value: "πr" });
    expect(patternOk(s)).toBe(true);
    expect(canAdvance(s)).toBe(false);
    s = run(
      s,
      { type: "SET_DISCOVERY", field: "find", value: "长是周长的一半" },
      { type: "SET_DISCOVERY", field: "because", value: "上下各一半" },
      { type: "SUBMIT_PATTERN" },
    );
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("patternPassed");
    s = reducer(s, { type: "NEXT_STEP" });
    expect(s.step).toBe(6);
    expect(s.formulaRevealed).toBe(true);
    expect(formulaVisible(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("formulaRevealed");
  });

  it("老师可强制进入揭示并记「未填完整」", () => {
    let s = reducer(withThreeRows(), { type: "NEXT_STEP" });
    s = reducer(s, { type: "STEP5_FORCE" });
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("step5Forced");
  });

  it("步骤 6：推导链逐行出现，最多 3 行；活公式与拼合区、表同一 r", () => {
    let s = toStep6();
    expect(s.derivationLines).toBe(0);
    s = run(s, { type: "REVEAL_LINE" }, { type: "REVEAL_LINE" }, { type: "REVEAL_LINE" }, { type: "REVEAL_LINE" });
    expect(s.derivationLines).toBe(3);
    expect(formulaS(s.r)).toBe(50.24);
    s = reducer(s, { type: "SET_R", r: 5 });
    expect(formulaS(s.r)).toBe(78.5);
    expect(currentApprox(s).area).toBeLessThan(78.5);
  });

  it("揭示后改 r 不清拼合区（随 r 缩放）", () => {
    let s = toStep6();
    expect(rescaleOnR(s)).toBe(true);
    // 表里最后一次拼合在 n = 32 到位
    expect(s.cutDone).toBe(true);
    expect(s.assembleT).toBe(1);
    s = reducer(s, { type: "SET_R", r: 5 });
    expect(s.cutDone).toBe(true);
    expect(s.assembleT).toBe(1);
  });

  it("π 展示：默认 3.14；老师可切 3.1416；学生模式切回", () => {
    let s = initialState({ mode: "teacher" });
    s = reducer(s, { type: "SET_PI_PRECISION", precision: "3.1416" });
    expect(s.piPrecision).toBe("3.1416");
    expect(formulaS(4)).toBe(50.24);
    s = reducer(s, { type: "SET_MODE", mode: "student" });
    expect(s.piPrecision).toBe("3.14");
  });

  it("步骤 7 任务 A：先算再拼；锁定后 n = 64、已剪；2% 内「对上了」", () => {
    let s = run(toStep6(), { type: "NEXT_STEP" });
    expect(s.step).toBe(7);
    s = reducer(s, { type: "VERIFY_SET_R", r: 5 });
    expect(s.r).toBe(5);
    expect(s.verify.rPred).toBe(5);
    // 未锁定预测：拼到位不算验证
    const early = cutAndAssemble(s);
    expect(early.verify.done).toBe(false);
    s = reducer(s, { type: "VERIFY_SET_PRED", sPred: 78.5 });
    s = reducer(s, { type: "VERIFY_LOCK" });
    expect(s.verify.locked).toBe(true);
    expect(s.n).toBe(64);
    expect(s.cutDone).toBe(true);
    expect(s.assembleT).toBe(0);
    for (let i = 1; i <= 4; i++) s = reducer(s, { type: "SET_ASSEMBLE_T", t: i / 4 });
    const r = verifyResult(s);
    expect(r?.ok).toBe(true);
    expect(r?.exact).toBe(78.5);
    expect(r?.assembledApprox).toBe(currentApprox(s).area);
    expect(s.verify.successCount).toBe(1);
    expect(canAdvance(s)).toBe(true);
    expect(evidenceKeys(s)).toContain("predictVerified");
  });

  it("步骤 7 预测归因：≈ 2πr 提示周长 / r²≠2r；≈ πd² 提示直径", () => {
    expect(verifyHint(31.4, 5)).toBe("circumference");
    expect(verifyHint(314, 5)).toBe("diameter");
    expect(verifyHint(78.5, 5)).toBe(null);
    let s = run(toStep6(), { type: "NEXT_STEP" }, { type: "VERIFY_SET_R", r: 5 }, { type: "VERIFY_SET_PRED", sPred: 31.4 }, { type: "VERIFY_LOCK" });
    for (let i = 1; i <= 4; i++) s = reducer(s, { type: "SET_ASSEMBLE_T", t: i / 4 });
    const r = verifyResult(s);
    expect(r?.ok).toBe(false);
    expect(r?.hint).toBe("circumference");
    expect(r?.direction).toBe("under");
  });

  it("步骤 7 任务 B 必须先 d → r；任务 C 两格；猜一猜参照 50.24", () => {
    let s = run(toStep6(), { type: "NEXT_STEP" });
    expect(reducer(s, { type: "VERIFY_TABLE_S", value: 0.785 }).verify.tableS).toBe(null);
    s = reducer(s, { type: "VERIFY_TABLE_D_TO_R" });
    s = reducer(s, { type: "VERIFY_TABLE_S", value: 0.785 });
    expect(s.verify.tableS).toBe(0.785);
    expect(tableExpected()).toEqual({ r: 0.5, s: 0.785 });
    expect(lawnExpected()).toEqual({ r: 10, s: 314, cost: 2512 });
    expect(guessReferenceS()).toBe(50.24);
    s = run(s, { type: "ADD_CANDIDATE", step: 2, label: "30" }, { type: "ADD_CANDIDATE", step: 2, label: "50" }, { type: "ADD_CANDIDATE", step: 2, label: "64" });
    expect(closestCandidate(s, 2, guessReferenceS())).toBe("50");
  });

  it("学生模式隐藏步骤 8 与提问卡；易混并排老师随时、学生第 9 步", () => {
    const t = initialState({ mode: "teacher" });
    expect(questionCardVisible(t)).toBe(true);
    expect(confusionAvailable(t)).toBe(true);
    const st = reducer(t, { type: "SET_MODE", mode: "student" });
    expect(questionCardVisible(st)).toBe(false);
    expect(visibleSteps(st)).not.toContain(8);
    expect(canGoto({ ...st, step: 7, maxStep: 9 }, 8)).toBe(false);
    expect(reducer(st, { type: "SET_CONFUSION", on: true }).confusionMode).toBe(false);
    const st9 = { ...st, step: 9 as const, maxStep: 9 as const };
    const opened = reducer(st9, { type: "SET_CONFUSION", on: true });
    expect(opened.confusionMode).toBe(true);
    expect(evidenceKeys(opened)).toContain("confusionOpened");
  });

  it("切模式不清任何探究数据", () => {
    const s = withThreeRows();
    const st = reducer(s, { type: "SET_MODE", mode: "student" });
    expect(st.table).toEqual(s.table);
    expect(st.step).toBe(s.step);
    expect(st.guess).toEqual(s.guess);
  });

  it("已完成步骤可回看且不改数据；不能跳到未解锁步骤", () => {
    const s = withThreeRows();
    const back = reducer(s, { type: "GOTO_STEP", step: 1 });
    expect(back.step).toBe(1);
    expect(back.table).toEqual(s.table);
    expect(back.maxStep).toBe(4);
    expect(reducer(back, { type: "GOTO_STEP", step: 7 }).step).toBe(1);
  });

  it("老师模式可设默认路线，重置后生效", () => {
    let s = reducer(initialState({ mode: "teacher" }), { type: "SET_DEFAULT_ASSEMBLY", assembly: "tri" });
    expect(s.assembly).toBe("rect");
    s = reducer(s, { type: "RESET" });
    expect(s.assembly).toBe("tri");
    expect(reducer(initialState({ mode: "student" }), { type: "SET_DEFAULT_ASSEMBLY", assembly: "tri" }).defaultAssembly).toBe("rect");
  });
});

describe("撤销 / 重置", () => {
  it("撤销可回退 r 变更、n 变更、拼合到位、表行加入", () => {
    let s = toStep3();
    s = reducer(s, { type: "SET_R", r: 5 });
    expect(reducer(s, { type: "UNDO" }).r).toBe(4);
    s = reducer(s, { type: "SET_N", n: 32 });
    expect(reducer(s, { type: "UNDO" }).n).toBe(8);
    s = cutAndAssemble(s);
    const undone = reducer(s, { type: "UNDO" });
    expect(undone.assembleT).toBeLessThan(1);
    expect(undone.assembleCount).toBe(0);
    s = reducer(s, { type: "ADD_ROW" });
    expect(s.table).toHaveLength(1);
    s = reducer(s, { type: "UNDO" });
    expect(s.table).toHaveLength(0);
    expect(s.assembleT).toBe(1);
  });

  it("拖半径没变时不留撤销记录", () => {
    const s = toStep3();
    const same = run(s, { type: "BEGIN_DRAG_R" }, { type: "DRAG_R", r: 4 }, { type: "END_DRAG_R" });
    expect(same.history.length).toBe(s.history.length);
    const changed = run(s, { type: "BEGIN_DRAG_R" }, { type: "DRAG_R", r: 5 }, { type: "END_DRAG_R" });
    expect(changed.history.length).toBe(s.history.length + 1);
  });

  it("撤销栈最多 30 步", () => {
    let s = toStep3();
    for (let i = 0; i < 40; i++) s = reducer(s, { type: "SET_R", r: 2 + (i % 40) * 0.1 });
    expect(s.history.length).toBeLessThanOrEqual(30);
  });

  it("重置清到步骤 0 初始：r = 4，n = 8，未剪，空表，猜清空，公式未揭示；保留模式", () => {
    let s = toStep6();
    s = reducer(s, { type: "SET_MODE", mode: "student" });
    s = reducer(s, { type: "RESET" });
    expect(s.step).toBe(0);
    expect(s.r).toBe(4);
    expect(s.n).toBe(8);
    expect(s.cutDone).toBe(false);
    expect(s.table).toEqual([]);
    expect(s.guess).toEqual({ low: null, likely: null, high: null });
    expect(s.formulaRevealed).toBe(false);
    expect(s.history).toEqual([]);
    expect(s.mode).toBe("student");
  });
});
