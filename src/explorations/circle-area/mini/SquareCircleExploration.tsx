import { useEffect, useRef, useState } from "react";
import { href } from "@/app/router";
import { useSettings } from "@/app/settings";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import type { ExplorationProps } from "@/explorations/registry";
import { SvgSlider } from "../components/SvgSlider";
import { SQUARE_CIRCLE_EVENTS } from "../model/evidence";
import { R_MAX, R_MIN } from "../model/types";
import { useEvidenceSync } from "../useEvidenceSync";
import { MiniShell } from "./MiniShell";
import { splitTrianglesArea, squareCircleAreas, type SquareKind } from "./model";
import "../circle-area.css";
import "@/explorations/circle-circumference/circumference.css";

const W = 1380;
const H = 620;
const CX = 690;
const CY = 300;
const SCALE = 48;

const SQUARE_CHIPS = ["2", "4", "3.14", "1"] as const;
const CIRCLE_CHIPS = ["3.14", "4", "2", "6.28"] as const;

type SqKey = keyof typeof SQUARE_CIRCLE_EVENTS;

/**
 * 方圆组合面积迷你探究单（交互稿 circle-area.md 步骤 9 延伸 B）。
 * 「外方内圆 / 外圆内方」切换、同一 r 可拖、系数「不变」小标、
 * 外圆内方沿对角线拆成两个底 2r 高 r 的三角形（t 驱动）。
 */
