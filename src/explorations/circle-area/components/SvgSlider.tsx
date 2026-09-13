import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ownerSvg, svgPoint } from "@/explorations/circle-circumference/components/svg-utils";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** 左侧短标签（如「拼合进度」「半径 r」） */
  label?: string;
  /** 拖柄上方读数 */
  format?: (v: number) => string;
  /** 两端刻度文字 */
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  onBegin?: () => void;
  onChange: (v: number) => void;
  onEnd?: () => void;
  ariaLabel: string;
  /** 主题色 */
  color?: string;
}

const W = 600;
const H = 96;
const PAD = 40;
const TRACK_Y = 60;
/** 拖柄直径 ≥ 48px（viewBox 与像素约 1:1） */
const HANDLE_R = 26;

/**
 * 自绘 SVG 滑块（交互稿 3.3「滑块」硬要求）：轨道高 ≥ 12px、拖柄 ≥ 48px，不用原生 range。
 * 按 pointerId 捕获自己的指针，可与其他拖点同时操作。
 */
export function SvgSlider({
  value,
  min,
  max,
  step,
  label,
  format,
  minLabel,
  maxLabel,
  disabled = false,
  onBegin,
  onChange,
  onEnd,
  ariaLabel,
  color = "var(--c-primary)",
}: Props) {
  const ptr = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const span = max - min;
  const frac = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  const x = PAD + frac * (W - 2 * PAD);

  const valueAt = (svgX: number) => {
    const f = Math.min(1, Math.max(0, (svgX - PAD) / (W - 2 * PAD)));
    let v = min + f * span;
    if (step) v = Math.round(v / step) * step;
    return Math.min(max, Math.max(min, v));
  };

  const capture = (e: ReactPointerEvent<SVGElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件无真实指针 */
    }
  };
  const onDown = (e: ReactPointerEvent<SVGElement>) => {
    if (disabled || ptr.current !== null) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    capture(e);
    ptr.current = e.pointerId;
    setActive(true);
    onBegin?.();
    onChange(valueAt(svgPoint(svg, e).x));
  };
  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    onChange(valueAt(svgPoint(svg, e).x));
  };
  const onUp = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    ptr.current = null;
    setActive(false);
    onEnd?.();
  };

  return (
    <div className={`svg-slider ${disabled ? "disabled" : ""}`}>
      {label && <span className="slider-label">{label}</span>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled}
      >
        <rect className="slider-track" x={PAD} y={TRACK_Y - 7} width={W - 2 * PAD} height={14} rx={7} />
        <rect className="slider-fill" x={PAD} y={TRACK_Y - 7} width={Math.max(0, x - PAD)} height={14} rx={7} fill={color} />
        {minLabel && (
          <text className="slider-end" x={PAD} y={TRACK_Y + 34} textAnchor="middle">
            {minLabel}
          </text>
        )}
        {maxLabel && (
          <text className="slider-end" x={W - PAD} y={TRACK_Y + 34} textAnchor="middle">
            {maxLabel}
          </text>
        )}
        {format && (
          <text className="slider-value" x={x} y={TRACK_Y - 36} textAnchor="middle" fill={color}>
            {format(value)}
          </text>
        )}
        <circle className={`slider-handle ${active ? "active" : ""}`} cx={x} cy={TRACK_Y} r={HANDLE_R} fill={color} />
        {/* 命中区：整条轨道可点，拖柄可拖 */}
        <rect
          className="hit"
          x={0}
          y={TRACK_Y - 40}
          width={W}
          height={80}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
        />
      </svg>
    </div>
  );
}
