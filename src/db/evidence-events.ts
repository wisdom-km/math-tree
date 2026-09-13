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

/**
 * 「图形面积转化链」的证据事件清单（area-chain.md 8.2）。
 * 旧知识不做母题，只有「听过」这一档参考；嵌入模式不写本表（由宿主记 step0_fill_completed）。
 */
export const AREA_CHAIN_EVENTS = {
  "stationCompleted:rect": {
    event: "chain_station_completed",
    label: "第 1 站长方形填空通过",
    nodeId: "5a-06",
    masteryHint: "heard",
  },
  "stationCompleted:para": {
    event: "chain_station_completed",
    label: "第 2 站平行四边形填空通过",
    nodeId: "5a-07",
    masteryHint: "heard",
  },
  "stationCompleted:tri": {
    event: "chain_station_completed",
    label: "第 3 站三角形填空通过",
    nodeId: "5a-07",
    masteryHint: "heard",
  },
  "stationCompleted:trap": {
    event: "chain_station_completed",
    label: "第 4 站梯形填空通过",
    nodeId: "5a-07",
    masteryHint: "heard",
  },
  "stationSkipped:rect": { event: "chain_station_skipped_by_teacher", label: "老师跳过第 1 站" },
  "stationSkipped:para": { event: "chain_station_skipped_by_teacher", label: "老师跳过第 2 站" },
  "stationSkipped:tri": { event: "chain_station_skipped_by_teacher", label: "老师跳过第 3 站" },
  "stationSkipped:trap": { event: "chain_station_skipped_by_teacher", label: "老师跳过第 4 站" },
  squareCaseSeen: {
    event: "chain_square_case_viewed",
    label: "第 1 站出现正方形特例（长 = 宽）",
    nodeId: "5a-08",
    masteryHint: "heard",
  },
  paraCutPositionDiscovered: {
    event: "chain_para_cut_position_discovered",
    label: "第 2 站归纳出「剪的位置不影响面积」",
    nodeId: "5a-07",
  },
  playedThrough: {
    event: "chain_played_through",
    label: "沿链五站连走完成",
    nodeId: "M-04",
  },
} as const satisfies Record<string, EvidenceEventDef>;

export type AreaChainEventKey = keyof typeof AREA_CHAIN_EVENTS;
