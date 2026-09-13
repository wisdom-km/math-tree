import YAML from "yaml";
import type { ZodTypeAny } from "zod";
import {
  explorationSchema,
  legacyFileSchema,
  methodFileSchema,
  unitFileSchema,
  type AnyNode,
  type Edge,
  type Exploration,
  type KnowledgeNode,
  type LegacyNode,
  type MethodNode,
  type RelationRef,
  type Unit,
} from "./schema";

export interface ContentIndex {
  units: Unit[];
  /** 按单元 id → 该单元知识点（按文件顺序） */
  unitNodes: Map<string, KnowledgeNode[]>;
  nodes: Map<string, AnyNode>;
  legacy: LegacyNode[];
  methods: MethodNode[];
  explorations: Exploration[];
  /** 全部有向边（来源节点 → 目标节点） */
  edges: Edge[];
  /** 反向索引：目标节点 id → 指向它的边 */
  incoming: Map<string, Edge[]>;
  /** 节点 id → 挂接的探究单 */
  explorationsByNode: Map<string, Exploration[]>;
  /** 校验通过但值得注意的问题（引用了尚未落库的节点等） */
  warnings: string[];
}

export class ContentError extends Error {
  constructor(
    public readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
    this.name = "ContentError";
  }
}

function parseFile<T extends ZodTypeAny>(path: string, raw: string, schema: T): ReturnType<T["parse"]> {
  let data: unknown;
  try {
    data = YAML.parse(raw);
  } catch (e) {
    throw new ContentError(path, `YAML 解析失败：${(e as Error).message}`);
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ContentError(path, `schema 校验失败：${detail}`);
  }
  return result.data;
}

function refId(ref: RelationRef): string {
  return typeof ref === "string" ? ref : ref.node;
}
function refTitle(ref: RelationRef): string | undefined {
  return typeof ref === "string" ? undefined : ref.title;
}
function refNote(ref: RelationRef): string | undefined {
  return typeof ref === "string" ? undefined : ref.note;
}

/**
 * 从「路径 → 文件文本」构建内容索引。纯函数，便于测试。
 * 路径约定见 content/README.md：
 *   content/units/*.yaml        单元知识点
 *   content/legacy/*.yaml       旧知识节点
 *   content/methods/*.yaml      方法节点
 *   content/explorations/*.yaml 探究单元信息
 */
