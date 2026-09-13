import type { Evidence, MasteryLevel, MasteryRow, MasterySource, Session, Student, UiMode } from "./schema";

export interface NodeRef {
  id: string;
  kind: "knowledge" | "legacy" | "method";
  title: string;
  unitId?: string;
}

export interface EvidenceInput {
  sessionId: string;
  explorationId: string;
  event: string;
  scope: "class" | "student";
  studentId?: string | null;
  nodeId?: string | null;
  masteryHint?: MasteryLevel | null;
  payload?: Record<string, unknown> | null;
}

export interface EvidenceFilter {
  sessionId?: string;
  studentId?: string;
  explorationId?: string;
  nodeId?: string;
}

/**
 * 数据访问接口。业务代码只依赖它：
 * - Tauri 内：DrizzleRepository（tauri-plugin-sql + drizzle sqlite-proxy）
 * - 普通浏览器 `pnpm dev`：MemoryRepository（内存降级，刷新即丢）
 */
export interface Repository {
  readonly kind: "sqlite" | "memory";

  listStudents(): Promise<Student[]>;
  addStudent(name: string): Promise<Student>;
  archiveStudent(id: string): Promise<void>;

  /** 启动时把内容层的节点同步进 knowledge_nodes（幂等 upsert）。 */
  syncNodes(nodes: NodeRef[]): Promise<void>;

  getMastery(studentId: string): Promise<MasteryRow[]>;
  setMastery(
    studentId: string,
    nodeId: string,
    level: MasteryLevel,
    source?: MasterySource,
    note?: string | null,
  ): Promise<void>;

  startSession(explorationId: string, mode: UiMode): Promise<Session>;
  endSession(sessionId: string): Promise<void>;

  recordEvidence(input: EvidenceInput): Promise<Evidence>;
  listEvidence(filter?: EvidenceFilter): Promise<Evidence[]>;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
