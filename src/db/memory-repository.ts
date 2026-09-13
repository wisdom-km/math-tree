import type { Evidence, MasteryLevel, MasteryRow, MasterySource, Session, Student, UiMode } from "./schema";
import { newId, type EvidenceFilter, type EvidenceInput, type NodeRef, type Repository } from "./repository";

/**
 * 内存实现：普通浏览器里 `pnpm dev` 时用，让探究单脱离数据库运行。
 * 行为与 SQLite 实现保持一致（同样的约束、同样的返回形状），便于测试。
 */
export class MemoryRepository implements Repository {
  readonly kind = "memory" as const;

  private students = new Map<string, Student>();
  private nodes = new Map<string, NodeRef>();
  private mastery = new Map<string, MasteryRow>();
  private sessions = new Map<string, Session>();
  private evidence: Evidence[] = [];

  async listStudents(): Promise<Student[]> {
    return [...this.students.values()]
      .filter((s) => !s.archived)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async addStudent(name: string): Promise<Student> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("学生姓名不能为空");
    const s: Student = { id: newId(), name: trimmed, createdAt: new Date(), archived: false };
    this.students.set(s.id, s);
    return s;
  }

  async archiveStudent(id: string): Promise<void> {
    const s = this.students.get(id);
    if (s) this.students.set(id, { ...s, archived: true });
  }

  async syncNodes(nodes: NodeRef[]): Promise<void> {
    for (const n of nodes) this.nodes.set(n.id, n);
  }

  async getMastery(studentId: string): Promise<MasteryRow[]> {
    return [...this.mastery.values()].filter((m) => m.studentId === studentId);
  }

  async setMastery(
    studentId: string,
    nodeId: string,
    level: MasteryLevel,
    source: MasterySource = "teacher",
    note: string | null = null,
  ): Promise<void> {
    if (!this.students.has(studentId)) throw new Error(`学生不存在：${studentId}`);
    if (!this.nodes.has(nodeId)) throw new Error(`知识节点未同步：${nodeId}`);
    this.mastery.set(`${studentId}/${nodeId}`, { studentId, nodeId, level, source, note, updatedAt: new Date() });
  }

  async startSession(explorationId: string, mode: UiMode): Promise<Session> {
    const s: Session = { id: newId(), explorationId, mode, startedAt: new Date(), endedAt: null };
    this.sessions.set(s.id, s);
    return s;
  }

  async endSession(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) this.sessions.set(sessionId, { ...s, endedAt: new Date() });
  }

  async recordEvidence(input: EvidenceInput): Promise<Evidence> {
    if (!this.sessions.has(input.sessionId)) throw new Error(`会话不存在：${input.sessionId}`);
    if (input.scope === "student" && !input.studentId) throw new Error("scope=student 的证据必须带 studentId");
    const e: Evidence = {
      id: newId(),
      sessionId: input.sessionId,
      explorationId: input.explorationId,
      event: input.event,
      scope: input.scope,
      studentId: input.studentId ?? null,
      nodeId: input.nodeId ?? null,
      masteryHint: input.masteryHint ?? null,
      payload: input.payload ?? null,
      createdAt: new Date(),
    };
    this.evidence.push(e);
    return e;
  }

  async listEvidence(filter: EvidenceFilter = {}): Promise<Evidence[]> {
    return this.evidence.filter(
      (e) =>
        (!filter.sessionId || e.sessionId === filter.sessionId) &&
        (!filter.studentId || e.studentId === filter.studentId) &&
        (!filter.explorationId || e.explorationId === filter.explorationId) &&
        (!filter.nodeId || e.nodeId === filter.nodeId),
    );
  }
}
