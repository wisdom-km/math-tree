import { href } from "@/app/router";

/** 尚未实现的探究单（如从面积链第 5 站跳到「圆的面积」）落到这里，而不是「找不到」 */
const KNOWN_PENDING: Record<string, { title: string; spec: string }> = {
  "exp-6a-05-area": { title: "圆的面积", spec: "docs/explorations/circle-area.md" },
};

export function ExplorationPlaceholder({ id, params }: { id: string; params: URLSearchParams }) {
  const pending = KNOWN_PENDING[id];
  const fromChain = params.get("from") === "chain";
  const step = params.get("step");
  return (
    <div className="panel" style={{ margin: "2rem", maxWidth: "60rem", fontSize: "var(--fs-num)", lineHeight: 1.6 }}>
      {pending ? (
        <>
          <h2 style={{ marginTop: 0 }}>「{pending.title}」探究单还在开发中</h2>
          <p className="muted">
            交互稿：<code>{pending.spec}</code>
            {step && <>；沿链播放会直接落在它的步骤 {step}。</>}
          </p>
        </>
      ) : (
        <p>
          找不到探究单 <code>{id}</code>。
        </p>
      )}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
        {fromChain && (
          <a className="btn primary lg" href={href("/explore/exp-chain-area", { station: "circle", ...(step ? { play: "1" } : {}) })}>
            ← 回到面积转化链
          </a>
        )}
        <a className="btn lg" href={href("/", pending ? { node: "6a-05-07" } : undefined)}>
          返回知识树
        </a>
      </div>
    </div>
  );
}
