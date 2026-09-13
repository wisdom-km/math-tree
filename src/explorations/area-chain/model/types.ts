/**
 * 「图形面积转化链」的单一数据源（交互稿 area-chain.md 第 3 节）。
 * 五站状态分站保存在 stations[station] 下；跳站不清。
 */

import type { TriangleKind } from "@/shared/shape-canvas/geometry";

export type StationId = "rect" | "para" | "tri" | "trap" | "circle";
/** 有图形舞台的四站（第 5 站是进入圆的面积探究单的入口屏） */
export type ShapeStationId = Exclude<StationId, "circle">;

export const STATIONS: readonly StationId[] = ["rect", "para", "tri", "trap", "circle"];
export const SHAPE_STATIONS: readonly ShapeStationId[] = ["rect", "para", "tri", "trap"];

export const STATION_TITLE: Record<StationId, string> = {
  rect: "长方形",
  para: "平行四边形",
  tri: "三角形",
  trap: "梯形",
  circle: "圆",
};

/** 各站对应的旧知识节点（证据写回用） */
export const STATION_NODE: Record<ShapeStationId, string> = {
  rect: "5a-06",
  para: "5a-07",
  tri: "5a-07",
  trap: "5a-07",
};

export type Mode = "teacher" | "student";

/** 各站可拖参数范围（cm，步进 0.5） */
export const PARAM_RANGE: Record<ShapeStationId, { min: number; max: number; default: number; label: string }> = {
  rect: { min: 2, max: 12, default: 6, label: "长 a" },
  para: { min: 0, max: 5, default: 2, label: "倾斜 s" },
  tri: { min: 2, max: 8, default: 4, label: "高 h" },
  trap: { min: 1, max: 5, default: 3, label: "上底 b" },
};
export const PARAM_STEP = 0.5;

/** 第 1 站宽 b（老师模式可改） */
export const RECT_B_RANGE = { min: 2, max: 8, default: 4 };
export const PARA_FIXED = { a: 6, h: 4 };
export const TRI_FIXED = { a: 6 };
export const TRAP_FIXED = { a: 6, h: 4 };

/** 填空选项（文案以交互稿附录 A 为准） */
export const FILL_OPTIONS: Record<ShapeStationId, readonly string[]> = {
  rect: ["长 × 宽", "长 + 宽", "(长 + 宽) × 2"],
  para: ["底 × 高", "底 × 斜边", "长 × 宽"],
  tri: ["÷ 2", "× 2", "不用再算"],
  trap: ["上底", "下底", "高", "腰"],
};
export const FILL_ANSWER: Record<ShapeStationId, readonly string[]> = {
  rect: ["长 × 宽"],
  para: ["底 × 高"],
  tri: ["÷ 2"],
  trap: ["上底", "下底"],
};

export interface ParaRecord {
  /** 倾斜量 */
  s: number;
  /** 剪的位置 x = c */
  c: number;
  length: number;
  width: number;
  area: number;
}

export interface StationState {
  /** 本站唯一可拖参数 */
  param: number;
  /** 是否操作过（拖过参数 / 剪 / 拼），填空卡操作过一次后出现 */
  touched: boolean;
  cutDone: boolean;
  moved: boolean;
  /** 转化进度 0–1 */
  t: number;
  /** 拼到位次数 */
  assembleCount: number;
  /** 填空当前选择（梯形双空为两个芯片；其余最多一个） */
  fillIn: string[];
  /** 填空提交次数 */
  fillSubmitted: boolean;
  /** 已通过（一旦通过就保留，供链条打对勾） */
  fillPassed: boolean;
  /** 点开的尺子：base / height */
  rulers: string[];

  /* 第 1 站 */
  rectB: number;
  /** 「一行一行数」动画触发次数 */
  rowCountAnim: number;
  /** 切到不规则图形数格子 */
  irregular: boolean;
  /** 出现过正方形（a = b） */
  squareSeen: boolean;

  /* 第 2 站（小 L3） */
  /** 剪的位置 x = c（沿一条高） */
  cutPos: number;
  paraRecords: ParaRecord[];
  /** 「剪的位置____面积」归纳：null 未填 */
  paraDiscovery: "不影响" | "影响" | null;

  /* 第 3 站 */
  triKind: TriangleKind;
  /** 算式用 ½ × 底 × 高 写法 */
  halfNotation: boolean;
}

export interface CoreState {
  station: StationId;
  /** 沿链播放（五站连走）；进入圆时落在圆的面积步骤 3 */
  playThrough: boolean;
  /** 嵌入模式：隐藏链顶栏 / 链条，只可重置，不写证据 */
  embedded: boolean;
  stations: Record<ShapeStationId, StationState>;
  /** 老师未通过填空直接跳到下一站 */
  skippedByTeacher: ShapeStationId[];
  /** 第 5 站入口屏已看 */
  circleEntryViewed: boolean;
  /** 从第 5 站进入了圆的面积探究单 */
  circleEntered: boolean;
  askedQuestions: string[];
  mode: Mode;
}

export interface State extends CoreState {
  /** 撤销栈（最多 30 步） */
  history: CoreState[];
}

export const HISTORY_MAX = 30;
/** 「拼」动画时长（ms） */
export const ASSEMBLE_MS = 1200;
/** 数格子超过多少格只显示总数 */
export const CELL_NUMBER_LIMIT = 40;
