import { describe, expect, it } from "vitest";
import {
  allShapeStationsCompleted,
  canGoNext,
  embeddedActions,
  evidenceKeys,
  fillCheck,
  fillFeedback,
  paraRecordsDistinct,
} from "@/explorations/area-chain/model/derived";
import { initialState, reducer, type Action, type InitOptions } from "@/explorations/area-chain/model/reducer";
import { HISTORY_MAX, type State } from "@/explorations/area-chain/model/types";

function run(state: State, ...actions: Action[]): State {
  return actions.reduce(reducer, state);
}

function start(opts?: InitOptions): State {
  return initialState(opts);
}

function go(station: "rect" | "para" | "tri" | "trap", opts?: InitOptions): State {
  return initialState({ ...opts, station });
}

function assemble(s: State, t = 1): State {
  return run(s, { type: "BEGIN_ASSEMBLE" }, { type: "SET_T", t });
}

describe("改参数 t 归 0", () => {
  it("第 2 站改倾斜 s：t 归 0、剪开进度清掉、需重剪", () => {
    let s = go("para");
    s = run(s, { type: "CUT" }, { type: "SET_T", t: 0.6 });
    expect(s.stations.para.t).toBe(0.6);
    expect(s.stations.para.cutDone).toBe(true);
    s = reducer(s, { type: "SET_PARAM", value: 3 });
    expect(s.stations.para.param).toBe(3);
    expect(s.stations.para.t).toBe(0);
    expect(s.stations.para.moved).toBe(false);
    expect(s.stations.para.cutDone).toBe(false);
    expect(s.stations.para.rulers).toEqual([]);
  });

  it("第 3 / 4 站改参数：t 归 0，不涉及剪", () => {
    let tri = go("tri");
    tri = assemble(tri);
    expect(tri.stations.tri.t).toBe(1);
    tri = reducer(tri, { type: "SET_PARAM", value: 5 });
    expect(tri.stations.tri.param).toBe(5);
    expect(tri.stations.tri.t).toBe(0);

    let trap = go("trap");
    trap = assemble(trap);
    trap = reducer(trap, { type: "SET_PARAM", value: 2 });
    expect(trap.stations.trap.param).toBe(2);
    expect(trap.stations.trap.t).toBe(0);
  });

  it("参数步进 0.5；相同值不改状态", () => {
    const s = go("rect");
    const same = reducer(s, { type: "SET_PARAM", value: 6 });
    expect(same).toBe(s);
    const snapped = reducer(s, { type: "SET_PARAM", value: 6.24 });
    expect(snapped.stations.rect.param).toBe(6);
    const half = reducer(s, { type: "SET_PARAM", value: 6.3 });
    expect(half.stations.rect.param).toBe(6.5);
  });

  it("第 1 站改长不碰 t（无转化）", () => {
    const s = reducer(go("rect"), { type: "SET_PARAM", value: 8 });
    expect(s.stations.rect.param).toBe(8);
    expect(s.stations.rect.t).toBe(0);
  });
});

describe("剪 / 移 / 拼门禁", () => {
  it("第 1 站剪 / 移 / 拼全部无效", () => {
    const s = go("rect");
    expect(reducer(s, { type: "CUT" })).toBe(s);
    expect(reducer(s, { type: "TOGGLE_MOVE" })).toBe(s);
    expect(reducer(s, { type: "SET_T", t: 1 })).toBe(s);
  });

  it("第 2 站：剪前不能移、不能拼；剪后可移可拼；已剪再剪无效", () => {
    const s = go("para");
    expect(s.stations.para.cutDone).toBe(false);
    expect(reducer(s, { type: "TOGGLE_MOVE" })).toBe(s);
    expect(reducer(s, { type: "SET_T", t: 1 })).toBe(s);
    const cut = reducer(s, { type: "CUT" });
    expect(cut.stations.para.cutDone).toBe(true);
    expect(reducer(cut, { type: "CUT" })).toBe(cut);
    const moved = reducer(cut, { type: "TOGGLE_MOVE" });
    expect(moved.stations.para.moved).toBe(true);
    const assembling = reducer(cut, { type: "SET_T", t: 0.4 });
    expect(assembling.stations.para.t).toBe(0.4);
    expect(reducer(assembling, { type: "TOGGLE_MOVE" })).toBe(assembling);
  });

  it("第 3 / 4 站不用剪，直接可移可拼", () => {
    const tri = reducer(go("tri"), { type: "TOGGLE_MOVE" });
    expect(tri.stations.tri.moved).toBe(true);
    expect(assemble(go("tri")).stations.tri.t).toBe(1);
    const trap = assemble(go("trap"));
    expect(trap.stations.trap.t).toBe(1);
    expect(trap.stations.trap.assembleCount).toBe(1);
  });

  it("拼到位只在跨过 t=1 时记一次 assembleCount", () => {
    let s = run(go("para"), { type: "CUT" }, { type: "SET_T", t: 1 });
    expect(s.stations.para.assembleCount).toBe(1);
    s = reducer(s, { type: "SET_T", t: 1 });
    expect(s.stations.para.assembleCount).toBe(1);
    s = run(s, { type: "SET_T", t: 0.2 }, { type: "SET_T", t: 1 });
    expect(s.stations.para.assembleCount).toBe(2);
  });
});

