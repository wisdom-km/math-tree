import { paraCutRange, snapHalf, type TriangleKind } from "@/shared/shape-canvas/geometry";
import { fillCheck, isShapeStation, nextStation, paraDerived, prevStation, stationAssembled, stationCompleted } from "./derived";
import {
  HISTORY_MAX,
  PARAM_RANGE,
  PARA_FIXED,
  RECT_B_RANGE,
  SHAPE_STATIONS,
  type CoreState,
  type Mode,
  type ShapeStationId,
  type State,
  type StationId,
  type StationState,
} from "./types";

/* ---------------- 初始状态 ---------------- */

export interface StationInit {
  param?: number;
  /** 第 1 站宽 b */
  rectB?: number;
  /** 嵌入模式第 2 站预先剪好 */
  preCut?: boolean;
  triKind?: TriangleKind;
}

export interface InitOptions {
  station?: StationId;
  mode?: Mode;
  playThrough?: boolean;
  embedded?: boolean;
  initial?: Partial<Record<ShapeStationId, StationInit>>;
}

export function initialStation(station: ShapeStationId, init: StationInit = {}): StationState {
  const range = PARAM_RANGE[station];
  const param = clampParam(station, init.param ?? range.default);
  const cutDefault = station === "para" ? param : 0;
  return {
    param,
    touched: false,
    cutDone: station === "para" ? !!init.preCut : false,
    moved: false,
    t: 0,
    assembleCount: 0,
    fillIn: [],
    fillSubmitted: false,
    fillPassed: false,
    rulers: [],
    rectB: clampRectB(init.rectB ?? RECT_B_RANGE.default),
    rowCountAnim: 0,
    irregular: false,
    squareSeen: false,
    cutPos: cutDefault,
    paraRecords: [],
    paraDiscovery: null,
    triKind: init.triKind ?? "acute",
    halfNotation: false,
  };
}

export function initialCore(opts: InitOptions = {}): CoreState {
  const stations = {} as Record<ShapeStationId, StationState>;
  for (const k of SHAPE_STATIONS) stations[k] = initialStation(k, opts.initial?.[k]);
  return {
    station: opts.station ?? "rect",
    playThrough: opts.playThrough ?? false,
    embedded: opts.embedded ?? false,
    stations,
    skippedByTeacher: [],
    circleEntryViewed: false,
    circleEntered: false,
    askedQuestions: [],
    mode: opts.mode ?? "teacher",
  };
}

export function initialState(opts: InitOptions = {}): State {
  return { ...initialCore(opts), history: [] };
}

/* ---------------- 动作 ---------------- */

export type Action =
  | { type: "SELECT_STATION"; station: StationId }
  | { type: "NEXT_STATION" }
  | { type: "PREV_STATION" }
  // 参数
  | { type: "BEGIN_DRAG" }
  | { type: "DRAG_PARAM"; value: number }
  | { type: "END_DRAG" }
  | { type: "SET_PARAM"; value: number }
  // 剪 / 移 / 拼
  | { type: "CUT" }
  | { type: "TOGGLE_MOVE" }
  | { type: "BEGIN_ASSEMBLE" }
  | { type: "SET_T"; t: number }
  | { type: "TOGGLE_RULER"; ruler: string }
  // 填空
  | { type: "SET_FILL"; value: string }
  | { type: "SUBMIT_FILL" }
  // 第 1 站
  | { type: "SET_RECT_B"; value: number }
  | { type: "ROW_COUNT" }
  | { type: "SET_IRREGULAR"; on: boolean }
  // 第 2 站
  | { type: "BEGIN_DRAG_CUT" }
  | { type: "DRAG_CUT_POS"; value: number }
  | { type: "SET_CUT_PRESET"; preset: "triangle" | "trapezoids" }
  | { type: "SET_PARA_DISCOVERY"; value: "不影响" | "影响" }
  /** 小 L3：拼到位后换个位置再剪一次（保留记录） */
  | { type: "RECUT" }
  // 第 3 站
  | { type: "SET_TRI_KIND"; kind: TriangleKind }
  | { type: "TOGGLE_HALF_NOTATION" }
  // 第 5 站
  | { type: "CIRCLE_ENTRY_VIEWED" }
  | { type: "CIRCLE_ENTERED" }
  // 其他
  | { type: "SET_MODE"; mode: Mode }
  | { type: "MARK_ASKED"; key: string }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "RESET_STATION"; init?: StationInit };

/* ---------------- 工具 ---------------- */

function snapshot(s: State): CoreState {
  const { history: _h, ...core } = s;
  return core;
}

function pushHistory(s: State): State {
  if (s.embedded) return s; // 嵌入模式只可重置，不进撤销栈（已拍板第 6 条）
  const history = [...s.history, snapshot(s)];
  if (history.length > HISTORY_MAX) history.shift();
  return { ...s, history };
}

