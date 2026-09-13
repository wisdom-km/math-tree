import { useState, type Dispatch } from "react";
import { gridCells, gridCount } from "../model/geometry";
import type { Action } from "../model/reducer";
import { GUESS_R, type State } from "../model/types";

const W = 1380;
const H = 700;
const CX = 460;
const CY = 350;
const SCALE = 56;

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 1 情境：圆形草坪要铺草皮——草皮要买多大一块？可「试着数格子」（已拍板第 11 条进本版）。 */
export function ContextStage({ state, dispatch, interactive }: Props) {
  const [aside, setAside] = useState(false);
  const counted = state.gridCounted;
  const rPx = GUESS_R * SCALE;
  const count = gridCount(GUESS_R);
  const cells = counted ? gridCells(GUESS_R) : [];

  return (
    <>
      <div className="stage-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="圆形草坪情境">
          {/* 草坪俯视 */}
          <circle cx={CX} cy={CY} r={rPx} fill="#9bd27a" stroke="#4f8a2f" strokeWidth={8} />
          {!counted && (
            <text className="svg-num" x={CX} y={CY + 18} textAnchor="middle" fontSize={72} fill="#2f5f17">
              ？
            </text>
          )}
          {/* 一卷草皮 */}
          <g transform="translate(900 250)">
            <rect x={0} y={0} width={360} height={200} rx={16} fill="#8fcb6e" stroke="#4f8a2f" strokeWidth={6} />
            <ellipse cx={360} cy={100} rx={40} ry={100} fill="#6fae4e" stroke="#4f8a2f" strokeWidth={6} />
            <ellipse cx={360} cy={100} rx={14} ry={40} fill="#3f7a26" />
            <text className="svg-label" x={180} y={250} textAnchor="middle">
              草皮要买多大一块？
            </text>
          </g>
          {/* 数格子：网格叠到圆上，完整格亮蓝、不完整格亮橙 */}
          {counted && (
            <g className="count-grid">
              {cells.map(({ i, j, kind }) => (
                <rect key={`${i}-${j}`} className={`count-cell ${kind}`} x={CX + i * SCALE} y={CY + j * SCALE} width={SCALE} height={SCALE} />
              ))}
              {Array.from({ length: 2 * Math.ceil(GUESS_R) + 1 }, (_, k) => {
                const o = (k - Math.ceil(GUESS_R)) * SCALE;
                return (
                  <g key={k}>
                    <line className="grid-major" x1={CX + o} y1={CY - rPx - SCALE} x2={CX + o} y2={CY + rPx + SCALE} />
                    <line className="grid-major" x1={CX - rPx - SCALE} y1={CY + o} x2={CX + rPx + SCALE} y2={CY + o} />
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r={rPx} fill="none" stroke="#2f5f17" strokeWidth={6} />
            </g>
          )}
          <text className="svg-label muted" x={CX} y={CY + rPx + 60} textAnchor="middle">
            学校要给这块圆形草坪铺草皮
          </text>
          {counted && (
            <text className="svg-num" x={W / 2} y={H - 40} textAnchor="middle">
              完整 <tspan fill="var(--c-primary)">{count.complete}</tspan> 格 + 不完整 <tspan fill="var(--c-diameter)">{count.partial}</tspan> 格 ≈ ？
            </text>
          )}
        </svg>
      </div>
      {aside && <div className="task-card">长方形草坪我们会算——数格子、长 × 宽。圆呢？</div>}
      {counted && <div className="task-card">边上这些半格怎么办？</div>}
      <div className="choice-row">
        <button className="btn" aria-pressed={aside} onClick={() => setAside(!aside)}>
          旁白
        </button>
        <button className="btn" aria-pressed={counted} disabled={!interactive || counted} onClick={() => dispatch({ type: "GRID_COUNT" })}>
          试着数格子
        </button>
        <button className="btn primary" disabled={!interactive} onClick={() => dispatch({ type: "NEXT_STEP" })}>
          换个办法 → 先猜一猜要多大
        </button>
      </div>
    </>
  );
}