describe("填空通过 / 错选反馈", () => {
  it("第 1 站：长 × 宽 通过；周长两项给 perimeter 反馈", () => {
    expect(fillCheck("rect", ["长 × 宽"])).toBe(true);
    let s = run(go("rect"), { type: "SET_FILL", value: "长 + 宽" }, { type: "SUBMIT_FILL" });
    expect(s.stations.rect.fillPassed).toBe(false);
    expect(fillFeedback("rect", s.stations.rect)).toEqual({ kind: "perimeter" });
    s = run(s, { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" });
    expect(s.stations.rect.fillPassed).toBe(true);
    expect(fillFeedback("rect", s.stations.rect)).toBeNull();
    const peri2 = run(go("rect"), { type: "SET_FILL", value: "(长 + 宽) × 2" }, { type: "SUBMIT_FILL" });
    expect(fillFeedback("rect", peri2.stations.rect)).toEqual({ kind: "perimeter" });
  });

  it("第 2 站：底 × 斜边 → slant；长 × 宽 → half-right；底 × 高通过", () => {
    const slant = run(go("para"), { type: "SET_FILL", value: "底 × 斜边" }, { type: "SUBMIT_FILL" });
    expect(fillFeedback("para", slant.stations.para)).toEqual({ kind: "slant" });
    const half = run(go("para"), { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" });
    expect(fillFeedback("para", half.stations.para)).toEqual({ kind: "half-right" });
    const ok = run(go("para"), { type: "SET_FILL", value: "底 × 高" }, { type: "SUBMIT_FILL" });
    expect(ok.stations.para.fillPassed).toBe(true);
  });

  it("第 3 站：× 2 → double；不用再算 → borrowed；÷ 2 通过", () => {
    const dbl = run(go("tri"), { type: "SET_FILL", value: "× 2" }, { type: "SUBMIT_FILL" });
    expect(fillFeedback("tri", dbl.stations.tri)).toEqual({ kind: "double" });
    const borrowed = run(go("tri"), { type: "SET_FILL", value: "不用再算" }, { type: "SUBMIT_FILL" });
    expect(fillFeedback("tri", borrowed.stations.tri)).toEqual({ kind: "borrowed" });
    expect(run(go("tri"), { type: "SET_FILL", value: "÷ 2" }, { type: "SUBMIT_FILL" }).stations.tri.fillPassed).toBe(true);
  });

  it("填空一旦通过就保留，再错选也不清 fillPassed", () => {
    let s = run(go("rect"), { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" });
    expect(s.stations.rect.fillPassed).toBe(true);
    s = run(s, { type: "SET_FILL", value: "长 + 宽" }, { type: "SUBMIT_FILL" });
    expect(s.stations.rect.fillPassed).toBe(true);
    expect(s.stations.rect.fillIn).toEqual(["长 + 宽"]);
  });
});

describe("梯形双空集合判定", () => {
  it("集合等于 {上底, 下底} 即通过，顺序无关", () => {
    expect(fillCheck("trap", ["上底", "下底"])).toBe(true);
    expect(fillCheck("trap", ["下底", "上底"])).toBe(true);
    expect(fillCheck("trap", ["上底"])).toBe(false);
    expect(fillCheck("trap", ["上底", "高"])).toBe(false);
    expect(fillCheck("trap", ["腰", "下底"])).toBe(false);
  });

  it("未选满两个不能提交；含腰给 leg 反馈", () => {
    const one = reducer(go("trap"), { type: "SET_FILL", value: "上底" });
    expect(reducer(one, { type: "SUBMIT_FILL" })).toBe(one);
    let s = run(go("trap"), { type: "SET_FILL", value: "上底" }, { type: "SET_FILL", value: "腰" }, { type: "SUBMIT_FILL" });
    expect(s.stations.trap.fillPassed).toBe(false);
    expect(fillFeedback("trap", s.stations.trap)).toEqual({ kind: "leg" });
    s = run(go("trap"), { type: "SET_FILL", value: "下底" }, { type: "SET_FILL", value: "上底" }, { type: "SUBMIT_FILL" });
    expect(s.stations.trap.fillPassed).toBe(true);
    expect(s.stations.trap.fillIn).toEqual(["下底", "上底"]);
  });

  it("再点已选项会取消", () => {
    const s = run(go("trap"), { type: "SET_FILL", value: "上底" }, { type: "SET_FILL", value: "上底" });
    expect(s.stations.trap.fillIn).toEqual([]);
  });
});

describe("老师跳站记录", () => {
  it("老师未通过填空点「下一站」记 skippedByTeacher，学生不能跳", () => {
    const teacher = reducer(start({ mode: "teacher" }), { type: "NEXT_STATION" });
    expect(teacher.station).toBe("para");
    expect(teacher.skippedByTeacher).toEqual(["rect"]);
    expect(canGoNext(start({ mode: "teacher" }))).toBe(true);

    const student = start({ mode: "student" });
    expect(canGoNext(student)).toBe(false);
    expect(reducer(student, { type: "NEXT_STATION" })).toBe(student);
    expect(student.skippedByTeacher).toEqual([]);
  });

  it("填空通过后再下一站不记 skip；同一站不重复记", () => {
    let s = run(start({ mode: "teacher" }), { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" }, { type: "NEXT_STATION" });
    expect(s.station).toBe("para");
    expect(s.skippedByTeacher).toEqual([]);
    s = run(start({ mode: "teacher" }), { type: "NEXT_STATION" });
    s = reducer(s, { type: "SELECT_STATION", station: "rect" });
    s = reducer(s, { type: "NEXT_STATION" });
    expect(s.skippedByTeacher).toEqual(["rect"]);
  });

  it("嵌入模式不能切站", () => {
    const s = start({ embedded: true, station: "para" });
    expect(reducer(s, { type: "NEXT_STATION" })).toBe(s);
    expect(reducer(s, { type: "SELECT_STATION", station: "tri" })).toBe(s);
  });
});

describe("undo / reset", () => {
  it("撤销恢复剪 / 参数 / 填空；栈最多 30 步", () => {
    let s = run(go("para"), { type: "CUT" });
    expect(s.history).toHaveLength(1);
    s = reducer(s, { type: "UNDO" });
    expect(s.stations.para.cutDone).toBe(false);
    expect(s.history).toHaveLength(0);

    s = go("rect");
    for (let i = 0; i < HISTORY_MAX + 5; i++) s = reducer(s, { type: "SET_PARAM", value: 2 + (i % 10) * 0.5 });
    expect(s.history.length).toBe(HISTORY_MAX);

    s = run(go("rect"), { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" });
    expect(s.stations.rect.fillPassed).toBe(true);
    s = reducer(s, { type: "UNDO" });
    expect(s.stations.rect.fillPassed).toBe(false);
  });

  it("重置回到第 1 站默认参数并清空撤销栈；嵌入重置留在本站", () => {
    let s = run(go("para"), { type: "CUT" }, { type: "SET_PARAM", value: 4 });
    s = reducer(s, { type: "RESET" });
    expect(s.station).toBe("rect");
    expect(s.stations.para.cutDone).toBe(false);
    expect(s.stations.para.param).toBe(2);
    expect(s.history).toEqual([]);

    const emb = reducer(start({ embedded: true, station: "tri" }), { type: "RESET" });
    expect(emb.station).toBe("tri");
    expect(emb.embedded).toBe(true);
  });

  it("RESET_STATION 只清当前站，他站保留", () => {
    let s = run(start(), { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" }, { type: "NEXT_STATION" }, { type: "CUT" });
    s = reducer(s, { type: "RESET_STATION" });
    expect(s.station).toBe("para");
    expect(s.stations.para.cutDone).toBe(false);
    expect(s.stations.rect.fillPassed).toBe(true);
  });
});

describe("evidenceKeys", () => {
  it("填空通过、老师跳站、正方形、剪的位置归纳、沿链走完分别出键", () => {
    let s = start({ playThrough: true, mode: "teacher" });
    s = run(s, { type: "SET_PARAM", value: 4 }, { type: "SET_RECT_B", value: 4 });
    expect(s.stations.rect.squareSeen).toBe(true);
    s = run(s, { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" }, { type: "NEXT_STATION" });
    expect(evidenceKeys(s)).toEqual(expect.arrayContaining(["stationCompleted:rect", "squareCaseSeen"]));

    s = reducer(s, { type: "NEXT_STATION" });
    expect(s.skippedByTeacher).toContain("para");
    expect(evidenceKeys(s)).toEqual(expect.arrayContaining(["stationSkipped:para"]));

    s = run(go("para"), { type: "SET_PARA_DISCOVERY", value: "不影响" });
    expect(evidenceKeys(s)).toContain("paraCutPositionDiscovered");

    let done = start({ playThrough: true });
    for (const k of ["rect", "para", "tri", "trap"] as const) {
      done = reducer(done, { type: "SELECT_STATION", station: k });
      const ans = { rect: "长 × 宽", para: "底 × 高", tri: "÷ 2" } as const;
      if (k === "trap") {
        done = run(done, { type: "SET_FILL", value: "上底" }, { type: "SET_FILL", value: "下底" }, { type: "SUBMIT_FILL" });
      } else {
        done = run(done, { type: "SET_FILL", value: ans[k] }, { type: "SUBMIT_FILL" });
      }
    }
    expect(allShapeStationsCompleted(done)).toBe(true);
    expect(evidenceKeys(done)).not.toContain("playedThrough");
    done = reducer(done, { type: "CIRCLE_ENTERED" });
    expect(evidenceKeys(done)).toContain("playedThrough");
  });

  it("嵌入模式 evidenceKeys 恒空", () => {
    const s = run(start({ embedded: true, station: "rect" }), { type: "SET_FILL", value: "长 × 宽" }, { type: "SUBMIT_FILL" });
    expect(s.stations.rect.fillPassed).toBe(true);
    expect(evidenceKeys(s)).toEqual([]);
  });
});

describe("嵌入模式 embeddedActions 与 history 恒空", () => {
  it("各站核心动作：第 1 站无按钮，其余只拼", () => {
    expect(embeddedActions("rect")).toEqual([]);
    expect(embeddedActions("para")).toEqual(["assemble"]);
    expect(embeddedActions("tri")).toEqual(["assemble"]);
    expect(embeddedActions("trap")).toEqual(["assemble"]);
  });

  it("嵌入：第 2 站预先剪好，任何操作不进撤销栈，UNDO 无效", () => {
    const s = start({ embedded: true, station: "para", initial: { para: { preCut: true } } });
    expect(s.stations.para.cutDone).toBe(true);
    expect(s.history).toEqual([]);
    const after = run(s, { type: "BEGIN_ASSEMBLE" }, { type: "SET_T", t: 1 }, { type: "SET_FILL", value: "底 × 高" }, { type: "SUBMIT_FILL" });
    expect(after.history).toEqual([]);
    expect(reducer(after, { type: "UNDO" })).toBe(after);
    expect(after.stations.para.t).toBe(1);
    expect(after.stations.para.fillPassed).toBe(true);
  });

  it("嵌入改倾斜仍保持已剪，只把 t 归 0；RESET_STATION 不推栈", () => {
    let s = start({ embedded: true, station: "para" });
    s = run(s, { type: "SET_T", t: 0.5 }, { type: "SET_PARAM", value: 4 });
    expect(s.stations.para.cutDone).toBe(true);
    expect(s.stations.para.t).toBe(0);
    expect(s.history).toEqual([]);
    s = reducer(s, { type: "RESET_STATION" });
    expect(s.history).toEqual([]);
    expect(s.stations.para.t).toBe(0);
    expect(s.stations.para.cutDone).toBe(true);
  });
});

describe("第 2 站小 L3 记录", () => {
  it("每次拼到位记一行；换位置再剪保留记录；两处不同位置可归纳", () => {
    let s = run(go("para"), { type: "CUT" });
    s = assemble(s);
    expect(s.stations.para.paraRecords).toHaveLength(1);
    expect(s.stations.para.paraRecords[0]).toMatchObject({ area: 24, length: 6, width: 4 });
    s = reducer(s, { type: "RECUT" });
    expect(s.stations.para.cutDone).toBe(false);
    expect(s.stations.para.paraRecords).toHaveLength(1);
    s = run(s, { type: "DRAG_CUT_POS", value: 4 }, { type: "CUT" });
    s = assemble(s);
    expect(paraRecordsDistinct(s.stations.para)).toBe(2);
    expect(s.stations.para.paraRecords).toHaveLength(2);
  });

  it("嵌入不能 RECUT", () => {
    const s = start({ embedded: true, station: "para" });
    expect(reducer(s, { type: "RECUT" })).toBe(s);
  });
});