export function clampParam(station: ShapeStationId, v: number): number {
  const r = PARAM_RANGE[station];
  return Math.min(r.max, Math.max(r.min, snapHalf(v)));
}
export function clampRectB(v: number): number {
  return Math.min(RECT_B_RANGE.max, Math.max(RECT_B_RANGE.min, snapHalf(v)));
}

function cur(s: State): { key: ShapeStationId; st: StationState } | null {
  if (!isShapeStation(s.station)) return null;
  return { key: s.station, st: s.stations[s.station] };
}

function patchStation(s: State, key: ShapeStationId, patch: Partial<StationState>): State {
  return { ...s, stations: { ...s.stations, [key]: { ...s.stations[key], ...patch } } };
}

/** 改参数：t 归 0、需重剪重拼（第 1 站无转化） */
function applyParam(s: State, key: ShapeStationId, value: number): State {
  const st = s.stations[key];
  const nv = clampParam(key, value);
  if (nv === st.param) return s;
  const patch: Partial<StationState> = { param: nv, touched: true };
  if (key !== "rect") {
    patch.t = 0;
    patch.moved = false;
    patch.cutDone = s.embedded && key === "para" ? true : false;
    patch.rulers = [];
  }
  if (key === "para") {
    // 剪的位置跟随合法范围：默认剪在左上顶点作的高上
    const { min, max } = paraCutRange(PARA_FIXED.a, nv);
    const wasAtVertex = Math.abs(st.cutPos - st.param) < 1e-9;
    patch.cutPos = wasAtVertex ? nv : Math.min(max, Math.max(min, st.cutPos));
  }
  if (key === "rect" && nv === st.rectB) patch.squareSeen = true;
  return patchStation(s, key, patch);
}

function setStation(s: State, station: StationId): State {
  return { ...s, station };
}

