import { useRef, useState, type Dispatch } from "react";
import { areaTextbook, formulaC, radius } from "../model/derived";
import type { Action } from "../model/reducer";
import { D_MAX, D_MIN, type State } from "../model/types";
import { fmt2 } from "./svg-utils";

const W = 640;
const H = 520;
const CX = 320;
const CY = 250;
const SCALE = 40;

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

/**
 * 易混并排（交互稿第 6 节）：同一圆、同一半径滑块；左周长、右面积。
 * 面积只演示不讲：公式显灰并标注「下节课正式探究」。
 */
export function ConfusionSplit({ state, dispatch }: Props) {
  const s = state;
  const r = radius(s);
  const rPx = r * SCALE;
  const C = formulaC(s);
  const S = areaTextbook(s);
  const [hintShown, setHintShown] = useState(false);
  const startedFrom = useRef(s.d);

  const onSlide = (value: number) => {
    dispatch({ type: "DRAG_D", d: value * 2 });
    if (!hintShown && Math.abs(value * 2 - startedFrom.current) > 1) setHintShown(true);
  };

  return (
    <>
      <div className="confusion-split" aria-label="周长与面积并排">
        <section className="half">
          <h3>周长</h3>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <circle cx={CX} cy={CY} r={rPx} fill="none" stroke="var(--c-arc)" strokeWidth={14} />
            <line className="radius-line" x1={CX} y1={CY} x2={CX + rPx} y2={CY} />
            <text className="svg-num" x={CX + rPx / 2} y={CY - 12} textAnchor="middle" fill="var(--c-radius)">
              r = {r.toFixed(1)}
            </text>
            <circle cx={CX} cy={CY} r={6} fill="var(--c-wheel-stroke)" />
            <text className="svg-label" x={CX} y={H - 30} textAnchor="middle">
              周长在「边」上
            </text>
          </svg>
          <div className="live-formula">
            <div className="formula">
              <span>C = 2πr = 2 × 3.14 ×</span>
              <span className="var">{r.toFixed(1)}</span>
              <span>=</span>
              <span className="res">{fmt2(C)}</span>
              <span>cm</span>
            </div>
          </div>
        </section>
        <section className="half">
          <h3>
            面积 <span className="note">下节课正式探究</span>
          </h3>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <circle className="area-fill" cx={CX} cy={CY} r={rPx} stroke="var(--c-diameter)" strokeWidth={3} />
            <line className="radius-line" x1={CX} y1={CY} x2={CX + rPx} y2={CY} />
            <text className="svg-num" x={CX + rPx / 2} y={CY - 12} textAnchor="middle" fill="var(--c-radius)">
              r = {r.toFixed(1)}
            </text>
            <circle cx={CX} cy={CY} r={6} fill="var(--c-wheel-stroke)" />
            <text className="svg-label" x={CX} y={H - 30} textAnchor="middle">
              面积在「面」上
            </text>
          </svg>
          <div className="live-formula" style={{ opacity: 0.7, borderColor: "var(--c-line)" }}>
            <div className="formula">
              <span>S = πr² = 3.14 ×</span>
              <span className="var">{r.toFixed(1)}</span>
              <span>×</span>
              <span className="var">{r.toFixed(1)}</span>
              <span>=</span>
              <span className="res">{fmt2(S)}</span>
              <span>cm²</span>
            </div>
            <div className="pi-note">下节课正式探究，这里只看数字怎么变。</div>
          </div>
        </section>
      </div>
      <div className="r-slider">
        <span>半径 r</span>
        <input
          type="range"
          min={D_MIN / 2}
          max={D_MAX / 2}
          step={0.05}
          value={r}
          aria-label="半径"
          onPointerDown={() => dispatch({ type: "BEGIN_DRAG_D" })}
          onPointerUp={() => dispatch({ type: "END_DRAG_D" })}
          onPointerCancel={() => dispatch({ type: "END_DRAG_D" })}
          onChange={(e) => onSlide(parseFloat(e.target.value))}
        />
        <span className="num">{r.toFixed(2)} cm</span>
      </div>
      {hintShown && <p className="hint">r 变大时，面积数字跳得比周长更猛。</p>}
    </>
  );
}
