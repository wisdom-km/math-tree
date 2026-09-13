/**
 * 「圆的周长」探究单的单一数据源（交互稿第 4 节）。
 * 所有视图只读这份状态并派生；禁止第二份「显示用副本」。
 */

export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const STEPS: readonly Step[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const STEP_LABEL: Record<Step, string> = {
  0: "回忆",
  1: "情境",
  2: "先猜",
  3: "动手",
  4: "数据",
  5: "规律",
  6: "揭示",
  7: "验证",
  8: "提问",
  9: "延伸",
};

export type Mode = "teacher" | "student";
export type PiPrecision = "3.14" | "3.1416";
export type PolygonSides = 6 | 12 | 24 | 48 | 96;
export const POLYGON_SIDES: readonly PolygonSides[] = [6, 12, 24, 48, 96];

export type Step0Choice = "2" | "一样长" | "一半";

export interface Row {
  id: string;
  /** 默认「圆1」「圆2」…；可改成「杯盖」「光盘」等 */
  label: string;
  /** cm，加入时快照 */
  d: number;
  /** cm，加入时 = 当时测量周长（须已满一圈），保留两位 */
  C: number;
  /** C / d，保留两位 */
  ratio: number;
  source: "roll";
}

export interface Guess {
  low: number | null;
  likely: number | null;
  high: number | null;
}

export interface HandVoteCandidate {
  label: string;
  count: number;
}

export interface Verify {
  /** 验证圆直径（进入步骤 7 时给出，可由老师改） */
  dPred: number;
  /** 孩子先算出的预测周长；null = 未填 */
  cPred: number | null;
  /** 预测已锁定，可以开始滚 */
  locked: boolean;
  /** 滚满一圈后的实测值 */
  measured: number | null;
  done: boolean;
  /** 已完成的成功验证次数 */
  successCount: number;
}

export interface Step0State {
  /** 回忆圆的半径（cm），只在步骤 0 用 */
  r0: number;
  choice: Step0Choice | null;
  correct: boolean;
}

export interface CoreState {
  step: Step;
  /** 已到达的最远步骤；≤ maxStep 的步骤可点回看（不改数据） */
  maxStep: Step;

  /** 直径（唯一核心参数），2.0–10.0 cm，步进 0.1 */
  d: number;
  /** 已滚动角 0…2π */
  rollAngle: number;
  isRolling: boolean;
  /** 本圈已滚满锁定 */
  rollLocked: boolean;
  /** 累计满圈次数 */
  rollCount: number;
  /** 本圈测量误差系数（已拍板 ±1%），随每次新滚动重新抽取 */
  noise: number;
  /** 确定性伪随机种子 */
  seed: number;
  /** 红点印记（滚动角，rad） */
  marks: number[];

  table: Row[];
  guess: Guess;
  /** 举手分布：按步骤存候选与人数；只当堂用不写名册（已拍板） */
  handVotes: Partial<Record<Step, HandVoteCandidate[]>>;

  patternBlank: string | null;
  discoveryText: { find: string; because: string };
  /** 步骤 5 填空已提交（可撤销） */
  patternSubmitted: boolean;

  piRevealed: boolean;
  /** π 展示位数：默认 3.14；老师模式可切 3.1416；主计算恒用 3.14（已拍板） */
  piPrecision: PiPrecision;
  /** 活公式强调 C = πd 还是 C = 2πr */
  formulaEmphasis: "d" | "r";

  verify: Verify;
  bike: { r: number; shown: boolean };

  mode: Mode;
  confusionMode: boolean;
  confusionEverOpened: boolean;
  easter: { nSides: PolygonSides; squareCompare: boolean; maxSidesSeen: PolygonSides };

  step0: Step0State;
  step0Skipped: boolean;
  step5Forced: boolean;
  /** 已「标记已问」的提问卡：`${step}:${index}` */
  askedQuestions: string[];
  completed: boolean;
}

export interface State extends CoreState {
  /** 撤销栈（最多 30 步），存 CoreState 快照 */
  history: CoreState[];
}

export const D_MIN = 2.0;
export const D_MAX = 10.0;
export const D_STEP = 0.1;
export const D_DEFAULT = 4.0;
/** 步骤 2 先猜针对的示范圆直径 */
export const GUESS_D = 4.0;
export const TABLE_MAX_ROWS = 8;
export const HISTORY_MAX = 30;
/** 满圈吸附：2° */
export const SNAP_RAD = (2 * Math.PI) / 180;
/** 红点每转过 20° 落一个印 */
export const MARK_EVERY_RAD = (20 * Math.PI) / 180;
/** 测量误差幅度（已拍板 ±1%） */
export const NOISE_AMPLITUDE = 0.01;
/** 主计算用的 π（与教材一致） */
export const PI_TEXTBOOK = 3.14;
/** 步骤 7 「对上了」的相对误差阈值 */
export const VERIFY_TOLERANCE = 0.02;
/** 自行车轮半径（教材例 3） */
export const BIKE_R = 33;
