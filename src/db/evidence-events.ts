import type { MasteryLevel } from "./schema";

/**
 * 「圆的周长」探究单的证据事件清单（交互稿 8.2）。
 * masteryHint 只是给老师录入时的参考，系统不据此改等级。
 */
export interface EvidenceEventDef {
  event: string;
  label: string;
  nodeId?: string;
  masteryHint?: MasteryLevel;
}

export const CIRCUMFERENCE_EVENTS = {
  step0Completed: {
    event: "step0_fill_completed",
    label: "完成步骤 0 填空",
    nodeId: "6a-05-01",
    masteryHint: "heard",
  },
  fullRoll: {
    event: "full_roll_completed",
    label: "完成至少 1 次满圈滚动",
    nodeId: "6a-05-04",
    masteryHint: "heard",
  },
  tableRows3: {
    event: "table_rows_ge_3",
    label: "数据表 ≥ 3 行",
    nodeId: "M-11",
  },
  patternPassed: {
    event: "step5_pattern_passed",
    label: "步骤 5 填空通过",
    nodeId: "6a-05-05",
    masteryHint: "heard",
  },
  revealSeen: {
    event: "step6_reveal_seen",
    label: "步骤 6 揭示已看",
    nodeId: "6a-05-06",
    masteryHint: "heard",
  },
  predictRollSuccess: {
    event: "step7_predict_roll_success",
    label: "步骤 7 先算再滚成功 1 次",
    nodeId: "6a-05-06",
    masteryHint: "can_do",
  },
  confusionOpened: {
    event: "confusion_split_opened",
    label: "打开易混并排（见过周长/面积对比）",
  },
  polygon96: {
    event: "polygon_sides_96",
    label: "割圆术边数拖到 96",
  },
  step0Skipped: {
    event: "step0_skipped_by_teacher",
    label: "老师跳过回忆",
  },
  step5Forced: {
    event: "step5_forced_by_teacher",
    label: "老师强制进入揭示（未填完整）",
  },
  completed: {
    event: "exploration_completed",
    label: "完成探究",
  },
} as const satisfies Record<string, EvidenceEventDef>;

export type CircumferenceEventKey = keyof typeof CIRCUMFERENCE_EVENTS;
