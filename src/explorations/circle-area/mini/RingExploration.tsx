import { href } from "@/app/router";
import type { ExplorationProps } from "@/explorations/registry";

/**
 * TODO(m1/circle-area 接手点)：圆环面积迷你探究单（交互稿 circle-area.md 步骤 9 延伸 A，已拍板第 7 条独立成单）。
 * 待实现：同心圆 rInner 可拖（0.5 ≤ rInner ≤ R − 0.5，自绘 SvgSlider）、环形涂色、
 * 两式并列活公式 πR² − πr² 与 π(R² − r²)、光盘一键填入（内 2 外 6）、π(R − r)² 错法对照、
 * 证据 RING_EVENTS（model/evidence.ts）经 useEvidenceSync 写入。
 * 目前只是占位页，保证路由与内容挂接可用。
 */
export function RingExploration({ exploration }: ExplorationProps) {
  return (
    <div className="panel" style={{ margin: "2rem" }}>
      <h2>{exploration.title}</h2>
      <p>迷你探究单开发中（圆环面积 = 外圆面积 − 内圆面积）。</p>
      <a className="btn" href={href("/", { node: exploration.primaryNode })}>
        ← 知识树
      </a>
    </div>
  );
}
