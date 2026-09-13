import { useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent } from "react";
import { effectiveRadius, measuredC, redPointAngle, rolledLength, TWO_PI } from "../model/derived";
import type { Action } from "../model/reducer";
import { D_MAX, D_MIN, type State } from "../model/types";
import { fmt2, ownerSvg, svgPoint } from "./svg-utils";

export const STAGE_W = 1380;
export const STAGE_H = 840;
const GROUND_Y = 600;
/** 地面尺 0 cm 的位置；左侧留出最大轮子的半径 */
const X0 = 330;
const SCALE_CAP = 60;

export function pxPerCm(d: number): number {
  const usable = STAGE_W - X0 - 40;
  return Math.min(SCALE_CAP, usable / (Math.PI * d * 1.03 + d / 2 + 1));
}

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  /** 是否允许操作（回看已完成步骤时只读） */
  interactive: boolean;
  /** 步骤 5 填 2 / 4 时的对照虚线 */
  contrast?: 2 | 4 | null;
  /** 是否显示 wiggle-me（仅启动、未滚过） */
  wiggle: boolean;
}

/**
 * 主舞台：地面刻度尺 + 可滚轮子 + 红点印记 + 直径拖点。
 * 每个手势按 pointerId 分流：轮子、地面、左右拖点各自捕获自己的指针，互不抢。
 */
