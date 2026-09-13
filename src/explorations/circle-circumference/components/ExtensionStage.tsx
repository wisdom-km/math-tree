import { useState, type Dispatch } from "react";
import { Polygon } from "@mathigon/euclid";
import { href } from "@/app/router";
import { exactC, polygonApprox, squarePerimeter } from "../model/derived";
import type { Action } from "../model/reducer";
import { POLYGON_SIDES, type State } from "../model/types";
import { fmt2 } from "./svg-utils";

const W = 1380;
const H = 700;
const CX = 690;
const CY = 350;
const R_PX = 260;

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 9 延伸：割圆术彩蛋 A、正方形对照彩蛋 B、钩子、易混并排入口。 */
export function ExtensionStage({ state, dispatch, interactive }: Props) {
  const s = state;
  const [history, setHistory] = useState(false);
  const n = s.easter.nSides;
  const approx = polygonApprox(s, n);
  const poly = Polygon.regular(n, R_PX);
  const points = poly.points.map((p) => `${CX + p.x},${CY + p.y}`).join(" ");
  const sq = s.easter.squareCompare;

  return (
    <>
      <div className="stage-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="割圆术">
          {sq && <rect className="square" x={CX - R_PX} y={CY - R_PX} width={2 * R_PX} height={2 * R_PX} />}
          <circle className="wheel" cx={CX} cy={CY} r={R_PX} fill="none" />
          <polygon className="polygon" points={points} />
          <line className="diameter" x1={CX - R_PX} y1={CY} x2={CX + R_PX} y2={CY} strokeWidth={6} />
          <text className="svg-num" x={CX} y={CY - 12} textAnchor="middle" fill="var(--c-diameter)">
            d = {s.d.toFixed(1)} cm
          </text>
          <text className="svg-label" x={60} y={70}>
            圆内接正 <tspan className="svg-num">{n}</tspan> 边形
          </text>
          <text className="svg-num" x={W - 60} y={70} textAnchor="end" fill="var(--c-primary)">
            P{n} = {fmt2(approx.perimeter)} cm
          </text>
          <text className="svg-num" x={W - 60} y={120} textAnchor="end" fill="var(--c-wheel-stroke)">
            C = {fmt2(exactC(s))} cm
          </text>
          <text className="svg-label" x={W - 60} y={170} textAnchor="end">
            相差 {fmt2(approx.gap)} cm · P{n} ÷ d = {approx.ratio.toFixed(4)}
          </text>
          {sq && (
            <text className="svg-num" x={W - 60} y={H - 60} textAnchor="end" fill="var(--c-warn)">
              正方形周长 4d = {fmt2(squarePerimeter(s))} cm · 圆周长 πd ≈ 3.14 × {s.d.toFixed(1)} = {fmt2(3.14 * s.d)} cm
            </text>
          )}
        </svg>
      </div>
      <div className="stage-controls">
        <span>边数</span>
        <div className="sides-row" role="group" aria-label="边数">
          {POLYGON_SIDES.map((k) => (
            <button key={k} className="btn" aria-pressed={k === n} disabled={!interactive} onClick={() => dispatch({ type: "SET_SIDES", n: k })}>
              {k}
            </button>
          ))}
        </div>
        <button className="btn" aria-pressed={sq} disabled={!interactive} onClick={() => dispatch({ type: "SET_SQUARE_COMPARE", on: !sq })}>
          正方形对照 4d
        </button>
        <button className="btn" aria-pressed={history} onClick={() => setHistory(!history)}>
          刘徽割圆术
        </button>
        <button className="btn" disabled title="第 1 版不做绕绳量法">
          绕绳量法（下一版）
        </button>
        <button className="btn primary" disabled={!interactive} onClick={() => dispatch({ type: "SET_CONFUSION", on: true })}>
          周长和面积有什么不同？
        </button>
      </div>
      {history && (
        <div className="history-note">
          「周三径一」是古人对圆周长与直径关系的粗略说法；刘徽用圆内接正多边形一步步逼近圆（割圆术）；祖冲之把 π 精确到小数点后 7 位。
        </div>
      )}
      {sq && <div className="task-card">围得越「圆」，同样宽度下边线比 4 倍直径短一截。</div>}
      <div className="hook">
        下一课我们会问——围住的<b>面</b>有多大？{" "}
        <a href={href("/", { node: "6a-05-07" })}>→ 圆的面积</a>
      </div>
    </>
  );
}
