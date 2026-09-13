import { useRef, useState, type Dispatch } from "react";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import { formulaC, formulaS } from "../model/derived";
import type { Action } from "../model/reducer";
import { R_MAX, R_MIN, type State } from "../model/types";
import { SvgSlider } from "./SvgSlider";

const W = 640;
const H = 520;
const CX = 320;
const CY = 250;
const SCALE = 36;

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

/**
 * 易混并排（交互稿第 6 节；已拍板第 9 条：全系统固定左周长右面积）。
 * 同一圆、同一自绘 SVG 半径滑块；本课主角是面积（右，正常色），周长标「上节课」。
 * r 翻倍时给一次「面积 ×4，周长 ×2」提示。
 */
export function ConfusionSplit({ state, dispatch }: Props) {
  const s = state;
  const r = s.r;
  const rPx = r * SCALE;
  const C = formulaC(r);
  const S = formulaS(r);
  const startR = useRef(r);
  const [doubled, setDoubled] = useState(false);

  const onSlide = (value: number) => {
    dispatch({ type: "DRAG_R", r: value });
    if (!doubled && value >= startR.current * 2 - 1e-9) setDoubled(true);
  };

  return (
    <>
      <div className="confusion-split" aria-label="周长与面积并排">
        <section className="half">
          <h3>
            周长 <span className="note">上节课</span>
          </h3>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <circle cx={CX} cy={CY} r={rPx} fill="none" stroke="var(--c-arc)" strokeWidth={14} />
            <line className="radius-seg" x1={CX} y1={CY} x2={CX + rPx} y2={CY} />
            <text className="svg-num" x={CX + rPx / 2} y={CY - 12} textAnchor="middle" fill="var(--c-diameter)">
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
          <h3>面积</h3>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <circle className="area-fill" cx={CX} cy={CY} r={rPx} stroke="var(--c-wheel-stroke)" strokeWidth={4} />
            <line className="radius-seg" x1={CX} y1={CY} x2={CX + rPx} y2={CY} />
            <text className="svg-num" x={CX + rPx / 2} y={CY - 12} textAnchor="middle" fill="var(--c-diameter)">
              r = {r.toFixed(1)}
            </text>
            <circle cx={CX} cy={CY} r={6} fill="var(--c-wheel-stroke)" />
            <text className="svg-label" x={CX} y={H - 30} textAnchor="middle">
              面积在「面」上
            </text>
          </svg>
          <div className="live-formula">
            <div className="formula">
              <span>S = πr² = 3.14 ×</span>
              <span className={`var ${doubled ? "changed" : ""}`}>{r.toFixed(1)}</span>
              <span>×</span>
              <span className={`var ${doubled ? "changed" : ""}`}>{r.toFixed(1)}</span>
              <span>=</span>
              <span className="res">{fmt2(S)}</span>
              <span>cm²</span>
            </div>
          </div>
        </section>
      </div>
      <SvgSlider
        value={r}
        min={R_MIN}
        max={R_MAX}
        step={0.1}
        label="半径 r"
        ariaLabel="半径"
        format={(v) => `r = ${v.toFixed(1)} cm`}
        minLabel={`${R_MIN.toFixed(1)}`}
        maxLabel={`${R_MAX.toFixed(1)}`}
        color="var(--c-diameter)"
        onBegin={() => dispatch({ type: "BEGIN_DRAG_R" })}
        onChange={onSlide}
        onEnd={() => dispatch({ type: "END_DRAG_R" })}
      />
      {doubled && (
        <p className="hint">
          半径从 {startR.current.toFixed(1)} 翻倍：<b>面积 ×4，周长 ×2</b>——因为面积里 r 乘了两次（r²）。
        </p>
      )}
    </>
  );
}