/* ---------------- reducer ---------------- */

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SELECT_STATION": {
      if (s.embedded) return s;
      if (a.station === s.station) return s;
      return setStation(s, a.station);
    }
    case "NEXT_STATION": {
      if (s.embedded) return s;
      const n = nextStation(s.station);
      if (n === null) return s;
      let ns = s;
      // 老师在未通过填空时跳站 → 记老师干预
      if (isShapeStation(s.station) && !stationCompleted(s, s.station)) {
        if (s.mode !== "teacher") return s;
        if (!s.skippedByTeacher.includes(s.station)) ns = { ...ns, skippedByTeacher: [...ns.skippedByTeacher, s.station] };
      }
      return setStation(ns, n);
    }
    case "PREV_STATION": {
      if (s.embedded) return s;
      const p = prevStation(s.station);
      return p === null ? s : setStation(s, p);
    }

    case "BEGIN_DRAG":
      return pushHistory(s);
    case "DRAG_PARAM": {
      const c = cur(s);
      return c ? applyParam(s, c.key, a.value) : s;
    }
    case "END_DRAG": {
      const c = cur(s);
      const last = s.history[s.history.length - 1];
      if (c && last && last.stations[c.key].param === c.st.param && last.stations[c.key].cutPos === c.st.cutPos) {
        return { ...s, history: s.history.slice(0, -1) };
      }
      return s;
    }
    case "SET_PARAM": {
      const c = cur(s);
      if (!c || clampParam(c.key, a.value) === c.st.param) return s;
      return applyParam(pushHistory(s), c.key, a.value);
    }

    case "CUT": {
      const c = cur(s);
      if (!c || c.key !== "para" || c.st.cutDone) return s;
      return patchStation(pushHistory(s), c.key, { cutDone: true, touched: true });
    }
    case "TOGGLE_MOVE": {
      const c = cur(s);
      if (!c || c.key === "rect") return s;
      if (c.key === "para" && !c.st.cutDone) return s;
      if (c.st.t > 0) return s;
      return patchStation(s, c.key, { moved: !c.st.moved, touched: true });
    }
    case "BEGIN_ASSEMBLE": {
      const c = cur(s);
      if (!c || c.key === "rect") return s;
      if (c.key === "para" && !c.st.cutDone) return s;
      return pushHistory(s);
    }
    case "SET_T": {
      const c = cur(s);
      if (!c || c.key === "rect") return s;
      if (c.key === "para" && !c.st.cutDone) return s;
      const t = Math.min(1, Math.max(0, a.t));
      if (t === c.st.t) return s;
      const arrived = t >= 1 - 1e-9 && c.st.t < 1 - 1e-9;
      const patch: Partial<StationState> = { t, touched: true, moved: false };
      if (arrived) patch.assembleCount = c.st.assembleCount + 1;
      let ns = patchStation(s, c.key, patch);
      if (arrived && c.key === "para") {
        // 小 L3：每次拼到位自动记一行（剪的位置 → 拼成的长方形）
        const d = paraDerived(ns.stations.para);
        const rec = { s: d.s, c: d.c, length: d.newDims.length, width: d.newDims.width, area: d.area };
        const dup = ns.stations.para.paraRecords.some((r) => r.s === rec.s && r.c === rec.c);
        if (!dup) ns = patchStation(ns, "para", { paraRecords: [...ns.stations.para.paraRecords, rec].slice(-8) });
      }
      return ns;
    }
    case "TOGGLE_RULER": {
      const c = cur(s);
      if (!c) return s;
      const rulers = c.st.rulers.includes(a.ruler) ? c.st.rulers.filter((r) => r !== a.ruler) : [...c.st.rulers, a.ruler];
      return patchStation(s, c.key, { rulers });
    }

    case "SET_FILL": {
      const c = cur(s);
      if (!c) return s;
      let fillIn: string[];
      if (c.key === "trap") {
        if (c.st.fillIn.includes(a.value)) fillIn = c.st.fillIn.filter((x) => x !== a.value);
        else fillIn = [...c.st.fillIn, a.value].slice(-2);
      } else {
        fillIn = [a.value];
      }
      return patchStation(s, c.key, { fillIn, fillSubmitted: false });
    }
    case "SUBMIT_FILL": {
      const c = cur(s);
      if (!c || c.st.fillIn.length === 0) return s;
      if (c.key === "trap" && c.st.fillIn.length < 2) return s;
      const ok = fillCheck(c.key, c.st.fillIn);
      return patchStation(pushHistory(s), c.key, { fillSubmitted: true, fillPassed: c.st.fillPassed || ok });
    }

    case "SET_RECT_B": {
      if (s.mode !== "teacher" && !s.embedded) return s;
      const st = s.stations.rect;
      const nb = clampRectB(a.value);
      if (nb === st.rectB) return s;
      return patchStation(pushHistory(s), "rect", { rectB: nb, touched: true, squareSeen: st.squareSeen || nb === st.param });
    }
    case "ROW_COUNT":
      return patchStation(s, "rect", { rowCountAnim: s.stations.rect.rowCountAnim + 1, touched: true });
    case "SET_IRREGULAR":
      return patchStation(s, "rect", { irregular: a.on, touched: true });

    case "BEGIN_DRAG_CUT":
      return s.stations.para.cutDone ? s : pushHistory(s);
    case "DRAG_CUT_POS": {
      const st = s.stations.para;
      if (st.cutDone) return s;
      const { min, max } = paraCutRange(PARA_FIXED.a, st.param);
      const c = Math.min(max, Math.max(min, snapHalf(a.value)));
      return c === st.cutPos ? s : patchStation(s, "para", { cutPos: c, touched: true });
    }
    case "SET_CUT_PRESET": {
      const st = s.stations.para;
      if (st.cutDone) return s;
      const { min, max } = paraCutRange(PARA_FIXED.a, st.param);
      const c = a.preset === "triangle" ? min : snapHalf((min + max) / 2);
      return c === st.cutPos ? s : patchStation(pushHistory(s), "para", { cutPos: c, touched: true });
    }
    case "SET_PARA_DISCOVERY":
      return patchStation(pushHistory(s), "para", { paraDiscovery: a.value });
    case "RECUT": {
      const st = s.stations.para;
      if (!st.cutDone || s.embedded) return s;
      return patchStation(pushHistory(s), "para", { cutDone: false, moved: false, t: 0, rulers: [] });
    }

    case "SET_TRI_KIND": {
      if (s.mode !== "teacher") return s;
      const st = s.stations.tri;
      if (st.triKind === a.kind) return s;
      return patchStation(pushHistory(s), "tri", { triKind: a.kind, t: 0, moved: false, rulers: [] });
    }
    case "TOGGLE_HALF_NOTATION":
      return patchStation(s, "tri", { halfNotation: !s.stations.tri.halfNotation });

    case "CIRCLE_ENTRY_VIEWED":
      return s.circleEntryViewed ? s : { ...s, circleEntryViewed: true };
    case "CIRCLE_ENTERED":
      return { ...s, circleEntryViewed: true, circleEntered: true };

    case "SET_MODE":
      return s.mode === a.mode ? s : { ...s, mode: a.mode };
    case "MARK_ASKED":
      return s.askedQuestions.includes(a.key)
        ? { ...s, askedQuestions: s.askedQuestions.filter((k) => k !== a.key) }
        : { ...s, askedQuestions: [...s.askedQuestions, a.key] };

    case "UNDO": {
      if (s.embedded) return s;
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...prev, mode: s.mode, history: s.history.slice(0, -1) };
    }
    case "RESET":
      return {
        ...initialCore({ station: s.embedded ? s.station : "rect", mode: s.mode, playThrough: s.playThrough, embedded: s.embedded }),
        history: [],
      };
    case "RESET_STATION": {
      const c = cur(s);
      if (!c) return s;
      const fresh = initialStation(c.key, { ...a.init, preCut: s.embedded && c.key === "para" });
      return patchStation(s.embedded ? s : pushHistory(s), c.key, fresh);
    }

    default:
      return s;
  }
}

/** 拼到位判定，供界面与测试共用 */
export { stationAssembled };
