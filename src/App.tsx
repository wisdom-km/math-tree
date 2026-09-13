import { useMemo } from "react";
import { href, useHashRoute } from "@/app/router";
import { SettingsProvider, useSettings } from "@/app/settings";
import { loadContent } from "@/content/loader";
import { DbProvider, useDbStatus } from "@/db/context";
import type { NodeRef } from "@/db/repository";
import { EXPLORATION_COMPONENTS } from "@/explorations/registry";
import { KnowledgeTreePage } from "@/tree/KnowledgeTreePage";
import { RosterPage } from "@/roster/RosterPage";

function ModeSwitch() {
  const { mode, setMode } = useSettings();
  return (
    <div className="mode-switch" role="group" aria-label="界面模式">
      <button className="btn" aria-pressed={mode === "teacher"} onClick={() => setMode("teacher")}>
        老师
      </button>
      <button className="btn" aria-pressed={mode === "student"} onClick={() => setMode("student")}>
        学生
      </button>
    </div>
  );
}

function DbBadge() {
  const { repo, error } = useDbStatus();
  if (error) return <span className="db-badge is-error">数据层错误</span>;
  if (!repo) return <span className="db-badge">连接中…</span>;
  return (
    <span className="db-badge" title={repo.kind === "sqlite" ? "SQLite 本地数据库" : "浏览器预览：数据只存在内存"}>
      {repo.kind === "sqlite" ? "SQLite" : "内存"}
    </span>
  );
}

function Routes() {
  const route = useHashRoute();
  const content = loadContent();

  const exploreMatch = route.path.match(/^\/explore\/([a-z0-9-]+)$/);
  if (exploreMatch) {
    const exp = content.explorations.find((e) => e.id === exploreMatch[1]);
    const Comp = exp ? EXPLORATION_COMPONENTS[exp.component] : undefined;
    if (!exp || !Comp) {
      return (
        <div className="panel" style={{ margin: "2rem" }}>
          找不到探究单 <code>{exploreMatch[1]}</code>。
          <a href={href("/")}>返回知识树</a>
        </div>
      );
    }
    return <Comp exploration={exp} />;
  }
  if (route.path === "/roster") return <RosterPage />;
  return <KnowledgeTreePage selectedId={route.params.get("node")} />;
}

function Shell() {
  const route = useHashRoute();
  const inExploration = route.path.startsWith("/explore/");
  return (
    <div className="app-shell">
      {!inExploration && (
        <nav className="app-nav">
          <span className="brand">数学知识树</span>
          <a href={href("/")} aria-current={route.path === "/" ? "page" : undefined}>
            知识树
          </a>
          <a href={href("/roster")} aria-current={route.path === "/roster" ? "page" : undefined}>
            名册
          </a>
          <span className="spacer" />
          <DbBadge />
          <ModeSwitch />
        </nav>
      )}
      <main className="app-main">
        <Routes />
      </main>
    </div>
  );
}

export default function App() {
  const content = loadContent();
  const nodeRefs = useMemo<NodeRef[]>(() => {
    const refs: NodeRef[] = [];
    for (const [unitId, list] of content.unitNodes) {
      for (const n of list) refs.push({ id: n.id, kind: "knowledge", title: n.title, unitId });
    }
    for (const l of content.legacy) refs.push({ id: l.id, kind: "legacy", title: l.title });
    for (const m of content.methods) refs.push({ id: m.id, kind: "method", title: m.title });
    return refs;
  }, [content]);

  return (
    <SettingsProvider>
      <DbProvider nodes={nodeRefs}>
        <Shell />
      </DbProvider>
    </SettingsProvider>
  );
}
