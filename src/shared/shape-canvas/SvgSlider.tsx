import { useRef, type PointerEvent as ReactPointerEvent } from "react";

interface Props {
  /** 0–1 */
  value: number;
  onChange: (v: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  label?: string;
}

const W = 360;
const H = 64;
const PAD = 32;

/** 自绘 SVG 滑块（不用原生 range）：拖柄 ≥ 48px，可拖可停。 */
export function SvgSlider({ value, onChange, onDragStart, onDragEnd, disabled, label = "进度" }: Props) {
  const ptr = useRef<number | null>(null);
  const x = PAD + value * (W - 2 * PAD);

  const valueFrom = (e: ReactPointerEvent<SVGElement>) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const ctm = svg.getScreenCTM();
    const q = ctm ? p.matrixTransform(ctm.inverse()) : { x: e.clientX };
    return Math.min(1, Math.max(0, (q.x - PAD) / (W - 2 * PAD)));
  };
  const down = (e: ReactPointerEvent<SVGElement>) => {
    if (disabled || ptr.current !== null) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件 */
    }
    ptr.current = e.pointerId;
    onDragStart?.();
    onChange(valueFrom(e));
  };
  const move = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    onChange(valueFrom(e));
  };
  const up = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    ptr.current = null;
    onDragEnd?.();
  };

  return (
    <div className={`svg-slider ${disabled ? "disabled" : ""}`}>
      <span className="svg-slider-label">{label}</span>
      <svg viewBox={`0 0 ${W} ${H}`} role="slider" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-disabled={disabled || undefined}>
        <rect className="track" x={PAD} y={H / 2 - 7} width={W - 2 * PAD} height={14} rx={7} />
        <rect className="track-fill" x={PAD} y={H / 2 - 7} width={Math.max(0, x - PAD)} height={14} rx={7} />
        <text className="end" x={PAD} y={H - 4} textAnchor="middle">
          0
        </text>
        <text className="end" x={W - PAD} y={H - 4} textAnchor="middle">
          1
        </text>
        <circle className="thumb" cx={x} cy={H / 2} r={20} />
        <rect className="hit" x={0} y={0} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} />
      </svg>
    </div>
  );
}
