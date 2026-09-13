import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * SQLite schema（Drizzle）。迁移用 `pnpm db:generate` 生成到 drizzle/，
 * 由 Rust 侧 tauri-plugin-sql 在启动时执行（见 src-tauri/src/lib.rs）。
 *
 * 掌握度四级（需求 3.4）：没学 / 听过 / 会做 / 会讲。
 */
export const MASTERY_LEVELS = ["none", "heard", "can_do", "can_teach"] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];
export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  none: "没学",
  heard: "听过",
  can_do: "会做",
  can_teach: "会讲",
};

/** 掌握度来源（需求 4.6）：老师手动 / 费曼自测 / 母题练习 / AI 建议经老师确认 */
export const MASTERY_SOURCES = ["teacher", "feynman", "practice", "ai_confirmed"] as const;
export type MasterySource = (typeof MASTERY_SOURCES)[number];

export const NODE_KINDS = ["knowledge", "legacy", "method"] as const;
export const UI_MODES = ["teacher", "student"] as const;
export type UiMode = (typeof UI_MODES)[number];
export const EVIDENCE_SCOPES = ["class", "student"] as const;
export type EvidenceScope = (typeof EVIDENCE_SCOPES)[number];

/** 名册：只有名字，无密码、无登录。 */
export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

/**
 * 知识节点引用表：以内容 id（content/ 下的节点 id）为主键，
 * 启动时从内容层同步标题，供掌握度、证据做外键与展示。
 */
export const knowledgeNodes = sqliteTable("knowledge_nodes", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: NODE_KINDS }).notNull(),
  title: text("title").notNull(),
  unitId: text("unit_id"),
  syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull(),
});

/** 掌握度：student × node → 等级。只由老师录入路径写；探究单证据不直接改它。 */
export const mastery = sqliteTable(
  "mastery",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    nodeId: text("node_id")
      .notNull()
      .references(() => knowledgeNodes.id),
    level: text("level", { enum: MASTERY_LEVELS }).notNull().default("none"),
    source: text("source", { enum: MASTERY_SOURCES }).notNull().default("teacher"),
    note: text("note"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.nodeId] }), index("mastery_node_idx").on(t.nodeId)],
);

/** 一次课堂会话：打开一份探究单到结束。 */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  explorationId: text("exploration_id").notNull(),
  mode: text("mode", { enum: UI_MODES }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
});

/**
 * 探究单完成证据（需求 4.6、交互稿第 8.2 节）。只记录，不自动改掌握度。
 * 已拍板：按全班本课记一条（scope=class），上台学生额外记一条（scope=student）。
 */
export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    explorationId: text("exploration_id").notNull(),
    /** 证据事件键，如 full_roll_completed；清单见 src/db/evidence-events.ts */
    event: text("event").notNull(),
    scope: text("scope", { enum: EVIDENCE_SCOPES }).notNull(),
    studentId: text("student_id").references(() => students.id, { onDelete: "set null" }),
    /** 参考的知识节点（可空） */
    nodeId: text("node_id").references(() => knowledgeNodes.id),
    /** 建议对应掌握度参考（供老师录入时看，系统不改等级） */
    masteryHint: text("mastery_hint", { enum: MASTERY_LEVELS }),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("evidence_session_idx").on(t.sessionId),
    index("evidence_student_idx").on(t.studentId),
    index("evidence_node_idx").on(t.nodeId),
  ],
);

export type Student = typeof students.$inferSelect;
export type KnowledgeNodeRow = typeof knowledgeNodes.$inferSelect;
export type MasteryRow = typeof mastery.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