export function SquareCircleExploration({ exploration }: ExplorationProps) {
  const { mode } = useSettings();
  const [kind, setKind] = useState<SquareKind>("outerSquare");
  const [r, setR] = useState(4);
  const [splitT, setSplitT] = useState(0);
  const [running, setRunning] = useState(false);
  const [squareBlank, setSquareBlank] = useState<string | null>(null);
  const [circleBlank, setCircleBlank] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const areas = squareCircleAreas(r, kind);
  const splitArea = splitTrianglesArea(r);
  const rPx = r * SCALE;

  useEffect(() => {
    if (!running) return undefined;
    let id = 0;
    const start = performance.now();
    const from = splitT;
    const tick = (now: number) => {
      const next = Math.min(1, from + (now - start) / 1200);
      setSplitT(next);
      if (next < 1) id = requestAnimationFrame(tick);
      else setRunning(false);
    };
    id = requestAnimationFrame(tick);
    raf.current = id;
    return () => cancelAnimationFrame(id);
    // 只在按下「拆」时从当前进度走到 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (kind === "outerSquare") {
      setSplitT(0);
      setRunning(false);
    }
  }, [kind]);

  const squareOk = squareBlank === String(areas.squareTimes);
  const circleOk = circleBlank === "3.14";
  const conclusionOk = squareOk && circleOk;

  const keys: SqKey[] = [
    "viewed",
    ...(kind === "innerSquare" && splitT > 0.05 ? (["splitSeen"] as const) : []),
    ...(conclusionOk ? (["conclusionFilled"] as const) : []),
  ];
  useEvidenceSync(exploration.id, mode, keys, SQUARE_CIRCLE_EVENTS, { kind, r, splitT, conclusionOk }, 0);

  const questions = exploration.questionCards[0]?.questions ?? [];
  const coefLabel = kind === "outerSquare" ? "0.86" : "1.14";

  const side = (
    <>
      <div className="live-formula" aria-live="polite">
        <h3 style={{ margin: "0 0 0.25rem" }}>{kind === "outerSquare" ? "外方内圆" : "外圆内方"}</h3>
        <div className="formula">
          <span>S方 =</span>
          <span className="var">{areas.squareTimes}r²</span>
          <span>=</span>
          <span className="res">{fmt2(areas.square)}</span>
          <span>cm²</span>
        </div>
        <div className="formula secondary">
          <span>S圆 = πr² =</span>
          <span className="res">{fmt2(areas.circle)}</span>
          <span>cm²</span>
        </div>
        <div className="formula secondary">
          <span>差 =</span>
          <span className="res">{fmt2(areas.diff)}</span>
          <span>=</span>
          <span className="var">
            {coefLabel}r²
            <sup className="coef-badge" title="拖 r，这个系数不变">
              不变
            </sup>
          </span>
        </div>
        <div className="pi-note">
          {kind === "outerSquare"
            ? "正方形边长 = 2r（和直径一样），S方 = (2r)² = 4r²；差 = 4r² − πr²。"
            : "正方形对角线 = 2r，拆成两个底 2r、高 r 的三角形，S方 = 2r²；差 = πr² − 2r²。"}
        </div>
      </div>

      <div className="fill-card" aria-label="结论卡">
        <div className="sentence">
          正方形面积是 r² 的
          <button className={`blank ${squareBlank ? "" : "empty"} ${squareOk ? "ok" : ""}`} onClick={() => setSquareBlank(null)}>
            {squareBlank ?? "______"}
          </button>
          倍；圆面积是 r² 的
          <button className={`blank ${circleBlank ? "" : "empty"} ${circleOk ? "ok" : ""}`} onClick={() => setCircleBlank(null)}>
            {circleBlank ?? "______"}
          </button>
          倍。
        </div>
        <div className="chips">
          <span className="muted">正方形：</span>
          {SQUARE_CHIPS.map((c) => (
            <button key={`s-${c}`} className="btn" aria-pressed={squareBlank === c} onClick={() => setSquareBlank(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="chips">
          <span className="muted">圆：</span>
          {CIRCLE_CHIPS.map((c) => (
            <button key={`c-${c}`} className="btn" aria-pressed={circleBlank === c} onClick={() => setCircleBlank(c)}>
              {c}
            </button>
          ))}
        </div>
        {squareBlank && !squareOk && <p className="hint">再看看正方形边长是 2r 还是对角线是 2r。</p>}
        {circleBlank && !circleOk && <p className="hint">圆的面积公式刚学过：πr²，π 取 3.14。</p>}
        {conclusionOk && <p className="hint ok">对：正方形 {areas.squareTimes} 倍，圆 3.14 倍。差出来的就是那个「不变」系数。</p>}
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
      <div className="choice-row">
        <button className="btn lg" aria-pressed={kind === "outerSquare"} onClick={() => setKind("outerSquare")}>
          外方内圆
        </button>
        <button className="btn lg" aria-pressed={kind === "innerSquare"} onClick={() => setKind("innerSquare")}>
          外圆内方
        </button>
      </div>
      <div className="stage-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="方圆组合">
          {kind === "outerSquare" ? <OuterSquare rPx={rPx} r={r} /> : <InnerSquare rPx={rPx} splitT={splitT} />}
        </svg>
      </div>
      <SvgSlider
        value={r}
        min={R_MIN}
        max={R_MAX}
        step={0.1}
        label="半径 r"
        ariaLabel="半径"
        format={(v) => `r = ${v.toFixed(1)} cm`}
        minLabel={`${R_MIN}`}
        maxLabel={`${R_MAX}`}
        color="var(--c-diameter)"
        onChange={setR}
      />
      {kind === "innerSquare" && (
        <>
          <div className="row" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn primary lg"
              aria-pressed={splitT >= 1}
              onClick={() => {
                if (splitT >= 1) {
                  setSplitT(0);
                  setRunning(false);
                } else {
                  setRunning(true);
                }
              }}
            >
              {splitT >= 1 ? "合回去" : "拆成三角形"}
            </button>
            <span className="muted">
              两个三角形：底 2r、高 r，合计 {fmt2(splitArea)} = 2r²
            </span>
          </div>
          <SvgSlider
            value={splitT}
            min={0}
            max={1}
            step={0.01}
            label="拆开进度"
            ariaLabel="把正方形沿对角线拆成两个三角形"
            format={(v) => `${Math.round(v * 100)}%`}
            minLabel="合"
            maxLabel="拆"
            color="var(--c-warn)"
            onBegin={() => setRunning(false)}
            onChange={setSplitT}
          />
        </>
      )}
    </MiniShell>
  );
}

function OuterSquare({ rPx, r }: { rPx: number; r: number }) {
  const side = 2 * rPx;
  return (
    <g>
      <rect
        x={CX - rPx}
        y={CY - rPx}
        width={side}
        height={side}
        fill="none"
        stroke="var(--c-warn)"
        strokeWidth={6}
      />
      <circle className="area-fill" cx={CX} cy={CY} r={rPx} stroke="var(--c-wheel-stroke)" strokeWidth={4} />
      <line className="radius-seg" x1={CX} y1={CY} x2={CX + rPx} y2={CY} />
      <text className="svg-num orange" x={CX + rPx / 2} y={CY - 12} textAnchor="middle">
        r = {r.toFixed(1)}
      </text>
      <text className="svg-label" x={CX} y={CY + rPx + 44} textAnchor="middle">
        正方形边长 = 2r = 直径
      </text>
    </g>
  );
}

function InnerSquare({ rPx, splitT }: { rPx: number; splitT: number }) {
  const N = { x: CX, y: CY - rPx };
  const E = { x: CX + rPx, y: CY };
  const S = { x: CX, y: CY + rPx };
  const W = { x: CX - rPx, y: CY };
  const shift = splitT * rPx * 1.15;
  const right = {
    N: { x: N.x + shift, y: N.y },
    E: { x: E.x + shift, y: E.y },
    S: { x: S.x + shift, y: S.y },
  };
  const pts = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`;
  return (
    <g>
      <circle cx={CX} cy={CY} r={rPx} fill="rgba(80, 140, 255, 0.18)" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
      <polygon points={pts(N, W, S)} className="tri-first" />
      <polygon points={pts(right.N, right.E, right.S)} className="tri-second" />
      <line className="radius-seg" x1={CX} y1={CY} x2={E.x} y2={E.y} />
      {splitT > 0.6 && (
        <g>
          <line className="dim-line arc" x1={right.N.x} y1={right.N.y} x2={right.S.x} y2={right.S.y} />
          <text className="svg-num arc" x={right.N.x + 16} y={CY} >
            底 2r
          </text>
          <line className="dim-line orange dashed" x1={right.E.x} y1={right.E.y} x2={(right.N.x + right.S.x) / 2} y2={(right.N.y + right.S.y) / 2} />
          <text className="svg-num orange" x={right.E.x + 12} y={CY - 24}>
            高 r
          </text>
        </g>
      )}
      <text className="svg-label" x={CX} y={CY + rPx + 44} textAnchor="middle">
        正方形对角线 = 直径 = 2r{splitT > 0 ? " · 拆成两个三角形" : ""}
      </text>
    </g>
  );
}
