/**
 * 「圆的面积」探究单的单一数据源（交互稿 circle-area.md 第 4 节）。
 * 所有视图（原圆、拼合区、数据表、活公式、填空回显）只读这份状态并派生；禁止第二份「显示用副本」。
 * 框架沿用「圆的周长」探究单（step / maxStep / history / handVotes / mode 等字段同名同义）。
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

/** 等分数：固定四档 + 128 彩蛋（已拍板第 5 条：老师模式解锁，或 n = 64 长按 3 秒） */
export type NValue = 8 | 16 | 32 | 64 | 128;
export const N_VALUES: readonly NValue[] = [8, 16, 32, 64, 128];
export const N_BASE: readonly NValue[] = [8, 16, 32, 64];
export const N_EASTER: NValue = 128;

/** 拼法：拼成长方形（教材法，默认）/ 拆成三角形 */
export type Assembly = "rect" | "tri";

/** 步骤 0 长方形面积三选一 */
export type RectChoice = "长 × 宽" | "长 + 宽" | "边 × 4";
/** 首次点「拆成三角形」时弹出的迷你回忆三选一（已拍板第 6 条） */
export type TriChoice = "½" | "1" | "2";

export interface Row {
  id: string;
  /** 等分数，加入时快照 */
  n: NValue;
  /** cm，加入时快照 */
  r: number;
  assembly: Assembly;
  /** cm；rect：长（近似）；tri：每份底（弦长） */
  length: number;
  /** cm；rect：宽（近似）；tri：每份高 */
  width: number;
  /** cm²；rect：长 × 宽；tri：n × ½ × 底 × 高 */
  areaApprox: number;
  source: "assemble";
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

export interface PatternBlank {
  length: string | null;
  width: string | null;
}

export interface Verify {
  /** 任务 A：验证圆的半径（进入步骤 7 时给出，可由老师改） */
  rPred: number;
  /** 孩子先算出的预测面积；null = 未填 */
  sPred: number | null;
  /** 预测已锁定，可以开始拼 */
  locked: boolean;
  /** 拼合到位后的近似面积（n = 64） */
  assembled: number | null;
  done: boolean;
  successCount: number;
  /** 任务 B：圆形桌面 d = 1 m，必须先「d → r」 */
  tableDToR: boolean;
  tableS: number | null;
  /** 任务 C：草坪 d = 20 m、每平方米 8 元 —— 两格计算器 */
  lawnS: number | null;
  lawnCost: number | null;
}

export interface Step0State {
  /** 回忆长方形：长 a、宽 b（cm，步进 0.5，对齐半格） */
  a: number;
  b: number;
  choice: RectChoice | null;
  correct: boolean;
}

export interface TriRecallState {
  /** 首次点「拆成三角形」时弹出过 */
  shown: boolean;
  /** 迷你回忆正打开着 */
  open: boolean;
  choice: TriChoice | null;
  correct: boolean;
}

export interface CoreState {
  step: Step;
  /** 已到达的最远步骤；≤ maxStep 的步骤可点回看（不改数据） */
  maxStep: Step;

  /** 半径（核心参数之一）2.0–6.0 cm，步进 0.1 */
  r: number;
  /** 等分数（核心参数之二） */
  n: NValue;
  /** 拼合进度 0–1；≥ 0.98 吸附到 1（已拍板第 2 条） */
  assembleT: number;
  assembly: Assembly;
  /** 老师课前可切默认路线（已拍板第 4 条）；重置后 assembly 取此值 */
  defaultAssembly: Assembly;
  /** 是否已「剪」 */
  cutDone: boolean;
  /** 「移」：各份径向炸开 0.2r */
  moved: boolean;
  /** 累计拼合到位次数 */
  assembleCount: number;
  /** 每档 n 「凹凸的地方越来越小了」只提示一次 */
  hintedN: NValue[];
  /** 128 彩蛋已解锁 */
  n128Unlocked: boolean;
  /** 曾把 n 切到 128 */
  n128Seen: boolean;

  table: Row[];
  guess: Guess;
  /** 举手分布：按步骤存候选与人数；只当堂用不写名册 */
  handVotes: Partial<Record<Step, HandVoteCandidate[]>>;

  patternBlank: PatternBlank;
  discoveryText: { find: string; because: string };
  patternSubmitted: boolean;

  /** 已揭示 S = πr²（进入步骤 6 置 true；此前界面禁止出现 πr、r²） */
  formulaRevealed: boolean;
  /** 步骤 6 推导链已点出的行数 0–3 */
  derivationLines: 0 | 1 | 2 | 3;
  /** 「拆成三角形」路线对照卡打开过 */
  triCardOpened: boolean;
  piPrecision: PiPrecision;

  verify: Verify;

  mode: Mode;
  confusionMode: boolean;
  confusionEverOpened: boolean;

  step0: Step0State;
  step0Skipped: boolean;
  triRecall: TriRecallState;
  /** 用过「拆成三角形」拼法（证据 tri_assembly_used） */
  triUsed: boolean;
  /** 步骤 1 点过「试着数格子」 */
  gridCounted: boolean;
  step5Forced: boolean;
  /** 已「标记已问」的提问卡：`${step}:${index}` */
  askedQuestions: string[];
  completed: boolean;
}

export interface State extends CoreState {
  /** 撤销栈（最多 30 步），存 CoreState 快照 */
  history: CoreState[];
}

export const R_MIN = 2.0;
export const R_MAX = 6.0;
export const R_STEP = 0.1;
export const R_DEFAULT = 4.0;
export const N_DEFAULT: NValue = 8;
/** 步骤 2 先猜针对的示范圆半径 */
export const GUESS_R = 4.0;
export const TABLE_MAX_ROWS = 8;
export const HISTORY_MAX = 30;
/** 拼合到位吸附阈值（已拍板第 2 条） */
export const ASSEMBLE_SNAP = 0.98;
/** 「移」时各份径向外移的比例 */
export const MOVE_EXPLODE = 0.2;
/** 主计算用的 π（与教材一致） */
export const PI_TEXTBOOK = 3.14;
/** 步骤 7 「对上了」的相对误差阈值 */
export const VERIFY_TOLERANCE = 0.02;
/** 步骤 7 任务 A 固定用 n = 64 拼 */
export const VERIFY_N: NValue = 64;
/** 步骤 0 长方形范围（cm，步进 0.5） */
export const RECT_A_MIN = 2;
export const RECT_A_MAX = 12;
export const RECT_B_MIN = 2;
export const RECT_B_MAX = 8;
/** 步骤 7 任务 B：圆形桌面直径 1 m */
export const TABLE_D_M = 1;
/** 步骤 7 任务 C：草坪直径 20 m、每平方米 8 元 */
export const LAWN_D_M = 20;
export const LAWN_PRICE = 8;
