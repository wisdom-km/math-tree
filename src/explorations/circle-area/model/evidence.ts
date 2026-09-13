import type { EvidenceEventDef } from "@/db/evidence-events";
import type { EvidenceKey } from "./derived";

/**
 * 「圆的面积」探究单的证据事件清单（交互稿 8.2）。
 * masteryHint 只是给老师录入时的参考，系统不据此改等级。
 * 圆环 / 方圆两个迷你探究单各自的事件见 ../mini/*。
 */
export const CIRCLE_AREA_EVENTS: Record<EvidenceKey, EvidenceEventDef> = {
  step0Completed: { event: "step0_fill_completed", label: "完成步骤 0 长方形面积填空", nodeId: "5a-06", masteryHint: "heard" },
  step0Skipped: { event: "step0_skipped_by_teacher", label: "老师跳过回忆" },
  firstAssembly: { event: "first_assembly_completed", label: "首次拼合到位", nodeId: "6a-05-07", masteryHint: "heard" },
  tableRows3: { event: "table_rows_gte_3", label: "数据表 ≥ 3 行", nodeId: "M-11" },
  triUsed: { event: "tri_assembly_used", label: "用过「拆成三角形」", nodeId: "5a-07", masteryHint: "heard" },
  patternPassed: { event: "step5_pattern_passed", label: "步骤 5 双填空通过", nodeId: "6a-05-07", masteryHint: "heard" },
  step5Forced: { event: "step5_forced_by_teacher", label: "老师强制进入揭示（未填完整）" },
  formulaRevealed: { event: "formula_revealed", label: "步骤 6 揭示已看", nodeId: "6a-05-08", masteryHint: "heard" },
  predictVerified: { event: "step7_predict_verified", label: "步骤 7 先算再拼成功 1 次", nodeId: "6a-05-08", masteryHint: "can_do" },
  confusionOpened: { event: "confusion_split_opened", label: "打开易混并排（见过面积/周长对比）" },
  easterN128: { event: "easter_n128_unlocked", label: "看过 128 份彩蛋" },
  completed: { event: "exploration_completed", label: "完成探究" },
};

/** 圆环迷你探究单 */
export const RING_EVENTS = {
  viewed: { event: "ring_extension_viewed", label: "打开圆环延伸", nodeId: "6a-05-09", masteryHint: "heard" },
  bothFormulas: { event: "ring_both_formulas_seen", label: "看过圆环两种算法" },
  trapSeen: { event: "ring_trap_contrast_seen", label: "看过 π(R − r)² 错法对照" },
} as const satisfies Record<string, EvidenceEventDef>;

/** 方圆迷你探究单 */
export const SQUARE_CIRCLE_EVENTS = {
  viewed: { event: "square_circle_extension_viewed", label: "打开方圆延伸", nodeId: "6a-05-10", masteryHint: "heard" },
  splitSeen: { event: "square_split_triangles_seen", label: "把外圆内方的正方形拆成两个三角形" },
  conclusionFilled: { event: "square_circle_conclusion_filled", label: "填出正方形 / 圆是 r² 的几倍", nodeId: "6a-05-10", masteryHint: "heard" },
} as const satisfies Record<string, EvidenceEventDef>;
