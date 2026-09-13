import { useEffect, useRef, useState } from "react";
import { href } from "@/app/router";
import { useSettings } from "@/app/settings";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import type { ExplorationProps } from "@/explorations/registry";
import { SvgSlider } from "../components/SvgSlider";
import { RING_EVENTS } from "../model/evidence";
import { useEvidenceSync } from "../useEvidenceSync";
import { MiniShell } from "./MiniShell";
import {
  DISC_INNER,
  DISC_OUTER,
  RING_R_MAX,
  RING_R_MIN,
  clampInnerR,
  clampOuterR,
  innerRBounds,
  ringAreas,
} from "./model";
import "../circle-area.css";
import "@/explorations/circle-circumference/circumference.css";

const W = 1380;
const H = 620;
const CX = 520;
const CY = 310;
const SCALE = 42;

type RingKey = keyof typeof RING_EVENTS;

/**
 * 圆环面积迷你探究单（交互稿 circle-area.md 步骤 9 延伸 A）。
 * 同心圆 rInner 可拖、两式并列活公式、光盘一键填入、π(R − r)² 错法对照。
 */
export function RingExploration({ exploration }: ExplorationProps) {
  const { mode } = useSettings();
  const [R, setR] = useState(DISC_OUTER);
  const [rInner, setRInner] = useState(DISC_INNER);
  const [trap, setTrap] = useState(false);
  const [flash, setFlash] = useState(false);
  const prev = useRef({ R, rInner });
  const inner = innerRBounds(R);
  const areas = ringAreas(R, rInner);
  const rPx = rInner * SCALE;
  const Rpx = R * SCALE;

  useEffect(() => {
    if (prev.current.R !== R || prev.current.rInner !== rInner) {
      prev.current = { R, rInner };
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 320);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [R, rInner]);

  const keys: RingKey[] = trap ? ["viewed", "bothFormulas", "trapSeen"] : ["viewed", "bothFormulas"];
  useEvidenceSync(exploration.id, mode, keys, RING_EVENTS, { R, rInner, trap }, 0);

  const setOuter = (value: number) => {
    const next = clampOuterR(value);
    setR(next);
    setRInner((cur) => clampInnerR(cur, next));
  };

  const cls = flash ? "changed" : "";
  const questions = exploration.questionCards[0]?.questions ?? [];

  const side = (
    <>
      <div className="live-formula" aria-live="polite">
        <h3 style={{ margin: "0 0 0.25rem" }}>小丽：先算两个圆再相减</h3>
        <div className="formula" aria-label={`圆环面积等于 π 大 R 平方减 π 小 r 平方，等于 ${fmt2(areas.diff)}`}>
          <span>S环 = πR² − πr² =</span>
          <span className={`var ${cls}`}>{fmt2(areas.outer)}</span>
          <span>−</span>
          <span className={`var ${cls}`}>{fmt2(areas.inner)}</span>
          <span>=</span>
          <span className={`res ${cls}`}>{fmt2(areas.diff)}</span>
          <span>cm²</span>
        </div>
      </div>
      <div className="live-formula" aria-live="polite">
        <h3 style={{ margin: "0 0 0.25rem" }}>小明：先算 R² − r² 再乘 π</h3>
        <div className="formula">
          <span>S环 = π(R² − r²) = 3.14 × (</span>
          <span className={`var ${cls}`}>{fmt2(R * R)}</span>
          <span>−</span>
          <span className={`var ${cls}`}>{fmt2(rInner * rInner)}</span>
          <span>) =</span>
          <span className={`res ${cls}`}>{fmt2(areas.factored)}</span>
          <span>cm²</span>
        </div>
        <div className="pi-note">两种算法结果一样。R 是外半径，r 是内半径。</div>
      </div>
      {trap && (
        <div className="task-card trap-card">
          <b>错法对照</b>
          <div className="formula secondary" style={{ marginTop: "0.5rem" }}>
            π(R − r)² = 3.14 × {fmt2(R - rInner)}² = <span className="res">{fmt2(areas.trap)}</span> cm²
          </div>
          <p className="hint">
            看舞台右边那个小圆：半径只有 (R − r) = {fmt2(R - rInner)} cm，面积 {fmt2(areas.trap)}，
            圆环却是 {fmt2(areas.diff)}——差了一大截。圆环不是「半径差再平方」。
          </p>
        </div>
      )}
      <div className="choice-row">
        <button className="btn primary" onClick={() => { setR(DISC_OUTER); setRInner(DISC_INNER); }}>
          光盘：内 2 · 外 6
        </button>
        <button className="btn" aria-pressed={trap} onClick={() => setTrap((v) => !v)}>
          {trap ? "收起错法" : "π(R − r)² 也对吗？"}
        </button>
      </div>
      {mode === "teacher" && questions.length > 0 && (
        <div className="task-card">
          <b>提问卡</b>
          <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      )}
      <a className="btn" href={href("/explore/exp-6a-05-area")}>
        ← 回到圆的面积
      </a>
    </>
  );

  return (
    <MiniShell exploration={exploration} side={side}>
      <div className="stage-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="圆环">
          <path
            className="ring-fill"
            fillRule="evenodd"
            d={`M ${CX + Rpx} ${CY} A ${Rpx} ${Rpx} 0 1 1 ${CX - Rpx} ${CY} A ${Rpx} ${Rpx} 0 1 1 ${CX + Rpx} ${CY} M ${CX + rPx} ${CY} A ${rPx} ${rPx} 0 1 0 ${CX - rPx} ${CY} A ${rPx} ${rPx} 0 1 0 ${CX + rPx} ${CY}`}
          />
          <circle cx={CX} cy={CY} r={Rpx} fill="none" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
          <circle cx={CX} cy={CY} r={rPx} fill="none" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
          <line className="radius-seg" x1={CX} y1={CY} x2={CX + Rpx} y2={CY} />
          <line className="radius-seg ring-inner-r" x1={CX} y1={CY} x2={CX} y2={CY - rPx} />
          <circle cx={CX} cy={CY} r={6} fill="var(--c-wheel-stroke)" />
          <text className="svg-num orange" x={CX + Rpx + 16} y={CY + 8}>
            R = {R.toFixed(1)}
          </text>
          <text className="svg-num" x={CX - 16} y={CY - rPx * 0.55} fill="var(--c-primary)" textAnchor="end">
            r = {rInner.toFixed(1)}
          </text>
          <text className="svg-label" x={CX} y={CY + Rpx + 40} textAnchor="middle">
            环形涂色 · 外圆 − 内圆
          </text>
          {trap && (
            <g className="trap-circle" transform={`translate(${CX + Rpx + 220} ${CY})`}>
              <circle r={(R - rInner) * SCALE} fill="rgba(200, 40, 40, 0.35)" stroke="var(--c-red)" strokeWidth={4} />
              <text className="svg-label" y={(R - rInner) * SCALE + 36} textAnchor="middle" fill="var(--c-red)">
                半径 (R − r) 的小圆
              </text>
              <text className="svg-num" y={(R - rInner) * SCALE + 72} textAnchor="middle" fill="var(--c-red)">
                {fmt2(areas.trap)} cm²
              </text>
            </g>
          )}
        </svg>
      </div>
      <SvgSlider
        value={R}
        min={RING_R_MIN}
        max={RING_R_MAX}
        step={0.1}
        label="外半径 R"
        ariaLabel="外半径"
        format={(v) => `R = ${v.toFixed(1)} cm`}
        minLabel={`${RING_R_MIN}`}
        maxLabel={`${RING_R_MAX}`}
        color="var(--c-diameter)"
        onChange={setOuter}
      />
      <SvgSlider
        value={rInner}
        min={inner.min}
        max={inner.max}
        step={0.1}
        label="内半径 r"
        ariaLabel="内半径"
        format={(v) => `r = ${v.toFixed(1)} cm`}
        minLabel={`${inner.min}`}
        maxLabel={`${inner.max}`}
        color="var(--c-primary)"
        onChange={(v) => setRInner(clampInnerR(v, R))}
      />
      <p className="muted">
        内圆越来越大、快追上外圆时，圆环越来越细、面积趋近 0；内半径越小，越接近整圆。
      </p>
    </MiniShell>
  );
}
