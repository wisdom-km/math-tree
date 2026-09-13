import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/app/settings";
import { loadContent, nodeTitle } from "@/content/loader";
import { useRepository } from "@/db/context";
import { MASTERY_LABEL, type Evidence, type MasteryRow, type Student } from "@/db/schema";
import "./roster.css";

/**
 * 名册（M1 最小版）：建学生、选「当前上台学生」、看掌握度与探究证据。
 * 掌握度录入、热力图等在 M2 补全。
 */
export function RosterPage() {
  const repo = useRepository();
  const { currentStudentId, setCurrentStudentId } = useSettings();
  const content = loadContent();
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);

  const refresh = useCallback(async () => {
    if (!repo) return;
    setStudents(await repo.listStudents());
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!repo || !currentStudentId) {
      setMastery([]);
      setEvidence([]);
      return;
    }
    void (async () => {
      setMastery(await repo.getMastery(currentStudentId));
      setEvidence(await repo.listEvidence({ studentId: currentStudentId }));
    })();
  }, [repo, currentStudentId]);

  if (!repo) return <div className="panel roster-page">数据层连接中…</div>;

  const add = async () => {
    if (!name.trim()) return;
    await repo.addStudent(name);
    setName("");
    await refresh();
  };

  const current = students.find((s) => s.id === currentStudentId);

  return (
    <div className="roster-page">
      <section className="panel roster-list">
        <h2>名册</h2>
        <p className="muted">
          只有名字，无密码。数据存在{repo.kind === "sqlite" ? "本地 SQLite" : "内存（浏览器预览，刷新即丢）"}。
        </p>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="学生姓名" aria-label="学生姓名" />
          <button className="btn primary" type="submit" disabled={!name.trim()}>
            添加
          </button>
        </form>
        <ul>
          {students.map((s) => (
            <li key={s.id}>
              <button className="btn" aria-pressed={s.id === currentStudentId} onClick={() => setCurrentStudentId(s.id === currentStudentId ? null : s.id)}>
                {s.name}
              </button>
            </li>
          ))}
          {students.length === 0 && <li className="muted">还没有学生。</li>}
        </ul>
      </section>

      <section className="panel roster-detail">
        {current ? (
          <>
            <h2>
              当前上台：{current.name}
              <button className="btn" onClick={() => setCurrentStudentId(null)}>
                取消
              </button>
            </h2>
            <p className="muted">上台学生在探究单里的完成证据会额外记一条到这个名字下；系统不会自动改掌握度。</p>
            <h3>掌握度</h3>
            {mastery.length === 0 ? (
              <p className="muted">尚无录入（老师手动录入在 M2）。</p>
            ) : (
              <ul className="plain">
                {mastery.map((m) => (
                  <li key={m.nodeId}>
                    {nodeTitle(content, m.nodeId)} · {MASTERY_LABEL[m.level]}
                  </li>
                ))}
              </ul>
            )}
            <h3>探究证据</h3>
            {evidence.length === 0 ? (
              <p className="muted">尚无证据。</p>
            ) : (
              <ul className="plain">
                {evidence.map((e) => (
                  <li key={e.id}>
                    <span className="muted">{new Date(e.createdAt).toLocaleString("zh-CN")}</span> {e.event}
                    {e.nodeId && <> · {nodeTitle(content, e.nodeId)}</>}
                    {e.masteryHint && <span className="tag">参考：{MASTERY_LABEL[e.masteryHint]}</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="muted">点一个学生设为「当前上台」。不选也能上课，证据只按全班本课记。</p>
        )}
      </section>
    </div>
  );
}
