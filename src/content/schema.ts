import { z } from "zod";

/**
 * 内容文件的 schema（zod）。
 * 与 content/README.md 中的说明一一对应；改格式先改这里再改 README。
 */

export const KNOWLEDGE_ID = /^[1-6][ab]-\d{2}-\d{2}$/; // 6a-05-05
export const LEGACY_ID = /^[1-6][ab]-\d{2}$/; // 3a-08
export const METHOD_ID = /^M-\d{2}$/; // M-11
export const UNIT_ID = /^[1-6][ab]-\d{2}$/; // 6a-05
/** 单元探究单 exp-6a-05-circumference；跨年级的转化链探究单 exp-chain-area */
export const EXPLORATION_ID = /^exp-(?:[1-6][ab]-\d{2}|chain)-[a-z0-9-]+$/;

const nodeIdSchema = z
  .string()
  .regex(new RegExp(`${KNOWLEDGE_ID.source}|${LEGACY_ID.source}|${METHOD_ID.source}`), "节点 id 格式不合法");

/** 关系引用：可写成纯 id，或带说明的对象；引用尚未落库的节点时必须给 title 作为占位。 */
export const relationRefSchema = z.union([
  nodeIdSchema,
  z.object({
    node: nodeIdSchema,
    title: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  }),
]);
export type RelationRef = z.infer<typeof relationRefSchema>;

/** 易混条目：差在哪必须写；可选指向具体节点。 */
export const confusionSchema = z.object({
  node: nodeIdSchema.optional(),
  title: z.string().min(1).optional(),
  note: z.string().min(1),
});
export type Confusion = z.infer<typeof confusionSchema>;

export const relationsSchema = z.object({
  transformsFrom: z.array(relationRefSchema).default([]),
  decomposesInto: z.array(z.string().min(1)).default([]),
  relatesTo: z.array(relationRefSchema).default([]),
  confusedWith: z.array(confusionSchema).default([]),
});
export type Relations = z.infer<typeof relationsSchema>;

export const visualLevelSchema = z.enum(["L1", "L2", "L3", "静态图解"]);

export const knowledgeNodeSchema = z.object({
  id: z.string().regex(KNOWLEDGE_ID, "知识点 id 形如 6a-05-05"),
  kind: z.literal("knowledge").default("knowledge"),
  title: z.string().min(1),
  summary: z.string().min(1),
  pages: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  level: visualLevelSchema.optional(),
  relations: relationsSchema.default({}),
  reviewed: z.boolean().default(false),
});
export type KnowledgeNode = z.infer<typeof knowledgeNodeSchema>;

export const legacyNodeSchema = z.object({
  id: z.string().regex(LEGACY_ID, "旧知识 id 形如 3a-08"),
  kind: z.literal("legacy").default("legacy"),
  title: z.string().min(1),
  source: z.string().min(1),
  dependedBy: z.array(z.string().regex(KNOWLEDGE_ID)).default([]),
  summary: z.string().min(1).optional(),
  pending: z.boolean().default(false),
});
export type LegacyNode = z.infer<typeof legacyNodeSchema>;

export const methodNodeSchema = z.object({
  id: z.string().regex(METHOD_ID, "方法 id 形如 M-11"),
  kind: z.literal("method").default("method"),
  title: z.string().min(1),
  usedIn: z.string().min(1),
});
export type MethodNode = z.infer<typeof methodNodeSchema>;

export const unitSchema = z.object({
  id: z.string().regex(UNIT_ID, "单元 id 形如 6a-05"),
  grade: z.string().regex(/^[1-6][ab]$/),
  order: z.number().int().min(1),
  title: z.string().min(1),
  pages: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
});
export type Unit = z.infer<typeof unitSchema>;

export const unitFileSchema = z.object({
  unit: unitSchema,
  nodes: z.array(knowledgeNodeSchema).min(1),
});
export type UnitFile = z.infer<typeof unitFileSchema>;

export const legacyFileSchema = z.object({
  nodes: z.array(legacyNodeSchema).min(1),
});

export const methodFileSchema = z.object({
  methods: z.array(methodNodeSchema).min(1),
});

/** 提问卡：按步骤分组的老师问题。 */
export const questionCardSchema = z.object({
  step: z.number().int().min(0).max(9),
  questions: z.array(z.string().min(1)).min(2),
  /** 投屏举手候选（可选），如「偏长 / 偏短 / 接近」 */
  handVote: z.array(z.string().min(1)).optional(),
});
export type QuestionCard = z.infer<typeof questionCardSchema>;

export const explorationSchema = z.object({
  id: z.string().regex(EXPLORATION_ID, "探究单 id 形如 exp-6a-05-circumference 或 exp-chain-area"),
  title: z.string().min(1),
  /** 前端路由组件键，代码里按它挑选实现 */
  component: z.string().min(1),
  status: z.enum(["draft", "reviewed"]).default("draft"),
  level: visualLevelSchema,
  durationMinutes: z.string().min(1).optional(),
  pages: z.string().min(1).optional(),
  /** 主挂节点：知识点，或旧知识（迷你回忆探究单挂在旧知识上，需求 3.3） */
  primaryNode: z.string().regex(new RegExp(`${KNOWLEDGE_ID.source}|${LEGACY_ID.source}`), "primaryNode 须为知识点或旧知识 id"),
  coversNodes: z.array(nodeIdSchema).default([]),
  prerequisites: z.array(nodeIdSchema).default([]),
  methods: z.array(z.string().regex(METHOD_ID)).default([]),
  confusionEdges: z
    .array(z.object({ a: z.string().regex(KNOWLEDGE_ID), b: z.string().regex(KNOWLEDGE_ID) }))
    .default([]),
  spec: z.string().min(1).optional(),
  questionCards: z.array(questionCardSchema).default([]),
});
export type Exploration = z.infer<typeof explorationSchema>;

export type AnyNode = KnowledgeNode | LegacyNode | MethodNode;

export type EdgeType = "transformsFrom" | "relatesTo" | "confusedWith";
export interface Edge {
  type: EdgeType;
  from: string;
  to: string;
  /** 目标未落库时的占位标题 */
  toTitle?: string;
  note?: string;
}

export const EDGE_LABEL: Record<EdgeType, string> = {
  transformsFrom: "转化自",
  relatesTo: "联系",
  confusedWith: "易混",
};
