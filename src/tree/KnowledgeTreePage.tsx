import { useMemo } from "react";
import { href, navigate } from "@/app/router";
import { loadContent, nodeTitle, outgoing } from "@/content/loader";
import { EDGE_LABEL, type AnyNode, type Edge, type Exploration, type KnowledgeNode } from "@/content/schema";
import { explorationEntries, playThroughEntry } from "@/explorations/registry";
import "./tree.css";

const LEVEL_LABEL: Record<string, string> = { L1: "L1 演示", L2: "L2 操作", L3: "L3 探究", 静态图解: "静态图解" };

function NodeLink({ id, title }: { id: string; title: string }) {
  return (
    <button className="node-link" onClick={() => navigate("/", { node: id })}>
      <span className="node-id">{id}</span>
      <span>{title}</span>
    </button>
  );
}

/** 「转化自」边上的沿链播放入口：目标旧知识挂了转化链探究单时出现 */
function PlayThroughEntries({ edges, index }: { edges: Edge[]; index: ReturnType<typeof loadContent> }) {
  const seen = new Set<string>();
  const items: { exp: Exploration; label: string; params?: Record<string, string>; badge?: string }[] = [];
  for (const e of edges) {
    for (const exp of index.explorationsByNode.get(e.to) ?? []) {
      if (seen.has(exp.id)) continue;
      const entry = playThroughEntry(exp);
      if (!entry) continue;
      seen.add(exp.id);
      items.push({ exp, ...entry });
    }
  }
  if (items.length === 0) return null;
  return (
    <div className="explorations">
      {items.map((it) => (
        <a key={it.exp.id} className="btn primary lg" href={href(`/explore/${it.exp.id}`, it.params)}>
          {it.label}
          {it.badge && <span className="badge">{it.badge}</span>}
        </a>
      ))}
    </div>
  );
}

