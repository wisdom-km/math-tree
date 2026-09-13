import { useEffect, type Dispatch } from "react";
import { href } from "@/app/router";
import { ShapeCanvas, rectangle, parallelogram, triangle, trapezoid, type ShapeSpec } from "@/shared/shape-canvas";
import { completedStations } from "./model/derived";
import type { Action } from "./model/reducer";
import { STATION_TITLE, type State } from "./model/types";

/** 圆的面积探究单 id（尚未实现时路由到占位页） */
export const CIRCLE_AREA_EXPLORATION_ID = "exp-6a-05-area";

/** 第 5 站 · 圆：进入 circle-area 前的一屏（链上钩子文案 + 两条提问卡由抽屉提供） */
export function CircleEntry({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  useEffect(() => {
    dispatch({ type: "CIRCLE_ENTRY_VIEWED" });
  }, [dispatch]);
  const done = completedStations(state);
  const target = href(`/explore/${CIRCLE_AREA_EXPLORATION_ID}`, state.playThrough ? { step: "3", from: "chain" } : { from: "chain" });

  // 四个已会算的图形并排 + 一个圆：同一网格底；圆靠右，避免压住梯形
  const circlePts = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return { x: 13.6 + 1.55 * Math.cos(a), y: 2 + 1.55 * Math.sin(a) };
  });
  const known: ShapeSpec[] = [
    { id: "rect", points: rectangle(2, 2) },
    { id: "para", points: parallelogram(2, 2, 0.7) },
    { id: "tri", points: triangle(2, 2) },
    { id: "trap", points: trapezoid(2.2, 1.1, 2, 0.5) },
  ].map((s, i) => ({ ...s, role: "source" as const, points: s.points.map((p) => ({ x: p.x + i * 2.55 + 0.25, y: p.y })) }));

  return (
    <div className="chain-station" data-station="circle">
      <section className="chain-stage">
        <ShapeCanvas
          ariaLabel="第 5 站 圆的入口"
          shapes={[...known, { id: "circle", points: circlePts, role: "piece" }]}
          view={{ xMin: -0.6, xMax: 16.4, yMin: -0.8, yMax: 4.6 }}
          actions={{
            cut: { disabled: true, onClick: () => undefined },
            move: { disabled: true, onClick: () => undefined },
            assemble: { disabled: true, onClick: () => undefined },
          }}
        >
          {(ctx) => (
            <>
              <text className="sc-label" x={ctx.toX(0.5)} y={ctx.toY(3.4)}>
                会算了
              </text>
              <text className="sc-label" x={ctx.toX(12.4)} y={ctx.toY(3.85)}>
                圆呢？
              </text>
              <text className="sc-num" x={ctx.toX(13.6)} y={ctx.toY(2) + 12} textAnchor="middle">
                ?
              </text>
            </>
          )}
        </ShapeCanvas>
      </section>
      <aside className="chain-side">
        <div className="chain-hook">
          长方形能数格子，平行四边形、三角形、梯形都靠「剪 / 移 / 拼」变成了会算的图形——圆呢？
        </div>
        <div className="chain-formula">
          <div className="formula secondary">
            <span>已走过：</span>
            <span>{done.length ? done.map((k) => STATION_TITLE[k]).join("、") : "还没有完成的站"}</span>
          </div>
          {state.playThrough && <p className="chain-note">沿链播放：进入后直接落在圆的面积探究单步骤 3「动手」。</p>}
        </div>
        <a className="btn primary lg" href={target} onClick={() => dispatch({ type: "CIRCLE_ENTERED" })}>
          进入「圆的面积」探究单 →
        </a>
      </aside>
    </div>
  );
}
