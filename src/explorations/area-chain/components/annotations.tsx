import type { CanvasCtx, Pt } from "@/shared/shape-canvas";

/** 底 / 长的青绿标注线。默认标签在线下方；上底这类在图形上方的边把 labelBelow 设为 false。 */
export function BaseLine({
  ctx,
  from,
  to,
  label,
  offset = 0.55,
  labelBelow = true,
}: {
  ctx: CanvasCtx;
  from: Pt;
  to: Pt;
  label?: string;
  offset?: number;
  labelBelow?: boolean;
}) {
  const y = Math.min(from.y, to.y) - offset;
  const a = ctx.toPx({ x: from.x, y });
  const b = ctx.toPx({ x: to.x, y });
  return (
    <g>
      <line className="sc-base-line" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      {label && (
        <text className="sc-num base" x={(a.x + b.x) / 2} y={a.y + (labelBelow ? 36 : -14)} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

/** 高：橙色虚线 + 直角标记（在 foot 处），标签在线外侧以免压到图形 */
export function HeightLine({ ctx, foot, top, label, side = 1 }: { ctx: CanvasCtx; foot: Pt; top: Pt; label?: string; side?: 1 | -1 }) {
  const f = ctx.toPx(foot);
  const t = ctx.toPx(top);
  const m = 22;
  return (
    <g>
      <line className="sc-height-line" x1={f.x} y1={f.y} x2={t.x} y2={t.y} />
      <path className="sc-right-angle" d={`M${f.x} ${f.y - m} h${m * side} v${m}`} />
      {label && (
        <text className="sc-num height" x={f.x + 28 * side} y={(f.y + t.y) / 2 + 10} textAnchor={side === 1 ? "start" : "end"}>
          {label}
        </text>
      )}
    </g>
  );
}

/** 「?」按钮：点边贴尺读数 */
export function RulerButton({ ctx, at, onClick, shown }: { ctx: CanvasCtx; at: Pt; onClick: () => void; shown: boolean }) {
  const p = ctx.toPx(at);
  return (
    <g className="sc-ruler-btn" role="button" aria-label={shown ? "收起尺子" : "点边贴尺读数"} aria-pressed={shown} onClick={onClick} transform={`translate(${p.x} ${p.y})`}>
      <rect x={-28} y={-28} width={56} height={56} />
      <text x={0} y={11} textAnchor="middle">
        {shown ? "×" : "?"}
      </text>
    </g>
  );
}

/** 尺子：沿一段线贴上刻度与读数（每 1 cm 一刻度） */
export function Ruler({ ctx, from, to, value, alt = false, offset = 0.3 }: { ctx: CanvasCtx; from: Pt; to: Pt; value: string; alt?: boolean; offset?: number }) {
  const horizontal = Math.abs(from.y - to.y) < 1e-9;
  const f = horizontal ? { x: from.x, y: from.y - offset } : { x: from.x + offset, y: from.y };
  const t = horizontal ? { x: to.x, y: to.y - offset } : { x: to.x + offset, y: to.y };
  const a = ctx.toPx(f);
  const b = ctx.toPx(t);
  const len = horizontal ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
  const ticks: number[] = [];
  for (let i = 0; i <= Math.floor(len + 1e-9); i++) ticks.push(i);
  return (
    <g>
      <line className={`sc-ruler ${alt ? "alt" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={6} />
      {ticks.map((i) => {
        const p = horizontal ? ctx.toPx({ x: Math.min(from.x, to.x) + i, y: f.y }) : ctx.toPx({ x: f.x, y: Math.min(from.y, to.y) + i });
        return horizontal ? (
          <line key={i} className="sc-ruler-tick" x1={p.x} y1={p.y - 10} x2={p.x} y2={p.y + 10} />
        ) : (
          <line key={i} className="sc-ruler-tick" x1={p.x - 10} y1={p.y} x2={p.x + 10} y2={p.y} />
        );
      })}
      <text className={`sc-num ${alt ? "height" : "base"}`} x={horizontal ? (a.x + b.x) / 2 : a.x + 18} y={horizontal ? a.y - 16 : (a.y + b.y) / 2 + 10} textAnchor={horizontal ? "middle" : "start"}>
        {value}
      </text>
    </g>
  );
}

/** 对照：把一条边「竖起来」与高并排（斜边 / 腰 vs 高） */
export function UprightCompare({ ctx, at, height, other, otherLabel }: { ctx: CanvasCtx; at: Pt; height: number; other: number; otherLabel: string }) {
  const h0 = ctx.toPx(at);
  const h1 = ctx.toPx({ x: at.x, y: at.y + height });
  const o0 = ctx.toPx({ x: at.x + 0.7, y: at.y });
  const o1 = ctx.toPx({ x: at.x + 0.7, y: at.y + other });
  return (
    <g>
      <line className="sc-height-line" x1={h0.x} y1={h0.y} x2={h1.x} y2={h1.y} />
      <text className="sc-num height" x={h0.x} y={h1.y - 14} textAnchor="middle">
        高 {height.toFixed(1)}
      </text>
      <line className="sc-contrast" x1={o0.x} y1={o0.y} x2={o1.x} y2={o1.y} />
      <text className="sc-num" x={o0.x + 8} y={o1.y - 14} textAnchor="start" fill="#1e5eff">
        {otherLabel} {other.toFixed(1)}
      </text>
    </g>
  );
}