function EdgeList({ title, edges, index }: { title: string; edges: Edge[]; index: ReturnType<typeof loadContent> }) {
  if (edges.length === 0) return null;
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {title === EDGE_LABEL.transformsFrom && <PlayThroughEntries edges={edges} index={index} />}
      <ul>
        {edges.map((e, i) => {
          const target = e.from === undefined ? e.to : e.to;
          const exists = index.nodes.has(target);
          const label = nodeTitle(index, target, e.toTitle);
          return (
            <li key={`${e.type}-${target}-${i}`}>
              {exists ? <NodeLink id={target} title={label} /> : <span className="node-pending">{label}（{target}，未落库）</span>}
              {e.note && <span className="edge-note">{e.note}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NodeDetail({ node }: { node: AnyNode }) {
  const index = loadContent();
  const out = outgoing(index, node.id);
  const incoming = index.incoming.get(node.id) ?? [];
  const explorations = index.explorationsByNode.get(node.id) ?? [];

  return (
    <article className="node-detail">
      <header>
        <div className="node-kind">
          {node.kind === "knowledge" ? "知识点" : node.kind === "legacy" ? "旧知识" : "方法"} · {node.id}
        </div>
        <h2>{node.title}</h2>
        {node.kind === "knowledge" && (
          <p className="summary">{node.summary}</p>
        )}
        {node.kind === "legacy" && (
          <p className="summary">
            {node.summary ?? ""}
            <span className="muted"> 出处：{node.source}{node.pending ? "（待核）" : ""}</span>
          </p>
        )}
        {node.kind === "method" && <p className="summary">用在：{node.usedIn}</p>}
        {node.kind === "knowledge" && (
          <div className="meta">
            {node.pages && <span>教材 p{node.pages}</span>}
            {node.level && <span>{LEVEL_LABEL[node.level] ?? node.level}</span>}
            {node.model && <span>直观模型：{node.model}</span>}
            <span className={node.reviewed ? "tag ok" : "tag"}>{node.reviewed ? "已审" : "未审"}</span>
          </div>
        )}
      </header>

      {explorations.length > 0 && (
        <section className="detail-section explorations">
          <h3>探究单</h3>
          {explorations.flatMap((e) =>
            explorationEntries(e, node.id).map((entry, i) => (
              <a key={`${e.id}-${i}`} className="btn primary lg" href={href(`/explore/${e.id}`, entry.params)}>
                {entry.label}
                {entry.badge && <span className="badge">{entry.badge}</span>}
              </a>
            )),
          )}
        </section>
      )}

      {node.kind === "knowledge" && (
        <>
          <EdgeList title={EDGE_LABEL.transformsFrom} edges={out.filter((e) => e.type === "transformsFrom")} index={index} />
          {node.relations.decomposesInto.length > 0 && (
            <section className="detail-section">
              <h3>拆解为</h3>
              <ol className="chips">
                {node.relations.decomposesInto.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </section>
          )}
          <EdgeList title={EDGE_LABEL.relatesTo} edges={out.filter((e) => e.type === "relatesTo")} index={index} />
          {node.relations.confusedWith.length > 0 && (
            <section className="detail-section">
              <h3>易混</h3>
              <ul>
                {node.relations.confusedWith.map((c, i) => (
                  <li key={i}>
                    {c.node && index.nodes.has(c.node) ? (
                      <NodeLink id={c.node} title={nodeTitle(index, c.node, c.title)} />
                    ) : c.node ? (
                      <span className="node-pending">{c.title ?? c.node}</span>
                    ) : null}
                    <span className="edge-note">{c.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {incoming.length > 0 && (
        <section className="detail-section">
          <h3>被谁引用</h3>
          <ul>
            {incoming.map((e, i) => (
              <li key={`${e.from}-${i}`}>
                <NodeLink id={e.from} title={nodeTitle(index, e.from)} />
                <span className="edge-note">{EDGE_LABEL[e.type]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {node.kind === "legacy" && node.dependedBy.length > 0 && (
        <section className="detail-section">
          <h3>被哪些六上节点依赖</h3>
          <ul>
            {node.dependedBy.map((id) => (
              <li key={id}>
                {index.nodes.has(id) ? (
                  <NodeLink id={id} title={nodeTitle(index, id)} />
                ) : (
                  <span className="node-pending">{id}（未落库）</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export function KnowledgeTreePage({ selectedId }: { selectedId: string | null }) {
  const index = loadContent();
  const selected = selectedId ? index.nodes.get(selectedId) : undefined;

  const legacyByGrade = useMemo(() => {
    const map = new Map<string, typeof index.legacy>();
    for (const l of index.legacy) {
      const g = l.id.slice(0, 2);
      map.set(g, [...(map.get(g) ?? []), l]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [index]);

  return (
    <div className="tree-page">
      <aside className="tree-list">
        {index.units.map((u) => (
          <section key={u.id} className="unit">
            <h2>
              <span className="unit-id">{u.id}</span> 单元{u.order} · {u.title}
              {u.pages && <span className="muted"> {u.pages}</span>}
            </h2>
            <ul>
              {(index.unitNodes.get(u.id) ?? []).map((n: KnowledgeNode) => (
                <li key={n.id}>
                  <button
                    className="tree-node"
                    aria-pressed={n.id === selectedId}
                    onClick={() => navigate("/", { node: n.id })}
                  >
                    <span className="node-id">{n.id}</span>
                    <span className="node-title">{n.title}</span>
                    {index.explorationsByNode.has(n.id) && <span className="dot" title="有探究单" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="unit">
          <h2>旧知识（六上直接依赖）</h2>
          {legacyByGrade.map(([grade, list]) => (
            <div key={grade}>
              <h4 className="muted">{grade}</h4>
              <ul>
                {list.map((l) => (
                  <li key={l.id}>
                    <button className="tree-node" aria-pressed={l.id === selectedId} onClick={() => navigate("/", { node: l.id })}>
                      <span className="node-id">{l.id}</span>
                      <span className="node-title">{l.title}</span>
                      {index.explorationsByNode.has(l.id) && <span className="dot" title="有探究单" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="unit">
          <h2>方法</h2>
          <ul>
            {index.methods.map((m) => (
              <li key={m.id}>
                <button className="tree-node" aria-pressed={m.id === selectedId} onClick={() => navigate("/", { node: m.id })}>
                  <span className="node-id">{m.id}</span>
                  <span className="node-title">{m.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <div className="tree-detail">
        {selected ? (
          <NodeDetail node={selected} />
        ) : (
          <div className="placeholder">
            <p>点左侧节点查看它的「转化自 / 拆解为 / 联系 / 易混」和挂接的探究单。</p>
            <p className="muted">
              当前已落库：{index.units.length} 个单元、{[...index.nodes.values()].filter((n) => n.kind === "knowledge").length} 个知识点、
              {index.legacy.length} 个旧知识、{index.methods.length} 个方法、{index.explorations.length} 份探究单。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
