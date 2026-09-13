import { useRef, type Dispatch, type PointerEvent as ReactPointerEvent } from "react";
import type { Action } from "../model/reducer";
import type { State, Step0Choice } from "../model/types";
import { ownerSvg, svgPoint } from "./svg-utils";

const W = 1380;
const H = 700;
const CX = 690;
const CY = 340;
const SCALE = 56; // px / cm

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 0 回忆：圆心 O、半径 r、直径 d；拖半径端点，直径自动 = 2r。 */
export function RecallStage({ state, dispatch, interactive }: Props) {
  const s0 = state.step0;
  const r = s0.r0;
  const rPx = r * SCALE;
  const ptr = useRef<number | null>(null);

  const onDown = (e: ReactPointerEvent<SVGElement>) => {
    if (!interactive || ptr.current !== null) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件无真实指针 */
    }
    ptr.current = e.pointerId;
  };
  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const p = svgPoint(svg, e);
    const dist = Math.hypot(p.x - CX, p.y - CY) / SCALE;
    dispatch({ type: "STEP0_SET_R", r: dist });
  };
  const onUp = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current === e.pointerId) ptr.current = null;
  };

  const wrong = s0.choice !== null && s0.choice !== "2" && !s0.correct;
  const choices: Step0Choice[] = ["2", "一样长", "一半"];

  return (
    <>
      <div className="stage-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="回忆圆的认识">
          <circle className="wheel" cx={CX} cy={CY} r={rPx} />
          {/* 直径 d（水平） */}
          <line
            className="diameter"
            x1={CX - rPx}
            y1={CY}
            x2={CX + rPx}
            y2={CY}
            stroke={s0.correct ? "var(--c-arc)" : undefined}
          />
          <text className="svg-num" x={CX} y={CY + 44} textAnchor="middle" fill="var(--c-diameter)">
            d = {(2 * r).toFixed(1)} cm
          </text>
          {/* 选错时：两条半径并排叠在直径上 */}
          {wrong && (
            <>
              <line x1={CX - rPx} y1={CY - 14} x2={CX} y2={CY - 14} stroke="#1e5eff" strokeWidth={8} strokeLinecap="round" />
              <line x1={CX} y1={CY - 14} x2={CX + rPx} y2={CY - 14} stroke="#12a58f" strokeWidth={8} strokeLinecap="round" />
              <text className="svg-label" x={CX - rPx / 2} y={CY - 26} textAnchor="middle" fill="#1e5eff">
                r
              </text>
              <text className="svg-label" x={CX + rPx / 2} y={CY - 26} textAnchor="middle" fill="#12a58f">
                r
              </text>
            </>
          )}
          {/* 半径 r（斜向，端点可拖） */}
          <line className="radius-line" x1={CX} y1={CY} x2={CX + rPx * Math.cos(-Math.PI / 4)} y2={CY + rPx * Math.sin(-Math.PI / 4)} />
          <text className="svg-num" x={CX + rPx * 0.5 * Math.cos(-Math.PI / 4) + 24} y={CY + rPx * 0.5 * Math.sin(-Math.PI / 4)} fill="var(--c-radius)">
            r = {r.toFixed(1)} cm
          </text>
          <circle cx={CX} cy={CY} r={7} fill="var(--c-wheel-stroke)" />
          <text className="svg-label" x={CX + 12} y={CY - 12}>
            O
          </text>
          <g>
            <circle className="diameter-handle" cx={CX + rPx * Math.cos(-Math.PI / 4)} cy={CY + rPx * Math.sin(-Math.PI / 4)} r={18} fill="var(--c-primary)" />
            <circle
              className="hit"
              cx={CX + rPx * Math.cos(-Math.PI / 4)}
              cy={CY + rPx * Math.sin(-Math.PI / 4)}
              r={34}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
          </g>
          {/* 活公式雏形：只出现 r、d */}
          <text className="svg-num" x={W - 40} y={70} textAnchor="end">
            d = 2 × <tspan fill="var(--c-radius)">{r.toFixed(1)}</tspan> = <tspan fill="var(--c-diameter)">{(2 * r).toFixed(1)}</tspan>
          </text>
          <text className="svg-label muted" x={40} y={70}>
            拖蓝点改半径，看直径怎么跟着变
          </text>
        </svg>
      </div>
      <div className={`task-card ${s0.correct ? "ok" : ""}`}>
        同一个圆里，直径长度是半径的 <b>{s0.correct ? "2 倍" : "____"}</b>。
      </div>
      <div className="choice-row" role="group" aria-label="三选一">
        {choices.map((c) => (
          <button key={c} className="btn" aria-pressed={s0.choice === c} disabled={!interactive} onClick={() => dispatch({ type: "STEP0_CHOOSE", choice: c })}>
            {c === "2" ? "2 倍" : c}
          </button>
        ))}
        {state.mode === "teacher" && interactive && !s0.correct && (
          <button className="btn" onClick={() => dispatch({ type: "STEP0_SKIP" })} aria-pressed={state.step0Skipped}>
            跳过回忆（记日志）
          </button>
        )}
      </div>
    </>
  );
}