export function WheelStage({ state, dispatch, interactive, contrast, wiggle }: Props) {
  const s = state;
  const frozenScale = useRef<number | null>(null);
  const scale = frozenScale.current ?? pxPerCm(s.d);

  const rPx = (s.d / 2) * scale;
  const rEff = effectiveRadius(s);
  const rolledPx = rolledLength(s) * scale;
  const cx = X0 + rolledPx;
  const cy = GROUND_Y - rPx;
  const phi = redPointAngle(s);
  const redX = cx + rPx * Math.cos(phi);
  const redY = cy + rPx * Math.sin(phi);

  // 手势状态（不进单一数据源：只是指针簿记）
  const wheelPtr = useRef<{ id: number; lastX: number } | null>(null);
  const groundPtr = useRef<{ id: number; lastX: number } | null>(null);
  const handlePtr = useRef<{ id: number; side: "left" | "right" } | null>(null);
  const [activeHandle, setActiveHandle] = useState<"left" | "right" | null>(null);

  const rollBy = (dxPx: number, sign: 1 | -1) => {
    const dxCm = dxPx / scale;
    dispatch({ type: "ROLL", deltaAngle: (sign * dxCm) / rEff });
  };

  /* ---- 轮子拖滚 ---- */
  const onWheelDown = (e: ReactPointerEvent<SVGElement>) => {
    if (!interactive || s.rollLocked || wheelPtr.current) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    wheelPtr.current = { id: e.pointerId, lastX: svgPoint(svg, e).x };
    dispatch({ type: "ROLL_START" });
  };
  const onWheelMove = (e: ReactPointerEvent<SVGElement>) => {
    const p = wheelPtr.current;
    if (!p || p.id !== e.pointerId) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const x = svgPoint(svg, e).x;
    rollBy(x - p.lastX, 1);
    p.lastX = x;
  };
  const onWheelUp = (e: ReactPointerEvent<SVGElement>) => {
    if (wheelPtr.current?.id !== e.pointerId) return;
    wheelPtr.current = null;
    dispatch({ type: "ROLL_END" });
  };

  /* ---- 地面反拖（增强） ---- */
  const onGroundDown = (e: ReactPointerEvent<SVGElement>) => {
    if (!interactive || s.rollLocked || groundPtr.current) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    groundPtr.current = { id: e.pointerId, lastX: svgPoint(svg, e).x };
    dispatch({ type: "ROLL_START" });
  };
  const onGroundMove = (e: ReactPointerEvent<SVGElement>) => {
    const p = groundPtr.current;
    if (!p || p.id !== e.pointerId) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const x = svgPoint(svg, e).x;
    rollBy(x - p.lastX, -1);
    p.lastX = x;
  };
  const onGroundUp = (e: ReactPointerEvent<SVGElement>) => {
    if (groundPtr.current?.id !== e.pointerId) return;
    groundPtr.current = null;
    dispatch({ type: "ROLL_END" });
  };

  /* ---- 直径两端拖点 ---- */
  const onHandleDown = (side: "left" | "right") => (e: ReactPointerEvent<SVGElement>) => {
    if (!interactive || handlePtr.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePtr.current = { id: e.pointerId, side };
    frozenScale.current = scale;
    setActiveHandle(side);
    dispatch({ type: "BEGIN_DRAG_D" });
  };
  const onHandleMove = (e: ReactPointerEvent<SVGElement>) => {
    const p = handlePtr.current;
    if (!p || p.id !== e.pointerId) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const x = svgPoint(svg, e).x;
    // 改 d 会把轮心拉回起点，用起点做圆心算新直径
    const half = Math.abs(x - X0) / (frozenScale.current ?? scale);
    const d = Math.min(D_MAX, Math.max(D_MIN, half * 2));
    dispatch({ type: "DRAG_D", d });
  };
  const onHandleUp = (e: ReactPointerEvent<SVGElement>) => {
    if (handlePtr.current?.id !== e.pointerId) return;
    handlePtr.current = null;
    frozenScale.current = null;
    setActiveHandle(null);
    dispatch({ type: "END_DRAG_D" });
  };

  /* ---- 刻度 ---- */
  const maxCm = Math.floor((STAGE_W - X0 - 10) / scale);
  const labelEvery = scale >= 50 ? 1 : 2;
  const ticks: number[] = [];
  for (let i = 0; i <= maxCm; i++) ticks.push(i);

  const C = measuredC(s);
  const locked = s.rollLocked;
  const showContrast = contrast && interactive === false;

  return (
    <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} preserveAspectRatio="xMidYMid meet" aria-label="滚动量周长的舞台">
      {/* 地面拖动区 */}
      <rect
        className="ground-band"
        x={0}
        y={GROUND_Y - 10}
        width={STAGE_W}
        height={120}
        onPointerDown={onGroundDown}
        onPointerMove={onGroundMove}
        onPointerUp={onGroundUp}
        onPointerCancel={onGroundUp}
        onLostPointerCapture={onGroundUp}
      />

      {/* 滚过的周长段（青绿高亮底） */}
      {rolledPx > 0 && <rect className="rolled-band" x={X0} y={GROUND_Y - 6} width={rolledPx} height={16} />}
      {locked && (
        <>
          <line className="rolled-end" x1={X0} y1={GROUND_Y - 40} x2={X0} y2={GROUND_Y + 30} />
          <line className="rolled-end" x1={X0 + rolledPx} y1={GROUND_Y - 40} x2={X0 + rolledPx} y2={GROUND_Y + 30} />
          <text className="svg-num arc" x={X0} y={GROUND_Y - 52} textAnchor="middle">
            0
          </text>
          <text className="svg-num arc" x={X0 + rolledPx} y={GROUND_Y - 52} textAnchor="middle">
            {fmt2(C)}
          </text>
          <text className="svg-label" x={X0 + rolledPx / 2} y={GROUND_Y + 110} textAnchor="middle">
            这一圈的长是 <tspan className="svg-num arc">{fmt2(C)}</tspan> cm
          </text>
        </>
      )}

      {/* 步骤 5 对照：2d / 4d 虚线 */}
      {showContrast && (
        <>
          <rect className="rolled-band" x={X0} y={GROUND_Y - 6} width={C * scale} height={16} />
          <text className="svg-label" x={X0 + (C * scale) / 2} y={GROUND_Y + 110} textAnchor="middle">
            滚一圈量得 <tspan className="svg-num arc">{fmt2(C)}</tspan> cm
          </text>
          <line
            className="contrast-line"
            stroke={contrast === 2 ? "#1e5eff" : "#b3540a"}
            x1={X0}
            y1={GROUND_Y - 130}
            x2={X0 + contrast * s.d * scale}
            y2={GROUND_Y - 130}
          />
          <text className="svg-label" x={X0} y={GROUND_Y - 145}>
            {contrast} × d = {contrast} × {s.d.toFixed(1)} = <tspan className="svg-num">{(contrast * s.d).toFixed(1)}</tspan> cm
          </text>
        </>
      )}

      {/* 地面与刻度 */}
      <line className="ground" x1={X0 - 40} y1={GROUND_Y} x2={STAGE_W} y2={GROUND_Y} />
      {ticks.map((i) => {
        const x = X0 + i * scale;
        const major = i % labelEvery === 0;
        return (
          <g key={i}>
            <line className="tick" x1={x} y1={GROUND_Y} x2={x} y2={GROUND_Y + (major ? 22 : 12)} />
            {major && (
              <text className="tick-label" x={x} y={GROUND_Y + 54}>
                {i}
              </text>
            )}
          </g>
        );
      })}
      <text className="svg-label muted" x={STAGE_W - 20} y={GROUND_Y - 16} textAnchor="end">
        单位：cm
      </text>

      {/* 红点印记 */}
      {s.marks.map((a) => {
        const x = X0 + a * rEff * scale;
        return <line key={a} className="mark" x1={x} y1={GROUND_Y - 14} x2={x} y2={GROUND_Y} />;
      })}

      {/* 轮子 */}
      <g transform={`translate(${cx} ${cy})`}>
        {/* 满圈脉冲动画用 key 重启；命中区放在外面，避免捕获指针的元素被重挂载而丢 pointerup */}
        <g className={`wheel-group ${wiggle ? "wiggle" : ""} ${locked ? "pulse" : ""}`} key={`${s.rollCount}-${locked}`}>
          <circle className="wheel" r={rPx} />
          <circle r={6} fill="var(--c-wheel-stroke)" />
          <text className="svg-label" x={12} y={-12}>
            O
          </text>
        </g>
        {/* 命中区：整个轮面 */}
        <circle
          className="hit"
          r={Math.max(rPx, 32)}
          onPointerDown={onWheelDown}
          onPointerMove={onWheelMove}
          onPointerUp={onWheelUp}
          onPointerCancel={onWheelUp}
          onLostPointerCapture={onWheelUp}
        />
      </g>

      {/* 直径（水平，两端拖点） */}
      <line className="diameter" x1={cx - rPx} y1={cy} x2={cx + rPx} y2={cy} />
      <text className="svg-num" x={cx} y={cy - 16} textAnchor="middle" fill="var(--c-diameter)">
        d = {s.d.toFixed(1)} cm
      </text>
      {(["left", "right"] as const).map((side) => {
        const hx = side === "left" ? cx - rPx : cx + rPx;
        return (
          <g key={side}>
            <circle className={`diameter-handle ${activeHandle === side ? "active" : ""}`} cx={hx} cy={cy} r={18} />
            <circle
              className="hit"
              cx={hx}
              cy={cy}
              r={34}
              onPointerDown={onHandleDown(side)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              onLostPointerCapture={onHandleUp}
            />
          </g>
        );
      })}

      {/* 红点 A */}
      <circle className="red-point" cx={redX} cy={redY} r={11} />
      <text className="svg-label" x={redX + 16} y={redY - 10} fill="var(--c-red)">
        A
      </text>

      {/* wiggle-me 手指 */}
      {wiggle && (
        <g transform={`translate(${cx + rPx + 60} ${cy + 30})`}>
          <path
            className="svg-hand"
            d="M0 0 l-46 -14 a8 8 0 0 1 4 -15 l58 8 v-40 a9 9 0 0 1 18 0 v46 h6 a9 9 0 0 1 9 9 v30 a26 26 0 0 1 -26 26 h-14 a26 26 0 0 1 -19 -8 z"
          />
          <text className="svg-label" x={70} y={12}>
            按住轮子往右拖
          </text>
        </g>
      )}

      {/* 进度 */}
      <text className="svg-label muted" x={STAGE_W - 20} y={40} textAnchor="end">
        已滚 {Math.round((s.rollAngle / TWO_PI) * 100)}%{locked ? " · 满一圈停" : ""}
      </text>
    </svg>
  );
}
