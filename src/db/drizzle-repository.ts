import { and, asc, eq, sql } from "drizzle-orm";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import type { Evidence, MasteryLevel, MasteryRow, MasterySource, Session, Student, UiMode } from "./schema";
import { newId, type EvidenceFilter, type EvidenceInput, type NodeRef, type Repository } from "./repository";

export type Db = SqliteRemoteDatabase<typeof schema>;

/** SQLite 实现：所有 SQL 由 Drizzle 生成，经 sqlite-proxy 交给 tauri-plugin-sql 执行。 */
export class DrizzleRepository implements Repository {
  readonly kind = "sqlite" as const;

  constructor(private readonly db: Db) {}

  async listStudents(): Promise<Student[]> {
    return this.db
      .select()
      .from(schema.students)
      .where(eq(schema.students.archived, false))
      .orderBy(asc(schema.students.createdAt));
  }

  async addStudent(name: string): Promise<Student> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("学生姓名不能为空");
    const row: Student = { id: newId(), name: trimmed, createdAt: new Date(), archived: false };
    await this.db.insert(schema.students).values(row);
    return row;
  }

  async archiveStudent(id: string): Promise<void> {
    await this.db.update(schema.students).set({ archived: true }).where(eq(schema.students.id, id));
  }

  async syncNodes(nodes: NodeRef[]): Promise<void> {
    const now = new Date();
    for (const n of nodes) {
      await this.db
        .insert(schema.knowledgeNodes)
        .values({ id: n.id, kind: n.kind, title: n.title, unitId: n.unitId ?? null, syncedAt: now })
        .onConflictDoUpdate({
          target: schema.knowledgeNodes.id,
          set: { kind: n.kind, title: n.title, unitId: n.unitId ?? null, syncedAt: now },
        });
    }
  }

  async getMastery(studentId: string): Promise<MasteryRow[]> {
    return this.db.select().from(schema.mastery).where(eq(schema.mastery.studentId, studentId));
  }

  async setMastery(
    studentId: string,
    nodeId: string,
    level: MasteryLevel,
    source: MasterySource = "teacher",
    note: string | null = null,
  ): Promise<void> {
    const now = new Date();
    await this.db
      .insert(schema.mastery)
      .values({ studentId, nodeId, level, source, note, updatedAt: now })
      .onConflictDoUpdate({
        target: [schema.mastery.studentId, schema.mastery.nodeId],
        set: { level, source, note, updatedAt: now },
      });
  }

  async startSession(explorationId: string, mode: UiMode): Promise<Session> {
    const row: Session = { id: newId(), explorationId, mode, startedAt: new Date(), endedAt: null };
    await this.db.insert(schema.sessions).values(row);
    return row;
  }

  async endSession(sessionId: string): Promise<void> {
    await this.db.update(schema.sessions).set({ endedAt: new Date() }).where(eq(schema.sessions.id, sessionId));
  }

  async recordEvidence(input: EvidenceInput): Promise<Evidence> {
    if (input.scope === "student" && !input.studentId) throw new Error("scope=student 的证据必须带 studentId");
    const row: Evidence = {
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
    await this.db.insert(schema.evidence).values(row);
    return row;
  }

  async listEvidence(filter: EvidenceFilter = {}): Promise<Evidence[]> {
    const conds = [
      filter.sessionId ? eq(schema.evidence.sessionId, filter.sessionId) : undefined,
      filter.studentId ? eq(schema.evidence.studentId, filter.studentId) : undefined,
      filter.explorationId ? eq(schema.evidence.explorationId, filter.explorationId) : undefined,
      filter.nodeId ? eq(schema.evidence.nodeId, filter.nodeId) : undefined,
    ].filter((c): c is NonNullable<typeof c> => !!c);
    return this.db
      .select()
      .from(schema.evidence)
      .where(conds.length ? and(...conds) : sql`1 = 1`)
      .orderBy(asc(schema.evidence.createdAt));
  }
}