export function buildIndex(files: Record<string, string>): ContentIndex {
  const units: Unit[] = [];
  const unitNodes = new Map<string, KnowledgeNode[]>();
  const nodes = new Map<string, AnyNode>();
  const legacy: LegacyNode[] = [];
  const methods: MethodNode[] = [];
  const explorations: Exploration[] = [];
  const warnings: string[] = [];

  const addNode = (path: string, node: AnyNode) => {
    if (nodes.has(node.id)) throw new ContentError(path, `节点 id 重复：${node.id}`);
    nodes.set(node.id, node);
  };

  const sortedPaths = Object.keys(files).sort();
  for (const path of sortedPaths) {
    const raw = files[path] ?? "";
    if (/\/units\/[^/]+\.ya?ml$/.test(path)) {
      const file = parseFile(path, raw, unitFileSchema);
      if (units.some((u) => u.id === file.unit.id)) throw new ContentError(path, `单元 id 重复：${file.unit.id}`);
      units.push(file.unit);
      for (const n of file.nodes) {
        if (!n.id.startsWith(`${file.unit.id}-`)) {
          throw new ContentError(path, `知识点 ${n.id} 不属于单元 ${file.unit.id}`);
        }
        addNode(path, n);
      }
      unitNodes.set(file.unit.id, file.nodes);
    } else if (/\/legacy\/[^/]+\.ya?ml$/.test(path)) {
      const file = parseFile(path, raw, legacyFileSchema);
      for (const n of file.nodes) {
        addNode(path, n);
        legacy.push(n);
      }
    } else if (/\/methods\/[^/]+\.ya?ml$/.test(path)) {
      const file = parseFile(path, raw, methodFileSchema);
      for (const m of file.methods) {
        addNode(path, m);
        methods.push(m);
      }
    } else if (/\/explorations\/[^/]+\.ya?ml$/.test(path)) {
      const exp = parseFile(path, raw, explorationSchema);
      if (explorations.some((e) => e.id === exp.id)) throw new ContentError(path, `探究单 id 重复：${exp.id}`);
      explorations.push(exp);
    } else {
      warnings.push(`${path}: 未识别的内容目录，已忽略`);
    }
  }

  units.sort((a, b) => a.grade.localeCompare(b.grade) || a.order - b.order);

  // 关系边与引用校验
  const edges: Edge[] = [];
  const incoming = new Map<string, Edge[]>();
  const pushEdge = (e: Edge) => {
    edges.push(e);
    const list = incoming.get(e.to) ?? [];
    list.push(e);
    incoming.set(e.to, list);
  };
  const checkRef = (path: string, from: string, ref: RelationRef, what: string) => {
    const id = refId(ref);
    if (!nodes.has(id)) {
      if (!refTitle(ref)) {
        throw new ContentError(path, `${from} 的「${what}」引用了不存在的节点 ${id}，且未给 title 占位`);
      }
      warnings.push(`${from} 的「${what}」引用了尚未落库的节点 ${id}（${refTitle(ref)}）`);
    }
  };

  for (const [unitId, list] of unitNodes) {
    const path = `content/units/${unitId}`;
    for (const n of list) {
      for (const ref of n.relations.transformsFrom) {
        checkRef(path, n.id, ref, "转化自");
        pushEdge({ type: "transformsFrom", from: n.id, to: refId(ref), toTitle: refTitle(ref), note: refNote(ref) });
      }
      for (const ref of n.relations.relatesTo) {
        checkRef(path, n.id, ref, "联系");
        pushEdge({ type: "relatesTo", from: n.id, to: refId(ref), toTitle: refTitle(ref), note: refNote(ref) });
      }
      for (const c of n.relations.confusedWith) {
        if (c.node) {
          checkRef(path, n.id, { node: c.node, title: c.title }, "易混");
          pushEdge({ type: "confusedWith", from: n.id, to: c.node, toTitle: c.title, note: c.note });
        }
      }
    }
  }

  for (const l of legacy) {
    for (const dep of l.dependedBy) {
      if (!nodes.has(dep)) warnings.push(`旧知识 ${l.id} 声明被 ${dep} 依赖，但该知识点尚未落库`);
    }
  }

  const explorationsByNode = new Map<string, Exploration[]>();
  const attach = (nodeId: string, exp: Exploration) => {
    const list = explorationsByNode.get(nodeId) ?? [];
    if (!list.includes(exp)) list.push(exp);
    explorationsByNode.set(nodeId, list);
  };
  for (const exp of explorations) {
    const path = `content/explorations/${exp.id}`;
    const mustExist = (id: string, what: string) => {
      if (!nodes.has(id)) throw new ContentError(path, `${what} 引用了不存在的节点 ${id}`);
    };
    mustExist(exp.primaryNode, "primaryNode");
    attach(exp.primaryNode, exp);
    for (const id of exp.coversNodes) {
      mustExist(id, "coversNodes");
      attach(id, exp);
    }
    for (const id of exp.prerequisites) mustExist(id, "prerequisites");
    for (const id of exp.methods) mustExist(id, "methods");
    for (const e of exp.confusionEdges) {
      mustExist(e.a, "confusionEdges");
      mustExist(e.b, "confusionEdges");
    }
    const steps = new Set<number>();
    for (const q of exp.questionCards) {
      if (steps.has(q.step)) throw new ContentError(path, `提问卡步骤 ${q.step} 重复`);
      steps.add(q.step);
    }
  }

  return {
    units,
    unitNodes,
    nodes,
    legacy,
    methods,
    explorations,
    edges,
    incoming,
    explorationsByNode,
    warnings,
  };
}

/** 节点的正向关系（用于详情页） */
export function outgoing(index: ContentIndex, nodeId: string): Edge[] {
  return index.edges.filter((e) => e.from === nodeId);
}

export function nodeTitle(index: ContentIndex, id: string, fallback?: string): string {
  return index.nodes.get(id)?.title ?? fallback ?? id;
}

let cached: ContentIndex | null = null;

/** 运行时加载：Vite 在构建期把 content/ 下的 YAML 打进包里。 */
export function loadContent(): ContentIndex {
  if (cached) return cached;
  const files = import.meta.glob("/content/**/*.{yaml,yml}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  cached = buildIndex(files);
  return cached;
}
