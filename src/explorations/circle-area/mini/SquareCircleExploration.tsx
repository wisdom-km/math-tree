import { href } from "@/app/router";
import type { ExplorationProps } from "@/explorations/registry";

/**
 * TODO(m1/circle-area 接手点)：方圆组合面积迷你探究单（交互稿 circle-area.md 步骤 9 延伸 B，已拍板第 7、8 条）。
 * 待实现：「外方内圆 / 外圆内方」切换、同一 r 可拖、S方 = 4r² / 2r²、差 0.86r² / 1.14r² 系数「不变」小标、
 * 外圆内方「拆成三角形」迷你操作（t 驱动把正方形沿对角线拆成两个底 2r 高 r 的三角形）、
 * 结论卡双填空（正方形是 r² 的 4 / 2 倍，圆是 3.14 倍）、证据 SQUARE_CIRCLE_EVENTS 经 useEvidenceSync 写入。
 * 目前只是占位页，保证路由与内容挂接可用。
 */
export function SquareCircleExploration({ exploration }: ExplorationProps) {
  return (
    <div className="panel" style={{ margin: "2rem" }}>
      <h2>{exploration.title}</h2>
      <p>迷你探究单开发中（正方形与圆的面积差是 r² 的几倍）。</p>
      <a className="btn" href={href("/", { node: exploration.primaryNode })}>
        ← 知识树
      </a>
    </div>
  );
}
